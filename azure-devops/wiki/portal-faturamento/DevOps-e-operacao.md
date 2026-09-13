> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; a reorganização documental local ainda aguarda commit/PR no GitHub. Estado planejado não equivale a implantação.

> Fonte: `docs/operations/azure-devops.md`

# Azure DevOps — documentação e entrega

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: a cada sprint  
> Documentos relacionados: [Catálogo](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento), [Plano de entrega](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FTo-do)

## Destino

- Organização: `rpa-automatic`.
- Projeto compartilhado: [RPA Automatic](https://dev.azure.com/rpa-automatic/RPA%20Automatic).
- Épico do produto: [#26 — Portal de Faturamento](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/26).
- Wiki: [portal-faturamento](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento).
- Código: [GitHub](https://github.com/RPA-Automatic/portal-faturamento), branches `dev` e `main`.

Decisão do usuário em 2026-09-13: manter os produtos no projeto Azure DevOps `RPA Automatic`, cada um com seu épico e árvore de wiki. Não criar um Team Project separado por produto.

## Organização

Raiz da Wiki: catálogo de produtos e padrão comum. Cada produto publica somente em `/<slug>` e suas subpáginas. Faturamento usa `/portal-faturamento`; Orchestrator usa `/portal-orchestrator-ai`; SDA usa `/solution-design-architecture-agent`.

Subpáginas mínimas: visão, arquitetura, especificação técnica, diagramas, fluxo operacional, dados/integrações, segurança, DevOps/operação, planejamento, decisões e qualidade. Conteúdo existente específico de um produto deve ser movido para sua árvore com a API de movimentação, preservando histórico e ID. Não copiar páginas genéricas de um produto para a raiz compartilhada.

## Fonte canônica e publicação

`docs/` permanece a fonte técnica. `azure-devops/wiki/` contém a projeção revisada para publicação; `azure-devops/config.json` fixa projeto, wiki e raiz permitida. A atualização da Wiki não altera código, estado dos cards ou configuração de produção. Alterações documentais locais ainda precisam de commit/PR no GitHub; a publicação da Wiki é independente.

```bash
python3 scripts/build_devops_wiki.py
python3 scripts/publish_devops_wiki.py
python3 scripts/publish_devops_wiki.py --apply
```

Autenticar pelo Azure CLI ou configurar `AZURE_DEVOPS_BEARER_TOKEN` / `AZURE_DEVOPS_PAT` fora do chat e do Git. `AZURE_CLI_WRAPPER` permite usar um wrapper já instalado. O publicador consulta todas as páginas antes de escrever, exige ETag para edição e confirma o conteúdo remoto após cada escrita. Em conflito, interromper e reconciliar. Nunca publicar `docs/docs_antigos/`.

## Backlog

Processo Agile: Epic → Feature → User Story → Task. O épico existente é reutilizado. As entregas e tarefas têm chaves estáveis em `azure-devops/backlog.json`, área `RPA Automatic\portal-faturamento` e quatro iterações sob o mesmo produto. Duração: duas semanas por sprint; início a definir.

```bash
python3 scripts/configure_devops_backlog.py
python3 scripts/configure_devops_backlog.py --apply --out azure-devops/backlog-state.json
```

O script cria apenas itens ausentes identificados pelas tags do plano, valida o pai e adiciona dependências entre entregas. Não redefine responsável, horas, estado, datas ou conteúdo de cards já existentes. `backlog-state.json` registra os IDs; o Azure Boards é a fonte do estado atual. Qualquer mudança de escopo posterior deve ser revisada nos cards e no plano canônico.

## Critérios operacionais

Planning confirma capacidade e agenda; review registra aceite; Closed requer testes e evidências. Permissões de produção, homologação e implantação são tratadas nas respectivas tarefas. Esta configuração de planejamento não equivale a deploy do portal nem CI remoto instalado.

Referências oficiais: [movimentação de páginas](https://learn.microsoft.com/en-us/rest/api/azure/devops/wiki/page-moves/create?view=azure-devops-rest-7.1), [edição com ETag](https://learn.microsoft.com/en-us/rest/api/azure/devops/wiki/pages/create-or-update?view=azure-devops-rest-7.1), [iterações e áreas](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/classification-nodes/create-or-update?view=azure-devops-rest-7.1).

## Visibilidade no board e consultas

A equipe compartilhada inclui explicitamente a área `RPA Automatic\portal-faturamento`, preservando a área padrão anterior. As quatro iterações do produto foram selecionadas para a equipe; a sprint genérica anterior foi preservada. Datas permanecem sem configuração até definir início.

Consultas compartilhadas ficam na pasta `portal-faturamento`:

- [00 - Backlog completo](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/d8b71d2e-7433-49f0-b360-80aae00e25ef)
- [01 - Sprint 1](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/85d9214d-c005-4874-b3a6-4250640574f8)
- [02 - Sprint 2](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/8f703990-a2b3-46ac-9bd8-bced80fc9329)
- [03 - Sprint 3](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/48c04abc-62b1-4559-afbb-8c555f794351)
- [04 - Sprint 4](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/d24a1277-cd63-427c-86fd-0d3ff4d807dc)


## Hierarquia Agile

[Árvore do produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/25bbb215-ea03-4d92-bcca-658451359c4a): Epic #26 → Features #88–#92 → 12 User Stories → 48 Tasks. Consulte o [padrão de trabalho](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FOrganizacao-do-backlog) para Issues, Bugs, subtarefas e estados.

Os boards Epics, Features e Stories estão habilitados e mapeados para New, Active, Resolved e Closed. As consultas por tipo estão na pasta do produto. O campo legado `issues` em `backlog.json` identifica entregas; em Agile o provisionador utiliza **User Story** e o `feature_key` define o pai. Não renomear os IDs estáveis PF-Fxx.

Consultas específicas:

- [Features](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/c8ef8f03-ca94-482e-8c1c-5c63255d179e)
- [User Stories](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/f6a48a8f-9245-4eb7-a052-5c563e8cda8d)
- [Tasks](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/9a0af423-73fb-496f-b220-6206c0dc9f93)
- [Issues - impedimentos](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/cf2778ab-265e-4513-80a3-1eababbd03d8)
- [Bugs - defeitos](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/c96b1547-b36b-495b-8903-6d45d645a97a)


> Fonte: `docs/operations/development.md`

# Desenvolvimento Local

> Atualização de 2026-09-13: nove migrations aplicadas no banco fiscal, 32 tabelas com RLS e ficha da OP disponível para consulta. Ambiente remoto único confirmado pelo usuário; DEV local. Consulte o [modelo vigente](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FModelo-de-dados) e a ADR-0002 (`docs/decisions/ADR-0002-banco-fiscal-unico.md`, fonte no repositório). As referências abaixo a DEV remoto pendente e sete migrations descrevem o diagnóstico anterior.

> Status: Aprovado  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: 2026-12-13
> Documentos relacionados: [Catálogo documental](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)  

## Pré-Requisitos

- Node.js LTS.
- Git.
- Docker Desktop.
- Supabase CLI.
- pnpm ou npm.

## Fluxo de Trabalho

```bash
git clone https://github.com/RPA-Automatic/portal-faturamento.git
cd portal-faturamento
git switch dev
```

## Variáveis de Ambiente Local

Criar um arquivo `.env.local` dentro de `frontend/` para a aplicacao React + Vite. Esse arquivo fica somente na maquina local e nao deve ser enviado ao Git.

Use `frontend/.env.example` como modelo:

Variáveis esperadas:

```bash
VITE_SUPABASE_URL=https://seu-projeto-dev.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_sua_chave_publicavel_dev
```

Para desenvolvimento local, aponte essas variaveis para o projeto Supabase DEV.

Em 2026-09-13, o DEV fiscal exclusivo ainda aguarda provisionamento. Registre sua referência em `supabase/targets.json`; até lá, os scripts bloqueiam cargas DEV remotas. A produção fiscal usa `eukazzizamxratkavcap`. Consulte o procedimento de separação (`docs/operations/database-separation.md`, fonte no repositório).

Nao exponha `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_*` ou `service_role` no frontend. Chaves privilegiadas devem existir somente em Edge Functions, jobs server-side ou configuracoes seguras do Supabase.

## Ambientes Netlify e Supabase

O portal usa ambientes separados para evitar que testes afetem dados de producao:

```text
GitHub dev  -> Netlify Branch Deploy dev -> Supabase Portal Faturamento Dev
GitHub main -> Netlify Production         -> Supabase Portal Faturamento
```

No Netlify, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com valores diferentes por contexto:

```text
Production      -> URL e publishable key do Supabase PROD
Deploy Previews -> URL e publishable key do Supabase DEV
Branch deploys  -> URL e publishable key do Supabase DEV
```

As variaveis do frontend devem usar apenas a chave `sb_publishable_*` do Supabase. Nunca use chaves `sb_secret_*` ou `service_role` no Netlify frontend.

## Autenticação

O frontend usa Supabase Auth com tres caminhos:

```text
Colaborador interno -> Azure/Microsoft OAuth
Acesso Externo   -> e-mail e senha
Acesso Externo   -> GitHub OAuth
```

Para que esses fluxos funcionem, habilite os providers em cada projeto Supabase usado pelo ambiente:

```text
Supabase DEV  -> habilitar Azure, Email e GitHub
Supabase PROD -> habilitar Azure, Email e GitHub antes do go-live
```

Os providers OAuth precisam ter suas redirect URLs configuradas no provedor externo e no Supabase Auth. Para Netlify dev, use a URL `https://dev--portal-fiscal-faturamento.netlify.app`; para producao, use `https://portal-fiscal-faturamento.netlify.app`.

## Migrações Supabase

As mudancas de banco devem ser versionadas em `supabase/migrations/`.

Fluxo recomendado sem Supabase Branching pago:

```text
1. Criar ou alterar uma migration em supabase/migrations/
2. Aplicar primeiro no Supabase DEV
3. Testar no Netlify dev
4. Abrir PR de dev para main
5. Aplicar a mesma migration no Supabase PROD
6. Fazer merge para main
```

Como `supabase/config.toml` pode apontar para um projeto especifico, confirme sempre o projeto alvo antes de rodar comandos como `supabase link`, `supabase db push` ou `supabase migration list`.

## Containers

O ambiente local deve usar containers para banco, serviços auxiliares, filas e ferramentas de desenvolvimento quando aplicável.

Opções recomendadas:

- Supabase CLI para subir stack local do Supabase.
- Docker Compose para serviços auxiliares que não forem cobertos pelo Supabase local.
- n8n local opcional para prototipar ingestão e orquestração.

## Scripts Esperados

No frontend atual, usar os scripts do Vite dentro de `frontend/`:

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Qualidade

- ESLint e Prettier configurados.
- TypeScript em modo estrito.
- Testes unitários para regras de estado e consolidação do Farol.
- Testes de integração para ingestão e normalização.
- Playwright para fluxos principais da UI.

## Branches

- `main`: produção/estável.
- `dev`: desenvolvimento contínuo.
- `feature/*`: funcionalidades específicas.

## Critérios Antes de Abrir PR

- Build passando.
- Lint sem erros.
- Testes relevantes passando.
- Migrações revisadas.
- RLS revisada quando houver nova tabela.
- Documentação atualizada quando houver mudança de domínio, regra ou fluxo.



[Voltar ao produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)
