# Plano de implementação até a entrega final (09/12/2026)

Base: devolutiva da entrega parcial (6,75, ver `docs/devolutiva-entrega-parcial.md`) e os
entregáveis objetivos do desafio. Organizado pelo que depende de outro squad e pelo que é só
nosso. Organização por frente, não por pessoa.

## Status em 29/10

Já na main (PRs #7 a #15):

| Entregável | Estado |
|---|---|
| Repositório documental: upload, download, classificação por tipo, consulta | Pronto (#10, #11) |
| Associação documento ↔ usuário/dependente | Pronto (#10, #11) |
| OCR de receitas com revisão manual | Pronto (#8, #9) |
| Medicamentos e posologia com alertas | Pronto (#12, #13). Alerta só com o app aberto |
| Vacinas com lembrete da próxima dose | Pronto (#13) |
| Consultas e exames | Upload e consulta prontos; sem dados estruturados (só receita passa pelo OCR) |
| Atestado ligado ao registro corporativo | Tipo `atestado` existe; envio ao registro depende do Desafio 3 |
| Contexto para o Assistente IA com consentimento | Pronto: `GET /api/assistente/contexto`, contrato em `docs/contrato-assistente-ia.md` |

Ainda em SQLite, com usuário pelo header de dev `X-Usuario-Id`, usuário fixo no front
(`App.tsx`) e chat com respostas fixas (`ChatScreen.tsx`).

## Mapa de dependências

| O que | Depende de | Bloqueia |
|---|---|---|
| Login real (JWT) | LOGIN | Perfil com dados reais, tirar usuário fixo, segurança das rotas, assistente com o usuário certo |
| Assistente respondendo com dados reais | CHAT IA | Tela de chat, Bloco 5 da devolutiva (nota 1,0) |
| Atestado enviado ao registro corporativo | Desafio 3 | Último entregável objetivo |
| API acessível para outros squads | Nós | CHAT IA testar contra a nossa API |

Regra: enquanto um contrato não fecha, seguimos com a proposta e deixamos o ponto de troca
num lugar só (adaptador). Se não houver resposta até a data-limite, aplicamos o plano B e
avisamos o squad.

## Squad LOGIN

**O que precisamos deles (até 05/11):**

1. Formato do token: JWT? Algoritmo (RS256/HS256) e onde fica a chave pública (JWKS)?
2. Qual claim tem o id do usuário (`sub`)? Nome e e-mail vêm no token ou numa rota de perfil?
3. Como o front faz login: tela deles com redirecionamento, componente, ou rota que chamamos?
4. Ambiente de dev para testar, ou um token de teste assinado.
5. Logout e expiração: tem refresh token?

**O que entregamos a eles:** nada além de consumir o token. Usuário fica com eles; do nosso
lado só guardamos `usuario_id` como dono. Dependentes ficam conosco.

**Nossa parte quando o contrato fechar:**

| Frente | Tarefa | Pronto quando |
|---|---|---|
| Backend | Validar o JWT em `usuario_atual` (`agente/agents/api/deps.py`), único ponto de troca | Token inválido ou ausente: 401; usuário A não vê dados do B (teste) |
| Frontend | `request()` envia `Authorization: Bearer`; 401 volta para o login | Nenhuma chamada sem token |
| Frontend | Tela/fluxo de login deles; tirar o usuário fixo de `App.tsx`; Perfil com dados reais | Login e logout funcionando |

**Plano B (sem resposta até 13/11):** JWT de dev assinado com segredo compartilhado
(HS256), `sub` como id. A troca depois é só a chave em `deps.py`.

## Squad CHAT IA

Eles pediram dados estruturados dos documentos, associação com usuário/dependente e
consentimento. Isso está pronto e documentado em `docs/contrato-assistente-ia.md`.

**O que precisamos deles (até 05/11):**

1. Onde o assistente roda: no serviço deles chamando a nossa API, ou dentro da nossa (aí
   expomos `POST /api/chat`)?
2. Histórico do chat: fica com eles ou conosco?
3. O JSON do contexto atende, ou preferem texto pronto para o prompt?
4. Texto do prompt com versões e os critérios de aceite do Épico 5 (sem dados, fora de
   escopo, nunca diagnosticar nem sugerir dose). A devolutiva cobrou isso no Bloco 5.
5. Em que URL precisam da nossa API e de qual origem chamam (CORS)?
6. Usam o mesmo login (squad LOGIN)? O `sub` do token precisa ser o mesmo para os dois.

**O que entregamos a eles:**

| Frente | Tarefa | Pronto quando |
|---|---|---|
| Backend | Dados estruturados de exame, consulta e vacina (hoje `dados` vem `null` fora de receita) | Contexto traz os campos confirmados desses tipos |
| Backend | Consentimento para medicamento manual (hoje não entra no contexto) | Medicamento manual compartilhado aparece no contexto |
| DevOps | API publicada numa URL acessível, com CORS para a origem deles | Eles chamam a rota de fora da nossa máquina |

**Nossa parte quando o contrato fechar:**

| Frente | Tarefa | Pronto quando |
|---|---|---|
| Frontend | `ChatScreen.tsx` sem respostas fixas, chamando o assistente | "Que remédio tomo hoje?" responde com dados reais |
| Frontend | Tela de consentimento clara (o que o assistente vê) | Usuário liga e desliga por documento e vacina |
| Documentação | Prompt, versões e ACs no doc de entrega | Texto real de cada versão no doc |

**Plano B (sem resposta até 13/11):** hospedamos o assistente na nossa API com o Gemini que
já usamos no OCR (`POST /api/chat`), prompt versionado em `agente/agents/prompts/` e os ACs
do Épico 5 como testes. O contexto continua o mesmo, então eles podem assumir depois.

## Squad do Desafio 3 (registro corporativo)

**O que precisamos deles (até 05/11):**

1. Como identificamos o funcionário no registro: matrícula, CPF, o mesmo `sub` do LOGIN?
2. Rota para receber o atestado: campos (data, dias de afastamento, CID opcional, médico,
   CRM) e se aceita o arquivo ou só os dados.
3. Retorno: protocolo, status (recebido, aceito, recusado) e como consultamos depois.
4. Autenticação entre serviços.

**Nossa parte:**

| Frente | Tarefa | Pronto quando |
|---|---|---|
| Backend | Dados estruturados do atestado (revisão manual, igual à receita) | Atestado tem data, dias, médico confirmados |
| Backend | Enviar ao registro só com ação explícita do usuário; guardar protocolo e status | Atestado mostra "enviado em ... protocolo ..." |
| Frontend | Botão "Enviar ao RH" no atestado e status do envio | Fluxo de ponta a ponta com o serviço deles ou o mock |

**Plano B (sem resposta até 20/11):** mock do serviço deles com o contrato proposto acima e o
envio demonstrado contra o mock. Documentamos a integração como pendente.

## Só nosso (não depende de ninguém)

| Frente | Tarefa | Até |
|---|---|---|
| Dados | Postgres no lugar do SQLite, migração do zero, `pytest` verde | 13/11 |
| Dados | Índices (`usuario_id`, lembrete por horário, documento por tipo e data) e view do contexto, com justificativa pelas perguntas do chat | 13/11 |
| Backend | Dados estruturados de exame, consulta, vacina e atestado | 20/11 |
| Backend | Lembretes persistidos e marcar dose tomada | 20/11 |
| IA | ~20 receitas de teste, acerto por campo e meta (justificar o limiar de 0,9) | 27/11 |
| DevOps | Publicar API e front (URL para os outros squads) | 13/11 |
| Documentação | Entrevistas, divisão de trabalho, §1.2 "Automação", §6.1, prints e vídeo do fluxo, revisão pt-BR | 05/12 |

## Cronograma

| Data | Marco |
|---|---|
| 05/11 | Perguntas respondidas pelos três squads; contratos fechados neste arquivo |
| 13/11 | Postgres, API publicada; plano B do LOGIN e do CHAT IA se não houver resposta |
| 20/11 | Login integrado; dados estruturados dos outros tipos; plano B do Desafio 3 |
| 27/11 | Chat com dados reais; atestado enviado; front sem mocks; acerto do OCR medido |
| 05/12 | Documento de entrega fechado |
| 09/12 | Entrega final |

## Ordem que importa

1. Contrato com LOGIN: o `sub` dele é o id que os três squads usam.
2. API publicada: sem isso o CHAT IA não testa.
3. Assistente (prompt + ACs), seja com o CHAT IA ou no plano B. Bloco 5 foi a pior nota.
4. Atestado com o Desafio 3.
5. Documento de entrega, escrito desde já.
