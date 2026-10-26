import re

PRIMEIRA_DOSE_HORA = 8  # ponytail: 1ª dose fixa às 08:00; vira campo quando o usuário puder escolher

_CONDICIONAL = re.compile(r"(?<![-\w])se\s|\bsos\b", re.IGNORECASE)
_INTERVALO = re.compile(r"(\d+)\s*/\s*\d+\s*h|cada\s+(\d+)\s*h|de\s+(\d+)\s+em\s+\d+\s*h", re.IGNORECASE)
_POR_DIA = re.compile(r"(\d+|uma|duas|tr[eê]s|quatro)\s*(?:x|vez(?:es)?)\s*(?:ao|por)\s*dia", re.IGNORECASE)
_NUMEROS = {"uma": 1, "duas": 2, "tres": 3, "três": 3, "quatro": 4}


def horarios(posologia: str) -> list[str]:
    """Horários "HH:MM" das doses do dia, calculados da posologia (spec prescription-api, FR-12).

    Posologia condicional ou sem frequência reconhecível devolve [] — não inventa horário.
    """
    if _CONDICIONAL.search(posologia):
        return []

    if m := _INTERVALO.search(posologia):
        intervalo = int(next(g for g in m.groups() if g))
    elif m := _POR_DIA.search(posologia):
        vezes = _NUMEROS.get(m.group(1).lower()) or int(m.group(1))
        intervalo = 24 // vezes if 0 < vezes <= 24 else 0
    else:
        return []

    if not 0 < intervalo <= 24:
        return []
    return [f"{(PRIMEIRA_DOSE_HORA + h) % 24:02d}:00" for h in range(0, 24, intervalo)]
