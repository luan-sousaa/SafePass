# Plano de implementação até a entrega final (09/12/2026)

Base: devolutiva da entrega parcial (6,75) cruzada com o repositório em `3c187ed`
(ver `docs/devolutiva-entrega-parcial.md`). Organização por frente, não por pessoa.

## Status em 28/10

Já na main (PRs #8 a #13):

- `documento_ocr` com status único e origem; nomes alinhados entre prompt, API e front (#8)
- Repositório documental por usuário e dependente, download, compartilhamento com o assistente e `GET /api/assistente/contexto`; contrato em `docs/contrato-assistente-ia.md` (#10)
- Telas Documentos, Dependentes e Início sem mocks; dono da receita (#11)
- Bugs do teste ponta a ponta (#9)
- Alertas no navegador com o app aberto (#12)
- Medicamento manual com vigência e vacinas com lembrete da próxima dose (#13)

Ainda em SQLite e com usuário por header de dev (`X-Usuario-Id`) até fechar o contrato com o LOGIN.

## Dependências externas

O SAFEpass precisa de dois outros grupos da residência. Enquanto o contrato não fecha,
seguimos com a proposta abaixo e trocamos só o adaptador.

### Grupo LOGIN

Proposta de contrato:

- O front recebe um JWT do serviço de login e envia `Authorization: Bearer <token>` em toda chamada.
- A nossa API valida o token (JWKS do serviço deles, ou segredo compartilhado em dev) e lê
  `sub` = id do usuário. Sem token ou token inválido: 401.
- Tabela de usuário: fica com o LOGIN. Do nosso lado só guardamos `usuario_id` (texto/uuid) como dono.
- Dependentes ficam do nosso lado (tabela `dependente` com `usuario_id`).

Perguntas para o grupo:
1. JWT? Qual algoritmo e onde fica a chave pública?
2. Qual claim tem o id do usuário? Vem nome/e-mail no token?
3. Tem ambiente de dev que podemos usar, ou geramos tokens de teste?

### Grupo CHAT IA

Proposta de contrato:

- `GET /api/contexto` (nossa API, autenticada): resumo do usuário logado (medicamentos ativos,
  próximos lembretes, últimos documentos, dependentes). Sai da view `vw_contexto_chat`.
- O assistente consome esse contexto. Se ele for hospedado por eles, chamam a nossa rota com o
  token do usuário. Se for por nós, expomos `POST /api/chat` e `GET /api/chat/historico`.
- Histórico do chat: tabela `chat_mensagem` com `usuario_id`, de quem hospeda o assistente.

Perguntas para o grupo:
1. Quem hospeda o assistente e o histórico?
2. Qual formato de contexto eles esperam (JSON livre, texto pronto para o prompt)?
3. O prompt é deles? Precisamos do texto e das versões para o Bloco 5.

## Fases

### Fase 0: contratos (até 30/10)

| Frente | Tarefa | Pronto quando |
|---|---|---|
| DevOps | Reunião com LOGIN e CHAT IA usando as perguntas acima | Contrato escrito em `docs/contratos.md` e aceito pelos 3 grupos |
| Backend | Token de teste local (JWT assinado com segredo de dev) | Testes conseguem chamar rotas como usuário A e B |

Correções do teste ponta a ponta de 26/10 (43 testes verdes, tsc sem erros, nenhuma tela quebrada):

| Frente | Tarefa | Pronto quando |
|---|---|---|
| Backend | Bug 1 (alta): com o Gemini em 503, o retry passa de 60 s e o front aborta antes do Tesseract responder. Limitar o tempo total do Gemini (timeout por tentativa) bem abaixo dos 60 s do front | Upload com Gemini fora cai no Tesseract em menos de 30 s |
| Frontend | Bug 2: no Safari o timeout chega como `AbortError` e mostra "Verifique sua conexão". Tratar `AbortError` em `prescriptions.ts` | Timeout mostra "O serviço demorou demais" |
| Frontend | Bug 3: Histórico fora de ordem (`HistoryScreen.tsx:36`) | Ordenado por data |
| Backend | Bug 4: "pela noite", "1 cp ao dia", "pela manhã" não geram horário e aparecem como "Conforme necessário" (`dose_schedule.py`) | Teste para cada posologia comum |
| Frontend | Bugs 5 e 6: "Adicionar documento" não sai da tela de erro; rótulo "Próxima dose" mostra todos os horários | Corrigidos |

### Fase 1: modelo de dados (até 06/11)

Fecha os Blocos 3 e 4 (índices, view, status do OCR).

| Frente | Tarefa | Pronto quando |
|---|---|---|
| Dados | Schema PostgreSQL: `dependente`, `documento` (tipo: receita/exame/consulta/vacina), `documento_ocr` (extraído x confirmado, `campos_revisar`, `confianca`, `origem` gemini/tesseract/manual, `status`), `medicamento`, `lembrete`, `chat_mensagem` | Migração roda do zero; todas as tabelas com `usuario_id` |
| Dados | Um único fluxo de falha no `status`: `processando` → `revisao` → `confirmado`; falha do Gemini cai no Tesseract; se ainda falhar, `revisao` com texto bruto e preenchimento manual. Não existe status de erro nem modo de espera | Mesmo fluxo no schema, no código e no doc de entrega |
| Dados | Índices (`usuario_id`, `(usuario_id, proximo_horario)` em lembrete, `(usuario_id, tipo, data)` em documento) e `vw_contexto_chat`, com a justificativa de cada um pelas perguntas que o chat responde | Justificativa escrita no doc de entrega |
| Backend | Trocar o SQLite (`prescription_store.py`) pelo Postgres mantendo os 43 testes verdes | `pytest` verde |

### Fase 2: API completa (até 13/11)

Prioridade 1 da devolutiva.

| Frente | Tarefa | Pronto quando |
|---|---|---|
| Backend | Dependência `current_user` (valida o JWT) em todas as rotas | Usuário A não vê dados do B (teste) |
| Backend | Rotas: dependentes (CRUD), documentos (listar/filtrar por tipo, detalhe, excluir), medicamentos (editar, encerrar), lembretes (persistidos, marcar dose tomada), `GET /api/contexto` | Spec + teste para cada rota antes do código (regra do `agente/CLAUDE.md`) |
| Backend | Padronizar nomes em pt-BR na API (`precisa_revisar`, `confianca`, `campos_revisar`, `origem`) e alinhar com o prompt de OCR | Prompt, API e doc usam os mesmos nomes |

### Fase 3: assistente virtual (até 20/11)

Bloco 5 foi a pior nota (1,0).

| Frente | Tarefa | Pronto quando |
|---|---|---|
| IA | Prompt do assistente versionado em `agente/agents/prompts/` com cabeçalho de versão e changelog (vale também para o prompt de OCR) | Texto real de cada versão no doc de entrega |
| IA | ACs do Épico 5: sem dados ("não encontrei isso nos seus registros"), fora de escopo, nunca diagnosticar nem sugerir dose, só dados do usuário logado | Spec com os ACs e um teste para cada um |
| IA | Integração com o CHAT IA conforme o contrato da Fase 0 | Pergunta "que remédio tomo hoje?" responde com dados reais |

### Fase 4: front ligado de verdade (até 27/11)

| Frente | Tarefa | Pronto quando |
|---|---|---|
| Frontend | Tela de login do grupo LOGIN; `User` ganha `id`; tirar o usuário fixo de `App.tsx` | Login e logout funcionando |
| Frontend | `request()` em `src/services/prescriptions.ts` envia o Bearer; 401 volta pro login | Nenhuma chamada sem token |
| Frontend | Trocar mocks por API: Documentos (exames/consultas/vacinas), Dependentes, Perfil, Chat (`ChatScreen.tsx` sem respostas fixas) | Nenhuma tela com dado de exemplo |

### Fase 5: qualidade do OCR (em paralelo, até 27/11)

| Frente | Tarefa | Pronto quando |
|---|---|---|
| IA | Conjunto de ~20 receitas de teste (hoje são 3), medir acerto por campo, fixar meta | Taxa medida e meta escritas no doc de entrega, com o limiar de 0,9 justificado |

### Fase 6: documento de entrega (até 05/12)

| Frente | Tarefa |
|---|---|
| Documentação | Registro das entrevistas (perfil, data, trechos, o que mudou na hipótese) |
| Documentação | Entrevista com IA: modelo, prompt, receitas e resultado (copiar de `specs/prescription-extraction.md`) |
| Documentação | §1.2: "Predição" vira "Automação" |
| Documentação | Tarefas por camada e definição de pronto por história |
| Documentação | Estrutura de pastas e diagrama com LOGIN e CHAT IA |
| Documentação | Divisão de trabalho, dificuldades de integração, uso de IA no desenvolvimento |
| Documentação | Prints e vídeo do fluxo receita → revisão → medicamentos → lembretes → chat |
| Documentação | Revisão final: tirar "[cite: …]", padronizar pt-BR |

## Ordem que importa

1. Contrato com LOGIN: destrava tudo que é por usuário (dependentes, histórico, contexto do chat).
2. Schema com `usuario_id` e o `status` único do OCR.
3. Assistente (prompt + ACs) junto com o CHAT IA.
4. Front sem mocks.
5. Documento de entrega, que pode ir sendo escrito desde a Fase 0.
