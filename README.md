# Portal Faturamento

Frontend do Portal de Faturamento para liberação de embarque, com autenticação via Supabase OAuth e deploy previsto no Netlify.

## Stack

- React + TypeScript + Vite
- Supabase Auth e Postgres
- Netlify para hospedagem do frontend
- GitHub Actions para CI em `main` e `desenvolvimento`

## Configuração local

1. Instale as dependências:

   ```bash
   npm ci
   ```

2. Copie as variáveis de ambiente:

   ```bash
   cp .env.example .env.local
   ```

3. Preencha `VITE_SUPABASE_ANON_KEY` com a chave pública `anon` do projeto Supabase `eukazzizamxratkavcap`.

4. Rode o frontend:

   ```bash
   npm run dev
   ```

## Supabase

O projeto usa o endpoint público `https://eukazzizamxratkavcap.supabase.co`.

O arquivo `supabase/config.toml` deve ser mantido no repositório para que o Supabase CLI consiga localizar a configuração Postgres local e aplicar migrations. A associação com o projeto remoto é feita pelo comando `supabase link --project-ref eukazzizamxratkavcap`.

A migration inicial está em `supabase/migrations/20260501223500_create_portal_tables.sql` e cria:

- `portal_profiles`
- `customers`
- `carriers`
- `shipment_releases`
- `release_documents`

As tabelas foram modeladas para o fluxo de liberação de embarque e podem ser ajustadas quando o arquivo XLSX mencionado no escopo estiver disponível no repositório.

Para aplicar as migrations no projeto remoto:

```bash
supabase login
supabase link --project-ref eukazzizamxratkavcap
supabase db push
```

Se o CLI retornar `unexpected status 404: {"message":"Postgres config not found"}`, confirme se o usuário autenticado tem acesso ao projeto `eukazzizamxratkavcap` e se o banco Postgres do projeto está ativo no dashboard do Supabase antes de executar `supabase db push` novamente.

### Autenticação

Habilite os provedores no Supabase Auth:

- Google
- Azure/Microsoft
- GitHub

Configure as URLs de callback dos provedores para o domínio do Netlify e para o ambiente local quando necessário.
O domínio de produção previsto é `https://portal-liberacao-embarque.netlify.app`; mantenha essa URL cadastrada nos provedores OAuth e no dashboard do Supabase.

## Netlify

O arquivo `netlify.toml` define:

- comando de build: `npm run build`
- pasta publicada: `dist`
- fallback SPA para `/index.html`

Configure no Netlify as variáveis:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Validação

```bash
npm run lint
npm run build
```
