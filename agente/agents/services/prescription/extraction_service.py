import logging
import time
from typing import Optional

import httpx
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, Field

from config.gemini_config import (
    GEMINI_EXTRACTION_ATTEMPTS,
    GEMINI_EXTRACTION_BUDGET_MS,
    GEMINI_EXTRACTION_TIMEOUT_MS,
    GEMINI_MODELS,
    GEMINI_RETRY_INITIAL_DELAY,
    GENERATION_TEMPERATURE,
)
from factories.model_factory import next_api_key
from prompts.extract_prescription_prompt import EXTRACT_PRESCRIPTION_PROMPT
from repositories.custom_gemini import build_genai_client
from repositories.tesseract_ocr import extract_text as tesseract_extract_text
from security.review_guard import apply_hitl_guard

logger = logging.getLogger(__name__)


class MedicationItem(BaseModel):
    medicamento: str
    dose: str
    posologia: str
    periodo: str
    confianca: float = Field(ge=0.0, le=1.0)


class PrescriptionExtraction(BaseModel):
    medicamentos: list[MedicationItem]
    confianca_geral: float = Field(ge=0.0, le=1.0)
    observacoes: Optional[str] = None
    medico: Optional[str] = None
    data_receita: Optional[str] = None  # AAAA-MM-DD


class ExtractionResult(BaseModel):
    data: PrescriptionExtraction
    precisa_revisar: bool
    campos_revisar: list[str]
    origem: str = "gemini"
    modelo: Optional[str] = None  # interno (log/debug): não vai para a API nem para a tool


# spec gemini-model-fallback FR-3: só essas falhas são do modelo (fila cheia, cota, fora do
# ar, inexistente) e justificam tentar o próximo. Auth ou JSON inválido falhariam igual.
_MODEL_UNAVAILABLE_CODES = {404, 429, 500, 502, 503, 504}
_MIN_ATTEMPT_MS = 1000  # FR-5: com menos que isso de orçamento, nem vale começar outra tentativa


def _is_model_unavailable(exc: Exception) -> bool:
    if isinstance(exc, httpx.TimeoutException):
        return True
    return isinstance(exc, genai_errors.APIError) and exc.code in _MODEL_UNAVAILABLE_CODES


def extract_prescription(image_bytes: bytes, mime_type: str = "image/jpeg") -> ExtractionResult:
    """
    Envia a foto da receita pro Gemini e devolve os dados estruturados com score de confiança.
    Chamada direta ao modelo multimodal (sem agente ADK por trás) — só extração, nada mais.

    Tenta os modelos de GEMINI_MODELS em ordem, uma vez cada, dentro de um orçamento total
    de tempo (spec gemini-model-fallback). Troca de modelo só em falha de disponibilidade;
    se todos falharem, se o orçamento acabar ou se o erro não for de disponibilidade, cai no
    fallback offline via Tesseract: devolve o texto bruto para revisão manual.
    """
    # FR-4: um modelo só mantém o comportamento antigo (N tentativas no mesmo modelo).
    attempts = GEMINI_MODELS if len(GEMINI_MODELS) > 1 else GEMINI_MODELS * GEMINI_EXTRACTION_ATTEMPTS
    deadline = time.monotonic() + GEMINI_EXTRACTION_BUDGET_MS / 1000

    for i, model in enumerate(attempts):
        if i > 0 and model == attempts[i - 1]:
            time.sleep(GEMINI_RETRY_INITIAL_DELAY)

        remaining_ms = int((deadline - time.monotonic()) * 1000)
        if remaining_ms < _MIN_ATTEMPT_MS:
            logger.warning("Orçamento de tempo do Gemini esgotado antes do modelo %s", model)
            break

        try:
            result = _extract_with_gemini(image_bytes, mime_type, model, min(GEMINI_EXTRACTION_TIMEOUT_MS, remaining_ms))
        except Exception as exc:
            logger.warning("Gemini %s falhou", model, exc_info=True)
            if not _is_model_unavailable(exc):
                break
            continue

        logger.info("Receita lida pelo modelo %s", model)
        return result

    logger.info("Nenhum modelo Gemini respondeu; usando fallback Tesseract")
    return _extract_with_tesseract_fallback(image_bytes)


def _extract_with_gemini(image_bytes: bytes, mime_type: str, model: str, timeout_ms: int) -> ExtractionResult:
    client = build_genai_client(api_key=next_api_key())

    response = client.models.generate_content(
        model=model,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            EXTRACT_PRESCRIPTION_PROMPT,
        ],
        config=types.GenerateContentConfig(
            temperature=GENERATION_TEMPERATURE,
            response_mime_type="application/json",
            response_schema=PrescriptionExtraction,
            # Uma tentativa só, com tempo máximo (FR-10): quem repete ou troca de modelo é o
            # laço de extract_prescription, que controla o orçamento total.
            http_options=types.HttpOptions(
                timeout=timeout_ms,
                retry_options=types.HttpRetryOptions(attempts=1),
            ),
        ),
    )

    extraction: Optional[PrescriptionExtraction] = response.parsed

    if extraction is None:
        raise ValueError("Gemini não retornou um JSON estruturado válido para a receita.")

    precisa_revisar, campos_revisar = apply_hitl_guard(extraction)

    return ExtractionResult(
        data=extraction,
        precisa_revisar=precisa_revisar,
        campos_revisar=campos_revisar,
        origem="gemini",
        modelo=model,
    )


def _extract_with_tesseract_fallback(image_bytes: bytes) -> ExtractionResult:
    try:
        raw_text = tesseract_extract_text(image_bytes)
    except Exception:
        logger.warning("Tesseract falhou; seguindo sem texto bruto", exc_info=True)
        raw_text = ""

    observacoes = (
        f"Leitura automática indisponível no momento. Texto bruto capturado via OCR offline "
        f"(Tesseract) para revisão manual:\n\n{raw_text}"
        if raw_text
        else "Leitura automática indisponível e o OCR offline não conseguiu extrair texto desta imagem."
    )

    # Sem estruturação automática nesse caminho: confiar em regex/heurística pra separar
    # medicamento/dose/posologia/período do texto bruto do Tesseract arriscaria dado errado
    # sem um LLM pra validar — melhor devolver vazio e revisão manual obrigatória (RF05).
    extraction = PrescriptionExtraction(medicamentos=[], confianca_geral=0.0, observacoes=observacoes)

    return ExtractionResult(
        data=extraction,
        precisa_revisar=True,
        campos_revisar=[],
        origem="tesseract",
    )
