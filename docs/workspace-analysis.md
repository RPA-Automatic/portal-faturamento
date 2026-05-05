# Analise do Workspace

Este documento resume a leitura inicial do workspace do Portal de Faturamento, dos arquivos TOTVS/Datasul recebidos e do estado atual do repositorio antes de atualizar o remoto.

## Veredito de Arquitetura

A arquitetura atual pode ficar em um unico workspace/repo neste momento. Para um projeto em fase inicial, manter `frontend`, `supabase` e `docs` juntos simplifica aprendizado, versionamento, deploy e revisao das mudancas.

Separar frontend e backend em repositorios diferentes so faria sentido quando houver times separados, ciclos de deploy independentes ou um backend proprio fora do Supabase. Hoje o backend principal sera Supabase, entao o monorepo e adequado.

## Estrutura Atual

| Pasta | Papel | Situacao |
|---|---|---|
| `frontend/` | Aplicacao web React + Vite + TypeScript | Ja existe painel inicial do Farol consultando views Supabase. Ainda tem heranca do portal de cadastro. |
| `supabase/migrations/` | Backend novo do Portal de Faturamento | Contem schema inicial com tabelas normalizadas, staging, views e RLS. |
| `supabase/supabase/` | Backend legado do Portal de Cadastro | Referencia local/historica ignorada no Git. Nao misturar com o backend novo sem revisao. |
| `docs/` | Documentacao de produto, arquitetura, dados e roadmap | Boa base para iniciantes, mas ainda ha inconsistencias entre Next.js planejado e Vite real. |
| `C:\Projetos\Docs` | Materiais externos recebidos | Contem XLSX, DOCX/PDF/EML/MSG e pastas de operacoes para extracao de regras/evidencias. |

## Frontend

O frontend real e React + Vite, nao Next.js. Isso aparece em `frontend/package.json`, `frontend/vite.config.ts` e `frontend/lib/supabase.ts`.

Pontos positivos:

- Usa TypeScript.
- Ja reaproveita autenticacao Supabase.
- Ja consome `v_operations_farol` e `v_area_backlog`.
- A tela inicial e operacional, com indicadores, filtros e lista de OPs.

Pontos de atencao:

- `frontend/package.json` foi renomeado para `portal-faturamento`.
- `frontend/README.md` foi ajustado para o Portal de Faturamento, mas componentes herdados ainda existem.
- Componentes como `ClientForm.tsx`, `ContactList.tsx`, `NotificationBell.tsx`, `types.ts` e services de cadastro ainda sao heranca do portal antigo.
- A documentacao de desenvolvimento foi alinhada ao Vite e as variaveis `VITE_*`.

Recomendacao: manter Vite por enquanto. Migrar para Next.js agora aumentaria escopo e nao resolve o gargalo principal, que e ingestao/normalizacao dos XLSX e motor de regras.

## Backend Supabase

O arquivo `supabase/migrations/20260501000100_initial_backend_schema.sql` ja esta bem alinhado com o dominio do portal. Ele cria:

- tabelas normalizadas: `operations`, `contracts`, `partners`, `logistics_orders`, `fiscal_documents`, `documents`, `rules`, `pending_items`, `evidence`, `state_history`;
- tabelas staging: `stg_es4004_contracts`, `stg_gg4164_purchase_contracts`, `stg_gg2037_sales_contracts`, `stg_gplp40180_logistics_orders`, `stg_fiscal_documents`;
- views para dashboard: `v_operations_farol`, `v_area_backlog`, `v_contract_drilldown`;
- enums, regras iniciais, RLS e funcao `recalculate_operation_farol`.

Essa abordagem e boa pratica para dados vindos de XLSX: primeiro preservar o bruto em staging com `raw_data`, depois consolidar em tabelas do produto.

## Arquivos XLSX Identificados

Arquivos principais para o MVP:

| Arquivo | Uso provavel | Aba principal | Linha de cabecalho |
|---|---|---:|---:|
| `ES4004(56).xlsx` | Hub OP/Oper B2B + contratos | `es4004` | 2 |
| `GG4164(40).xlsx` | Contratos de compra/originacao | `GG4164` | 2 |
| `gg2037-03660.xlsx` | Contratos de venda | `GG2037` | 2 |
| `GPLP40180(43).xlsx` | Logistica/OL/rota | `GPLP40180` | 2 |
| `DocumentosFiscais-20260220091958.xlsx` | Fiscal, NF, CFOP | `Doc Fisc` | 2 |
| `Checklist_MT.xlsx` | Regras e validacoes manuais | `Checklist_MT` | 3 |
| `Checklist_RS (1).xlsx` | Regras e validacoes manuais | `Checklist_RS` | 3 |
| `CHECKLIST_Pre_Faturamento_BIOND.xlsx` | Regras e validacoes manuais | `CheckList` | 3 |

Arquivos auxiliares que merecem mapeamento em uma segunda etapa:

- `ACR.lst.xlsx`, `ACR303AA.xlsx`, `APB322AA.xlsx`: financeiro/contas a receber/pagar e titulos.
- `GG4081.xlsx`, `GG4089.xlsx`, `GG4160.xlsx`: adiantamentos/previsoes/titulos ligados a contratos.
- `GG402874862.xlsx`: mapa de estoque.
- `GG408474836.xlsx`: cadastro/extrato de fornecedor.
- `GG411274787.xlsx`: fixacao de componente/preco.

## Documentos e Operacoes

Os DOCX/PDF/EML/MSG em `C:\Projetos\Docs` devem ser usados para transformar conhecimento operacional em regras:

- documentos de processo: checklist fiscal, comercial, logistica, contratos, PDD e historico de prompts;
- pastas por OP: exemplos reais de liberacao de embarque, instrucao fiscal, autorizacao, notas fiscais e e-mails;
- operacoes amostra: OP 35, OP 36, OP 67, OP 73, OP 80, OP 92 e OP 99.

Esses arquivos nao devem ir todos diretamente para o Git se forem dados sensiveis ou muito grandes. O melhor destino operacional e Supabase Storage, SharePoint ou uma pasta controlada, com metadados no banco.

## Boas Praticas Atuais

O projeto ja segue boas praticas importantes:

- separacao clara entre frontend, backend Supabase e docs;
- schema versionado por migration;
- RLS habilitada nas tabelas sensiveis;
- staging separado do modelo normalizado;
- views dedicadas para consumo do dashboard;
- documentacao de dominio e fluxo operacional.

## Riscos Antes do Push

- Ha muitos arquivos novos/untracked, incluindo `frontend/` e `docs/`.
- O caminho `supabase/supabase/` contem historico/rascunhos do portal de cadastro, migrations antigas e snippets SQL com webhooks/segredos operacionais. Ele foi ignorado no Git para evitar publicacao acidental.
- A raiz agora possui `.gitignore` para proteger ambientes, builds, dados brutos, `.vscode` local e export legado do Supabase.
- O ambiente local nao tem `npm` disponivel no PATH, entao nao foi possivel rodar `npm ci`, `npm run lint` ou `npm run build`.
- O VS Code acusa falta de tipos Node no frontend, provavelmente por `node_modules` ausente.

## Recomendacao de Proximas Entregas

1. Criar `.gitignore` raiz para proteger `.env`, builds, caches e dados brutos.
2. Renomear metadados do frontend de portal de cadastro para portal de faturamento.
3. Atualizar docs que falam em Next.js para refletir React + Vite, ou marcar Next como evolucao futura.
4. Criar pasta `data/README.md` ou `data/raw/.gitkeep` com regra clara: dados reais nao entram no Git.
5. Criar script/Edge Function de diagnostico de XLSX: arquivo, aba, linha de cabecalho, colunas, quantidade de linhas e amostra.
6. Ajustar staging para colunas reais faltantes, mantendo `raw_data` para compatibilidade.
7. Criar rotina idempotente de importacao staging -> modelo normalizado.
8. Implementar detalhe da OP e Kanban/backlog por area no frontend.
9. Validar localmente com Node/npm e Supabase CLI antes do push.
10. Fazer commit em `dev` e push para `origin/dev` somente depois da triagem dos arquivos legados/sensiveis.

## Decisao Recomendada

Continuar com monorepo e Supabase como backend. O foco tecnico agora deve ser ingestao dos XLSX, consolidacao das chaves (`oper_b2b`, contrato compra, contrato venda, parceiro e OL) e conversao dos checklists/documentos em regras auditaveis do Farol.