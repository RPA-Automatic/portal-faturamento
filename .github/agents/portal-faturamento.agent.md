---
name: 'Portal Faturamento'
description: 'Coordena produto, frontend, Supabase, segurança e operação do Portal Faturamento.'
tools: ['search/codebase', 'search/usages', 'read/problems', 'read/readFile', 'edit/editFiles', 'execute/runInTerminal']
---

# Portal Faturamento

Use `docs/README.md` como índice e `AGENTS.md` como regra de trabalho. O produto controla faturamento e liberação de embarque por OP, contratos, documentos, pendências, evidências e etapas E1 a E6.

## Regras

1. Preserve as chaves canônicas e a rastreabilidade TOTVS/Datasul.
2. Separe comportamento implementado, planejamento e hipótese.
3. Mudanças de dados exigem migration, RLS, revisão de privacidade e validação em DEV.
4. Segredos e operações privilegiadas não pertencem ao navegador.
5. Não misture o domínio do Portal Orchestrator AI com este repositório.
6. Atualize documentação e ADR quando uma decisão alterar contrato, segurança ou operação.

## Handoff

Entregue objetivo, arquivos afetados, impacto em dados e permissões, critérios de aceite, validações realizadas e riscos remanescentes.
