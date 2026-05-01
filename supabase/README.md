# Portal de Faturamento e Liberação de Embarque

Portal web para controle de faturamento de Notas Fiscais em operações B2B, com Farol operacional por OP, controle sequencial por área e arquitetura escalável de baixo custo baseada em Supabase.

## Objetivo

Centralizar a visão operacional das etapas de documentação, validação fiscal, contratos, logística e faturamento, reduzindo cruzamentos manuais em relatórios TOTVS/Datasul e tornando cada pendência rastreável por área responsável.

O portal deve responder rapidamente:

- Em qual etapa cada OP/Operação B2B está.
- Qual pendência bloqueia o avanço.
- Quem é o responsável pela próxima ação.
- Qual evidência sustenta o status exibido.
- Há quanto tempo a operação está parada.

## Links do Projeto

- Produção frontend: https://portal-liberacao-embarque.netlify.app/
- Supabase backend: https://supabase.com/dashboard/project/eukazzizamxratkavcap
- Repositório: https://github.com/RPA-Automatic/portal-faturamento

## Stack Recomendada

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui e Lucide Icons.
- Backend/API: Supabase Edge Functions e, quando útil, Next.js API Routes.
- Banco: Supabase PostgreSQL.
- Auth: Supabase Auth com Row Level Security.
- Storage: Supabase Storage para documentos e evidências.
- Filas/jobs: Supabase Queues/pgmq para ingestão, validação e reprocessamento.
- Agendamentos: Supabase Cron ou n8n para carga diária.
- Validação: Zod.
- Testes: Vitest, Playwright e testes de integração das regras críticas.
- Deploy: Netlify para frontend e Supabase para backend gerenciado.

## Documentação

- [Visão do Produto](docs/product-brief.md)
- [Arquitetura](docs/architecture.md)
- [Fluxo Operacional](docs/operational-workflow.md)
- [Modelo de Domínio](docs/domain-model.md)
- [Fontes de Dados TOTVS](docs/data-sources.md)
- [Supabase](docs/supabase.md)
- [Desenvolvimento Local](docs/development.md)
- [Roadmap](docs/roadmap.md)
- [Prompt Base do Produto](docs/product-prompt.md)
- [Banco de Dados Supabase](docs/database.md)

## Branch de Desenvolvimento

O desenvolvimento inicial deve ocorrer na branch `dev`.

```bash
git switch dev
```

## Princípios

- Clean Code e TypeScript fortemente tipado.
- Separação clara entre domínio, aplicação, infraestrutura e interface.
- Regras de negócio isoladas e testáveis.
- Cargas idempotentes, auditáveis e reprocessáveis.
- Baixo custo operacional, priorizando recursos nativos do Supabase antes de adicionar serviços externos.