# Contrato: SAFEpass para o Assistente IA

Do Squad 44 (SAFEpass) para o squad do Chat IA. Responde ao pedido de vocês:

1. Acesso aos dados estruturados dos documentos que o usuário envia.
2. Associação bem definida entre documento e usuário/dependente.
3. O usuário autorizar o assistente a analisar os documentos dele.

Tudo abaixo já está na `main` e foi testado chamando a API. Este arquivo é a referência
da integração: quando algo mudar na API, ele é atualizado no mesmo PR.

- Specs: `agente/agents/specs/repositorio-documentos.md` e `agente/agents/specs/medicamentos-vacinas.md`

## Resumo

Vocês só precisam de uma rota:

```
GET /api/assistente/contexto
GET /api/assistente/contexto?dependente_id=<id>
```

Ela devolve, do usuário autenticado, **somente o que ele autorizou**: documentos com os
dados estruturados confirmados, medicamentos ativos, lembretes e vacinas. Cada item diz de
quem é (o próprio usuário ou qual dependente).

## Como rodar a API localmente

Requisitos: Python 3.11+. Tesseract com idioma português só se forem testar o OCR.

```bash
git clone https://github.com/luan-sousaa/SafePass.git
cd SafePass/agente/agents
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
cp ../.env.example .env        # GOOGLE_API_KEY é opcional: sem ela a API sobe e o OCR usa só o Tesseract
.venv/bin/uvicorn api.main:app --port 8000
```

- Base: `http://localhost:8000/api`
- Documentação interativa: `http://localhost:8000/docs`
- Front (opcional, para criar dados pela tela): na raiz, `npm install && npm run dev` → `http://localhost:8443`

## Autenticação

| Quando | Como |
|---|---|
| Hoje (desenvolvimento) | Header `X-Usuario-Id: <id do usuário>` em toda chamada. Sem ele: **401** |
| Depois do login (grupo LOGIN) | `Authorization: Bearer <JWT>`. Só muda o header; rotas e respostas continuam iguais |

O header de dev não é seguro (qualquer um se passa por qualquer usuário). Serve só para
integrarmos enquanto o login não existe. Usem o mesmo id de usuário que o grupo LOGIN for
gerar (o `sub` do token), assim nada muda quando o JWT entrar.

## Associação documento → usuário/dependente

- Todo documento pertence a um usuário (`usuario_id`, vem da autenticação).
- `dependente_id` nulo = documento do próprio usuário; preenchido = documento de um
  dependente desse usuário.
- Na resposta, o campo `dono` já vem resolvido:
  - `{"tipo": "usuario", "id": "maria"}`
  - `{"tipo": "dependente", "id": 1, "nome": "Pedro", "parentesco": "filho"}`
- Medicamentos, lembretes e vacinas trazem `dependente_id` com a mesma regra.
- Recurso de outro usuário responde **404**, como se não existisse.

## Consentimento

- Cada documento tem `compartilhado_assistente`, que **começa desligado**. O usuário liga
  documento por documento na tela Documentos ("Compartilhar com o assistente").
- Vacina tem o próprio `compartilhado_assistente`, também começando desligado.
- O contexto traz só o que está compartilhado, inclusive o que é derivado: medicamentos e
  lembretes aparecem apenas se vierem de uma receita compartilhada.
- **Não usem `GET /api/documentos`** no assistente: ela lista tudo, inclusive o que não foi
  compartilhado. É a rota das telas do próprio usuário.

## Resposta real

Usuária `maria`, com o filho Pedro como dependente. A receita do Pedro está compartilhada; o
exame dela (Hemograma) não está, então não aparece.

```
GET /api/assistente/contexto?dependente_id=1
X-Usuario-Id: maria
```

```json
{
  "documentos": [
    {
      "id": 1,
      "tipo": "receita",
      "titulo": "Amoxicilina",
      "data_documento": "2026-10-27",
      "dono": {"tipo": "dependente", "id": 1, "nome": "Pedro", "parentesco": "filho"},
      "dados": {
        "medico": "Dra. Ana Lima",
        "data_receita": "2026-10-27",
        "medicamentos": [
          {"medicamento": "Amoxicilina", "dose": "250mg", "posologia": "5 ml de 8/8h", "periodo": "7 dias"}
        ]
      }
    }
  ],
  "medicamentos": [
    {
      "id": null, "origem": "receita", "receita_id": 1,
      "medico": "Dra. Ana Lima", "data_receita": "2026-10-27",
      "medicamento": "Amoxicilina", "dose": "250mg", "posologia": "5 ml de 8/8h", "periodo": "7 dias",
      "horarios": ["08:00", "16:00", "00:00"],
      "dependente_id": 1, "inicio": "2026-10-27", "duracao_dias": 7, "encerrado_em": null, "ativo": true
    }
  ],
  "lembretes": [
    {"tipo": "medicamento", "medicamento": "Amoxicilina", "dose": "250mg", "periodo": "7 dias", "horario": "08:00", "data": null, "dependente_id": 1},
    {"tipo": "medicamento", "medicamento": "Amoxicilina", "dose": "250mg", "periodo": "7 dias", "horario": "16:00", "data": null, "dependente_id": 1},
    {"tipo": "medicamento", "medicamento": "Amoxicilina", "dose": "250mg", "periodo": "7 dias", "horario": "00:00", "data": null, "dependente_id": 1}
  ],
  "vacinas": []
}
```

Sem nada compartilhado, a resposta é `{"documentos": [], "medicamentos": [], "lembretes": [], "vacinas": []}`.
O assistente deve tratar esse caso dizendo que não encontrou registros autorizados, sem
inventar dados.

## O que significa cada campo

| Campo | Significado |
|---|---|
| `documentos[].tipo` | `receita`, `exame`, `consulta`, `vacina` ou `atestado` |
| `documentos[].dados` | O que o usuário **confirmou** depois do OCR, nunca o palpite da IA. Hoje só receita tem; os outros tipos vêm `null` |
| `medicamentos[].horarios` | Calculados da posologia confirmada, começando às 08:00. Posologia condicional ("se necessário") vem `[]` |
| `medicamentos[].ativo` | Já começou, não foi encerrado e o período não venceu. Só ativos geram lembrete |
| `medicamentos[].origem` | `receita` (veio do OCR/receita) ou `manual` |
| `lembretes[].tipo` | `medicamento` (com `horario` do dia) ou `vacina` (com `data` da próxima dose e `horario` nulo; o nome da vacina vem em `medicamento`) |
| `vacinas[]` | `nome`, `dose`, `data_aplicacao`, `proxima_dose`, `dependente_id`, `documento_id` |

## Modelo

**dependente**: `id`, `nome`, `parentesco`, `data_nascimento` (`AAAA-MM-DD` ou `null`).
Sempre de um usuário. Receita também pode ser de um dependente: o front escolhe o dono ao
confirmar (`dependente_id` em `POST /api/prescriptions`), e o documento `receita` já nasce
com esse `dono`.

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

## Outras rotas que podem ajudar

| Rota | Para quê |
|---|---|
| `GET /api/documentos/{id}` | Um documento específico (mesmo formato) |
| `GET /api/documentos/{id}/arquivo` | Arquivo original (JPG, PNG ou PDF), se o assistente precisar ler a imagem |
| `GET /api/dependentes` | Lista de dependentes do usuário (nome, parentesco, nascimento) |

## Como criar dados de teste

Pela tela (front em `http://localhost:8443`) ou direto na API:

```bash
H='X-Usuario-Id: maria'; B=http://localhost:8000/api

# dependente
curl -X POST $B/dependentes -H "$H" -H 'Content-Type: application/json' \
  -d '{"nome":"Pedro","parentesco":"filho","data_nascimento":"2019-05-10"}'

# receita do dependente (gera documento tipo receita, medicamentos e lembretes)
curl -X POST $B/prescriptions -H "$H" -H 'Content-Type: application/json' \
  -d '{"medico":"Dra. Ana Lima","data_receita":"2026-10-27","dependente_id":1,
       "medicamentos":[{"medicamento":"Amoxicilina","dose":"250mg","posologia":"5 ml de 8/8h","periodo":"7 dias"}]}'

# exame do próprio usuário (sem OCR)
curl -X POST $B/documentos -H "$H" -F arquivo=@exame.pdf -F tipo=exame -F titulo=Hemograma -F data_documento=2026-10-20

# autorizar o assistente a ver o documento 1
curl -X PATCH $B/documentos/1 -H "$H" -H 'Content-Type: application/json' -d '{"compartilhado_assistente":true}'

# o que o assistente enxerga
curl "$B/assistente/contexto" -H "$H"
```

## Respostas de erro

| Código | Quando |
|---|---|
| 401 | Sem header de usuário (depois: token ausente ou inválido) |
| 404 | Documento ou dependente não existe ou é de outro usuário |

## O que ainda não existe

- **Login real (JWT):** depende do grupo LOGIN. Até lá, header de dev.
- **Dados estruturados de exame, consulta, vacina e atestado:** só receita passa pelo OCR.
  Desses tipos vocês recebem tipo, título, data, dono e o arquivo.
- **Medicamentos cadastrados à mão no contexto:** ainda não têm consentimento próprio, então
  não entram no contexto.
- **Histórico do chat:** nossa API não guarda conversas.
- **CORS:** a API não libera chamadas de outra origem no navegador. Chamada servidor a
  servidor funciona; se o front de vocês chamar direto, avisem que liberamos a origem.
- **API publicada:** hoje roda só localmente.

## O que precisamos de vocês

1. **Onde o assistente roda:** no serviço de vocês, chamando a nossa API com o token do
   usuário, ou dentro da nossa API (aí expomos `POST /api/chat`)?
2. **Histórico do chat:** fica com vocês? Se precisar ficar com a gente, combinamos a rota
   e a tabela.
3. **Formato do contexto:** o JSON acima atende ou vocês preferem um texto pronto para o
   prompt?
4. **Prompt do assistente:** precisamos do texto e das versões para a nossa documentação
   (o mentor cobrou isso no Bloco 5), e dos critérios de aceite: resposta sem dados, fora
   de escopo, nunca diagnosticar nem sugerir dose.
5. **Ambiente:** em que URL a nossa API precisa estar acessível para vocês? Hoje roda local.
