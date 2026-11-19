# Histórico dos prompts

Os prompts ficam versionados em `agente/agents/prompts/`. Cada alteração é um commit; o diff mostra exatamente o que mudou.

O agente veio do repositório `joaaoow/prototipo_agente_ocr` por `git subtree`, com o histórico preservado (antes de 14/10/2026 o caminho era `agents/prompts/`).

Ver o histórico localmente:

```bash
git log -p -- agente/agents/prompts/ agents/prompts/
```

| Data | Commit | Arquivo | O que mudou e por quê |
|---|---|---|---|
| 17/09/2026 | [919d0f0](https://github.com/luan-sousaa/SafePass/commit/919d0f0) | os dois | Primeira versão do prompt de extração e do prompt do orquestrador |
| 17/09/2026 | [890cb8a](https://github.com/luan-sousaa/SafePass/commit/890cb8a) | orquestrador | Parou de anunciar o fallback ("Tesseract", "leitura offline") ao usuário; o texto capturado passa a ser apresentado como leitura a confirmar |
| 17/09/2026 | [ddf7a33](https://github.com/luan-sousaa/SafePass/commit/ddf7a33) | extração | Confiança mais rígida em números e em foto borrada; prompt injection mantém o texto literal no campo e explica em `observacoes`. Limiar subiu de 0,75 para 0,9 |
| 18/10/2026 | [a0d117c](https://github.com/luan-sousaa/SafePass/commit/a0d117c) | extração | Passa a extrair também médico e data da receita |
| 28/10/2026 | [425646a](https://github.com/luan-sousaa/SafePass/commit/425646a) | os dois | Nomes em pt-BR iguais aos da API (`confianca`, `precisa_revisar`, `campos_revisar`, `origem`); status "error" do orquestrador passa a significar só foto ausente |

Casos de falha detalhados em [`prompts-que-falharam.md`](prompts-que-falharam.md).
