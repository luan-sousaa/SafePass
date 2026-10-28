# Spec: Cadastro de medicamentos e de vacinas com lembretes

- **Status**: Implementada
- **Autor**: Luan (frente de front-end)
- **Data**: 2026-10-28

## Contexto

Os entregáveis pedem cadastro de medicamentos com posologia e alertas, e registro de
vacinas com lembrete da próxima dose. Hoje medicamento só entra pela receita, nunca
termina (um antibiótico de 7 dias gera lembrete para sempre) e não há vacinas. Esta spec
adiciona o cadastro manual, a vigência dos medicamentos e as vacinas, mantendo
`/api/medications` e `/api/reminders` compatíveis com o front (só ganham campos).

## Requisitos funcionais

- **FR-1**: `POST /api/medications` MUST cadastrar um medicamento manual: `medicamento`,
  `dose`, `posologia`, `inicio` (`AAAA-MM-DD`, padrão hoje), `duracao_dias` (nulo =
  contínuo) e `dependente_id` (nulo = do próprio usuário; 404 se não for dependente dele).
- **FR-2**: `PATCH /api/medications/{id}` MUST editar esses campos e `encerrado_em`
  (`AAAA-MM-DD`): encerrar é gravar a data. Só vale para medicamento manual; o da receita
  segue a receita.
- **FR-3**: `GET /api/medications` MUST listar os manuais e os das receitas, mais recente
  primeiro (por `inicio`), com os campos de antes e mais `id` (nulo nos da receita),
  `origem` (`receita` | `manual`), `dependente_id`, `inicio`, `duracao_dias`,
  `encerrado_em` e `ativo`. No da receita, `inicio` = `data_receita` (ou o dia em que foi
  salva) e `duracao_dias` sai do `periodo` (`"7 dias"` → 7; sem número de dias → nulo).
- **FR-4**: `ativo` MUST ser verdadeiro só se o medicamento não foi encerrado, já começou
  e, tendo duração, `hoje < inicio + duracao_dias`.
- **FR-5**: `GET /api/reminders` MUST trazer um lembrete por horário (calculado por
  `dose_schedule`) só dos medicamentos **ativos**, e um lembrete por vacina com próxima
  dose pendente (FR-7). Cada lembrete ganha `tipo` (`medicamento` | `vacina`), `data`
  (`AAAA-MM-DD` da próxima dose; nulo em medicamento) e `dependente_id`; em vacina,
  `medicamento` traz o nome da vacina e `horario` é nulo.
- **FR-6**: A API MUST expor `GET/POST /api/vacinas` (filtro `dependente_id`) e
  `GET/PATCH/DELETE /api/vacinas/{id}`: `nome`, `dose` (ex.: "2ª dose"),
  `data_aplicacao`, `proxima_dose` (opcional), `dependente_id`, `documento_id` (opcional,
  documento do mesmo usuário) e `compartilhado_assistente` (começa `false`). Dependente
  ou documento de outro usuário → 404.
- **FR-7**: Uma vacina tem próxima dose pendente se `proxima_dose` existe e não há registro
  posterior da mesma vacina (mesmo `nome`, mesmo dono). Registrar a dose seguinte apaga o
  lembrete; atrasada continua aparecendo.
- **FR-8**: `GET /api/assistente/contexto` MUST trazer `vacinas` só com
  `compartilhado_assistente = true` (e do dependente, se `dependente_id` vier). O flag é
  da própria vacina, não do documento ligado: vacina pode não ter documento, e é a regra
  mais simples. Os lembretes do contexto seguem FR-4 (só medicamentos ativos).
- **FR-9**: Apagar um documento ligado a uma vacina MUST manter a vacina (sem o
  documento). Dependente com medicamentos ou vacinas não pode ser apagado (409).

## Interface / contrato

```sql
CREATE TABLE medicamento (
    id INTEGER PRIMARY KEY, usuario_id TEXT NOT NULL,
    dependente_id INTEGER REFERENCES dependente(id),
    medicamento TEXT NOT NULL, dose TEXT NOT NULL DEFAULT '', posologia TEXT NOT NULL DEFAULT '',
    inicio TEXT NOT NULL, duracao_dias INTEGER, encerrado_em TEXT, criado_em TEXT NOT NULL
);
CREATE TABLE vacina (
    id INTEGER PRIMARY KEY, usuario_id TEXT NOT NULL,
    dependente_id INTEGER REFERENCES dependente(id),
    nome TEXT NOT NULL, dose TEXT NOT NULL DEFAULT '',
    data_aplicacao TEXT NOT NULL, proxima_dose TEXT,
    documento_id INTEGER REFERENCES documento(id) ON DELETE SET NULL,
    compartilhado_assistente INTEGER NOT NULL DEFAULT 0, criado_em TEXT NOT NULL
);
```

```
POST  /api/medications        {"medicamento", "dose", "posologia", "inicio"?, "duracao_dias"?, "dependente_id"?} → 201
PATCH /api/medications/{id}   parcial, inclui "encerrado_em"
GET   /api/medications        [{..., "id", "origem", "dependente_id", "inicio", "duracao_dias", "encerrado_em", "ativo"}]
GET   /api/reminders          [{"tipo", "medicamento", "dose", "periodo", "horario" | null, "data" | null, "dependente_id"}]
GET|POST /api/vacinas?dependente_id= · GET|PATCH|DELETE /api/vacinas/{id}
GET   /api/assistente/contexto → {..., "vacinas": [...]}
```

## Critérios de aceite

- **AC-1** (FR-1, FR-3): Dado um medicamento manual cadastrado para um dependente, quando
  `GET /api/medications`, então ele vem com `origem="manual"`, o `dependente_id`, os
  horários de `dose_schedule` e `ativo=true`.
- **AC-2** (FR-2, FR-4, FR-5): Dado um medicamento manual ativo, quando é encerrado,
  então fica `ativo=false` e some de `/api/reminders`; quando é editado (posologia),
  então os horários mudam.
- **AC-3** (FR-3, FR-4, FR-5): Dada uma receita de "5 dias" de 10 dias atrás e outra de
  hoje, quando os lembretes são pedidos, então só a de hoje gera lembrete, e
  `/api/medications` mostra a antiga com `ativo=false`.
- **AC-4** (FR-4): Medicamento contínuo (`duracao_dias` nulo) segue ativo; com `inicio`
  no futuro ainda não está ativo.
- **AC-5** (FR-6): Dadas vacinas do usuário e de um dependente, quando listadas com e sem
  `dependente_id`, então voltam as certas; vacina de outro usuário dá 404.
- **AC-6** (FR-5, FR-7): Dada uma vacina com `proxima_dose`, quando os lembretes são
  pedidos, então aparece um lembrete `tipo="vacina"` com `data` = `proxima_dose`; quando
  a dose seguinte é registrada, então o lembrete some.
- **AC-7** (FR-8): Dadas uma vacina compartilhada e outra não, quando o contexto é
  pedido, então só a compartilhada aparece.
- **AC-8** (FR-6, FR-9): Dada uma vacina ligada a um documento, quando o documento é
  apagado, então a vacina continua, com `documento_id` nulo.

## Casos de borda

- **EC-1** (FR-1, FR-6): `dependente_id` ou `documento_id` de outro usuário → 404, nada
  gravado.
- **EC-2** (FR-2): `PATCH` de medicamento inexistente ou de outro usuário → 404.
- **EC-3** (FR-1, FR-6): `medicamento`/`nome` vazio ou `duracao_dias` < 1 → 422.
- **EC-4** (FR-9): `DELETE` de dependente com medicamento ou vacina → 409.

## Fora de escopo

- **Encerrar ou editar medicamento da receita**: segue a receita (corrigir é refazer a
  receita). Só o manual é editável.
- **Medicamento manual no contexto do assistente**: não tem consentimento próprio ainda;
  entra quando houver um flag como o da vacina.
- **Horário da 1ª dose escolhido pelo usuário**: `dose_schedule` começa às 08:00.
- **Calendário vacinal automático** (sugerir a próxima dose pela idade): o usuário informa.
- **Notificação push/e-mail**: os lembretes são listados; disparar é outra frente.
