import json
import os
import sqlite3
from datetime import datetime, timezone

# ponytail: SQLite com medicamentos em coluna JSON, só para o front não esperar o banco.
# A frente de banco troca o corpo destas funções pelo PostgreSQL (spec prescription-api, FR-9).

# Um registro por leitura (spec documento-ocr): processando → revisao → confirmado. Falha do
# OCR não tem status próprio: vira origem "tesseract" em revisão.
_SCHEMA = """
CREATE TABLE IF NOT EXISTS documento_ocr (
    id INTEGER PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('processando', 'revisao', 'confirmado')),
    origem TEXT CHECK (origem IN ('gemini', 'tesseract', 'manual')),
    confianca REAL,
    campos_revisar TEXT NOT NULL DEFAULT '[]',
    extraido TEXT,
    confirmado TEXT,
    criado_em TEXT NOT NULL,
    confirmado_em TEXT
);
CREATE TABLE IF NOT EXISTS receitas (
    id INTEGER PRIMARY KEY, medico TEXT, data_receita TEXT, criado_em TEXT NOT NULL, medicamentos TEXT NOT NULL,
    documento_ocr_id INTEGER REFERENCES documento_ocr(id)
);
"""


class DocumentoIndisponivel(Exception):
    """O documento_ocr não existe ou não está mais em revisão."""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(os.getenv("SAFEPASS_DB", "safepass.db"))
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    try:  # banco criado antes do documento_ocr (spec documento-ocr, EC-2)
        conn.execute("ALTER TABLE receitas ADD COLUMN documento_ocr_id INTEGER REFERENCES documento_ocr(id)")
    except sqlite3.OperationalError:
        pass  # a coluna já existe
    return conn


def _agora() -> str:
    return datetime.now(timezone.utc).isoformat()


def iniciar_documento() -> int:
    with _connect() as conn:
        cur = conn.execute("INSERT INTO documento_ocr (status, criado_em) VALUES ('processando', ?)", (_agora(),))
    return cur.lastrowid


def concluir_extracao(documento_ocr_id: int, origem: str, extraido: dict, confianca: float, campos_revisar: list[str]) -> None:
    with _connect() as conn:
        conn.execute(
            "UPDATE documento_ocr SET status = 'revisao', origem = ?, extraido = ?, confianca = ?, campos_revisar = ? WHERE id = ?",
            (origem, json.dumps(extraido, ensure_ascii=False), confianca, json.dumps(campos_revisar, ensure_ascii=False), documento_ocr_id),
        )


def salvar(receita: dict) -> dict:
    """Confirma o documento_ocr e cria a receita numa transação só (spec documento-ocr, FR-5/FR-6)."""
    criado_em = _agora()
    confirmado = json.dumps({k: receita[k] for k in ("medico", "data_receita", "medicamentos")}, ensure_ascii=False)
    documento_ocr_id = receita.get("documento_ocr_id")

    with _connect() as conn:
        if documento_ocr_id is None:  # preenchimento manual, sem foto
            documento_ocr_id = conn.execute(
                "INSERT INTO documento_ocr (status, origem, confirmado, criado_em, confirmado_em) VALUES ('confirmado', 'manual', ?, ?, ?)",
                (confirmado, criado_em, criado_em),
            ).lastrowid
        elif conn.execute(
            "UPDATE documento_ocr SET status = 'confirmado', confirmado = ?, confirmado_em = ? WHERE id = ? AND status = 'revisao'",
            (confirmado, criado_em, documento_ocr_id),
        ).rowcount == 0:
            raise DocumentoIndisponivel(documento_ocr_id)

        cur = conn.execute(
            "INSERT INTO receitas (medico, data_receita, criado_em, medicamentos, documento_ocr_id) VALUES (?, ?, ?, ?, ?)",
            (receita["medico"], receita["data_receita"], criado_em, json.dumps(receita["medicamentos"], ensure_ascii=False), documento_ocr_id),
        )
    return {**receita, "id": cur.lastrowid, "criado_em": criado_em, "documento_ocr_id": documento_ocr_id}


def listar() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM receitas ORDER BY id DESC").fetchall()
    return [{**dict(row), "medicamentos": json.loads(row["medicamentos"])} for row in rows]
