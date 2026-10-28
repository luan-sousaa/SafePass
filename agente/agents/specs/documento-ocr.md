# Spec: Registro da leitura (`documento_ocr`) com status e origem

- **Status**: Implementada
- **Autor**: Luan (frente de front-end)
- **Data**: 2026-10-28

## Contexto

A devolutiva da entrega parcial (Bloco 4, prioridade 2) pediu um único comportamento
para a falha do OCR, refletido no modelo de dados (status, fila), e os mesmos nomes de
campo no prompt, na API e no documento. O código já tinha um fluxo só (Gemini falha →
Tesseract → preenchimento manual), mas nada era gravado antes da confirmação e a tabela
`receitas` não dizia de onde veio a leitura. Esta spec cria o registro de cada leitura,
separando o que a IA extraiu do que o usuário confirmou.

## Requisitos funcionais

- **FR-1**: Toda receita salva MUST ter um registro em `documento_ocr`, que guarda
  separados o que a IA extraiu (`extraido`) e o que o usuário confirmou (`confirmado`).
- **FR-2**: `status` MUST ser `processando` → `revisao` → `confirmado`. Não existe
  status de erro nem modo de espera: falha do Gemini vira leitura com
  `origem="tesseract"` em `revisao`, e o usuário preenche os campos à mão.
- **FR-3**: `origem` MUST ser `gemini`, `tesseract` (Gemini falhou, só texto bruto) ou
  `manual` (usuário digitou sem enviar foto).
- **FR-4**: `POST /api/prescriptions/extract` MUST criar o registro em `processando`
  antes de chamar o OCR e, ao terminar, passá-lo para `revisao` com `origem`,
  `extraido` (incluindo a `confianca` de cada item), `confianca` (= `confianca_geral`) e
  `campos_revisar`. A resposta MUST trazer `documento_ocr_id`. Registro que ficou em
  `processando` é leitura interrompida (o processo caiu no meio): é a fila do que não
  terminou.
- **FR-5**: `POST /api/prescriptions` com `documento_ocr_id` MUST, numa única transação,
  gravar `confirmado`, mudar o status para `confirmado` e criar a receita ligada ao
  registro (`receitas.documento_ocr_id`). Se qualquer passo falhar, nada muda.
- **FR-6**: `POST /api/prescriptions` sem `documento_ocr_id` (preenchimento manual) MUST
  criar, na mesma transação da receita, um registro com `origem="manual"`,
  `status="confirmado"`, `extraido` e `confianca` nulos.
- **FR-7**: `confianca` e `campos_revisar` ficam só no banco; a API continua sem expor
  número de confiança (spec `prescription-api`, FR-4).
- **FR-8**: Os nomes MUST ser os mesmos no prompt de OCR, no serviço, na API e nas
  specs: `confianca` (por medicamento), `confianca_geral` (receita), `precisa_revisar`,
  `campos_revisar` e `origem`. Saem `confidence`, `confidence_geral`,
  `needs_manual_review`, `low_confidence_fields`, `source` e `"tesseract_fallback"`.

## Interface / contrato

```sql
-- repositories/prescription_store.py (SQLite; a frente de Dados leva para o PostgreSQL)
CREATE TABLE documento_ocr (
    id INTEGER PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('processando', 'revisao', 'confirmado')),
    origem TEXT CHECK (origem IN ('gemini', 'tesseract', 'manual')),  -- nulo em processando
    confianca REAL,                          -- confianca_geral; nulo em manual
    campos_revisar TEXT NOT NULL DEFAULT '[]',  -- JSON: medicamentos abaixo do limiar
    extraido TEXT,                           -- JSON: o que a IA leu
    confirmado TEXT,                         -- JSON: o que o usuário salvou
    criado_em TEXT NOT NULL,
    confirmado_em TEXT
);
receitas.documento_ocr_id INTEGER REFERENCES documento_ocr(id)
```

```
POST /api/prescriptions/extract
200 {"documento_ocr_id": int, "origem": "gemini" | "tesseract", "precisa_revisar": bool, ...}

POST /api/prescriptions
{"documento_ocr_id": int | null, "medico": ..., "data_receita": ..., "medicamentos": [...]}
201 {"id": int, "criado_em": str, "documento_ocr_id": int, ...}
409 documento inexistente ou que não está em revisão (corpo: {"detail": str})
```

## Critérios de aceite

- **AC-1** (FR-4): Dado que o OCR está rodando, quando o registro é consultado, então
  ele está em `processando`.
- **AC-2** (FR-3, FR-4): Dada uma leitura do Gemini com um item abaixo do limiar, quando
  a extração termina, então o registro está em `revisao`, com `origem="gemini"`,
  `confianca` = `confianca_geral`, `campos_revisar` com o nome do item e `extraido` com
  os medicamentos (e a `confianca` de cada um); a resposta traz o `documento_ocr_id`.
- **AC-3** (FR-2, FR-3): Dado que o Gemini falhou e o Tesseract leu o texto bruto,
  quando a extração termina, então o registro está em `revisao` com
  `origem="tesseract"` e o texto bruto em `extraido.observacoes`.
- **AC-4** (FR-5): Dado um registro em `revisao`, quando o usuário confirma com o
  `documento_ocr_id`, então o registro vai para `confirmado` com o corpo enviado em
  `confirmado`, mantém a `origem`, e a receita criada aponta para ele.
- **AC-5** (FR-6): Dado um `POST` sem `documento_ocr_id`, quando salvo, então a receita
  aponta para um registro novo com `origem="manual"` e `status="confirmado"`.
- **AC-6** (FR-5): Dado um registro em `revisao`, quando a gravação da receita falha,
  então o registro continua em `revisao`, sem `confirmado`, e nenhuma receita é criada.

## Casos de borda

- **EC-1** (FR-5): `documento_ocr_id` inexistente ou já `confirmado` → 409, nada salvo.
- **EC-2**: Banco SQLite criado antes desta spec (sem `documento_ocr_id` em `receitas`)
  → a coluna é adicionada ao abrir o banco; receitas antigas ficam com o campo nulo.
- **EC-3** (FR-2): Usuário abandona a revisão, ou o Gemini devolve lista vazia e o front
  pede outra foto → o registro fica em `revisao`. Não é erro.

## Fora de escopo

- **PostgreSQL, migrações e índices**: frente de Dados. Aqui é SQLite com JSON em
  coluna, como as receitas já eram (spec `prescription-api`, FR-9).
- **Usuário dono do registro**: `usuario_id` desde 2026-10-28 (spec `repositorio-documentos`);
  o dependente fica no `documento`.
- **Reprocessar ou listar a fila** (`processando`/`revisao`): nenhuma tela precisa ainda.
- ~~Guardar a foto~~: feito em 2026-10-28 (spec `repositorio-documentos`, FR-8): o
  registro guarda `arquivo`, `mime_type` e `tamanho`, e a confirmação cria o `documento`.
