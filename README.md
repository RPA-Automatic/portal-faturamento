# Portal de Faturamento e Liberacao de Embarque

Portal operacional da Biond Agro para acompanhar OPs/Operacoes B2B, contratos de compra e venda, documentos fiscais, ordens logisticas, checklists por area e pendencias de faturamento em um fluxo sequencial E1..E6.

O projeto transforma relatorios TOTVS/Datasul e checklists operacionais em um Farol auditavel, com Kanban por etapa, pendencias por area, evidencias, historico e base para automacao de regras.

## Objetivos

- Centralizar a visao de cada OP em um unico portal.
- Reduzir controle manual em planilhas e trocas dispersas de documentos.
- Relacionar contratos de compra, contratos de venda, fornecedores, clientes, OLs e NFs.
- Dar clareza sobre qual area precisa agir em cada etapa.
- Criar trilha auditavel de pendencias, evidencias e mudancas de estado.
- Preparar o produto para boas praticas de seguranca, RLS e LGPD.

## Estado Atual

O projeto esta em fase de MVP tecnico na branch `dev`.

Ja existe:

- frontend React + Vite publicado via Netlify branch deploy;
- autenticacao Supabase Auth com e-mail/senha, GitHub e Azure/Microsoft OAuth;
- schema Supabase inicial com tabelas operacionais, staging, views, regras e RLS;
- importador local dos principais XLSX para tabelas `stg_*`;
- registro de hashes/metadados dos documentos das OPs em `documents`;
- Kanban E1..E6 no frontend;
- documentacao de arquitetura, dominio, fontes de dados, ingestao, LGPD e checklist operacional.

Ainda falta:

- consolidar staging em tabelas normalizadas (`operations`, `contracts`, `partners`, `logistics_orders`, `fiscal_documents`);
- gerar `pending_items` e `evidence` automaticamente a partir das regras;
- criar painel lateral de OP com checklist editavel por area;
- aplicar hardening RLS no Supabase DEV/PROD;
- criar tela administrativa para aprovar usuarios e definir area/perfil.

## Fluxo Operacional

As operacoes seguem uma maquina de estados sequencial:

```text
E1 Documentacao Basica
-> E2 Validacao Fiscal
-> E3 Contratos e Regras TOTVS
-> E4 Logistica
-> E5 Faturamento
-> E6 Concluido
```

Cada OP deve permanecer na primeira etapa com pendencia bloqueante. Quando nao houver bloqueios nem alertas, a operacao pode avancar para `E6`.

### Semaforo

- `verde`: etapa atual OK e sem pendencias abertas.
- `amarelo`: alerta, divergencia nao bloqueante ou observacao pendente.
- `vermelho`: pendencia bloqueante para avancar.

## Areas Envolvidas

| Area | Responsabilidade principal |
|---|---|
| Comercial | Documentacao inicial, IF compra/venda, cliente, fornecedor, pedido e comunicacao. |
| Fiscal | CFOP, cadastro cliente x fornecedor, regras fiscais, validacao de NF. |
| Gestao de Contratos | Contratos, regras Datasul, liberacao de contrato/pedido. |
| Logistica | OL, agendamento, origem, destino, transportadora e portais logisticos. |
| Faturamento | Primeira NF, dados adicionais, observacoes fiscais e conclusao operacional. |
| Administracao | Usuarios, regras, excecoes, templates e governanca. |

## Dados e Fontes

Os principais relatorios XLSX usados no MVP sao:

| Fonte | Papel | Staging |
|---|---|---|
| ES4004 | Hub de OP/Operacao B2B e contratos | `stg_es4004_contracts` |
| GG4164 | Contratos de compra e fornecedores | `stg_gg4164_purchase_contracts` |
| GG2037 | Contratos de venda e clientes | `stg_gg2037_sales_contracts` |
| GPLP40180 | Ordens logisticas, OL/rota e transporte | `stg_gplp40180_logistics_orders` |
| Documentos Fiscais | NFs, CFOP e dados fiscais | `stg_fiscal_documents` |
| Checklist RS/MT/Pre-Faturamento | Regras manuais por area | templates/checklist operacional |

Os documentos reais das OPs sao inventariados por hash SHA-256 e registrados na tabela `documents`. Os arquivos fisicos devem permanecer fora do Git e, em uma etapa futura, podem ir para Supabase Storage ou outro repositório documental controlado.

## Arquitetura

```text
Relatorios XLSX / Documentos OP
        |
        v
Scripts locais seguros / jobs server-side
        |
        v
Supabase PostgreSQL
  - stg_* para dados brutos
  - operations, contracts, partners
  - logistics_orders, fiscal_documents
  - documents, rules, pending_items, evidence
        |
        v
Views e RPCs seguras
        |
        v
Frontend React + Vite no Netlify
```

Principios adotados:

- preservar dados brutos em staging para auditoria e reprocessamento;
- consolidar dados em tabelas normalizadas para o produto;
- separar autenticacao de autorizacao;
- usar RLS e perfis por area;
- nunca expor service role no frontend;
- manter dados reais e segredos fora do Git.

## Estrutura do Repositorio

```text
.
├── docs/                         # Documentacao de produto, arquitetura, dados, seguranca e roadmap
├── frontend/                     # Aplicacao React + Vite + TypeScript
├── scripts/                      # Scripts locais de inventario/importacao usando service role local
├── supabase/                     # Backend Supabase oficial e migrations versionadas
├── netlify.toml                  # Build/deploy Netlify
├── .gitignore                    # Protecao de dados privados, builds e segredos
└── README.md                     # Este documento
```

Arquivos importantes:

- [docs/product-brief.md](docs/product-brief.md): visao de produto.
- [docs/architecture.md](docs/architecture.md): arquitetura geral.
- [docs/domain-model.md](docs/domain-model.md): entidades e conceitos.
- [docs/data-sources.md](docs/data-sources.md): fontes TOTVS/Datasul.
- [docs/operational-workflow.md](docs/operational-workflow.md): fluxo E1..E6.
- [docs/xlsx-ingestion-plan.md](docs/xlsx-ingestion-plan.md): plano de ingestao XLSX.
- [docs/checklist-portal-template.md](docs/checklist-portal-template.md): template recomendado para checklist no portal.
- [docs/security-lgpd-audit.md](docs/security-lgpd-audit.md): auditoria LGPD/RLS.
- [supabase/migrations](supabase/migrations): migrations oficiais do backend.

## Frontend

Stack:

- React 18;
- Vite 6;
- TypeScript;
- Supabase JS v2;
- Netlify para deploy.

Comandos:

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

Variaveis de ambiente do frontend:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_sua_chave_publicavel
```

Use somente `sb_publishable_*` no frontend. Nunca use `sb_secret_*` ou `service_role` em Netlify/Vite.

## Backend Supabase

A migration principal cria:

- tabelas normalizadas: `operations`, `contracts`, `partners`, `logistics_orders`, `fiscal_documents`, `documents`;
- governanca operacional: `rules`, `pending_items`, `evidence`, `state_history`, `exceptions`;
- observabilidade: `import_runs`, `job_logs`, `audit_logs`;
- staging: `stg_es4004_contracts`, `stg_gg4164_purchase_contracts`, `stg_gg2037_sales_contracts`, `stg_gplp40180_logistics_orders`, `stg_fiscal_documents`;
- views: `v_operations_farol`, `v_area_backlog`, `v_contract_drilldown`;
- RLS e policies iniciais.

### Autenticacao

O portal usa Supabase Auth com:

- Azure/Microsoft OAuth para colaboradores;
- e-mail e senha para acesso externo;
- GitHub OAuth para acesso externo/controlado.

Providers devem estar habilitados em cada projeto Supabase usado pelo ambiente.

## Seguranca e LGPD

Boas praticas ja adotadas:

- `data/private/` ignorado pelo Git;
- arquivos reais em `docs/**/*.xlsx`, `docs/**/*.docx`, `docs/**/*.pdf` ignorados;
- `supabase/supabase/` legado ignorado;
- scripts administrativos usam `SUPABASE_SERVICE_ROLE_KEY` somente via ambiente local;
- RLS habilitado nas tabelas sensiveis.

Hardening planejado:

- usuarios novos ficam `pending` ate aprovacao;
- usuarios precisam de `profile.status = active` para ler dados operacionais;
- usuarios externos devem ser vinculados a `partner_id`;
- externos so podem ver operacoes relacionadas ao proprio parceiro;
- staging e dados brutos ficam restritos a admin/job/service role;
- senhas de portais logisticos nao devem ser armazenadas em texto no banco operacional.

A migration de hardening esta em:

- [supabase/migrations/20260506000100_harden_rls_profiles.sql](supabase/migrations/20260506000100_harden_rls_profiles.sql)

Antes de aplicar em producao, valide no Supabase DEV e configure pelo menos um usuario administrador ativo.

Depois de aplicar a migration de hardening no Supabase DEV, promova o primeiro administrador pelo SQL Editor usando a conta que ja fez login no portal:

```sql
select public.bootstrap_admin_profile('seu-email@empresa.com');
```

Essa funcao so pode ser executada com contexto privilegiado/service role; usuarios autenticados comuns nao recebem permissao para executa-la.

## Ingestao dos XLSX

Os arquivos reais devem ficar fora do Git, por exemplo:

```text
data/private/relatorios-xlsx/
data/private/operacoes/
data/private/documentos-processo/
```

Inventariar XLSX:

```bash
c:/Projetos/portal-faturamento/.venv/Scripts/python.exe scripts/inventory_xlsx.py data/private/relatorios-xlsx --output data/private/xlsx-inventory.json
```

Dry-run da importacao:

```bash
c:/Projetos/portal-faturamento/.venv/Scripts/python.exe scripts/import_xlsx_to_supabase.py data/private/relatorios-xlsx --dry-run
```

Importar para Supabase DEV:

```powershell
$env:SUPABASE_URL = "https://seu-projeto-dev.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_sua_chave_server_side"
c:/Projetos/portal-faturamento/.venv/Scripts/python.exe scripts/import_xlsx_to_supabase.py data/private/relatorios-xlsx
```

O importador cria `import_runs`, grava hash SHA-256 e pula arquivos que ja possuem importacao concluida, salvo quando usado `--force`.

## Controle de Documentos

Inventariar documentos das OPs:

```bash
c:/Projetos/portal-faturamento/.venv/Scripts/python.exe scripts/inventory_documents.py data/private/operacoes --output data/private/documents-inventory.json
```

Registrar hashes/metadados no Supabase:

```powershell
$env:SUPABASE_URL = "https://seu-projeto-dev.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_sua_chave_server_side"
c:/Projetos/portal-faturamento/.venv/Scripts/python.exe scripts/register_documents_to_supabase.py data/private/documents-inventory.json
```

Neste momento o sistema registra metadados e assinatura dos arquivos. Upload fisico para Storage deve ser tratado em etapa posterior com buckets privados e signed URLs.

## Ambientes

Fluxo recomendado:

```text
GitHub dev  -> Netlify Branch Deploy dev -> Supabase DEV
GitHub main -> Netlify Production         -> Supabase PROD
```

No Netlify, configure variaveis por contexto:

| Contexto | Supabase |
|---|---|
| Production | PROD |
| Branch deploys | DEV |
| Deploy previews | DEV |

## Deploy

O Netlify usa [netlify.toml](netlify.toml):

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "dist"
```

Para atualizar o branch deploy, envie commits para `dev`.

## Roadmap Tecnico

1. Aplicar hardening RLS no Supabase DEV.
2. Criar rotina de consolidacao staging -> modelo operacional.
3. Gerar pendencias e evidencias automaticamente a partir das regras.
4. Criar painel lateral de OP com abas de Resumo, Checklist, Contratos, Logistica, Fiscal/NF, Documentos e Historico.
5. Criar administracao de usuarios/perfis/areas.
6. Criar importacao dos checklists como templates versionados.
7. Adicionar testes de regras criticas e Playwright para fluxos principais.
8. Promover fluxo DEV -> PROD com checklist de seguranca.

## Cuidados Operacionais

- Nunca commitar `.env`, dumps, XLSX reais, documentos fiscais, DOCX/PDF de operacao ou chaves.
- Nunca colocar `sb_secret_*` no frontend ou Netlify client-side.
- Rotacionar chaves se forem expostas em chat, print ou commit.
- Validar `supabase/config.toml` e projeto alvo antes de rodar `db push`.
- Aplicar migrations primeiro em DEV.
- Revisar policies RLS antes de liberar usuarios externos.

## Licenca e Uso

Repositorio publico para desenvolvimento do Portal de Faturamento Biond Agro. Dados reais de operacao, documentos fiscais, chaves e arquivos privados nao fazem parte do repositorio e devem permanecer em ambientes controlados.
