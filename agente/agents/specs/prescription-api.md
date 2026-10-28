# Spec: API HTTP de extração de receita

- **Status**: Implementada
- **Autor**: Luan (frente de front-end)
- **Data**: 2026-10-14

## Contexto

O front-end React do SAFEpass precisa enviar a foto de uma receita e receber os dados
estruturados para preencher a tela de revisão (RF04/RF05). O agente só roda via
`adk web`, sem API HTTP. Esta spec cobre o endpoint mínimo que expõe
`extraction_service.extract_prescription` — sem passar pelo orquestrador
conversacional, porque a tela de revisão precisa de JSON, não de texto.

## Requisitos funcionais

- **FR-1**: A API MUST expor `POST /api/prescriptions/extract`, recebendo a imagem como
  `multipart/form-data` no campo `file`, e devolver os medicamentos extraídos.
- **FR-2**: A API MUST aceitar só JPEG e PNG, identificados pelo conteúdo do arquivo
  (assinatura de bytes), não pelo `Content-Type` declarado pelo cliente.
- **FR-3**: A API MUST recusar arquivo vazio ou maior que 10 MB sem chamar o Gemini.
- **FR-4**: A API MUST NOT expor `confidence`/`confidence_geral` numéricos. Cada
  medicamento sai com `precisa_revisar: bool` (`confidence < CONFIDENCE_THRESHOLD`,
  já considerando o zeramento do `review_guard`), mantendo a regra do FR-5 da spec
  de extração.
- **FR-5**: A API MUST repassar `needs_manual_review`, `observacoes` e `source`
  (`"gemini"` | `"tesseract_fallback"`), para o front decidir entre tela de revisão e
  preenchimento manual. O fallback é resposta 200, não erro.
- **FR-6** (2026-10-18): A extração MUST devolver também `medico` e `data_receita`
  (`AAAA-MM-DD`), ambos `null` quando não estiverem legíveis, para preencher a tela de
  revisão e o Histórico.
- **FR-7** (2026-10-18): A API MUST expor `POST /api/prescriptions` para salvar a receita
  que o usuário confirmou (médico, data e medicamentos já revisados) e devolver `201` com
  o registro salvo (`id`, `criado_em`).
- **FR-8** (2026-10-18): A API MUST expor `GET /api/prescriptions`, listando as receitas
  salvas da mais recente para a mais antiga.
- **FR-9** (2026-10-18): A persistência MUST ficar isolada em
  `repositories/prescription_store.py` (`salvar`, `listar`). Hoje é SQLite (stdlib) só
  para não bloquear o front; a frente de banco troca o corpo dessas duas funções pelo
  PostgreSQL sem mexer na API.
- **FR-10** (2026-10-23): A API MUST expor `GET /api/medications`, com cada medicamento
  das receitas salvas (mais recente primeiro), junto com `receita_id`, `medico`,
  `data_receita` e `horarios` (lista `"HH:MM"`, ver FR-12).
- **FR-11** (2026-10-23): A API MUST expor `GET /api/reminders`, com um lembrete por
  horário de cada medicamento (`medicamento`, `dose`, `periodo`, `horario`). Medicamento
  sem horário calculável não gera lembrete.
- **FR-12** (2026-10-23): Os horários MUST ser calculados (automação, não predição) a
  partir da posologia **confirmada pelo usuário**, começando às 08:00: `8/8h` ou
  `a cada 8 horas` → intervalo de 8 h; `3x ao dia`/`três vezes ao dia` → 24 h ÷ 3.
  Posologia condicional (`se necessário`, `se dor`, `SOS`) ou sem frequência
  reconhecível MUST devolver `horarios: []` — o sistema não inventa horário.
- **FR-13** (2026-10-28): Posologias sem intervalo, mas com momento do dia ou dose diária
  única, MUST gerar horário fixo: `pela manhã` → 08:00; `à noite`, `pela noite` e `ao
  deitar` → 20:00 (o mesmo horário da 2ª dose de `12/12h`, para não espalhar lembretes);
  `1 cp ao dia`/`por dia` sem número de vezes → uma dose às 08:00. Manhã e noite na mesma
  posologia geram os dois horários. Intervalo (`8/8h`) e `Nx ao dia` continuam tendo
  prioridade; o momento do dia vem antes de `1x ao dia` (`1x ao dia à noite` → 20:00).
  Motivo (teste ponta a ponta de 2026-10-26): `Tomar 01 comprimido pela noite` voltava
  `[]` e a tela mostrava "Conforme necessário", como se fosse uso SOS.

## Interface / contrato

```
POST /api/prescriptions/extract
Content-Type: multipart/form-data   (campo: file)

200 {
  "source": "gemini" | "tesseract_fallback",
  "needs_manual_review": bool,
  "observacoes": str | null,
  "medicamentos": [
    {"medicamento": str, "dose": str, "posologia": str, "periodo": str, "precisa_revisar": bool}
  ]
}
400 arquivo vazio · 413 maior que 10 MB · 415 não é JPEG/PNG   (corpo: {"detail": str})
(o 200 também traz "medico": str | null e "data_receita": "AAAA-MM-DD" | null — FR-6)

POST /api/prescriptions
{"medico": str | null, "data_receita": "AAAA-MM-DD" | null,
 "medicamentos": [{"medicamento": str, "dose": str, "posologia": str, "periodo": str}]}  (mín. 1)
201 {"id": int, "criado_em": str (ISO 8601), ...os campos enviados}
422 sem medicamentos ou medicamento com nome vazio

GET /api/prescriptions
200 [ {mesmo formato do 201}, ... ]   (mais recente primeiro)

GET /api/medications
200 [ {"receita_id": int, "medico": str | null, "data_receita": str | null,
       "medicamento": str, "dose": str, "posologia": str, "periodo": str,
       "horarios": ["08:00", "16:00", "00:00"]}, ... ]

GET /api/reminders
200 [ {"medicamento": str, "dose": str, "periodo": str, "horario": "HH:MM"}, ... ]
```

Rodar (de dentro de `agents/`): `uvicorn api.main:app --reload --port 8000`

## Critérios de aceite

- **AC-1** (FR-1, FR-5): Dada uma imagem JPEG válida e extração bem-sucedida, quando
  enviada ao endpoint, então responde 200 com os medicamentos, `source="gemini"` e
  `needs_manual_review` repassado do serviço.
- **AC-2** (FR-4): Dado um item com `confidence` abaixo do limiar e outro acima, quando
  a resposta sai, então o primeiro vem com `precisa_revisar=true`, o segundo com
  `false`, e nenhum campo `confidence` aparece no JSON.
- **AC-3** (FR-5): Dado que o serviço caiu no fallback offline, quando a resposta sai,
  então é 200 com `source="tesseract_fallback"`, lista vazia e o texto bruto em
  `observacoes`.
- **AC-4** (FR-2): Dado um arquivo que não é JPEG/PNG (mesmo declarado como
  `image/png`), quando enviado, então responde 415 e o serviço não é chamado.
- **AC-5** (FR-2): Dado um PNG declarado com `Content-Type` errado, quando enviado,
  então é aceito e o serviço recebe `mime_type="image/png"`.

- **AC-6** (FR-6): Dada uma extração com médico e data, quando a resposta sai, então
  `medico` e `data_receita` vêm preenchidos.
- **AC-7** (FR-7, FR-8): Dadas duas receitas salvas via `POST`, quando `GET` é chamado,
  então as duas voltam, a última salva primeiro, com `id` e `criado_em`.

- **AC-8** (FR-10, FR-12): Dada uma receita salva com `1 cp 8/8h`, quando `GET
  /api/medications` é chamado, então o medicamento volta com `receita_id` e
  `horarios = ["08:00", "16:00", "00:00"]`.
- **AC-9** (FR-11): Dada uma receita com um medicamento `2x ao dia` e outro `se
  necessário`, quando `GET /api/reminders` é chamado, então voltam 2 lembretes (08:00 e
  20:00), ambos do primeiro medicamento.
- **AC-10** (FR-13): `1 cp ao dia` → `["08:00"]`; `1 comprimido pela manhã` →
  `["08:00"]`; `Tomar 01 comprimido pela noite`, `1 cp à noite` e `1 cp ao deitar` →
  `["20:00"]`; `1 cp pela manhã e 1 à noite` → `["08:00", "20:00"]`; `1x ao dia à noite`
  → `["20:00"]`.

## Casos de borda

- **EC-1** (FR-3): Arquivo vazio → 400, serviço não é chamado.
- **EC-2** (FR-3): Arquivo com mais de 10 MB → 413, serviço não é chamado.
- **EC-3**: Requisição sem o campo `file` → 422 (validação padrão do FastAPI).
- **EC-4** (FR-7): `POST` sem medicamentos ou com nome de medicamento vazio → 422, nada
  é salvo.
- **EC-5** (FR-12): Posologia vazia, condicional (`1 cp 6/6h se dor`) ou com intervalo
  que não cabe em 24 h (`a cada 0 horas`, `a cada 36 horas`) → `horarios: []`.

## Fora de escopo

- **PDF**: o fallback Tesseract não lê PDF; entra numa spec futura se o squad quiser.
- **Banco definitivo** (PostgreSQL, schema normalizado, migrações): frente de banco do
  squad — ver FR-9. Hoje os medicamentos ficam numa coluna JSON.
- **Usuário dono da receita**: entra junto com a autenticação.
- **Chat via orquestrador (`root_agent`)**: o front ainda não precisa; quando precisar,
  avaliar `adk api_server`.
- **CORS e autenticação**: em dev o front usa proxy do Vite (mesma origem); auth entra
  junto com a API de produção do squad.
