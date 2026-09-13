# Portal de Faturamento Biond Agro (Frontend)

Aplicação frontend em **React + Vite + TypeScript** para acompanhamento de OPs, Farol de liberacao de embarque, pendencias por area e dados consolidados do Supabase.

## Visão geral

O sistema centraliza o acompanhamento operacional do faturamento com foco em:

- visao por OP/Operacao B2B;
- contratos de compra e venda vinculados;
- pendencias por area e severidade;
- status de Farol por etapa;
- evidencias e validacoes alimentadas por relatorios TOTVS/Datasul.

## Stack e principais dependências

- **React 18** + **React Router DOM 6**;
- **Vite 6** para desenvolvimento/build;
- **TypeScript**;
- **Supabase JS v2** para autenticação, banco e storage;
- **xlsx-js-style** para exportação/formatação de planilhas.

## Perfis e domínio de negócio

Os perfis de acesso e categorias do cadastro estão modelados em `types.ts`, incluindo:

- perfis como Comercialização, Operações, Crédito e Risco, Consultoria, Assessoria e Marketing;
- status operacionais (ex.: lead, concluído, pronto para input);
- status de crédito (pendente, em análise, aprovado, reprovado).

## Estrutura principal do projeto

```text
.
├── App.tsx                       # Orquestra rotas, carregamento de cadastros e fluxo principal
├── index.tsx                     # Bootstrap da aplicação
├── lib/
│   └── supabase.ts               # Configuração do cliente Supabase
├── components/
│   ├── Auth.tsx                  # Login e autenticação
│   ├── ClientForm.tsx            # Formulário principal de cadastro
│   ├── ContactList.tsx           # Gestão de contatos
│   ├── NotificationBell.tsx      # Notificações
│   ├── FormInput.tsx             # Componente base de input
│   └── MultiSelect.tsx           # Seleção múltipla (culturas, serviços etc.)
├── services/
│   ├── brasilApi.ts              # Consulta de CNPJ e CEP (com fallback)
│   ├── slaveLaborApi.ts          # Verificação compliance via RPC
│   └── storage.ts                # Upload de documentos no bucket Supabase
├── types.ts                      # Tipos, enums e contrato de dados do cliente
├── utils.ts                      # Utilitários de formatação e apoio
└── vite.config.ts
```

## Pré-requisitos

- Node.js **18+** (recomendado 20+)
- npm **9+**

## Instalação

```bash
npm install
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

> No frontend com Vite, variáveis expostas ao cliente devem começar com `VITE_`.

## Como executar

### Desenvolvimento

```bash
npm run dev
```

A aplicação ficará disponível, por padrão, em `http://localhost:5173`.

### Build de produção

```bash
npm run build
```

### Preview local do build

```bash
npm run preview
```

### Checagem de tipos

```bash
npm run lint
```

## Integrações

### Supabase

- autenticação de usuários;
- leitura/escrita de cadastros via tabelas e RPC;
- storage para anexos no bucket `docs_cadastros`.

### BrasilAPI

- busca de dados de CNPJ;
- busca de endereço por CEP;
- fallback via proxy quando necessário.

### Compliance (Lista Suja)

A verificação de trabalho escravo utiliza RPC no schema `ultis`, função `is_in_lista_suja`.

## Fluxo de documentos

Os uploads seguem a estrutura:

```text
{cadastro_id}/{tipo_documento}/{nome_arquivo}_{timestamp}.{ext}
```

Esse padrão facilita versionamento e organização por cadastro/tipo.

## Boas práticas para evolução

- manter tipos em `types.ts` atualizados antes de mexer no formulário;
- preservar mapeamentos entre frontend e campos do banco (RPC/DB);
- validar permissões de perfil ao incluir novos campos/ações;
- evitar lógica de negócio espalhada em componentes muito pequenos: prefira centralização em serviços/utilitários.

## Solução de problemas (rápida)

- **Tela sem dados/autenticação falhando:** verificar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- **Microsoft/Google/GitHub OAuth falhando:** conferir callbacks, Client ID/Secret e URL Configuration conforme `../docs/oauth-auth-setup.md`.
- **Erro no upload:** conferir permissões do bucket `docs_cadastros` e políticas do Storage.
- **Consulta CNPJ/CEP instável:** pode haver limitação externa; existe fallback com proxy em parte dos casos.

## Scripts disponíveis

- `npm run dev` — sobe servidor de desenvolvimento;
- `npm run build` — gera build de produção;
- `npm run preview` — serve build localmente;
- `npm run lint` — valida tipos TypeScript (sem emitir arquivos).