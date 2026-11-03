# Spec: Notificações dos medicamentos

- **Status**: Aprovada
- **Autor**: Luan
- **Data**: 2026-11-02

## Contexto

Hoje o aviso do remédio da receita começa na data da receita (não quando o paciente começa
a tomar), a 1ª dose é sempre às 08:00, o remédio da receita não pode ser encerrado e o
sistema não sabe se a dose foi tomada. Esta spec fecha essas regras, aprovadas pelo squad
em 02/11. Aviso com o app fechado (service worker + push) fica fora.

## Requisitos funcionais

- **FR-1**: Cada medicamento da receita MUST aceitar, no `POST /api/prescriptions`, os
  campos opcionais `inicio` (`AAAA-MM-DD`) e `primeira_dose` (`HH:MM`). Sem eles vale o
  dia em que a receita foi salva e `08:00`. O `inicio` deixa de vir da `data_receita`.
  Receitas antigas, salvas sem esses campos, seguem a regra antiga.
- **FR-2**: `horarios(posologia, primeira_dose="08:00")` MUST começar o intervalo pela
  `primeira_dose` ("8/8h" com 1ª dose às 15:00 → 15:00, 23:00, 07:00). Momentos fixos
  ("pela manhã", "à noite") continuam nos horários de FR-15 da prescription-api.
- **FR-3**: O medicamento manual MUST aceitar `primeira_dose` no `POST` e no `PATCH`
  (padrão `08:00`).
- **FR-4**: `PATCH /api/prescriptions/{id}/medicamentos/{indice}` MUST gravar
  `encerrado_em` (`AAAA-MM-DD`; nulo reabre) num medicamento da receita. `indice` é a
  posição na lista da receita. Receita ou índice de outro usuário/inexistente → 404.
  Pausar = encerrar e reabrir depois.
- **FR-5**: Todo medicamento MUST ter `ref` estável: `"r{receita_id}-{indice}"` na receita,
  `"m{id}"` no manual. Vem em `/api/medications` e em cada lembrete de medicamento.
- **FR-6**: `POST /api/doses` `{"ref", "data", "horario"}` MUST registrar a dose como
  tomada (idempotente: repetir não duplica). `ref` que não é do usuário → 404.
  `DELETE /api/doses` com o mesmo corpo desfaz.
- **FR-7**: Cada lembrete de medicamento em `/api/reminders` MUST trazer `ref`,
  `tomada` (dose de hoje naquele horário já registrada) e `ultimo_dia` (hoje é o último
  dia do tratamento; falso em uso contínuo).
- **FR-8**: O front MUST, na confirmação da receita, pedir data e hora da 1ª dose de cada
  medicamento (padrão: hoje, próxima hora cheia). Se o `periodo` não tiver número de dias,
  MUST perguntar "Por quantos dias?" ou "Uso contínuo"; uso contínuo grava o `periodo`
  "uso contínuo" (sem duração = avisa até encerrar).
- **FR-9**: O aviso no horário MUST ter o botão "Tomei" (registra FR-6). Sem resposta,
  MUST avisar de novo uma única vez 15 minutos depois. Dose já `tomada` não avisa.
- **FR-10**: No `ultimo_dia`, o aviso MUST dizer "Seu tratamento termina hoje".
- **FR-11**: A tela de medicamentos MUST permitir encerrar e reabrir também o medicamento
  da receita (FR-4).
- **FR-12**: Posologia condicional ("se necessário") ou sem frequência diária ("1x por
  semana") MUST NOT avisar; aparece só na lista (regra atual mantida).

## Interface / contrato

```sql
CREATE TABLE dose_tomada (
    id INTEGER PRIMARY KEY, usuario_id TEXT NOT NULL,
    ref TEXT NOT NULL, data TEXT NOT NULL, horario TEXT NOT NULL, tomada_em TEXT NOT NULL,
    UNIQUE (usuario_id, ref, data, horario)
);
ALTER TABLE medicamento ADD COLUMN primeira_dose TEXT;
-- receita: inicio, primeira_dose e encerrado_em ficam em cada item do JSON receitas.medicamentos
```

```
POST   /api/prescriptions   medicamentos[]: {..., "inicio"?, "primeira_dose"?}
PATCH  /api/prescriptions/{id}/medicamentos/{indice}   {"encerrado_em": "AAAA-MM-DD" | null}
POST   /api/medications     {..., "primeira_dose"?}    PATCH idem
GET    /api/medications     [{..., "ref", "primeira_dose"}]
GET    /api/reminders       [{..., "ref", "tomada", "ultimo_dia"}]   (vacina: ref null, tomada false, ultimo_dia false)
POST   /api/doses           {"ref", "data", "horario"} → 201
DELETE /api/doses           {"ref", "data", "horario"} → 204
```

## Critérios de aceite

- **AC-1** (FR-1, FR-2): Dada uma receita salva com "8/8h por 7 dias", `inicio` hoje e
  `primeira_dose` 15:00, quando `GET /api/reminders`, então os horários são 15:00, 23:00 e
  07:00.
- **AC-2** (FR-1): Dada uma receita com `data_receita` de 10 dias atrás, "5 dias", salva
  hoje sem `inicio`, então o medicamento está ativo (começa hoje, não na data da receita).
- **AC-3** (FR-4): Dado um medicamento de receita ativo, quando encerrado, então some dos
  lembretes e fica `ativo=false`; quando reaberto (`null`), volta.
- **AC-4** (FR-6, FR-7): Dada uma dose registrada para hoje às 15:00, então o lembrete das
  15:00 vem `tomada=true` e os outros `false`; repetir o `POST` não duplica; `DELETE`
  volta para `false`.
- **AC-5** (FR-7): Dado um tratamento de 7 dias que começou há 6 dias, então
  `ultimo_dia=true`; em uso contínuo, `false`.
- **AC-6** (FR-4, FR-6): `ref` ou receita de outro usuário → 404.
- **AC-7** (FR-3): Medicamento manual com `primeira_dose` 21:00 e "12/12h" → 21:00 e 09:00.

## Casos de borda

- **EC-1**: `primeira_dose` fora do formato `HH:MM` → 422.
- **EC-2**: `indice` fora da lista da receita → 404.
- **EC-3**: Receita antiga sem `inicio`/`primeira_dose` no JSON: `inicio` pela regra
  antiga (`data_receita` ou dia salvo), 1ª dose 08:00.
- **EC-4**: Dose das 23:00 registrada depois da meia-noite: o front manda a `data` do
  horário avisado, não a data atual.

## Fora do escopo

- Aviso com o app fechado (service worker + push).
- Histórico/relatório de adesão na tela (os dados ficam em `dose_tomada`).
