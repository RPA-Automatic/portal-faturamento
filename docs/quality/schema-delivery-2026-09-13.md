# Validação do esquema e ficha operacional

> Status: Evidência técnica; homologação de negócio pendente  
> Data: 2026-09-13

- Nove migrations executadas do zero em PostgreSQL 16.15 local descartável.
- Mesma cadeia aplicada no Supabase fiscal `eukazzizamxratkavcap`, PostgreSQL 17.
- SHA-256 dos statements remotos comparados aos arquivos e versões do histórico reconciliadas. Manifesto em `supabase/deployment-manifest.json`.
- 32 tabelas em `public`, todas com RLS; cinco views operacionais com `security_invoker`.
- Cenários SQL de integridade, isolamento, histórico, auditoria e Farol passaram localmente e no remoto. Dados sintéticos remotos foram revertidos por ROLLBACK; contagem posterior: zero OP e zero contas `@example.test`.
- TypeScript e build Vite passaram.
- Teste de navegador com API simulada: abertura da ficha, conteúdo da pendência, fechamento por Escape, erro/retry e viewport móvel; nenhum erro JavaScript. Capturas desktop/mobile foram inspecionadas. Isso não comprova sessão OAuth ou cargas reais ponta a ponta.

## Advisor

O Advisor não apontou tabela sem RLS nem exposição anônima. Apontou descoberta do schema GraphQL por `authenticated` em 29 objetos que precisam de SELECT para o frontend. Essa descoberta não equivale a leitura irrestrita: grants foram mantidos com policies e testes de acesso. [Explicação do aviso](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed).

Os 23 índices de FK ausentes foram corrigidos por migration complementar. Restam avisos informativos de índices ainda não usados, esperados em banco novo e vazio; não removê-los com base em ausência de tráfego. [Explicação do aviso de índices](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Limites

O banco do Orchestrator foi apenas consultado. Seus dados fiscais ainda precisam de backup/reprocessamento/reconciliação e corte de consumidores antes de limpeza. Não houve cópia de usuários nem dados reais. As novas aprovações, revisões e decisões têm schema, mas não workflow de escrita publicado. A ficha é de consulta, limitada a 100 linhas por seção e às permissões do usuário. Homologação fiscal, migração dos dados e operação assistida continuam pendentes.

## Reproduzir

- `PG_BIN=/caminho/postgresql/bin PF_TEST_PG_PORT=55482 python3 scripts/test_database.py`
- `python3 -m unittest discover -s scripts -p 'test_*.py' -v`
- `npm --prefix frontend ci`
- `npm --prefix frontend run lint` e `npm --prefix frontend run build`
- Node 22: `cd frontend && npx playwright install chromium`; depois, na raiz: `node scripts/test_portal_ui.cjs` (dados simulados; não acessa Supabase real).

## Reconciliação de main/dev

A main anterior (`604c5c0`) continha um protótipo diferente, com frontend na raiz e cinco tabelas próprias. O merge preserva ambos os históricos, adota o frontend em `frontend/`, mantém o fallback SPA do Netlify e arquiva a migration antiga fora da cadeia ativa. A CI passa a validar o frontend atual e as migrations em PostgreSQL 17, com Node 22.

## Dependências e publicação

O primeiro push confirmou CI remota aprovada em main/dev. A revisão adicional corrigiu os dez avisos do npm audit: atualizações do lockfile e React Router 7.18.3 (mantendo React 18 e HashRouter). O resultado local final é zero vulnerabilidades reportadas pelo npm audit; isso não equivale a garantia de ausência de falhas. Build, TypeScript e cenários de navegador foram repetidos após a atualização.

O runtime de desenvolvimento/CI/Netlify foi fixado em Node 22, e o import map antigo de CDNs foi removido: as dependências vêm do lockfile do Vite.
