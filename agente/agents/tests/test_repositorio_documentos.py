"""Testa o repositório documental e o contexto do assistente — spec: specs/repositorio-documentos.md."""

from unittest.mock import patch

import pytest

from fastapi.testclient import TestClient

from api.main import MAX_UPLOAD_BYTES, app
from services.prescription.extraction_service import (
    ExtractionResult,
    MedicationItem,
    PrescriptionExtraction,
)

ana = TestClient(app, headers={"X-Usuario-Id": "ana"})
bruno = TestClient(app, headers={"X-Usuario-Id": "bruno"})

PDF = b"%PDF-1.7\n" + b"hemograma completo"
JPEG = b"\xff\xd8\xff\xe0" + b"fake-jpeg"


@pytest.fixture(autouse=True)
def db(tmp_path, monkeypatch):
    monkeypatch.setenv("SAFEPASS_DB", str(tmp_path / "test.db"))


def _enviar(cliente, tipo="exame", titulo="Hemograma", data_documento="2026-09-12", conteudo=PDF, **extra):
    return cliente.post(
        "/api/documentos",
        data={"tipo": tipo, "titulo": titulo, "data_documento": data_documento, **extra},
        files={"arquivo": ("documento.pdf", conteudo, "application/pdf")},
    )


def _dependente(cliente, nome="Pedro", parentesco="Filho"):
    return cliente.post("/api/dependentes", json={"nome": nome, "parentesco": parentesco, "data_nascimento": "2018-03-02"}).json()


def _receita_via_ocr(cliente, nome):
    """Foto → extract → confirmação; devolve o documento tipo receita criado."""
    item = MedicationItem(medicamento=nome, dose="500mg", posologia="2x ao dia", periodo="7 dias", confianca=0.95)
    result = ExtractionResult(
        data=PrescriptionExtraction(medicamentos=[item], confianca_geral=0.95, medico="Dr. Carlos", data_receita="2026-09-17"),
        precisa_revisar=False,
        campos_revisar=[],
        origem="gemini",
    )
    with patch("api.main.extract_prescription", return_value=result):
        extracao = cliente.post("/api/prescriptions/extract", files={"file": ("receita.jpg", JPEG, "image/jpeg")}).json()

    cliente.post("/api/prescriptions", json={
        "documento_ocr_id": extracao["documento_ocr_id"],
        "medico": "Dr. Carlos",
        "data_receita": "2026-09-17",
        "medicamentos": [{"medicamento": nome, "dose": "500mg", "posologia": "2x ao dia", "periodo": "7 dias"}],
    })
    return next(d for d in cliente.get("/api/documentos", params={"tipo": "receita"}).json() if d["titulo"] == nome)


def _titulos(cliente, **params):
    return [d["titulo"] for d in cliente.get("/api/documentos", params=params).json()]


def test_requires_user_header_ac1():
    anonimo = TestClient(app)

    for rota in ["/api/documentos", "/api/dependentes", "/api/prescriptions", "/api/medications", "/api/assistente/contexto"]:
        assert anonimo.get(rota).status_code == 401, rota


def test_users_only_see_their_own_data_ac2():
    documento = _enviar(ana).json()
    _dependente(ana)
    _receita_via_ocr(ana, "Amoxicilina")

    for rota in ["/api/documentos", "/api/dependentes", "/api/prescriptions", "/api/medications", "/api/reminders"]:
        assert bruno.get(rota).json() == [], rota
    assert bruno.get(f"/api/documentos/{documento['id']}").status_code == 404
    assert bruno.get(f"/api/documentos/{documento['id']}/arquivo").status_code == 404
    assert bruno.patch(f"/api/documentos/{documento['id']}", json={"titulo": "x"}).status_code == 404
    assert bruno.delete(f"/api/documentos/{documento['id']}").status_code == 404
    assert ana.get(f"/api/documentos/{documento['id']}").json()["titulo"] == "Hemograma"


def test_rejects_dependent_from_another_user_ac3():
    dependente_do_bruno = _dependente(bruno)
    documento = _enviar(ana).json()

    assert _enviar(ana, titulo="Vacina", dependente_id=dependente_do_bruno["id"]).status_code == 404
    patch_resp = ana.patch(f"/api/documentos/{documento['id']}", json={"dependente_id": dependente_do_bruno["id"]})
    assert patch_resp.status_code == 404
    assert _titulos(ana) == ["Hemograma"]
    assert ana.get(f"/api/documentos/{documento['id']}").json()["dependente_id"] is None


def test_download_returns_same_file_ac4():
    documento = _enviar(ana).json()

    arquivo = ana.get(f"/api/documentos/{documento['id']}/arquivo")

    assert arquivo.content == PDF
    assert arquivo.headers["content-type"] == "application/pdf"
    assert (documento["mime_type"], documento["tamanho"]) == ("application/pdf", len(PDF))


def test_filters_by_type_owner_title_and_period_ac5():
    pedro = _dependente(ana)
    _enviar(ana, tipo="exame", titulo="Hemograma", data_documento="2026-09-12")
    _enviar(ana, tipo="vacina", titulo="Influenza", data_documento="2026-09-02", dependente_id=pedro["id"])
    _enviar(ana, tipo="consulta", titulo="Cardiologia", data_documento="2026-08-05")

    assert _titulos(ana) == ["Hemograma", "Influenza", "Cardiologia"]
    assert _titulos(ana, tipo="vacina") == ["Influenza"]
    assert _titulos(ana, dependente_id=pedro["id"]) == ["Influenza"]
    assert _titulos(ana, busca="hemo") == ["Hemograma"]
    assert _titulos(ana, de="2026-09-01") == ["Hemograma", "Influenza"]
    assert _titulos(ana, ate="2026-08-31") == ["Cardiologia"]


def test_ocr_prescription_creates_receipt_document_ac6():
    documento = _receita_via_ocr(ana, "Amoxicilina")

    detalhe = ana.get(f"/api/documentos/{documento['id']}").json()

    assert (detalhe["tipo"], detalhe["data_documento"], detalhe["compartilhado_assistente"]) == ("receita", "2026-09-17", False)
    assert detalhe["dados"]["medicamentos"][0]["medicamento"] == "Amoxicilina"
    assert detalhe["dono"] == {"tipo": "usuario", "id": "ana"}
    assert ana.get(f"/api/documentos/{documento['id']}/arquivo").content == JPEG


def test_context_only_has_shared_documents_ac7():
    compartilhada = _receita_via_ocr(ana, "Amoxicilina")
    _receita_via_ocr(ana, "Dipirona")
    _enviar(ana, titulo="Hemograma")
    ana.patch(f"/api/documentos/{compartilhada['id']}", json={"compartilhado_assistente": True})

    resposta = ana.get("/api/assistente/contexto")

    contexto = resposta.json()
    assert [d["titulo"] for d in contexto["documentos"]] == ["Amoxicilina"]
    assert contexto["documentos"][0]["dados"]["medico"] == "Dr. Carlos"
    assert [m["medicamento"] for m in contexto["medicamentos"]] == ["Amoxicilina"]
    assert [(l["medicamento"], l["horario"]) for l in contexto["lembretes"]] == [("Amoxicilina", "08:00"), ("Amoxicilina", "20:00")]
    assert "Dipirona" not in resposta.text and "Hemograma" not in resposta.text


def test_context_by_dependent_ac8():
    pedro = _dependente(ana)
    vacina = _enviar(ana, tipo="vacina", titulo="Influenza", dependente_id=pedro["id"]).json()
    exame = _enviar(ana, titulo="Hemograma").json()
    for documento in (vacina, exame):
        ana.patch(f"/api/documentos/{documento['id']}", json={"compartilhado_assistente": True})

    documentos = ana.get("/api/assistente/contexto", params={"dependente_id": pedro["id"]}).json()["documentos"]

    assert [d["titulo"] for d in documentos] == ["Influenza"]
    assert documentos[0]["dono"] == {"tipo": "dependente", "id": pedro["id"], "nome": "Pedro", "parentesco": "Filho"}
    assert bruno.get("/api/assistente/contexto", params={"dependente_id": pedro["id"]}).status_code == 404


def test_delete_removes_record_and_file_ac9(tmp_path):
    documento = _enviar(ana).json()
    assert len(list((tmp_path / "arquivos").iterdir())) == 1

    assert ana.delete(f"/api/documentos/{documento['id']}").status_code == 204

    assert ana.get(f"/api/documentos/{documento['id']}").status_code == 404
    assert list((tmp_path / "arquivos").iterdir()) == []


def test_rejects_invalid_files_ec1():
    assert _enviar(ana, conteudo=b"").status_code == 400
    assert _enviar(ana, conteudo=PDF + b"0" * MAX_UPLOAD_BYTES).status_code == 413
    assert _enviar(ana, conteudo=b"GIF89a imagem").status_code == 415
    assert ana.get("/api/documentos").json() == []


def test_rejects_unknown_type_ec2():
    documento = _enviar(ana).json()

    assert _enviar(ana, tipo="raio-x").status_code == 422
    assert ana.patch(f"/api/documentos/{documento['id']}", json={"tipo": "raio-x"}).status_code == 422


def test_dependents_crud_and_cannot_delete_with_documents_ec3():
    pedro = _dependente(ana)
    documento = _enviar(ana, dependente_id=pedro["id"]).json()

    assert ana.patch(f"/api/dependentes/{pedro['id']}", json={"nome": "Pedro Souza"}).json()["nome"] == "Pedro Souza"
    assert ana.delete(f"/api/dependentes/{pedro['id']}").status_code == 409
    ana.delete(f"/api/documentos/{documento['id']}")
    assert ana.delete(f"/api/dependentes/{pedro['id']}").status_code == 204
    assert ana.get("/api/dependentes").json() == []


def test_manual_prescription_document_has_no_file_ec4():
    ana.post("/api/prescriptions", json={
        "medico": None,
        "data_receita": None,
        "medicamentos": [{"medicamento": "Losartana", "dose": "50mg", "posologia": "1x ao dia", "periodo": ""}],
    })

    documento = ana.get("/api/documentos").json()[0]

    assert (documento["tipo"], documento["titulo"]) == ("receita", "Losartana")
    assert ana.get(f"/api/documentos/{documento['id']}/arquivo").status_code == 404
