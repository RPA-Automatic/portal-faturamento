> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; consulte código e decisões no repositório canônico. Estado planejado não equivale a implantação.

> Fonte: `docs/decisions/ADR-0001-organizacao-azure-devops.md`

# ADR-0001 — Organização por produto no Azure DevOps

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: quando mudar a estrutura de equipes  
> Documentos relacionados: [Operação Azure DevOps](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FDevOps-e-operacao)

## Contexto

A wiki compartilhada publicava páginas do SDA diretamente na raiz, misturando a navegação entre produtos. O usuário criou o épico #26 para o Faturamento e confirmou que os produtos devem permanecer no projeto Azure DevOps RPA Automatic.

## Alternativas

Criar Team Projects independentes; criar wikis independentes no mesmo projeto; ou manter projeto/wiki compartilhados com árvore e épico por produto.

## Decisão registrada

Usar RPA Automatic, um épico por produto e páginas sob o slug correspondente. Reutilizar #1 (SDA) e #26 (Faturamento). GitHub continua como repositório de código; docs/ é canônico; Wiki é a superfície operacional. Planejar o Faturamento em quatro sprints de duas semanas.

## Consequências

Navegação e backlog precisam de identificação explícita de produto. O publicador deve impedir escrita fora de sua raiz. Mudanças de documentação mantêm rastreabilidade até a fonte. A autorização existente do projeto compartilhado se aplica às páginas; separação de navegação não cria isolamento de permissões.

## Validação e revisão

Consultar árvore remota, conferir IDs das páginas movidas, conteúdo publicado e relações dos cards. Repetir publicações deve resultar em zero alterações quando a fonte não mudar. Revisar a decisão se houver exigência de isolamento de acesso ou equipes independentes.



[Voltar ao produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)
