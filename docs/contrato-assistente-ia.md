# Contrato: documentos do SAFEpass para o Assistente IA

Para o squad do Chat IA. Descreve como ler os documentos que o usuário autorizou o
assistente a analisar. Spec completa: `agente/agents/specs/repositorio-documentos.md`.

## Autenticação

- **Hoje (dev):** toda rota exige o header `X-Usuario-Id: <id do usuário>`. Sem ele: 401.
  Não é seguro: qualquer um se passa por qualquer usuário. Serve só para integrar.
- **Depois:** o header vira `Authorization: Bearer <JWT do grupo LOGIN>`. O resto do
  contrato não muda; só o ponto que identifica o usuário (`usuario_atual`, em
  `agente/agents/api/deps.py`).

## Regra de consentimento

- Cada documento tem `compartilhado_assistente`, que começa `false`. Só o usuário liga,
  documento a documento (`PATCH /api/documentos/{id}`).
- `GET /api/assistente/contexto` devolve **só** documentos compartilhados, e só os
  medicamentos e lembretes de receitas compartilhadas. Nada de documento não
  compartilhado aparece, nem derivado.
- Recurso de outro usuário responde 404, como se não existisse.

## Rota para o assistente

`GET /api/assistente/contexto` — todos os documentos compartilhados da conta (do usuário e
dos dependentes).

`GET /api/assistente/contexto?dependente_id=1` — só os do dependente 1 (404 se não for
dependente do usuário).

Resposta real (usuário `dev` com uma receita lida pelo OCR, uma vacina do filho e um
exame **não** compartilhado, que não aparece):

```json
{
  "documentos": [
    {
      "id": 1,
      "tipo": "receita",
      "titulo": "Amoxicilina",
      "data_documento": "2026-09-17",
      "dono": { "tipo": "usuario", "id": "dev" },
      "dados": {
        "medico": "Dr. Carlos Mendes",
        "data_receita": "2026-09-17",
        "medicamentos": [
          { "medicamento": "Amoxicilina", "dose": "500mg", "posologia": "1 cápsula de 12/12h", "periodo": "7 dias" }
        ]
      }
    },
    {
      "id": 2,
      "tipo": "vacina",
      "titulo": "Influenza 2026",
      "data_documento": "2026-09-02",
      "dono": { "tipo": "dependente", "id": 1, "nome": "Pedro Souza", "parentesco": "Filho" },
      "dados": null
    }
  ],
  "medicamentos": [
    {
      "receita_id": 1, "medico": "Dr. Carlos Mendes", "data_receita": "2026-09-17",
      "medicamento": "Amoxicilina", "dose": "500mg", "posologia": "1 cápsula de 12/12h", "periodo": "7 dias",
      "horarios": ["08:00", "20:00"]
    }
  ],
  "lembretes": [
    { "medicamento": "Amoxicilina", "dose": "500mg", "periodo": "7 dias", "horario": "08:00" },
    { "medicamento": "Amoxicilina", "dose": "500mg", "periodo": "7 dias", "horario": "20:00" }
  ]
}
```

- `dados`: o que o usuário **confirmou** depois do OCR (nunca o chute da IA). Hoje só
  receita tem; os outros tipos vêm `null`.
- `horarios`: calculados da posologia confirmada, a partir das 08:00. Posologia
  condicional ("se necessário") não gera horário.

## Modelo

**dependente**: `id`, `nome`, `parentesco`, `data_nascimento` (`AAAA-MM-DD` ou `null`).
Sempre de um usuário.

**documento**:

| Campo | Tipo | Observação |
|---|---|---|
| `id` | int | |
| `tipo` | `receita` \| `exame` \| `consulta` \| `vacina` \| `atestado` | |
| `titulo` | str | receita do OCR: nomes dos medicamentos |
| `data_documento` | `AAAA-MM-DD` \| null | |
| `dependente_id` | int \| null | `null` = do próprio usuário |
| `dono` | objeto | `{"tipo": "usuario", "id"}` ou `{"tipo": "dependente", "id", "nome", "parentesco"}` |
| `dados` | objeto \| null | dados estruturados confirmados (ver acima) |
| `mime_type`, `tamanho` | str, int | do arquivo original (JPG, PNG ou PDF) |
| `documento_ocr_id` | int \| null | leitura do OCR que originou o documento |
| `compartilhado_assistente` | bool | consentimento |
| `criado_em` | ISO 8601 | |

## Outras rotas úteis

| Rota | Para quê |
|---|---|
| `GET /api/documentos/{id}` | Um documento (mesmo formato da tabela) |
| `GET /api/documentos/{id}/arquivo` | O arquivo original, se o assistente precisar ler a imagem/PDF |
| `GET /api/dependentes` | Lista de dependentes |

O assistente **não** deve usar `GET /api/documentos` (lista tudo, inclusive o que não foi
compartilhado): ela é para as telas do próprio usuário.

## O que ainda não existe

- Login de verdade (JWT): hoje é o header de dev.
- Medicamentos "ativos" pelo período e "próximos" lembretes pelo relógio: hoje vêm todos
  os medicamentos das receitas compartilhadas, com os horários do dia.
- Dados estruturados de exame, consulta, vacina e atestado (só receita passa por OCR).
- Histórico do chat: a API não guarda conversas. Se o assistente precisar, combinamos
  rota e tabela.
- Tela para o usuário ligar o compartilhamento: a rota existe, a tela vem depois.
