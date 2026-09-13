> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; consulte código e decisões no repositório canônico. Estado planejado não equivale a implantação.

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

# Desenvolvimento local e publicação

> Status: Aprovado  
> Responsável: @RodrigoFreitas16n91  
> Versão: 2.0  
> Última revisão: 2026-09-13

## Ambientes

O projeto usa Node.js 22, React/Vite e Supabase. `dev` é a branch de desenvolvimento; `main` publica produção no Netlify. O banco remoto fiscal é único, conforme a ADR-0002 (`docs/decisions/ADR-0002-banco-fiscal-unico.md`, fonte no repositório); testes de banco devem usar uma instância local isolada.

| Ambiente | Aplicação | Banco |
|---|---|---|
| Desenvolvimento | Vite local | Supabase/Postgres local |
| CI | Build e testes sintéticos | Postgres 17 efêmero |
| Produção | `https://portal-fiscal-faturamento.netlify.app` | `eukazzizamxratkavcap` |

Não apontar testes de carga ou cenários sintéticos para o banco remoto. Não provisionar outra branch paga como pré-requisito do desenvolvimento.

## Configuração local

Copie `frontend/.env.example` para `frontend/.env.local` e configure URL e chave pública do banco local. Esse arquivo é ignorado pelo Git.

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<chave publica local>
VITE_AUTH_OAUTH_PROVIDERS=
```

A lista de provedores sociais permanece vazia até os aplicativos estarem configurados. A chave publicável `sb_publishable_*` pode estar no frontend; `sb_secret_*`, `service_role` e Client Secrets OAuth nunca podem estar em arquivos públicos ou variáveis `VITE_`.

```bash
npm --prefix frontend ci
npm --prefix frontend run dev
```

O Vite deste repositório usa a porta 3000 por padrão. Para OAuth local, registre exatamente o endereço efetivamente usado e o callback da instância Supabase local. Não reutilize credenciais de aplicativos de clientes.

## Autenticação

O acesso por e-mail permite cadastro, confirmação, login e logout. A conta criada não recebe acesso automático às operações: depende do perfil autorizado e das políticas RLS. Os provedores sociais planejados são Microsoft (`azure`), GitHub (`github`) e Google (`google`).

O SDK usa PKCE, armazena a sessão e processa o callback uma única vez. Não reintroduzir troca manual concorrente de tokens ou roteamento que consuma o fragmento OAuth antes do SDK.

A configuração dos aplicativos, os callbacks e a habilitação por `VITE_AUTH_OAUTH_PROVIDERS` estão no [passo a passo OAuth](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FSeguranca). Não declarar um provedor homologado somente porque seu botão aparece ou porque `/authorize` responde com redirecionamento.

## Validação

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
node scripts/test_auth_ui.cjs
node scripts/test_portal_ui.cjs
python3 -m unittest discover -s scripts -p 'test_*.py' -v
```

`lint` executa TypeScript (`tsc --noEmit`). Os testes de navegador requerem Chromium do Playwright; a instalação em CI já está configurada. Eles interceptam o Supabase com dados sintéticos e não autenticam contas reais nos provedores.

Para alterações de banco, execute também `python3 scripts/test_database.py` contra Postgres local. O script cria e descarta um banco isolado, aplica migrations e verifica invariantes e RLS. Versões e hash das migrations remotas constam no manifesto de implantação.

## Publicação

1. Desenvolver e validar na `dev`.
2. Revisar alterações e documentação. Para migrations, validar localmente antes de aplicar no alvo fiscal autorizado.
3. Integrar a `main`; o Netlify compila `frontend/` e publica `frontend/dist/`.
4. Confirmar o commit efetivamente publicado, os checks de CI e a interface no domínio de produção.
5. Validar login real após configurar cada provedor OAuth. Registrar limitações e evidências sem credenciais ou dados pessoais.

A configuração pública de produção está em `[context.production.environment]` de `netlify.toml`. Ela contém URL fiscal, chave publicável e lista de provedores habilitados. Nenhum segredo OAuth pertence a esse arquivo. Previews e branch deploys precisam de sua própria configuração explícita; não herdar produção para testes de escrita.



[Voltar ao produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)
