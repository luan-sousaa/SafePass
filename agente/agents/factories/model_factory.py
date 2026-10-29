import itertools
import os

from dotenv import load_dotenv

from config.gemini_config import DEFAULT_MODEL
from repositories.custom_gemini import CustomGemini

load_dotenv()

def _load_api_keys() -> list[str]:
    raw = os.getenv("GOOGLE_API_KEYS") or os.getenv("GOOGLE_API_KEY", "")
    keys = [key.strip() for key in raw.split(",") if key.strip()]

    if not keys:
        raise ValueError(
            "Nenhuma chave configurada. Defina GOOGLE_API_KEY ou GOOGLE_API_KEYS (separadas por vírgula) no .env."
        )

    return keys


_key_cycle = None


def next_api_key() -> str:
    """Revezamento round-robin entre as chaves do tier gratuito (plano estudante).

    As chaves são lidas na primeira chamada, não no import: a API sobe sem chave (spec
    prescription-extraction, EC-3).
    """
    global _key_cycle
    if _key_cycle is None:
        _key_cycle = itertools.cycle(_load_api_keys())
    return next(_key_cycle)


def create_model():
    return CustomGemini(api_key=next_api_key(), model=DEFAULT_MODEL)
