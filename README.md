# SAFEpass

## Plataforma Digital de Saúde

O **SAFEpass** é uma plataforma digital desenvolvida para centralizar e organizar informações de saúde de forma simples, segura e acessível.

A aplicação permite gerenciar documentos médicos, medicamentos, lembretes, dependentes e histórico de saúde em um único ambiente. Além disso, conta com um **Assistente IA** integrado, desenvolvido para facilitar a consulta das informações registradas na plataforma.

O projeto possui uma interface responsiva e foi pensado para proporcionar uma experiência organizada tanto em computadores quanto em dispositivos móveis.

---

## Objetivo do projeto

O SAFEpass tem como objetivo facilitar a organização de informações relacionadas à saúde, reduzindo a necessidade de manter receitas, exames, prescrições e lembretes espalhados em diferentes locais.

A proposta é oferecer ao usuário um ambiente centralizado para consultar seus registros e acompanhar informações importantes do dia a dia.

---

## Principais funcionalidades

### Início

A tela inicial apresenta uma visão geral das principais informações cadastradas no sistema, incluindo:

- documentos recentes;
- medicamentos ativos;
- próximos lembretes;
- dependentes cadastrados;
- atalhos para as principais funcionalidades.

### Documentos

Permite armazenar e organizar documentos relacionados à saúde.

Os documentos podem ser classificados em categorias como:

- Receitas;
- Exames;
- Consultas;
- Vacinas.

A tela também disponibiliza mecanismos de busca e filtros para facilitar a localização das informações.

### Adicionar documento

O usuário pode adicionar um novo documento utilizando:

- captura por câmera;
- envio de arquivo.

Após selecionar o documento, o sistema inicia o processo de análise das informações.

### OCR e revisão das informações

O SAFEpass possui um fluxo de leitura de documentos utilizando **OCR (Reconhecimento Óptico de Caracteres)**.

Durante o processamento, o sistema apresenta a mensagem:

> Analisando seu documento...

Após a análise, as informações identificadas são disponibilizadas para revisão antes do armazenamento.

Entre os dados que podem ser identificados estão:

- medicamento;
- dosagem;
- posologia;
- período;
- data.

Quando alguma informação precisa ser verificada, o sistema destaca o campo para revisão do usuário.

Caso não seja possível identificar corretamente as informações do documento, são apresentadas as opções de tentar novamente ou realizar o preenchimento manual.

### Medicamentos

A área de medicamentos permite acompanhar os tratamentos registrados, apresentando informações como:

- nome do medicamento;
- dosagem;
- frequência;
- período de utilização;
- próxima dose.

### Lembretes

Permite acompanhar e controlar lembretes relacionados à saúde, incluindo:

- horários de medicamentos;
- consultas;
- vacinas.

Os lembretes podem ser ativados ou desativados conforme a necessidade do usuário.

### Dependentes

O módulo de dependentes possibilita organizar informações de saúde de outras pessoas vinculadas à conta.

Cada dependente possui uma área individual contendo informações como documentos, condições registradas e próximos lembretes.

### Histórico

O histórico apresenta os registros de saúde de forma cronológica.

A linha do tempo reúne informações relacionadas a documentos, prescrições, exames e outros eventos cadastrados na plataforma.

### Assistente IA

O SAFEpass possui um **Assistente IA de saúde** integrado à aplicação.

O chat foi desenvolvido para facilitar o acesso às informações armazenadas no sistema por meio de uma interação mais natural.

Entre as consultas previstas estão:

- “Quais são meus medicamentos ativos?”
- “Quando é minha próxima consulta?”
- “Tenho alguma vacina agendada?”
- “Quais foram meus documentos recentes?”

A interface do assistente possui histórico de mensagens, sugestões rápidas, indicador de processamento e painel de informações relacionadas à saúde.

> **Importante:** o Assistente IA tem caráter informativo e organizacional. Ele não substitui médicos, farmacêuticos ou outros profissionais de saúde e não deve ser utilizado para realizar diagnósticos ou substituir orientação médica.

### Perfil

A área de perfil reúne as configurações relacionadas à conta do usuário.

Ela é organizada em seções para:

- dados pessoais;
- segurança;
- senha;
- autenticação em dois fatores;
- preferências de notificações.

---

## Interface e identidade visual

A interface do SAFEpass segue uma proposta visual profissional, limpa e objetiva, buscando transmitir segurança e organização.

### Paleta principal

| Elemento | Cor |
|---|---|
| Azul principal | `#3f6886` |
| Azul claro | `#d6e8f6` |
| Ações e botões | `#e92423` |

### Tipografia

O projeto utiliza:

- **Days One** — títulos e elementos de destaque;
- **Yanone Kaffeesatz** — textos e elementos da interface.

O layout utiliza componentes padronizados, ícones lineares, bordas discretas e hierarquia visual consistente.

---

## Responsividade

O SAFEpass foi desenvolvido para funcionar em diferentes tamanhos de tela.

No desktop, a navegação principal utiliza uma sidebar lateral.

Em dispositivos móveis, a navegação é adaptada para um menu compacto, mantendo o acesso às principais funcionalidades da plataforma.

---

## Tecnologias utilizadas

O projeto utiliza tecnologias modernas para desenvolvimento de interfaces web:

- React
- TypeScript
- Vite
- Node.js / npm
- CSS e componentes reutilizáveis

---

## Estrutura geral

```text
SAFEpass
│
├── Início
├── Documentos
│   ├── Buscar documentos
│   ├── Filtrar documentos
│   └── Adicionar documento
│       ├── Tirar foto
│       ├── Enviar arquivo
│       ├── Análise OCR
│       └── Revisão
│
├── Histórico
├── Medicamentos
├── Lembretes
├── Dependentes
├── Assistente IA
└── Perfil
```

---

## Como executar o projeto

### 1. Acesse a pasta do projeto

```bash
cd "Digital Health Platform"
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Inicie o ambiente de desenvolvimento

```bash
npm run dev
```

Após iniciar, o Vite exibirá no terminal os endereços disponíveis para acessar a aplicação.

Exemplo:

```text
Local:   http://localhost:8443/
Network: http://SEU-IP:8443/
```

Abra o endereço **Local** no navegador para utilizar a aplicação no computador.

---

## Build do projeto

Para gerar uma versão de produção, utilize:

```bash
npm run build
```

Esse comando realiza a compilação e prepara os arquivos necessários para publicação da aplicação.

---

## Aviso do Vite

Dependendo da versão utilizada, ao executar:

```bash
npm run dev
```

o Vite pode apresentar avisos relacionados ao `vite.config.ts`, como utilização de `__dirname` ou importação de arquivos JSON.

Essas mensagens são **avisos de compatibilidade futura** e não necessariamente impedem a execução atual da aplicação.

Caso o terminal apresente:

```text
VITE ready
```

e disponibilize o endereço local da aplicação, o servidor de desenvolvimento foi iniciado corretamente.

---

## Segurança e privacidade

Por trabalhar com informações relacionadas à saúde, o SAFEpass foi idealizado considerando princípios de privacidade e proteção de dados.

Entre os princípios considerados no projeto estão:

- controle das informações pelo usuário;
- proteção de dados pessoais;
- acesso seguro às informações;
- revisão humana dos dados identificados por OCR;
- redução da exposição desnecessária de informações;
- organização segura de documentos.

Em uma implantação real, mecanismos adicionais de segurança devem ser implementados no backend, banco de dados, autenticação, armazenamento de documentos, criptografia, controle de acesso e auditoria.

---

## Status do projeto

**Em desenvolvimento.**

As interfaces e os
