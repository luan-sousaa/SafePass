"""Testa o registro da leitura (documento_ocr) — spec: specs/documento-ocr.md."""

import json
import sqlite3
from unittest.mock import patch

import pytest

from fastapi.testclient import TestClient

from api.main import app
from repositories import prescription_store
from services.prescription.extraction_service import (
    ExtractionResult,
    MedicationItem,
    PrescriptionExtraction,
)

client = TestClient(app)

JPEG = b"\xff\xd8\xff\xe0" + b"fake-jpeg"
URL = "/api/prescriptions/extract"
RECEITA = {
    "medico": "Dr. Carlos Mendes",
    "data_receita": "2026-09-17",
    "medicamentos": [{"medicamento": "Dipirona", "dose": "500mg", "posologia": "1 cp 8/8h", "periodo": "5 dias"}],
}


@pytest.fixture(autouse=True)
def db(tmp_path, monkeypatch):
    monkeypatch.setenv("SAFEPASS_DB", str(tmp_path / "test.db"))


def _documento(documento_ocr_id=None):
    """Registro pelo id, ou o mais recente."""
    with prescription_store._connect() as conn:
        row = conn.execute(
            "SELECT * FROM documento_ocr WHERE id = coalesce(?, (SELECT max(id) FROM documento_ocr))",
            (documento_ocr_id,),
        ).fetchone()
    return dict(row)


def _gemini(confianca=0.95):
    item = MedicationItem(medicamento="Dipirona", dose="500mg", posologia="1 cp 8/8h", periodo="5 dias", confianca=confianca)
    return ExtractionResult(
        data=PrescriptionExtraction(medicamentos=[item], confianca_geral=0.4),
        precisa_revisar=True,
        campos_revisar=["Dipirona"],
        origem="gemini",
    )


def _extrair(result):
    with patch("api.main.extract_prescription", return_value=result):
        return client.post(URL, files={"file": ("receita.jpg", JPEG, "image/jpeg")}).json()


def test_document_is_processing_while_ocr_runs_ac1():
    status_durante_ocr = []

    def ocr(*args, **kwargs):
        status_durante_ocr.append(_documento()["status"])
        return _gemini()

    with patch("api.main.extract_prescription", side_effect=ocr):
        client.post(URL, files={"file": ("receita.jpg", JPEG, "image/jpeg")})

    assert status_durante_ocr == ["processando"]


def test_gemini_reading_goes_to_review_ac2():
    body = _extrair(_gemini(confianca=0.3))

    doc = _documento(body["documento_ocr_id"])
    assert (doc["status"], doc["origem"], doc["confianca"]) == ("revisao", "gemini", 0.4)
    assert json.loads(doc["campos_revisar"]) == ["Dipirona"]
    assert json.loads(doc["extraido"])["medicamentos"][0]["confianca"] == 0.3
    assert doc["confirmado"] is None


def test_tesseract_fallback_goes_to_review_ac3():
    result = ExtractionResult(
        data=PrescriptionExtraction(medicamentos=[], confianca_geral=0.0, observacoes="Dipirona 500mg"),
        precisa_revisar=True,
        campos_revisar=[],
        origem="tesseract",
    )

    doc = _documento(_extrair(result)["documento_ocr_id"])

    assert (doc["status"], doc["origem"]) == ("revisao", "tesseract")
    assert json.loads(doc["extraido"])["observacoes"] == "Dipirona 500mg"


def test_confirming_links_prescription_to_document_ac4():
    documento_ocr_id = _extrair(_gemini())["documento_ocr_id"]

    response = client.post("/api/prescriptions", json={**RECEITA, "documento_ocr_id": documento_ocr_id})

    assert response.status_code == 201
    doc = _documento(documento_ocr_id)
    assert (doc["status"], doc["origem"]) == ("confirmado", "gemini")
    assert json.loads(doc["confirmado"])["medicamentos"] == RECEITA["medicamentos"]
    assert doc["confirmado_em"]
    assert client.get("/api/prescriptions").json()[0]["documento_ocr_id"] == documento_ocr_id


def test_manual_entry_creates_confirmed_manual_document_ac5():
    receita = client.post("/api/prescriptions", json=RECEITA).json()

    doc = _documento(receita["documento_ocr_id"])
    assert (doc["status"], doc["origem"], doc["extraido"], doc["confianca"]) == ("confirmado", "manual", None, None)


def test_failed_save_leaves_document_in_review_ac6():
    documento_ocr_id = _extrair(_gemini())["documento_ocr_id"]
    with prescription_store._connect() as conn:  # faz a gravação da receita falhar no próprio banco
        conn.execute("CREATE TRIGGER falha BEFORE INSERT ON receitas BEGIN SELECT RAISE(ABORT, 'falha'); END")

    with pytest.raises(sqlite3.Error):
        client.post("/api/prescriptions", json={**RECEITA, "documento_ocr_id": documento_ocr_id})

    doc = _documento(documento_ocr_id)
    assert (doc["status"], doc["confirmado"]) == ("revisao", None)
    assert client.get("/api/prescriptions").json() == []


def test_rejects_unknown_or_confirmed_document_ec1():
    documento_ocr_id = _extrair(_gemini())["documento_ocr_id"]
    client.post("/api/prescriptions", json={**RECEITA, "documento_ocr_id": documento_ocr_id})

    assert client.post("/api/prescriptions", json={**RECEITA, "documento_ocr_id": documento_ocr_id}).status_code == 409
    assert client.post("/api/prescriptions", json={**RECEITA, "documento_ocr_id": 999}).status_code == 409
    assert len(client.get("/api/prescriptions").json()) == 1


def test_adds_link_column_to_old_database_ec2(tmp_path):
    with sqlite3.connect(tmp_path / "test.db") as conn:  # schema de antes desta spec
        conn.execute(
            "CREATE TABLE receitas ("
            "id INTEGER PRIMARY KEY, medico TEXT, data_receita TEXT, criado_em TEXT NOT NULL, medicamentos TEXT NOT NULL)"
        )
        conn.execute(
            "INSERT INTO receitas (medico, data_receita, criado_em, medicamentos) VALUES (NULL, NULL, '2026-10-18', ?)",
            (json.dumps(RECEITA["medicamentos"]),),
        )

    client.post("/api/prescriptions", json=RECEITA)

    assert [r["documento_ocr_id"] is None for r in client.get("/api/prescriptions").json()] == [False, True]
