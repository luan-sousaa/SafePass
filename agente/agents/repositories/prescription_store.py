import json
from datetime import datetime, timezone

from repositories.database import connect as _connect


class DocumentoIndisponivel(Exception):
    """O documento_ocr não existe, é de outro usuário ou não está mais em revisão."""


def _agora() -> str:
    return datetime.now(timezone.utc).isoformat()


def iniciar_documento(usuario_id: str, arquivo: str, mime_type: str, tamanho: int) -> int:
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO documento_ocr (usuario_id, status, arquivo, mime_type, tamanho, criado_em) VALUES (?, 'processando', ?, ?, ?, ?)",
            (usuario_id, arquivo, mime_type, tamanho, _agora()),
        )
    return cur.lastrowid


def concluir_extracao(documento_ocr_id: int, origem: str, extraido: dict, confianca: float, campos_revisar: list[str]) -> None:
    with _connect() as conn:
        conn.execute(
            "UPDATE documento_ocr SET status = 'revisao', origem = ?, extraido = ?, confianca = ?, campos_revisar = ? WHERE id = ?",
            (origem, json.dumps(extraido, ensure_ascii=False), confianca, json.dumps(campos_revisar, ensure_ascii=False), documento_ocr_id),
        )


def salvar(receita: dict, usuario_id: str) -> dict:
    """
    Confirma o documento_ocr e cria a receita e o documento tipo receita numa transação só
    (specs documento-ocr FR-5/FR-6 e repositorio-documentos FR-8).
    """
    criado_em = _agora()
    confirmado = json.dumps({k: receita[k] for k in ("medico", "data_receita", "medicamentos")}, ensure_ascii=False)
    documento_ocr_id = receita.get("documento_ocr_id")

    with _connect() as conn:
        if documento_ocr_id is None:  # preenchimento manual, sem foto
            documento_ocr_id = conn.execute(
                "INSERT INTO documento_ocr (usuario_id, status, origem, confirmado, criado_em, confirmado_em) "
                "VALUES (?, 'confirmado', 'manual', ?, ?, ?)",
                (usuario_id, confirmado, criado_em, criado_em),
            ).lastrowid
        elif conn.execute(
            "UPDATE documento_ocr SET status = 'confirmado', confirmado = ?, confirmado_em = ? "
            "WHERE id = ? AND usuario_id = ? AND status = 'revisao'",
            (confirmado, criado_em, documento_ocr_id, usuario_id),
        ).rowcount == 0:
            raise DocumentoIndisponivel(documento_ocr_id)

        cur = conn.execute(
            "INSERT INTO receitas (usuario_id, medico, data_receita, criado_em, medicamentos, documento_ocr_id) VALUES (?, ?, ?, ?, ?, ?)",
            (usuario_id, receita["medico"], receita["data_receita"], criado_em, json.dumps(receita["medicamentos"], ensure_ascii=False), documento_ocr_id),
        )
        conn.execute(  # a foto da leitura (se houver) vira o arquivo do documento
            "INSERT INTO documento (usuario_id, dependente_id, tipo, titulo, data_documento, arquivo, mime_type, tamanho, documento_ocr_id, criado_em) "
            "SELECT usuario_id, ?, 'receita', ?, ?, arquivo, mime_type, tamanho, id, ? FROM documento_ocr WHERE id = ?",
            (receita.get("dependente_id"), ", ".join(m["medicamento"] for m in receita["medicamentos"]), receita["data_receita"], criado_em, documento_ocr_id),
        )
    return {**receita, "id": cur.lastrowid, "criado_em": criado_em, "documento_ocr_id": documento_ocr_id}


def listar(usuario_id: str) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(  # o dono vem do documento da receita, que o usuário pode mudar depois
            "SELECT r.*, d.dependente_id FROM receitas r LEFT JOIN documento d ON d.documento_ocr_id = r.documento_ocr_id "
            "WHERE r.usuario_id = ? ORDER BY r.id DESC",
            (usuario_id,),
        ).fetchall()
    return [{**dict(row), "medicamentos": json.loads(row["medicamentos"])} for row in rows]
