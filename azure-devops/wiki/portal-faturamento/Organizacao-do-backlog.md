> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; a reorganização documental local ainda aguarda commit/PR no GitHub. Estado planejado não equivale a implantação.

> Fonte: `docs/governance/work-item-hierarchy.md`

# Organização de trabalho — épicos, funcionalidades e tarefas

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: a cada alteração do processo ou da hierarquia  
> Documentos relacionados: [Operação DevOps](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FDevOps-e-operacao), [Plano de entrega](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FTo-do)

## Estado atual e objetivo

O projeto compartilhado **RPA Automatic usa Agile**. Os 87 cards existentes foram preservados: 18 entregas passaram de Issue para User Story, 66 Tasks mantiveram seus pais e três Epics foram reutilizados. Oito Features foram criadas para agrupar capacidades. A consulta após a migração confirmou 95 cards: 3 Epics, 8 Features, 18 User Stories e 66 Tasks; dois cards Active e 93 New.

O Portal de Faturamento possui **1 Epic, 5 Features, 12 User Stories e 48 Tasks**, distribuídas em quatro sprints de duas semanas. Cada sprint contém três User Stories e 12 Tasks. As Features podem atravessar sprints e permanecem na iteração raiz.

[Consultar a árvore do Portal de Faturamento](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/25bbb215-ea03-4d92-bcca-658451359c4a).

## Modelo adotado

| Tipo | Uso | Exemplo |
|---|---|---|
| Epic | Objetivo de cada produto | Portal de Faturamento, #26 |
| Feature | Capacidade ou frente de entrega com valor identificável | Experiência operacional e liberação de embarque |
| User Story | Incremento com critérios de aceite e tarefas | Detalhe completo da operação, preservando o ID #47 |
| Task | Trabalho técnico ou operacional executável | Exibir pendências, evidências e histórico |
| Subtarefa | Passo verificável dentro da Task; padrão inicial em checklist | Consultar evidências, apresentar origem, testar acesso negado |
| Issue | Impedimento, decisão pendente ou problema de coordenação | Acesso DEV indisponível, com impacto e ação vinculada |
| Bug | Defeito reproduzível | Semáforo incorreto para cenário documentado |

Hierarquia de execução: **Epic → Feature → User Story → Task**. Issues e Bugs são vinculados ao trabalho afetado, sem formar níveis obrigatórios dessa hierarquia. Evitar criar um Bug apenas porque existe um risco ou uma atividade ainda não implementada.

Subtarefas independentes, com responsável ou esforço próprios, devem virar Tasks irmãs sob a mesma User Story. O Azure Boards não oferece um nível de backlog nativo abaixo de Task; aninhamento de tarefas pode ocultar pais em algumas telas. As 48 Tasks fiscais recebem checklists de marcação manual derivados dos critérios de aceite, com passo para registrar evidências. Não representam cards Subtask nem horas adicionais.

## Agrupamento publicado

| Feature | User Stories preservadas |
|---|---|
| #88 PF-C01 — Fundação, requisitos e ambientes | #27, #32, #37 |
| #89 PF-C02 — Experiência operacional e liberação de embarque | #42, #47, #52 |
| #90 PF-C03 — Integração TOTVS e motor de verificações | #57, #62 |
| #91 PF-C04 — Qualidade e homologação | #67, #72 |
| #92 PF-C05 — Implantação e transição para operação | #77, #82 |
| #93 SDA-C01 — Fundação e hospedagem do agente | #2, #6 |
| #94 SDA-C02 — Integrações do agente | #10, #14 |
| #95 SDA-C03 — Qualidade e piloto supervisionado | #18, #22 |

Não criar Features vazias para o Orchestrator, que possui apenas seu épico e precisa de decomposição própria. Features agrupam capacidades; não substituem sprints nem adicionam prazo ao plano fiscal.

## Migração e preservação

O plano em `azure-devops/agile-migration-plan.json` identifica os 87 cards existentes e o agrupamento em oito Features. IDs, responsáveis, descrições, evidências, datas e dependências devem ser preservados. Mapear estados por significado: To Do → New, Doing → Active, Done → Closed. Na consulta inicial havia dois cards Doing; não reiniciá-los como New.

O script `scripts/migrate_devops_hierarchy.py` verifica a disponibilidade de Agile, consulta os cards, prepara patches com revisão e usa validateOnly antes da primeira escrita real. Converte os tipos e estados; cria Features ausentes com chaves estáveis; muda somente os vínculos de pai necessários. Cada alteração é conferida no destino. Em conflito, reler e reconciliar, sem forçar revisões.

```bash
python3 scripts/migrate_devops_hierarchy.py
python3 scripts/migrate_devops_hierarchy.py --apply --out azure-devops/agile-hierarchy-state.json
```

A verificação remota comparou os 87 cards antes/depois: títulos, responsáveis, áreas, iterações, dependências e demais vínculos foram preservados. As descrições originais foram preservadas; os checklists fiscais acrescentam uma seção ao final. Os dois cards Doing permaneceram em andamento como Active. Os provisionadores fiscal e SDA reconhecem Agile e reutilizam as User Stories e Features existentes, sem recriar Issues de entrega.

## Boards e acompanhamento

Epics, Features e Stories ficam habilitados nos backlogs. Colunas: **A fazer (New) → Em andamento (Active) → Em validação (Resolved) → Concluído (Closed)**. Tasks usam New → Active → Closed no taskboard. Bugs são planejados junto às Stories e também possuem consulta específica. Issues são acompanhadas em consulta própria como impedimentos. As consultas ficam em Shared Queries, em uma pasta por produto, com árvore e listas por tipo.

Não criar Issues/Bugs artificiais para preencher as consultas. Um impedimento deve indicar impacto, trabalho afetado e ação necessária; um Bug precisa de passos de reprodução, esperado, observado, ambiente e evidências. Vincular ambos ao trabalho afetado e usar área/tag do produto.

## Histórico da troca de processo

A API de migração recusou a troca entre famílias Basic e Agile. O usuário realizou a troca pela interface; a leitura remota confirmou Agile antes de converter os cards. Essa etapa está resolvida. Evidências sem dados pessoais: `azure-devops/agile-verification.json`, `agile-hierarchy-state.json`, `agile-board-state.json` e `task-checklists-state.json`.

Referências: [troca Basic → Agile](https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/change-process-basic-to-agile?view=azure-devops), [limitação da API](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/project-process-migration/migrate-projects-process?view=azure-devops-rest-7.1), [hierarquias e tarefas aninhadas](https://learn.microsoft.com/en-us/azure/devops/boards/backlogs/resolve-backlog-reorder-issues?view=azure-devops).



[Voltar ao produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)
