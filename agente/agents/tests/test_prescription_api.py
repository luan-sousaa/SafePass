"""Testa api/main.py — spec: specs/prescription-api.md."""

from unittest.mock import patch

import pytest

from fastapi.testclient import TestClient

from api.main import MAX_UPLOAD_BYTES, app
from services.prescription.extraction_service import (
    ExtractionResult,
    MedicationItem,
    PrescriptionExtraction,
)

client = TestClient(app)

JPEG = b"\xff\xd8\xff\xe0" + b"fake-jpeg"
PNG = b"\x89PNG\r\n\x1a\n" + b"fake-png"
URL = "/api/prescriptions/extract"


def _result(medicamentos, needs_review=False, origem="gemini", observacoes=None, **extra):
    return ExtractionResult(
        data=PrescriptionExtraction(medicamentos=medicamentos, confianca_geral=0.95, observacoes=observacoes, **extra),
        precisa_revisar=needs_review,
        campos_revisar=[],
        origem=origem,
    )


def _item(nome, confianca):
    return MedicationItem(medicamento=nome, dose="500mg", posologia="1 cp 8/8h", periodo="5 dias", confianca=confianca)


def test_returns_extracted_medications_ac1():
    with patch("api.main.extract_prescription", return_value=_result([_item("Dipirona", 0.95)])) as service:
        response = client.post(URL, files={"file": ("receita.jpg", JPEG, "image/jpeg")})

    assert response.status_code == 200
    body = response.json()
    assert body["origem"] == "gemini"
    assert body["precisa_revisar"] is False
    assert body["medicamentos"][0]["medicamento"] == "Dipirona"
    service.assert_called_once_with(JPEG, mime_type="image/jpeg")


def test_flags_low_confidence_items_without_exposing_numbers_ac2():
    result = _result([_item("Dipirona", 0.3), _item("Amoxicilina", 0.99)], needs_review=True)

    with patch("api.main.extract_prescription", return_value=result):
        response = client.post(URL, files={"file": ("receita.jpg", JPEG, "image/jpeg")})

    medicamentos = response.json()["medicamentos"]
    assert [m["precisa_revisar"] for m in medicamentos] == [True, False]
    assert "confianca" not in response.text


def test_fallback_is_a_successful_response_ac3():
    result = _result([], needs_review=True, origem="tesseract", observacoes="Dipirona 500mg")

    with patch("api.main.extract_prescription", return_value=result):
        response = client.post(URL, files={"file": ("receita.jpg", JPEG, "image/jpeg")})

    assert response.status_code == 200
    body = response.json()
    assert body["origem"] == "tesseract"
    assert body["medicamentos"] == []
    assert body["observacoes"] == "Dipirona 500mg"


def test_rejects_non_image_even_if_declared_as_png_ac4():
    with patch("api.main.extract_prescription") as service:
        response = client.post(URL, files={"file": ("receita.png", b"%PDF-1.7 fake", "image/png")})

    assert response.status_code == 415
    service.assert_not_called()


def test_detects_mime_type_from_content_not_header_ac5():
    with patch("api.main.extract_prescription", return_value=_result([])) as service:
        response = client.post(URL, files={"file": ("receita", PNG, "application/octet-stream")})

    assert response.status_code == 200
    service.assert_called_once_with(PNG, mime_type="image/png")


def test_rejects_empty_file_ec1():
    with patch("api.main.extract_prescription") as service:
        response = client.post(URL, files={"file": ("vazio.jpg", b"", "image/jpeg")})

    assert response.status_code == 400
    service.assert_not_called()


def test_rejects_file_over_size_limit_ec2():
    with patch("api.main.extract_prescription") as service:
        response = client.post(URL, files={"file": ("grande.jpg", JPEG + b"0" * MAX_UPLOAD_BYTES, "image/jpeg")})

    assert response.status_code == 413
    service.assert_not_called()


def test_requires_file_field_ec3():
    response = client.post(URL)

    assert response.status_code == 422


@pytest.fixture(autouse=True)  # o extract também grava (documento_ocr)
def db(tmp_path, monkeypatch):
    monkeypatch.setenv("SAFEPASS_DB", str(tmp_path / "test.db"))


def test_returns_doctor_and_date_ac6():
    result = _result([_item("Dipirona", 0.95)], medico="Dr. Carlos Mendes", data_receita="2026-09-17")

    with patch("api.main.extract_prescription", return_value=result):
        body = client.post(URL, files={"file": ("receita.jpg", JPEG, "image/jpeg")}).json()

    assert body["medico"] == "Dr. Carlos Mendes"
    assert body["data_receita"] == "2026-09-17"


RECEITA = {
    "medico": "Dr. Carlos Mendes",
    "data_receita": "2026-09-17",
    "medicamentos": [{"medicamento": "Dipirona", "dose": "500mg", "posologia": "1 cp 8/8h", "periodo": "5 dias"}],
}


def test_saves_and_lists_newest_first_ac7(db):
    primeira = client.post("/api/prescriptions", json=RECEITA)
    segunda = client.post("/api/prescriptions", json={**RECEITA, "medico": None})

    assert primeira.status_code == segunda.status_code == 201
    lista = client.get("/api/prescriptions").json()
    assert [r["id"] for r in lista] == [segunda.json()["id"], primeira.json()["id"]]
    assert lista[1]["medicamentos"] == RECEITA["medicamentos"]
    assert lista[1]["criado_em"]


def test_rejects_prescription_without_medications_ec4(db):
    assert client.post("/api/prescriptions", json={**RECEITA, "medicamentos": []}).status_code == 422
    vazio = {**RECEITA, "medicamentos": [{**RECEITA["medicamentos"][0], "medicamento": " "}]}
    assert client.post("/api/prescriptions", json=vazio).status_code == 422
    assert client.get("/api/prescriptions").json() == []


def test_lists_medications_with_schedule_ac8(db):
    receita = client.post("/api/prescriptions", json=RECEITA).json()

    meds = client.get("/api/medications").json()

    assert meds == [{
        "receita_id": receita["id"],
        "medico": "Dr. Carlos Mendes",
        "data_receita": "2026-09-17",
        **RECEITA["medicamentos"][0],
        "horarios": ["08:00", "16:00", "00:00"],
    }]


def test_lists_one_reminder_per_dose_time_ac9(db):
    client.post("/api/prescriptions", json={**RECEITA, "medicamentos": [
        {"medicamento": "Amoxicilina", "dose": "500mg", "posologia": "2x ao dia", "periodo": "7 dias"},
        {"medicamento": "Dipirona", "dose": "500mg", "posologia": "se necessário", "periodo": ""},
    ]})

    lembretes = client.get("/api/reminders").json()

    assert [(r["medicamento"], r["horario"]) for r in lembretes] == [("Amoxicilina", "08:00"), ("Amoxicilina", "20:00")]
