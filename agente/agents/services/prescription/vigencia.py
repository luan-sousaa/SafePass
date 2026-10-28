import re
from datetime import date, timedelta
from typing import Optional

_DURACAO = re.compile(r"(\d+)\s*(dia|semana)", re.IGNORECASE)


def duracao_dias(periodo: str) -> Optional[int]:
    """Dias de tratamento escritos no período da receita ("7 dias", "2 semanas"); None se não houver."""
    if m := _DURACAO.search(periodo or ""):
        return int(m.group(1)) * (7 if m.group(2).lower() == "semana" else 1)
    return None


def ativo(inicio: str, duracao: Optional[int], encerrado_em: Optional[str], hoje: Optional[date] = None) -> bool:
    """Já começou, não foi encerrado e, tendo duração, ainda não venceu (spec medicamentos-vacinas, FR-4)."""
    hoje = hoje or date.today()
    comeco = date.fromisoformat(inicio)
    return (
        comeco <= hoje
        and (encerrado_em is None or date.fromisoformat(encerrado_em) > hoje)
        and (duracao is None or hoje < comeco + timedelta(days=duracao))
    )
