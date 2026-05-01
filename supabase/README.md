# Supabase Backend

Este diretório contém o backend Supabase/PostgreSQL do Portal de Faturamento e Liberação de Embarque.

## Migration Inicial

- `migrations/20260501000100_initial_backend_schema.sql`

Ela cria:

- Tabelas normalizadas do domínio (`operations`, `contracts`, `partners`, `logistics_orders`, `fiscal_documents`, `pending_items`, `evidence`).
- Tabelas de staging para os XLSX Datasul/TOTVS.
- Estados E1..E6 do Farol.
- Regras iniciais de validação.
- Exceções parametrizáveis.
- Views do dashboard operacional.
- RLS inicial para leitura autenticada e atualização de pendências por área.

## Aplicar no Projeto Remoto

```bash
supabase link --project-ref eukazzizamxratkavcap
supabase db push
```

## Rodar Localmente

```bash
supabase start
supabase db reset
```

## Observação de Segurança

Não use `SUPABASE_SERVICE_ROLE_KEY` no frontend. A service role deve ficar restrita a jobs server-side, Edge Functions ou ambiente de ingestão controlado.