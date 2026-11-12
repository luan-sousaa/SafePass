# Spec: Fallback entre modelos Gemini antes do Tesseract

- **Status**: Implementada (2026-11-12) — aprovada pelo usuário; testes em `tests/test_gemini_model_fallback.py`
- **Autor**: Squad 44 (frente de IA)
- **Data**: 2026-11-12 (portada do protótipo, onde foi implementada em 2026-09-22 e nunca
  chegou a este repositório; adaptada ao FR-10 de `prescription-extraction.md`)
- **Depende de**: `prescription-extraction.md` (FR-4 fallback Tesseract, FR-9 log, FR-10 tempo)

## Contexto

Hoje a extração tenta **um** modelo (`GEMINI_MODEL`) e, se falhar, cai no Tesseract. Um
503 "high demand" é sobrecarga **daquele modelo**, não da chave nem da conta: em
2026-09-21 uma receita manuscrita legível caiu no Tesseract por 503 no
`gemini-flash-latest`, e no teste ao vivo do protótipo outro modelo (`gemini-3.6-flash`)
leu a mesma foto certo. O Tesseract acerta ~27% dos nomes em manuscrito, então cair nele é
revisão manual quase total. Esta spec põe outros modelos Gemini entre o primeiro e o
Tesseract **sem estourar o limite de tempo do FR-10** (o front desiste em 60 s).

## Requisitos funcionais

- **FR-1**: O serviço MUST ler uma lista ordenada de modelos da env `GEMINI_MODELS`
  (separados por vírgula, espaços ignorados). Ausente, vazia ou só vírgulas → `[GEMINI_MODEL]`.
- **FR-2**: `extract_prescription` MUST tentar os modelos na ordem; o primeiro que devolver
  JSON estruturado válido vence e os seguintes não são chamados.
- **FR-3**: A troca para o próximo modelo MUST acontecer só em falha transitória ou de
  disponibilidade: `google.genai.errors.APIError` com código 404, 429, 500, 502, 503 ou 504,
  ou estouro do timeout da tentativa (`httpx.TimeoutException`). Qualquer outra exceção
  (400/401/403, `ValueError` de JSON inválido) MUST ir direto para o Tesseract, porque outro
  modelo provavelmente falharia igual.
- **FR-4**: Cada modelo recebe **uma** tentativa (sem retry do SDK). Se a lista tiver um
  modelo só, ele MUST ser tentado `GEMINI_EXTRACTION_ATTEMPTS` vezes (comportamento atual),
  com espera de `GEMINI_RETRY_INITIAL_DELAY` entre elas. Motivo: com mais de um modelo,
  trocar é melhor que insistir num modelo sobrecarregado.
- **FR-5**: Toda a cadeia de modelos MUST caber num orçamento total
  `GEMINI_EXTRACTION_BUDGET_MS` (padrão 25000, o mesmo teto que o FR-10 já prometia). O
  timeout de cada tentativa MUST ser `min(GEMINI_EXTRACTION_TIMEOUT_MS, tempo restante)`, e
  se restar menos de 1 s nenhuma tentativa nova é feita — vai para o Tesseract.
- **FR-6**: Só depois de esgotar a lista (ou o orçamento) o serviço MUST cair no Tesseract,
  com o comportamento atual (`origem="tesseract"`, `precisa_revisar=True`).
- **FR-7**: Cada tentativa MUST pedir uma chave nova com `next_api_key()` (rotação atual).
- **FR-8**: Cada falha de modelo MUST ser registrada no log (WARNING, com o nome do modelo e
  a exceção), e o modelo que respondeu MUST ser registrado em INFO. Estende o FR-9 da spec
  de extração: sem isso não dá para saber, olhando o log, qual modelo está fora.
- **FR-9**: O resultado MUST guardar internamente qual modelo respondeu
  (`ExtractionResult.modelo: str | None`, `None` no Tesseract). MUST NOT sair na resposta da
  API (`ExtracaoOut`) nem na tool do agente — é detalhe interno, igual à confiança (FR-5 da
  spec de extração).
- **FR-10**: `apply_hitl_guard` e o prompt de extração MUST valer igual para qualquer
  modelo da lista; nenhuma regra é relaxada por causa do modelo usado.

## Interface / contrato

```python
# config/gemini_config.py
GEMINI_MODELS: list[str]                 # de GEMINI_MODELS, ou [DEFAULT_MODEL]
GEMINI_EXTRACTION_BUDGET_MS = int(os.getenv("GEMINI_EXTRACTION_BUDGET_MS", "25000"))
def parse_model_list(raw: str | None, default: str) -> list[str]: ...

# services/prescription/extraction_service.py
class ExtractionResult(BaseModel):
    ...
    modelo: Optional[str] = None         # interno; não vai para ExtracaoOut nem para a tool
```

`.env.example` ganha, comentada, a sugestão validada no protótipo:
`GEMINI_MODELS=gemini-flash-latest,gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash`

## Critérios de aceite

Cliente Gemini mockado (ou servidor HTTP falso, como no AC-13 da spec de extração).

- **AC-1** (FR-1): `parse_model_list("a, b ,c", "x") == ["a","b","c"]`;
  `parse_model_list(None, "x") == ["x"]`; `""` e `" , ,"` → `["x"]`.
- **AC-2** (FR-2): 1º modelo responde ok → 1 chamada só, `modelo` = 1º, `origem="gemini"`.
- **AC-3** (FR-3): 1º modelo dá 503, 2º responde → resultado do 2º, Tesseract não chamado.
- **AC-4** (FR-3): 404, 429 e timeout no 1º modelo também trocam para o 2º.
- **AC-5** (FR-3): `ValueError` (JSON inválido) ou 401/403 no 1º → 2º **não** é chamado,
  cai no Tesseract.
- **AC-6** (FR-6): 503 em todos → `origem="tesseract"`, `modelo is None`, `precisa_revisar=True`.
- **AC-7** (FR-4): lista de 3 modelos, todos 503 → exatamente 3 chamadas (uma por modelo).
  Lista de 1 modelo, 503 → `GEMINI_EXTRACTION_ATTEMPTS` chamadas (AC-13 da extração continua valendo).
- **AC-8** (FR-5): servidor falso lento em todos os modelos, orçamento reduzido (ex.: 1 s)
  com 4 modelos → cai no Tesseract em menos de orçamento + 0,5 s, sem chamar todos os modelos.
- **AC-9** (FR-7): duas tentativas → `next_api_key` chamado duas vezes.
- **AC-10** (FR-8): 503 no 1º e ok no 2º → um WARNING com o nome do 1º e um INFO com o do 2º.
- **AC-11** (FR-9): resposta da rota `/api/prescriptions/extract` e dict da tool não têm
  `modelo`.
- **AC-12** (FR-10): 2º modelo responde com confiança baixa → `precisa_revisar=True`.

## Casos de borda

- **EC-1**: modelo repetido na lista → aceito, sem deduplicar (quem configura decide).
- **EC-2**: todas as chaves em 429 → cada modelo falha, cai no Tesseract (AC-6).
- **EC-3**: Tesseract também falha → comportamento atual, não levanta exceção (AC-6 da extração).
- **EC-4**: com o 503 lento do incidente de 2026-10-26 (~20 s por resposta), o timeout de
  10 s corta cada tentativa: cabem 2 modelos e meio no orçamento de 25 s, e o fallback
  responde em ~25 s, longe dos 60 s do front.

## Mudança em outra spec

`prescription-extraction.md` FR-10/AC-12: o teto de 25 s passa a ser garantido pelo
orçamento total (FR-5 desta spec) em vez da conta `tentativas × timeout + backoff`. O teste
do AC-12 passa a checar `GEMINI_EXTRACTION_BUDGET_MS <= 25000`.

## Fora de escopo

- Outro provedor (OpenAI etc.) ou modelo local melhor que o Tesseract.
- Circuit breaker ("modelo X está fora, pule por N minutos").
- Gravar o modelo usado em `documento_ocr` (pode virar spec própria se o squad quiser métrica).
- Escolher o modelo pela dificuldade da imagem.
