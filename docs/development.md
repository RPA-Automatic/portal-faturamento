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

## Variáveis de Ambiente Local

Criar um arquivo `.env.local` dentro de `frontend/` para a aplicacao React + Vite. Esse arquivo fica somente na maquina local e nao deve ser enviado ao Git.

Use `frontend/.env.example` como modelo:

Variáveis esperadas:

```bash
VITE_SUPABASE_URL=https://seu-projeto-dev.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_sua_chave_publicavel_dev
```

Para desenvolvimento local, aponte essas variaveis para o projeto Supabase DEV.

Nao exponha `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_*` ou `service_role` no frontend. Chaves privilegiadas devem existir somente em Edge Functions, jobs server-side ou configuracoes seguras do Supabase.

## Ambientes Netlify e Supabase

O portal usa ambientes separados para evitar que testes afetem dados de producao:

```text
GitHub dev  -> Netlify Branch Deploy dev -> Supabase Portal Faturamento Dev
GitHub main -> Netlify Production         -> Supabase Portal Faturamento
```

No Netlify, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com valores diferentes por contexto:

```text
Production      -> URL e publishable key do Supabase PROD
Deploy Previews -> URL e publishable key do Supabase DEV
Branch deploys  -> URL e publishable key do Supabase DEV
```

As variaveis do frontend devem usar apenas a chave `sb_publishable_*` do Supabase. Nunca use chaves `sb_secret_*` ou `service_role` no Netlify frontend.

## Migrações Supabase

As mudancas de banco devem ser versionadas em `supabase/migrations/`.

Fluxo recomendado sem Supabase Branching pago:

```text
1. Criar ou alterar uma migration em supabase/migrations/
2. Aplicar primeiro no Supabase DEV
3. Testar no Netlify dev
4. Abrir PR de dev para main
5. Aplicar a mesma migration no Supabase PROD
6. Fazer merge para main
```

Como `supabase/config.toml` pode apontar para um projeto especifico, confirme sempre o projeto alvo antes de rodar comandos como `supabase link`, `supabase db push` ou `supabase migration list`.

## Containers

O ambiente local deve usar containers para banco, serviços auxiliares, filas e ferramentas de desenvolvimento quando aplicável.

Opções recomendadas:

- Supabase CLI para subir stack local do Supabase.
- Docker Compose para serviços auxiliares que não forem cobertos pelo Supabase local.
- n8n local opcional para prototipar ingestão e orquestração.

## Scripts Esperados

No frontend atual, usar os scripts do Vite dentro de `frontend/`:

```bash
npm install
npm run dev
npm run lint
npm run build
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