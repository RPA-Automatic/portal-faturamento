# Mapa do Projeto

Este arquivo serve como guia rapido para quem esta comecando em fullstack e precisa entender onde mexer no Portal de Faturamento.

## Visao Geral

O projeto esta dividido em tres grandes partes:

| Pasta | Funcao | Quando mexer |
|---|---|---|
| `frontend/` | Aplicacao web em React + Vite + TypeScript | Telas, filtros, tabelas, login, chamadas ao Supabase |
| `supabase/` | Backend Supabase do portal de faturamento | Banco, tabelas, views, RLS, migrations e deploy Supabase |
| `docs/` | Documentacao do produto e arquitetura | Regras de negocio, fluxo operacional, modelo de dados e roadmap |

## Frontend

Arquivos principais:

- `frontend/App.tsx`: primeira tela do Portal de Faturamento, com Farol por OP, indicadores e backlog por area.
- `frontend/index.tsx`: ponto de entrada do React. Renderiza o `App` dentro do navegador.
- `frontend/index.html`: HTML base carregado pelo Vite.
- `frontend/lib/supabase.ts`: cria o cliente Supabase usado pelo frontend.
- `frontend/components/Auth.tsx`: tela de login reaproveitada do portal de cadastro.
- `frontend/package.json`: scripts (`dev`, `build`, `lint`) e dependencias.
- `frontend/types.ts`, `frontend/components/ClientForm.tsx` e componentes relacionados: ainda pertencem ao portal de cadastro original e podem ser reaproveitados ou removidos aos poucos quando o portal de faturamento amadurecer.

Fluxo basico do frontend:

1. Usuario abre a aplicacao.
2. `App.tsx` verifica sessao no Supabase Auth.
3. Se nao houver sessao, mostra `Auth.tsx`.
4. Se houver sessao, consulta as views `v_operations_farol` e `v_area_backlog`.
5. A tela exibe OPs, semaforo, etapa, contratos, pendencias e aging.

## Backend Supabase

Arquivos principais:

- `supabase/migrations/20260501000100_initial_backend_schema.sql`: schema inicial do Portal de Faturamento.
- `supabase/config.toml`: configuracao local do Supabase CLI.
- `supabase/README Portal Liberacao Embarque.md`: visao do projeto, links e stack recomendada.
- `supabase/readme.md`: documentacao herdada do backend do portal de cadastro.
- `supabase/supabase/`: historico antigo/local do portal de cadastro. Esta ignorado no Git; use apenas como referencia privada, sem misturar com o backend novo.

O schema inicial cria:

- tabelas normalizadas: `operations`, `contracts`, `partners`, `logistics_orders`, `fiscal_documents`, `documents`, `pending_items`, `evidence`, `state_history`;
- tabelas de staging para XLSX: `stg_es4004_contracts`, `stg_gg4164_purchase_contracts`, `stg_gg2037_sales_contracts`, `stg_gplp40180_logistics_orders`, `stg_fiscal_documents`;
- views para o frontend: `v_operations_farol`, `v_area_backlog`, `v_contract_drilldown`;
- regras iniciais, areas, etapas E1 a E6 e politicas RLS.

## Documentacao

Arquivos mais importantes:

- `docs/product-brief.md`: objetivo do produto e publico-alvo.
- `docs/architecture.md`: arquitetura do fluxo TOTVS para Farol.
- `docs/domain-model.md`: entidades principais do dominio.
- `docs/data-sources.md`: fontes TOTVS/Datasul e chaves canonicas.
- `docs/database.md`: desenho do banco Supabase.
- `docs/operational-workflow.md`: etapas E1 a E6 e semaforo.
- `docs/xlsx-ingestion-plan.md`: plano pratico para transformar XLSX em tabelas do banco.
- `docs/roadmap.md`: fases de desenvolvimento.

## Ordem Recomendada para Desenvolver

1. Salvar os XLSX dentro de uma pasta controlada, por exemplo `data/raw/`.
2. Conferir colunas reais dos XLSX e comparar com as tabelas staging.
3. Ajustar a migration caso alguma coluna importante esteja faltando.
4. Criar rotina de importacao para preencher staging.
5. Criar rotina de consolidacao para preencher `operations`, `contracts`, `partners`, `logistics_orders` e `fiscal_documents`.
6. Alimentar `pending_items` e `evidence` com as regras do Farol.
7. Evoluir o frontend com detalhe da OP e tratamento de pendencias por area.
