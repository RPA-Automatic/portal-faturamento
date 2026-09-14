# Documentação — Portal Faturamento

> Status: Aprovado  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: 2026-12-13

Este índice é a entrada oficial da documentação. Código, migrations e testes prevalecem para comportamento implementado; divergências devem gerar correção documental ou ADR.

## Governança

- [Padrão documental](governance/documentation-standard.md)
- [Hierarquia de trabalho — migração para Agile](governance/work-item-hierarchy.md)
- [Desenvolvimento assistido por IA](governance/ai-assisted-development.md)

## Produto

- [Identidade pública — RPA Automatic](product/brand.md)

- [Contexto fiscal derivado do acervo privado](product/fiscal-context.md)
- [Critérios próprios do produto](product/market-benchmark.md)
- [Visão do produto](product/vision.md)
- [Fluxo operacional E1–E6](product/operational-workflow.md)
- [Template do checklist](product/checklist-portal-template.md)
- [Roadmap](product/roadmap.md)
- [Plano de entrega — quatro sprints](product/delivery-plan.md)

## Arquitetura

- [Visão de arquitetura](architecture/overview.md)
- [Especificação técnica — SDD](architecture/SDD.md)
- [Modelo de domínio](architecture/domain-model.md)
- [Mapa do projeto](architecture/project-map.md)
- [Diagramas](architecture/diagrams/README.md)

## Dados e integrações

- [Esquema fiscal e recuperação das migrations](data/fiscal-schema.md)
- [Banco Supabase](data/database.md)
- [Recursos Supabase](data/supabase.md)
- [Plano de ingestão XLSX](data/xlsx-ingestion-plan.md)
- [Fontes TOTVS/Datasul](integrations/totvs-data-sources.md)

## Segurança e operação

- [Separação dos bancos e recuperação das cargas](operations/database-separation.md)
- [OAuth Supabase](security/oauth-auth-setup.md)
- [Revisão LGPD atual e pendências](security/lgpd-review-2026-09-13.md)
- [Auditoria histórica de segurança e LGPD](security/security-lgpd-audit.md)
- [Desenvolvimento local e ambientes](operations/development.md)
- [Azure DevOps — wiki, épico e planejamento](operations/azure-devops.md)

## Referência e histórico

- [Prompt histórico do produto](reference/product-prompt.md)
- [Análise histórica do workspace](archive/workspace-analysis-2026-05-06.md)

## Decisões e qualidade

- [DevOps e planejamento de implantação — 2026-09-13](quality/devops-planning-2026-09-13.md)
- [ADR-0001 — Organização Azure DevOps](decisions/ADR-0001-organizacao-azure-devops.md)

- [Revisão do acervo privado](quality/source-review-2026-09-13.md)
- [Auditoria GitHub/Netlify/Supabase — 2026-09-13](quality/environment-audit-2026-09-13.md)

Novas decisões ficam em `decisions/ADR-NNNN-titulo.md`. Evidências de teste ou revisão transversal ficam em `quality/`. As pastas podem permanecer sem documentos até existir conteúdo real; não crie arquivos vazios apenas para completar a taxonomia.

- [ADR-0002 — Banco fiscal remoto único](decisions/ADR-0002-banco-fiscal-unico.md)

- [Validação do esquema e ficha](quality/schema-delivery-2026-09-13.md)

- [Validação de autenticação e identidade](quality/auth-branding-2026-09-13.md)
