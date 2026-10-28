import os
import sqlite3

# ponytail: SQLite com JSON em coluna, só para o front não esperar o banco.
# A frente de banco troca isto pelo PostgreSQL (spec prescription-api, FR-9).

# documento_ocr: um registro por leitura (spec documento-ocr): processando → revisao → confirmado.
# Falha do OCR não tem status próprio: vira origem "tesseract" em revisão.
# documento/dependente: repositório do usuário (spec repositorio-documentos).
_SCHEMA = """
CREATE TABLE IF NOT EXISTS documento_ocr (
    id INTEGER PRIMARY KEY,
    usuario_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('processando', 'revisao', 'confirmado')),
    origem TEXT CHECK (origem IN ('gemini', 'tesseract', 'manual')),
    confianca REAL,
    campos_revisar TEXT NOT NULL DEFAULT '[]',
    extraido TEXT,
    confirmado TEXT,
    arquivo TEXT, mime_type TEXT, tamanho INTEGER,
    criado_em TEXT NOT NULL,
    confirmado_em TEXT
);
CREATE TABLE IF NOT EXISTS receitas (
    id INTEGER PRIMARY KEY, medico TEXT, data_receita TEXT, criado_em TEXT NOT NULL, medicamentos TEXT NOT NULL,
    documento_ocr_id INTEGER REFERENCES documento_ocr(id),
    usuario_id TEXT
);
CREATE TABLE IF NOT EXISTS dependente (
    id INTEGER PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    parentesco TEXT NOT NULL,
    data_nascimento TEXT
);
CREATE TABLE IF NOT EXISTS documento (
    id INTEGER PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    dependente_id INTEGER REFERENCES dependente(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'exame', 'consulta', 'vacina', 'atestado')),
    titulo TEXT NOT NULL,
    data_documento TEXT,
    arquivo TEXT, mime_type TEXT, tamanho INTEGER,
    documento_ocr_id INTEGER REFERENCES documento_ocr(id),
    compartilhado_assistente INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL
);
"""

# Colunas que chegaram depois da tabela: bancos antigos ganham ao abrir, sem perder dados.
_COLUNAS_NOVAS = [
    ("receitas", "documento_ocr_id INTEGER REFERENCES documento_ocr(id)"),
    ("receitas", "usuario_id TEXT"),
    ("documento_ocr", "usuario_id TEXT"),
    ("documento_ocr", "arquivo TEXT"),
    ("documento_ocr", "mime_type TEXT"),
    ("documento_ocr", "tamanho INTEGER"),
]


def caminho() -> str:
    return os.getenv("SAFEPASS_DB", "safepass.db")


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(caminho())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")  # impede apagar dependente que ainda tem documentos
    conn.executescript(_SCHEMA)
    for tabela, coluna in _COLUNAS_NOVAS:
        try:
            conn.execute(f"ALTER TABLE {tabela} ADD COLUMN {coluna}")
        except sqlite3.OperationalError:
            pass  # a coluna já existe
    return conn
