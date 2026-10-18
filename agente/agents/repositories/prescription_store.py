import json
import os
import sqlite3
from datetime import datetime, timezone

# ponytail: SQLite com medicamentos em coluna JSON, só para o front não esperar o banco.
# A frente de banco troca o corpo de `salvar`/`listar` pelo PostgreSQL (spec prescription-api, FR-9).


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(os.getenv("SAFEPASS_DB", "safepass.db"))
    conn.row_factory = sqlite3.Row
    conn.execute(
        "CREATE TABLE IF NOT EXISTS receitas ("
        "id INTEGER PRIMARY KEY, medico TEXT, data_receita TEXT, criado_em TEXT NOT NULL, medicamentos TEXT NOT NULL)"
    )
    return conn


def salvar(receita: dict) -> dict:
    criado_em = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO receitas (medico, data_receita, criado_em, medicamentos) VALUES (?, ?, ?, ?)",
            (receita["medico"], receita["data_receita"], criado_em, json.dumps(receita["medicamentos"], ensure_ascii=False)),
        )
    return {**receita, "id": cur.lastrowid, "criado_em": criado_em}


def listar() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM receitas ORDER BY id DESC").fetchall()
    return [{**dict(row), "medicamentos": json.loads(row["medicamentos"])} for row in rows]
