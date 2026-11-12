"""Testa o fallback entre modelos Gemini — spec: specs/gemini-model-fallback.md."""

import asyncio
import logging
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient
from google.genai import Client, errors, types

from config.gemini_config import parse_model_list
from services.prescription import extraction_service
from services.prescription.extraction_service import (
    ExtractionResult,
    MedicationItem,
    PrescriptionExtraction,
    extract_prescription,
)

SERVICE = "services.prescription.extraction_service"


def _extraction(confianca=0.95):
    return PrescriptionExtraction(
        medicamentos=[MedicationItem(medicamento="Dipirona", dose="500mg", posologia="8/8h", periodo="5 dias", confianca=confianca)],
        confianca_geral=confianca,
    )


def _api_error(code):
    return errors.APIError(code, {"error": {"code": code, "message": "x", "status": "X"}})


def _client_by_model(outcomes):
    """Client falso: `outcomes[model]` é uma exceção (levantada) ou um PrescriptionExtraction."""
    calls = []

    def generate_content(*, model, **_):
        calls.append(model)
        outcome = outcomes[model]
        if isinstance(outcome, Exception):
            raise outcome
        return SimpleNamespace(parsed=outcome)

    client = MagicMock()
    client.models.generate_content.side_effect = generate_content
    return client, calls


def _run(models, outcomes, tesseract_text=""):
    client, calls = _client_by_model(outcomes)
    with patch(f"{SERVICE}.GEMINI_MODELS", models), patch(
        f"{SERVICE}.build_genai_client", return_value=client
    ), patch(f"{SERVICE}.tesseract_extract_text", return_value=tesseract_text) as tesseract:
        result = extract_prescription(b"fake-image-bytes")
    return result, calls, tesseract


# --- FR-1 ---------------------------------------------------------------------------------

@pytest.mark.parametrize(
    "raw, esperado",
    [("a, b ,c", ["a", "b", "c"]), (None, ["x"]), ("", ["x"]), (" , ,", ["x"]), ("a,a", ["a", "a"])],
)
def test_parse_model_list_ac1_ec1(raw, esperado):
    assert parse_model_list(raw, "x") == esperado


# --- FR-2 / FR-3 / FR-6 -------------------------------------------------------------------

def test_primeiro_modelo_ok_faz_uma_chamada_so_ac2():
    result, calls, tesseract = _run(["a", "b"], {"a": _extraction(), "b": _extraction()})

    assert calls == ["a"]
    assert result.origem == "gemini"
    assert result.modelo == "a"
    tesseract.assert_not_called()


def test_503_no_primeiro_troca_para_o_segundo_ac3():
    result, calls, tesseract = _run(["a", "b"], {"a": _api_error(503), "b": _extraction()})

    assert calls == ["a", "b"]
    assert result.origem == "gemini"
    assert result.modelo == "b"
    tesseract.assert_not_called()


@pytest.mark.parametrize("erro", [_api_error(404), _api_error(429), httpx.ReadTimeout("lento")])
def test_404_429_e_timeout_tambem_trocam_de_modelo_ac4(erro):
    result, calls, _ = _run(["a", "b"], {"a": erro, "b": _extraction()})

    assert calls == ["a", "b"]
    assert result.modelo == "b"


@pytest.mark.parametrize("erro", [ValueError("json inválido"), _api_error(401), _api_error(403)])
def test_erro_nao_transitorio_vai_direto_para_o_tesseract_ac5(erro):
    result, calls, tesseract = _run(["a", "b"], {"a": erro, "b": _extraction()})

    assert calls == ["a"]
    assert result.origem == "tesseract"
    tesseract.assert_called_once()


def test_resposta_sem_json_nao_troca_de_modelo_ac5():
    result, calls, _ = _run(["a", "b"], {"a": None, "b": _extraction()})

    assert calls == ["a"]
    assert result.origem == "tesseract"


def test_todos_os_modelos_fora_cai_no_tesseract_ac6():
    result, calls, tesseract = _run(["a", "b", "c"], {m: _api_error(503) for m in "abc"})

    assert result.origem == "tesseract"
    assert result.modelo is None
    assert result.precisa_revisar is True
    tesseract.assert_called_once()


# --- FR-4 ---------------------------------------------------------------------------------

def test_uma_tentativa_por_modelo_quando_ha_varios_ac7():
    _, calls, _ = _run(["a", "b", "c"], {m: _api_error(503) for m in "abc"})

    assert calls == ["a", "b", "c"]


def test_modelo_unico_e_tentado_extraction_attempts_vezes_ac7(monkeypatch):
    monkeypatch.setattr(extraction_service, "GEMINI_RETRY_INITIAL_DELAY", 0.01)
    monkeypatch.setattr(extraction_service, "GEMINI_EXTRACTION_ATTEMPTS", 3)

    _, calls, _ = _run(["a"], {"a": _api_error(503)})

    assert calls == ["a", "a", "a"]


def test_sem_retry_do_sdk_por_tentativa_fr4():
    client, _ = _client_by_model({"a": _extraction()})
    with patch(f"{SERVICE}.GEMINI_MODELS", ["a"]), patch(f"{SERVICE}.build_genai_client", return_value=client):
        extract_prescription(b"fake-image-bytes")

    config = client.models.generate_content.call_args.kwargs["config"]
    assert config.http_options.retry_options.attempts == 1


# --- FR-5 ---------------------------------------------------------------------------------

def test_cadeia_de_modelos_respeita_o_orcamento_total_ac8(monkeypatch):
    chamadas = []

    class GeminiLento(BaseHTTPRequestHandler):
        def do_POST(self):
            chamadas.append(self.path)
            self.rfile.read(int(self.headers["Content-Length"]))
            time.sleep(3)
            self.send_response(503)
            self.end_headers()

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), GeminiLento)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    client = Client(api_key="dummy-key", http_options=types.HttpOptions(base_url=f"http://127.0.0.1:{server.server_port}"))

    monkeypatch.setattr(extraction_service, "GEMINI_EXTRACTION_BUDGET_MS", 1500)
    try:
        with patch(f"{SERVICE}.GEMINI_MODELS", ["a", "b", "c", "d"]), patch(
            f"{SERVICE}.build_genai_client", return_value=client
        ), patch(f"{SERVICE}.tesseract_extract_text", return_value=""):
            inicio = time.monotonic()
            result = extract_prescription(b"fake-image-bytes")
            duracao = time.monotonic() - inicio
    finally:
        server.shutdown()

    assert result.origem == "tesseract"
    assert duracao < 1.5 + 0.5
    assert len(chamadas) < 4


def test_orcamento_padrao_cabe_no_limite_do_fr10():
    from config import gemini_config

    assert gemini_config.GEMINI_EXTRACTION_BUDGET_MS <= 25000


# --- FR-7 ---------------------------------------------------------------------------------

def test_cada_tentativa_pede_uma_chave_nova_ac9():
    client, _ = _client_by_model({"a": _api_error(503), "b": _extraction()})
    with patch(f"{SERVICE}.GEMINI_MODELS", ["a", "b"]), patch(
        f"{SERVICE}.build_genai_client", return_value=client
    ), patch(f"{SERVICE}.next_api_key", return_value="k") as next_key:
        extract_prescription(b"fake-image-bytes")

    assert next_key.call_count == 2


# --- FR-8 ---------------------------------------------------------------------------------

def test_loga_modelo_que_falhou_e_modelo_que_respondeu_ac10(caplog):
    caplog.set_level(logging.INFO, logger=extraction_service.logger.name)

    _run(["modelo-a", "modelo-b"], {"modelo-a": _api_error(503), "modelo-b": _extraction()})

    warnings = [r for r in caplog.records if r.levelname == "WARNING"]
    infos = [r for r in caplog.records if r.levelname == "INFO"]
    assert len(warnings) == 1 and "modelo-a" in warnings[0].getMessage() and warnings[0].exc_info
    assert any("modelo-b" in r.getMessage() for r in infos)


# --- FR-9 ---------------------------------------------------------------------------------

def test_modelo_nao_sai_na_api_ac11(tmp_path, monkeypatch):
    from api.main import app

    monkeypatch.setenv("SAFEPASS_DB", str(tmp_path / "test.db"))
    resultado = ExtractionResult(data=_extraction(), precisa_revisar=False, campos_revisar=[], modelo="gemini-x")

    with patch("api.main.extract_prescription", return_value=resultado):
        response = TestClient(app, headers={"X-Usuario-Id": "ana"}).post(
            "/api/prescriptions/extract",
            files={"file": ("receita.jpg", b"\xff\xd8\xff\xe0fake-jpeg", "image/jpeg")},
        )

    assert response.status_code == 200
    assert "modelo" not in response.json()
    assert "gemini-x" not in response.text


def test_modelo_nao_sai_na_tool_ac11():
    from tools.extract_prescription import extract_prescription as tool

    artifact = SimpleNamespace(inline_data=SimpleNamespace(data=b"img", mime_type="image/jpeg"))

    class Ctx:
        state = {"prescription_artifact": {"filename": "f", "mime_type": "image/jpeg"}}

        async def load_artifact(self, filename):
            return artifact

    resultado = ExtractionResult(data=_extraction(), precisa_revisar=False, campos_revisar=[], modelo="gemini-x")
    with patch("tools.extract_prescription.run_extraction", return_value=resultado):
        out = asyncio.run(tool(Ctx()))

    assert out["status"] == "success"
    assert "modelo" not in out
    assert "gemini-x" not in str(out)


# --- FR-10 --------------------------------------------------------------------------------

def test_hitl_vale_para_o_segundo_modelo_ac12():
    result, _, _ = _run(["a", "b"], {"a": _api_error(503), "b": _extraction(confianca=0.3)})

    assert result.modelo == "b"
    assert result.precisa_revisar is True
