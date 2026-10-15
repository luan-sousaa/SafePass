# SAFEpass

Front-end do SAFEpass (gestão de documentos de saúde) em React 19 + Vite + Tailwind CSS v4 + TypeScript.

## Comandos

Gerenciador de pacotes: **npm**.

- `npm install` — instala dependências
- `npm run dev` — servidor de desenvolvimento em http://localhost:8443
- `npm run build` — build de produção em `dist/`
- `npx tsc --noEmit` — checagem de tipos

## Estrutura

- `src/App.tsx` — shell da aplicação e troca de telas (estado `screen`, sem router)
- `src/types.ts` — tipos compartilhados (`Screen`, `User`)
- `src/screens/` — uma tela por arquivo; dados de exemplo ficam no topo de cada tela
- `src/components/Icon.tsx` — todos os ícones SVG (`<Icon name="..." />`); adicione novos aqui
- `src/components/layout/` — Sidebar, TopBar, NavList (itens do menu e títulos das telas), BrandLogo
- `src/index.css` — import do Tailwind, fontes, tokens de cor (`--brand`, `--primary`…) e animações

## Estilo

- Tailwind direto no JSX; cores via variáveis CSS de `src/index.css` (`var(--brand)`), não hex solto.
- Tipografia: **Nunito Sans** no texto/interface, **Yanone Kaffeesatz** só em títulos (`h1`–`h6`, é condensada — use tamanhos `text-xl`+), **Days One** no logo.
- Interface em português (pt-BR).
