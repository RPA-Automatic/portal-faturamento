# Backend Supabase - Portal de Faturamento

Este diretorio contem o backend oficial do Portal de Faturamento e Liberacao de Embarque.

## Estrutura

- `migrations/`: migrations versionadas do backend novo.
- `config.toml`: configuracao local do Supabase CLI para este projeto.
- `README Portal Liberacao Embarque.md`: visao do projeto, links, stack e principios.

## Backend Oficial

A migration principal atual e `migrations/20260501000100_initial_backend_schema.sql`.

Ela cria o modelo de dados do portal operacional, incluindo tabelas normalizadas, tabelas de staging para XLSX TOTVS/Datasul, views do Farol, RLS e regras iniciais.

## Legado

A pasta local `supabase/` dentro deste diretorio, quando existir como `supabase/supabase/`, pertence ao historico do Portal de Cadastro. Ela foi ignorada no Git porque contem migrations antigas, snippets de SQL Editor e automacoes que nao devem ser publicadas junto com o backend novo sem revisao.

## Fluxo Recomendado

1. Criar ou ajustar migrations em `supabase/migrations/`.
2. Validar localmente com Supabase CLI antes do deploy.
3. Versionar somente migrations, docs e codigo revisado.
4. Manter dados reais, `.env`, snippets e rascunhos fora do Git.