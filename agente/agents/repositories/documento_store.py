import contextlib
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Optional

from repositories.database import caminho, connect

# Toda consulta filtra por usuario_id: recurso de outro usuário é tratado como inexistente
# (spec repositorio-documentos, FR-2).

_EXTENSOES = {"image/jpeg": ".jpg", "image/png": ".png", "application/pdf": ".pdf"}


class DependenteComDocumentos(Exception):
    """O dependente ainda tem documentos ligados a ele."""


def _pasta_arquivos() -> str:
    # ponytail: disco local ao lado do banco (fora do git); a frente de Dados troca por armazenamento em nuvem.
    return os.getenv("SAFEPASS_ARQUIVOS") or os.path.join(os.path.dirname(os.path.abspath(caminho())), "arquivos")


def guardar_arquivo(conteudo: bytes, mime_type: str) -> str:
    """Grava com nome gerado (nunca o nome que o cliente mandou) e devolve esse nome."""
    nome = uuid.uuid4().hex + _EXTENSOES[mime_type]
    os.makedirs(_pasta_arquivos(), exist_ok=True)
    with open(caminho_arquivo(nome), "wb") as arquivo:
        arquivo.write(conteudo)
    return nome


def caminho_arquivo(nome: str) -> str:
    return os.path.join(_pasta_arquivos(), nome)


def _atualizar(tabela: str, usuario_id: str, id: int, campos: dict) -> bool:
    """UPDATE parcial; as chaves de `campos` vêm dos modelos da API, não do cliente."""
    if not campos:
        with connect() as conn:
            return conn.execute(f"SELECT 1 FROM {tabela} WHERE id = ? AND usuario_id = ?", (id, usuario_id)).fetchone() is not None
    with connect() as conn:
        cur = conn.execute(
            f"UPDATE {tabela} SET {', '.join(f'{campo} = ?' for campo in campos)} WHERE id = ? AND usuario_id = ?",
            (*campos.values(), id, usuario_id),
        )
    return cur.rowcount > 0


# Dependentes

def listar_dependentes(usuario_id: str) -> list[dict]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM dependente WHERE usuario_id = ? ORDER BY nome", (usuario_id,)).fetchall()
    return [dict(row) for row in rows]


def buscar_dependente(usuario_id: str, dependente_id: int) -> Optional[dict]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM dependente WHERE id = ? AND usuario_id = ?", (dependente_id, usuario_id)).fetchone()
    return dict(row) if row else None


def criar_dependente(usuario_id: str, dependente: dict) -> dict:
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO dependente (usuario_id, nome, parentesco, data_nascimento) VALUES (?, ?, ?, ?)",
            (usuario_id, dependente["nome"], dependente["parentesco"], dependente["data_nascimento"]),
        )
    return buscar_dependente(usuario_id, cur.lastrowid)


def atualizar_dependente(usuario_id: str, dependente_id: int, campos: dict) -> Optional[dict]:
    return buscar_dependente(usuario_id, dependente_id) if _atualizar("dependente", usuario_id, dependente_id, campos) else None


def apagar_dependente(usuario_id: str, dependente_id: int) -> bool:
    try:
        with connect() as conn:
            cur = conn.execute("DELETE FROM dependente WHERE id = ? AND usuario_id = ?", (dependente_id, usuario_id))
    except sqlite3.IntegrityError:  # chave estrangeira de documento.dependente_id
        raise DependenteComDocumentos(dependente_id)
    return cur.rowcount > 0


# Documentos

def _documento(row: sqlite3.Row) -> dict:
    documento = dict(row)
    nome, parentesco = documento.pop("dependente_nome"), documento.pop("dependente_parentesco")
    confirmado = documento.pop("confirmado")
    documento["compartilhado_assistente"] = bool(documento["compartilhado_assistente"])
    documento["dono"] = (
        {"tipo": "usuario", "id": documento["usuario_id"]}
        if documento["dependente_id"] is None
        else {"tipo": "dependente", "id": documento["dependente_id"], "nome": nome, "parentesco": parentesco}
    )
    documento["dados"] = json.loads(confirmado) if confirmado else None  # o que o usuário confirmou no OCR
    return documento


def listar_documentos(
    usuario_id: str,
    id: Optional[int] = None,
    tipo: Optional[str] = None,
    dependente_id: Optional[int] = None,
    busca: Optional[str] = None,
    de: Optional[str] = None,
    ate: Optional[str] = None,
    compartilhados: bool = False,
) -> list[dict]:
    filtros = {
        "d.id = ?": id,
        "d.tipo = ?": tipo,
        "d.dependente_id = ?": dependente_id,
        "d.titulo LIKE ?": f"%{busca}%" if busca else None,
        "d.data_documento >= ?": de,
        "d.data_documento <= ?": ate,
        "d.compartilhado_assistente = ?": 1 if compartilhados else None,
    }
    ativos = {sql: valor for sql, valor in filtros.items() if valor is not None}
    with connect() as conn:
        rows = conn.execute(
            "SELECT d.*, o.confirmado, p.nome AS dependente_nome, p.parentesco AS dependente_parentesco "
            "FROM documento d "
            "LEFT JOIN documento_ocr o ON o.id = d.documento_ocr_id "
            "LEFT JOIN dependente p ON p.id = d.dependente_id "
            f"WHERE {' AND '.join(['d.usuario_id = ?', *ativos])} "
            "ORDER BY d.data_documento DESC, d.id DESC",
            (usuario_id, *ativos.values()),
        ).fetchall()
    return [_documento(row) for row in rows]


def buscar_documento(usuario_id: str, documento_id: int) -> Optional[dict]:
    return next(iter(listar_documentos(usuario_id, id=documento_id)), None)


def criar_documento(usuario_id: str, documento: dict) -> dict:
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO documento (usuario_id, dependente_id, tipo, titulo, data_documento, arquivo, mime_type, tamanho, criado_em) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                usuario_id, documento["dependente_id"], documento["tipo"], documento["titulo"], documento["data_documento"],
                documento["arquivo"], documento["mime_type"], documento["tamanho"], datetime.now(timezone.utc).isoformat(),
            ),
        )
    return buscar_documento(usuario_id, cur.lastrowid)


def atualizar_documento(usuario_id: str, documento_id: int, campos: dict) -> Optional[dict]:
    return buscar_documento(usuario_id, documento_id) if _atualizar("documento", usuario_id, documento_id, campos) else None


def apagar_documento(usuario_id: str, documento_id: int) -> bool:
    documento = buscar_documento(usuario_id, documento_id)
    if documento is None:
        return False
    with connect() as conn:
        conn.execute("DELETE FROM documento WHERE id = ?", (documento_id,))
    if documento["arquivo"]:
        with contextlib.suppress(FileNotFoundError):
            os.remove(caminho_arquivo(documento["arquivo"]))
    return True
