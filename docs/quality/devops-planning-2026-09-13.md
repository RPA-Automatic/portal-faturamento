# Evidência — organização DevOps e plano de implantação

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: na primeira planning  
> Documentos relacionados: [Plano de entrega](../product/delivery-plan.md), [Operação DevOps](../operations/azure-devops.md)

> Atualização posterior no mesmo dia: processo convertido para Agile; as 12 entregas fiscais agora são User Stories sob cinco Features. Consulte [hierarquia atual](../governance/work-item-hierarchy.md). As contagens abaixo registram a configuração inicial.

## O que já havia dos pedidos do chat anterior

| Pedido | Evidência disponível | Limite |
|---|---|---|
| Separar documentação dos produtos | Índices e árvores docs/ próprios nos três repositórios | Reorganização local ainda sem commit/PR nesta entrega |
| Governança, especificações e diagramas | AGENTS, metadados, SDDs/arquitetura e fontes Mermaid/SVG | Documentação não comprova todas as capacidades implementadas |
| Evoluir experiência cockpit/canvas do Orchestrator | Visão, SDD e catálogo de agentes documentados | Evolução planejada, fora do desenvolvimento fiscal desta entrega |
| Revisar acervo fiscal | Inventário e requisitos neutros em fiscal-context e source-review | Regras fiscais, SLA e encerramento ainda exigem homologação |
| Corrigir importador de compras | Mapeamento local corrigido, testes e comparação com fonte registrados | Registros remotos ainda precisam de reprocessamento autorizado |
| Separar ambientes/bancos | Destinos locais corrigidos e bloqueios de carga preparados | DEV exclusivo, recuperação e implantação remota pendentes |
| Evoluir portal fiscal | Frontend com autenticação, Farol, filtros, indicadores e backlog | Detalhe da OP, ações, validação integrada e go-live no plano |

## Alterações remotas verificadas nesta entrega

Organização `rpa-automatic`, projeto privado compartilhado `RPA Automatic`. Consulta final da estrutura e do backlog em 2026-09-13, às 18:03 UTC; escopo limitado aos três produtos identificados, sem truncamento na árvore retornada ou no lote de 60 cards fiscais.

- Épicos #1 (SDA) e #26 (Faturamento) reutilizados; #87 criado para Orchestrator, que não tinha épico.
- Wiki com 39 páginas: 13 do Faturamento, 12 do Orchestrator, 12 do SDA e duas páginas compartilhadas de catálogo/padrão.
- Oito páginas antigas do SDA movidas com API nativa; IDs e conteúdo conferidos após cada movimento. Histórico mantido no repositório da Wiki.
- Faturamento: 12 Issues e 48 Tasks criadas sob #26; cada uma das quatro sprints contém três Issues e doze Tasks.
- 23 relações de dependência entre entregas verificadas. Cada Task tem pai, área e iteração corretos.
- Área fiscal incluída explicitamente no board da equipe; área padrão e sprint genérica anteriores preservadas. Quatro iterações fiscais selecionadas, sem datas inventadas.
- Cinco consultas compartilhadas verificadas: backlog completo com 61 itens, incluindo o épico, e 15 itens por sprint.
- Links de repositório e wiki associados aos três épicos. Nenhum responsável, hora realizada ou conclusão foi atribuído por inferência.

## Arquivos e rastreabilidade

Plano detalhado: `docs/product/delivery-plan.md`. Especificação técnica consolidada: `docs/architecture/SDD.md`. Decisão de organização: `docs/decisions/ADR-0001-organizacao-azure-devops.md`.

Configuração, IDs e evidências sem credenciais: `azure-devops/config.json`, `backlog.json`, `backlog-state.json`, `board-views.json`, `wiki-migration.json` e `verification.json`. Projeções em `azure-devops/wiki/`; catálogo/padrão em `azure-devops/portfolio/`.

Scripts fiscais: geração de wiki por lista explícita, publicação limitada à raiz e criação idempotente do backlog. O publicador SDA foi alterado para percorrer somente sua árvore; fontes de wiki foram realocadas no repositório correspondente. Índices dos três projetos apontam ao DevOps.

## Validações

- Faturamento: 13 testes passaram, incluindo publicação restrita, ETag, plano sem escrita, replay, bloqueio de symlink e regressão da leitura do campo Parent da API.
- SDA: 13 testes passaram; sete testes do runtime Azure foram ignorados por dependências opcionais ausentes. O novo teste prova que o publicador não recria páginas soltas na raiz.
- Reexecução do planejamento fiscal: 60 cards reutilizados, zero novas criações previstas. Republicação planejada das três árvores: todas as páginas inalteradas.
- Links internos da wiki conferidos contra a árvore remota. Links Markdown locais e `git diff --check` passaram nos três repositórios.
- Não houve navegador disponível para inspeção visual. Conteúdo, hierarquia, vínculos e IDs foram verificados pela API; renderização visual dos diagramas permanece sem inspeção nesta sessão.
- Frontend não foi modificado nesta entrega; typecheck/build já haviam passado na leitura inicial do projeto.

## Impacto e próximos passos

As alterações remotas atingiram Wiki, work items, consultas e configuração de área/iterações do board. Não alteraram permissões, Supabase, Netlify nem produção do portal. Nenhum commit, push ou PR GitHub foi executado nesta entrega; alterações locais anteriores foram preservadas.

Prazo proposto: quatro sprints de duas semanas, oito semanas no total. Definir data de início, capacidade, responsáveis e agenda dos homologadores na planning. Regras críticas e DEV exclusivo são prioridades da sprint 1. Operação assistida e encerramento dependem de estabilidade e aceite; estender a janela se necessário.
