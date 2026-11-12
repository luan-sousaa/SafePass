import os
from typing import Optional

DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
GENERATION_TEMPERATURE = float(os.getenv("GEMINI_TEMPERATURE", "0.1"))

# Sem isso, o SDK do google-genai NÃO tenta de novo em erro nenhum (nem 503 de alta
# demanda, que é quase sempre transitório) — cai fora na primeira falha.
GEMINI_RETRY_ATTEMPTS = int(os.getenv("GEMINI_RETRY_ATTEMPTS", "3"))
GEMINI_RETRY_INITIAL_DELAY = float(os.getenv("GEMINI_RETRY_INITIAL_DELAY", "1"))
GEMINI_RETRY_MAX_DELAY = float(os.getenv("GEMINI_RETRY_MAX_DELAY", "8"))

# Só a extração (spec prescription-extraction, FR-10): cada tentativa tem no máximo
# GEMINI_EXTRACTION_TIMEOUT_MS; com um modelo só, ele é tentado GEMINI_EXTRACTION_ATTEMPTS
# vezes (spec gemini-model-fallback, FR-4).
GEMINI_EXTRACTION_TIMEOUT_MS = int(os.getenv("GEMINI_EXTRACTION_TIMEOUT_MS", "10000"))
GEMINI_EXTRACTION_ATTEMPTS = int(os.getenv("GEMINI_EXTRACTION_ATTEMPTS", "2"))

# Teto da cadeia inteira de modelos (spec gemini-model-fallback, FR-5): é ele que garante os
# 25 s do FR-10, para o fallback Tesseract responder bem antes dos 60 s em que o front desiste.
GEMINI_EXTRACTION_BUDGET_MS = int(os.getenv("GEMINI_EXTRACTION_BUDGET_MS", "25000"))


def parse_model_list(raw: Optional[str], default: str) -> list[str]:
    """CSV de GEMINI_MODELS em lista ordenada; vazio ou só vírgulas -> [default] (FR-1)."""
    models = [model.strip() for model in (raw or "").split(",") if model.strip()]
    return models or [default]


# Sem GEMINI_MODELS, só o GEMINI_MODEL de sempre. A lista sugerida fica no .env.example.
GEMINI_MODELS = parse_model_list(os.getenv("GEMINI_MODELS"), DEFAULT_MODEL)
