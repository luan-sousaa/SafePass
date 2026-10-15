"""Testa api/main.py — spec: specs/prescription-api.md."""

from unittest.mock import patch

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


def _result(medicamentos, needs_review=False, source="gemini", observacoes=None):
    return ExtractionResult(
        data=PrescriptionExtraction(medicamentos=medicamentos, confidence_geral=0.95, observacoes=observacoes),
        needs_manual_review=needs_review,
        low_confidence_fields=[],
        source=source,
    )


def _item(nome, confidence):
    return MedicationItem(medicamento=nome, dose="500mg", posologia="1 cp 8/8h", periodo="5 dias", confidence=confidence)


def test_returns_extracted_medications_ac1():
    with patch("api.main.extract_prescription", return_value=_result([_item("Dipirona", 0.95)])) as service:
        response = client.post(URL, files={"file": ("receita.jpg", JPEG, "image/jpeg")})

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "gemini"
    assert body["needs_manual_review"] is False
    assert body["medicamentos"][0]["medicamento"] == "Dipirona"
    service.assert_called_once_with(JPEG, mime_type="image/jpeg")


def test_flags_low_confidence_items_without_exposing_numbers_ac2():
    result = _result([_item("Dipirona", 0.3), _item("Amoxicilina", 0.99)], needs_review=True)

    with patch("api.main.extract_prescription", return_value=result):
        response = client.post(URL, files={"file": ("receita.jpg", JPEG, "image/jpeg")})

    medicamentos = response.json()["medicamentos"]
    assert [m["precisa_revisar"] for m in medicamentos] == [True, False]
    assert "confidence" not in response.text


def test_fallback_is_a_successful_response_ac3():
    result = _result([], needs_review=True, source="tesseract_fallback", observacoes="Dipirona 500mg")

    with patch("api.main.extract_prescription", return_value=result):
        response = client.post(URL, files={"file": ("receita.jpg", JPEG, "image/jpeg")})

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "tesseract_fallback"
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
