# Spec: Repositório documental por usuário e dependente + contexto do assistente

- **Status**: Implementada
- **Autor**: Luan (frente de front-end)
- **Data**: 2026-10-28

## Contexto

Os entregáveis do desafio pedem um repositório documental individual (upload, captura,
download, classificação, organização e consulta), com cada documento associado ao
usuário ou a um dependente. O squad do Chat IA precisa ler os dados estruturados desses
documentos, só dos que o usuário autorizou. O serviço de login (outro grupo) ainda não
existe, então o usuário vem de um header de desenvolvimento, num ponto único que depois
troca pela validação do JWT.

## Requisitos funcionais

- **FR-1**: Toda rota da API MUST identificar o usuário por uma única dependência
  (`usuario_atual`). Hoje ela lê o header `X-Usuario-Id` (só para dev) e responde 401
  sem ele; quando o grupo LOGIN entregar, só essa função troca para validar o JWT.
- **FR-2**: `receitas`, `documento_ocr`, `dependente` e `documento` MUST ter
  `usuario_id`. Cada rota MUST ler e gravar só dados do usuário atual; recurso de outro
  usuário responde 404, como se não existisse.
- **FR-3**: A API MUST expor `GET/POST /api/dependentes` e `PATCH/DELETE
  /api/dependentes/{id}` (`nome`, `parentesco`, `data_nascimento`). Dependente com
  documentos não pode ser apagado (409).
- **FR-4**: `POST /api/documentos` (multipart: `arquivo`, `tipo`, `titulo`,
  `data_documento`, `dependente_id` opcional) MUST guardar o arquivo em disco, fora do
  git, com nome gerado, e registrar `mime_type` e `tamanho`. Aceita JPEG, PNG e PDF, até
  10 MB, detectados pelo conteúdo. `tipo` ∈ `receita`, `exame`, `consulta`, `vacina`,
  `atestado`. `dependente_id` nulo = documento do próprio usuário.
- **FR-5**: `GET /api/documentos` MUST listar os documentos do usuário (mais recente
  primeiro), com filtros opcionais `tipo`, `dependente_id`, `busca` (no título) e
  período `de`/`ate` (sobre `data_documento`).
- **FR-6**: `GET /api/documentos/{id}` MUST devolver o documento com o dono e, quando
  ele veio do OCR, os dados estruturados (`dados` = `confirmado` do `documento_ocr`).
  `GET /api/documentos/{id}/arquivo` MUST devolver o arquivo original.
- **FR-7**: `PATCH /api/documentos/{id}` MUST permitir mudar `tipo`, `titulo`,
  `data_documento`, `dependente_id` e `compartilhado_assistente`. `DELETE` MUST apagar o
  registro e o arquivo.
- **FR-8**: A foto enviada ao `POST /api/prescriptions/extract` MUST ser guardada, e a
  confirmação da receita MUST criar, na mesma transação, um `documento` tipo `receita`
  ligado ao `documento_ocr` (sem arquivo quando o preenchimento foi manual).
- **FR-9**: `compartilhado_assistente` MUST começar `false`. `GET
  /api/assistente/contexto` MUST devolver só documentos compartilhados (todos do usuário,
  ou só os do dependente se `dependente_id` vier), com tipo, data, dono e dados
  estruturados, mais os medicamentos e lembretes **das receitas compartilhadas**. Nada
  derivado de documento não compartilhado aparece.

## Interface / contrato

```sql
CREATE TABLE dependente (
    id INTEGER PRIMARY KEY, usuario_id TEXT NOT NULL,
    nome TEXT NOT NULL, parentesco TEXT NOT NULL, data_nascimento TEXT
);
CREATE TABLE documento (
    id INTEGER PRIMARY KEY, usuario_id TEXT NOT NULL,
    dependente_id INTEGER REFERENCES dependente(id),          -- nulo = do próprio usuário
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'exame', 'consulta', 'vacina', 'atestado')),
    titulo TEXT NOT NULL, data_documento TEXT,
    arquivo TEXT, mime_type TEXT, tamanho INTEGER,            -- nome gerado no disco
    documento_ocr_id INTEGER REFERENCES documento_ocr(id),
    compartilhado_assistente INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL
);
-- e usuario_id TEXT em receitas e documento_ocr; arquivo/mime_type/tamanho em documento_ocr
```

```
Todas as rotas: header X-Usuario-Id (401 sem ele)

GET    /api/documentos?tipo=&dependente_id=&busca=&de=&ate=
POST   /api/documentos            multipart → 201 documento
GET    /api/documentos/{id}       → documento + "dono" + "dados"
GET    /api/documentos/{id}/arquivo
PATCH  /api/documentos/{id}       JSON parcial → documento
DELETE /api/documentos/{id}       → 204
GET|POST /api/dependentes · PATCH|DELETE /api/dependentes/{id}
GET    /api/assistente/contexto?dependente_id=
```

O formato completo de cada resposta está em `docs/contrato-assistente-ia.md`.

## Critérios de aceite

- **AC-1** (FR-1): Dada uma requisição sem `X-Usuario-Id`, quando chega a qualquer rota,
  então responde 401.
- **AC-2** (FR-2): Dados documentos, dependentes e receitas dos usuários A e B, quando A
  lista documentos, dependentes, receitas, medicamentos e lembretes, então só vê os seus;
  e quando A pede `GET`/`PATCH`/`DELETE` de um documento de B, então recebe 404.
- **AC-3** (FR-2, FR-4): Dado um dependente de B, quando A envia um documento ou faz
  `PATCH` com esse `dependente_id`, então recebe 404 e nada é gravado.
- **AC-4** (FR-4, FR-6): Dado um PDF enviado, quando A baixa o arquivo, então recebe os
  mesmos bytes e o mesmo `Content-Type`.
- **AC-5** (FR-5): Dados documentos de tipos, donos, títulos e datas diferentes, quando
  A filtra por cada um, então só voltam os que batem.
- **AC-6** (FR-8): Dada uma foto lida pelo OCR, quando a receita é confirmada, então
  existe um documento `receita` com o arquivo da foto, título com os medicamentos,
  `data_documento` = `data_receita` e `dados` = o que o usuário confirmou.
- **AC-7** (FR-9): Dado um documento compartilhado e outro não (cada um de uma receita),
  quando o contexto é pedido, então só o compartilhado aparece, e só os medicamentos e
  lembretes da receita dele.
- **AC-8** (FR-9): Dado `dependente_id` no contexto, então só os documentos
  compartilhados daquele dependente aparecem, com `dono` = nome e parentesco.
- **AC-9** (FR-7): Dado um documento, quando é apagado, então o registro e o arquivo
  somem.

## Casos de borda

- **EC-1** (FR-4): Arquivo vazio → 400; acima de 10 MB → 413; nem JPEG, PNG nem PDF →
  415. Nada é gravado.
- **EC-2** (FR-4, FR-7): `tipo` fora da lista → 422.
- **EC-3** (FR-3): `DELETE` de dependente com documentos → 409, nada apagado.
- **EC-4** (FR-6): Documento sem arquivo (receita digitada à mão) →
  `GET .../arquivo` responde 404.
- **EC-5** (FR-2): Receitas e leituras gravadas antes desta spec não têm dono
  (`usuario_id` nulo) → não aparecem para ninguém.
- **EC-6** (FR-7): Apagar o documento de uma receita não apaga a receita: os
  medicamentos continuam até existir rota própria para isso.

## Fora de escopo

- **Login de verdade (JWT)**: grupo LOGIN; aqui só o ponto único de troca (FR-1).
- **Medicamentos "ativos" pelo período e lembretes "próximos" pelo relógio**: o contexto
  devolve todos os medicamentos das receitas compartilhadas, com os horários do dia.
- **OCR de exames, consultas e vacinas**: só receita tem dados estruturados.
- **PostgreSQL, índices e armazenamento de arquivos em nuvem**: frente de Dados.
- **Telas do front**: outro agente, a partir de `docs/contrato-assistente-ia.md`.
