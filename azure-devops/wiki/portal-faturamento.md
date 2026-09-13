# Portal Faturamento — Liberação de Embarque

> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; consulte código e decisões no repositório canônico. Estado planejado não equivale a implantação.

[Épico #26](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/26) · [Código no GitHub](https://github.com/RPA-Automatic/portal-faturamento)

O portal antecipa impedimentos de embarque e apresenta, por OP, o que falta, quem resolve e qual evidência sustenta a liberação.

## Situação verificada

Farol inicial, filtros, indicadores e autenticação existem no código. Documentação organizada e correção local do importador de compras disponíveis. Ficha de consulta da OP e esquema fiscal de 32 tabelas implantados. Cargas, ações de aprovação, validação integral das regras e implantação operacional permanecem no plano. Typecheck e build locais passaram em 2026-09-13; isso não comprova operação remota.

## Entrega em quatro sprints

Quatro sprints de duas semanas (oito semanas), com início/capacidade a definir; 5 Features, 12 User Stories e 48 Tasks sob o épico #26.

| Sprint | Foco |
|---|---|
| 1 | Requisitos, ambientes e qualidade base |
| 2 | Farol, detalhe e tratamento operacional |
| 3 | Integrações, regras e testes integrados |
| 4 | Homologação, deploy, assistência e encerramento |

## Documentação

- [Organizacao do backlog](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FOrganizacao-do-backlog)
- [Visao do produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FVisao-do-produto)
- [Arquitetura](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FArquitetura)
- [Especificacao tecnica](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FEspecificacao-tecnica)
- [Fluxo operacional](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FFluxo-operacional)
- [Modelo de dados](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FModelo-de-dados)
- [Referencias de mercado](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FReferencias-de-mercado)
- [Integracoes](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FIntegracoes)
- [Seguranca](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FSeguranca)
- [DevOps e operacao](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FDevOps-e-operacao)
- [To do](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FTo-do)
- [Decisoes](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FDecisoes)
- [Qualidade](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FQualidade)
- [Diagramas](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FDiagramas)
