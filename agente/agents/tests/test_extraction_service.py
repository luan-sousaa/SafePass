"""Testa services/prescription/extraction_service.py — spec: specs/prescription-extraction.md (AC-1, AC-5, AC-6, AC-11, AC-12, AC-13)."""

import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import MagicMock, patch

import pytest
from google.genai import Client, types

from config import gemini_config
from services.prescription import extraction_service

from services.prescription.extraction_service import (
    MedicationItem,
    PrescriptionExtraction,
    extract_prescription,
)


def _fake_gemini_client(parsed_extraction):
    client = MagicMock()
    response = MagicMock()
    response.parsed = parsed_extraction
    client.models.generate_content.return_value = response
    return client


def test_extract_prescription_returns_structured_data_on_success_ac1():
    fake_extraction = PrescriptionExtraction(
        medicamentos=[
            MedicationItem(medicamento="Dipirona", dose="500mg", posologia="1 cp 8/8h", periodo="5 dias", confidence=0.95)
        ],
        confidence_geral=0.95,
    )

    with patch(
        "services.prescription.extraction_service.build_genai_client",
        return_value=_fake_gemini_client(fake_extraction),
    ):
        result = extract_prescription(b"fake-image-bytes", mime_type="image/jpeg")

    assert result.source == "gemini"
    assert result.needs_manual_review is False
    assert len(result.data.medicamentos) == 1
    assert result.data.medicamentos[0].medicamento == "Dipirona"


def test_extract_prescription_falls_back_to_tesseract_when_gemini_fails_ac5():
    with patch(
        "services.prescription.extraction_service.build_genai_client",
        side_effect=RuntimeError("Gemini API indisponível"),
    ), patch(
        "services.prescription.extraction_service.tesseract_extract_text",
        return_value="Dipirona 500mg - 1 cp 8/8h",
    ):
        result = extract_prescription(b"fake-image-bytes")

    assert result.source == "tesseract_fallback"
    assert result.needs_manual_review is True
    assert result.data.medicamentos == []
    assert "Dipirona 500mg" in result.data.observacoes


def test_extract_prescription_fallback_does_not_raise_when_tesseract_also_fails_ac6():
    with patch(
        "services.prescription.extraction_service.build_genai_client",
        side_effect=RuntimeError("Gemini API indisponível"),
    ), patch(
        "services.prescription.extraction_service.tesseract_extract_text",
        side_effect=RuntimeError("tesseract não instalado"),
    ):
        result = extract_prescription(b"fake-image-bytes")

    assert result.source == "tesseract_fallback"
    assert result.needs_manual_review is True
    assert result.data.medicamentos == []
    assert result.data.observacoes is not None



def test_fallback_logs_the_cause_of_each_failure_ac11(caplog):
    with patch(
        "services.prescription.extraction_service.build_genai_client",
        side_effect=RuntimeError("429 cota"),
    ), patch(
        "services.prescription.extraction_service.tesseract_extract_text",
        side_effect=RuntimeError("sem idioma por"),
    ):
        extract_prescription(b"fake-image-bytes")

    warnings = [r for r in caplog.records if r.levelname == "WARNING"]
    assert [str(r.exc_info[1]) for r in warnings] == ["429 cota", "sem idioma por"]

def test_extract_prescription_falls_back_when_gemini_returns_unparseable_response():
    client = MagicMock()
    response = MagicMock()
    response.parsed = None
    client.models.generate_content.return_value = response

    with patch(
        "services.prescription.extraction_service.build_genai_client",
        return_value=client,
    ), patch(
        "services.prescription.extraction_service.tesseract_extract_text",
        return_value="",
    ):
        result = extract_prescription(b"fake-image-bytes")

    assert result.source == "tesseract_fallback"


def test_pior_caso_do_gemini_cabe_em_25_segundos_ac12():
    # Espera do backoff (tenacity.wait_exponential_jitter): initial * 2^(i-1) + jitter de até 1 s, limitada a max_delay.
    esperas = sum(
        min(gemini_config.GEMINI_RETRY_INITIAL_DELAY * 2**i + 1, gemini_config.GEMINI_RETRY_MAX_DELAY)
        for i in range(gemini_config.GEMINI_EXTRACTION_ATTEMPTS - 1)
    )
    tentativas = gemini_config.GEMINI_EXTRACTION_ATTEMPTS * gemini_config.GEMINI_EXTRACTION_TIMEOUT_MS / 1000

    assert tentativas + esperas <= 25


@pytest.mark.parametrize("modo", ["lento", "503"])
def test_gemini_lento_ou_fora_cai_no_fallback_dentro_do_limite_ac13(modo, monkeypatch):
    chamadas = []

    class FakeGemini(BaseHTTPRequestHandler):
        def do_POST(self):
            chamadas.append(self.path)
            self.rfile.read(int(self.headers["Content-Length"]))
            if modo == "lento":
                time.sleep(2)
            self.send_response(503)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error": {"code": 503, "message": "high demand", "status": "UNAVAILABLE"}}')

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), FakeGemini)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    client = Client(api_key="dummy-key", http_options=types.HttpOptions(base_url=f"http://127.0.0.1:{server.server_port}"))

    monkeypatch.setattr(extraction_service, "GEMINI_EXTRACTION_TIMEOUT_MS", 300)
    monkeypatch.setattr(extraction_service, "GEMINI_RETRY_INITIAL_DELAY", 0.01)
    try:
        with patch(
            "services.prescription.extraction_service.build_genai_client",
            return_value=client,
        ), patch(
            "services.prescription.extraction_service.tesseract_extract_text",
            return_value="",
        ):
            inicio = time.monotonic()
            result = extract_prescription(b"fake-image-bytes")
            duracao = time.monotonic() - inicio
    finally:
        server.shutdown()

    assert result.source == "tesseract_fallback"
    assert len(chamadas) == gemini_config.GEMINI_EXTRACTION_ATTEMPTS
    assert duracao < 2  # sem o timeout, só o modo "lento" já levaria 2 s por tentativa
