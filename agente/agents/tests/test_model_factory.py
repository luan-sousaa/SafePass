"""Testa factories/model_factory.py — spec: specs/prescription-extraction.md (AC-7, EC-3).

model_factory lê as chaves na primeira chave pedida e guarda o round-robin no módulo,
então cada teste que muda GOOGLE_API_KEY(S) precisa recarregar o módulo.
model_factory também chama load_dotenv() no import, que lê o .env real do projeto
(procurando em diretórios acima do cwd) — por isso o mockamos aqui, senão os testes
de "sem chave configurada" ficam reféns do que tiver escrito no .env de verdade.
"""

import importlib

import pytest


def _reload_model_factory(monkeypatch):
    monkeypatch.setattr("dotenv.load_dotenv", lambda *args, **kwargs: False)
    import factories.model_factory as model_factory

    return importlib.reload(model_factory)


def test_next_api_key_round_robins_ac7(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEYS", "k1,k2,k3")
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    model_factory = _reload_model_factory(monkeypatch)

    keys = [model_factory.next_api_key() for _ in range(4)]

    assert keys == ["k1", "k2", "k3", "k1"]


def test_missing_keys_raises_value_error_on_first_key_ec3(monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEYS", raising=False)
    model_factory = _reload_model_factory(monkeypatch)  # importar sem chave não quebra

    with pytest.raises(ValueError):
        model_factory.next_api_key()

    # restaura uma chave válida pra não vazar estado quebrado pros próximos testes
    monkeypatch.setenv("GOOGLE_API_KEY", "test-key-for-pytest")
    _reload_model_factory(monkeypatch)


def test_extraction_without_key_falls_back_to_tesseract_ec3(monkeypatch):
    from unittest.mock import patch

    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEYS", raising=False)
    model_factory = _reload_model_factory(monkeypatch)
    from services.prescription import extraction_service

    monkeypatch.setattr(extraction_service, "next_api_key", model_factory.next_api_key)
    with patch("services.prescription.extraction_service.tesseract_extract_text", return_value="texto"):
        result = extraction_service.extract_prescription(b"fake-image-bytes")

    assert result.origem == "tesseract"

    monkeypatch.setenv("GOOGLE_API_KEY", "test-key-for-pytest")
    _reload_model_factory(monkeypatch)
