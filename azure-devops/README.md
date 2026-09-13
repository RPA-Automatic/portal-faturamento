# Azure DevOps — Portal Faturamento

Leia [operação e publicação](../docs/operations/azure-devops.md) e [plano de entrega](../docs/product/delivery-plan.md).

- `config.json`: destino, raiz da wiki e épico existente.
- `backlog.json`: 12 entregas e 48 tarefas, critérios e dependências.
- `backlog-state.json`: IDs criados, sem substituir o estado atual do Boards.
- `board-views.json`: área, iterações e consultas compartilhadas verificadas.
- `wiki/portal-faturamento*`: projeção fiscal revisada, gerada por `scripts/build_devops_wiki.py`.
- `portfolio/`: catálogo e padrão de navegação compartilhados, conteúdo operacional transversal.
- `wiki-migration.json`: evidência dos IDs preservados ao agrupar páginas do SDA.

Os scripts de publicação e backlog usam plano por padrão e `--apply` para escrever no escopo configurado. O acervo privado nunca é fonte direta de publicação.
