from typing import Optional

from repositories.database import agora, atualizar, connect

# Medicamentos manuais e vacinas (spec medicamentos-vacinas). Toda consulta filtra por
# usuario_id: registro de outro usuário é tratado como inexistente.


def _listar(tabela: str, usuario_id: str, ordem: str, filtros: dict, condicoes: tuple[str, ...] = ()) -> list[dict]:
    ativos = {sql: valor for sql, valor in filtros.items() if valor is not None}
    with connect() as conn:
        rows = conn.execute(
            f"SELECT * FROM {tabela} v WHERE {' AND '.join(['v.usuario_id = ?', *ativos, *condicoes])} ORDER BY {ordem}",
            (usuario_id, *ativos.values()),
        ).fetchall()
    return [dict(row) for row in rows]


def _criar(tabela: str, usuario_id: str, campos: dict) -> int:
    campos = {**campos, "usuario_id": usuario_id, "criado_em": agora()}
    with connect() as conn:
        cur = conn.execute(
            f"INSERT INTO {tabela} ({', '.join(campos)}) VALUES ({', '.join('?' for _ in campos)})",
            tuple(campos.values()),
        )
    return cur.lastrowid


# Medicamentos manuais

def listar_medicamentos(usuario_id: str, id: Optional[int] = None) -> list[dict]:
    return _listar("medicamento", usuario_id, "v.inicio DESC, v.id DESC", {"v.id = ?": id})


def criar_medicamento(usuario_id: str, medicamento: dict) -> dict:
    return listar_medicamentos(usuario_id, _criar("medicamento", usuario_id, medicamento))[0]


def atualizar_medicamento(usuario_id: str, medicamento_id: int, campos: dict) -> Optional[dict]:
    return listar_medicamentos(usuario_id, medicamento_id)[0] if atualizar("medicamento", usuario_id, medicamento_id, campos) else None


# Vacinas

_PENDENTE = (
    "v.proxima_dose IS NOT NULL",
    "NOT EXISTS (SELECT 1 FROM vacina d WHERE d.usuario_id = v.usuario_id AND d.nome = v.nome "
    "AND d.dependente_id IS v.dependente_id AND d.data_aplicacao > v.data_aplicacao)",
)


def listar_vacinas(
    usuario_id: str,
    id: Optional[int] = None,
    dependente_id: Optional[int] = None,
    compartilhadas: bool = False,
    pendentes: bool = False,
) -> list[dict]:
    """`pendentes`: com próxima dose e sem registro posterior da mesma vacina para o mesmo dono (FR-7)."""
    vacinas = _listar("vacina", usuario_id, "v.data_aplicacao DESC, v.id DESC", {
        "v.id = ?": id,
        "v.dependente_id = ?": dependente_id,
        "v.compartilhado_assistente = ?": 1 if compartilhadas else None,
    }, _PENDENTE if pendentes else ())
    return [{**v, "compartilhado_assistente": bool(v["compartilhado_assistente"])} for v in vacinas]


def buscar_vacina(usuario_id: str, vacina_id: int) -> Optional[dict]:
    return next(iter(listar_vacinas(usuario_id, id=vacina_id)), None)


def criar_vacina(usuario_id: str, vacina: dict) -> dict:
    return buscar_vacina(usuario_id, _criar("vacina", usuario_id, vacina))


def atualizar_vacina(usuario_id: str, vacina_id: int, campos: dict) -> Optional[dict]:
    return buscar_vacina(usuario_id, vacina_id) if atualizar("vacina", usuario_id, vacina_id, campos) else None


def apagar_vacina(usuario_id: str, vacina_id: int) -> bool:
    with connect() as conn:
        return conn.execute("DELETE FROM vacina WHERE id = ? AND usuario_id = ?", (vacina_id, usuario_id)).rowcount > 0
