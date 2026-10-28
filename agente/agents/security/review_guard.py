import re

from config.confidence_config import CONFIDENCE_THRESHOLD

_SUSPICIOUS_PATTERNS = [
    re.compile(r"ignor[ae]\s+(as\s+)?instru", re.IGNORECASE),
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"system\s*prompt", re.IGNORECASE),
    re.compile(r"you\s+are\s+now", re.IGNORECASE),
    re.compile(r"a\s+partir\s+de\s+agora\s+voc[eê]\s+[ée]", re.IGNORECASE),
    re.compile(r"disregard\s+(the\s+)?above", re.IGNORECASE),
]


def contains_prompt_injection(text: str) -> bool:
    """Detecta texto que parece instrução embutida (ex.: adversária, escrita na própria receita)."""
    if not text:
        return False

    return any(pattern.search(text) for pattern in _SUSPICIOUS_PATTERNS)


def apply_hitl_guard(extraction):
    """
    Aplica a política de HITL como segurança sobre o resultado bruto do modelo:
    não confia no self-report de confiança — zera a confiança de item suspeito e
    força precisa_revisar sempre que houver suspeita ou confiança abaixo do limiar.

    Retorna (precisa_revisar: bool, campos_revisar: list[str]).
    """
    campos_revisar: list[str] = []
    forced_review = False

    for index, item in enumerate(extraction.medicamentos):
        campos = " ".join(
            filter(None, [item.medicamento, item.dose, item.posologia, item.periodo])
        )

        if contains_prompt_injection(campos):
            item.confianca = 0.0
            forced_review = True

        label = item.medicamento or f"item_{index}"

        if item.confianca < CONFIDENCE_THRESHOLD:
            campos_revisar.append(label)

    precisa_revisar = (
        forced_review
        or extraction.confianca_geral < CONFIDENCE_THRESHOLD
        or bool(campos_revisar)
        or not extraction.medicamentos
    )

    return precisa_revisar, campos_revisar
