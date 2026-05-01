# Desenvolvimento Local

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

## Variáveis de Ambiente

Criar um arquivo `.env.local` quando a aplicação Next.js for iniciada.

Variáveis esperadas:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` deve ser usada somente em rotinas server-side seguras.

## Containers

O ambiente local deve usar containers para banco, serviços auxiliares, filas e ferramentas de desenvolvimento quando aplicável.

Opções recomendadas:

- Supabase CLI para subir stack local do Supabase.
- Docker Compose para serviços auxiliares que não forem cobertos pelo Supabase local.
- n8n local opcional para prototipar ingestão e orquestração.

## Scripts Esperados

Quando o projeto Next.js for criado, manter scripts equivalentes a:

```bash
pnpm dev
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
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