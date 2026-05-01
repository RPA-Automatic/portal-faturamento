# Supabase

## Projeto

- Project URL no dashboard: https://supabase.com/dashboard/project/eukazzizamxratkavcap
- Uso previsto: banco, autenticação, storage, filas, cron, funções e políticas de acesso.

## Recursos Recomendados

### PostgreSQL

Fonte principal de verdade para operações, contratos, documentos, pendências, evidências, regras, exceções e auditoria.

### Auth

Autenticação dos usuários do portal. Os perfis devem refletir área e papel operacional.

Perfis iniciais:

- Administrador
- Comercial
- Fiscal
- Gestão de Contratos
- Logística
- Faturamento
- Gestão/Leitura

### Row Level Security

As políticas devem garantir que cada área edite somente campos e pendências sob sua responsabilidade.

Diretrizes:

- Todos podem visualizar operações conforme permissão de leitura.
- Áreas operacionais só podem atualizar pendências da própria área.
- Administradores podem parametrizar regras, exceções e usuários.
- Jobs internos devem usar service role apenas em ambiente seguro, nunca no frontend.

### Storage

Buckets recomendados:

- `imports`: arquivos XLSX recebidos.
- `documents`: documentos da operação.
- `evidence`: evidências vinculadas a regras e pendências.

### Queues/pgmq

Filas recomendadas:

- `import_jobs`
- `validation_jobs`
- `document_lookup_jobs`
- `reprocess_jobs`

### Cron

Agendamentos recomendados:

- Carga diária D+0.
- Reprocessamento de pendências abertas.
- Consolidação de KPIs.
- Limpeza/arquivamento de execuções antigas.

## Tabelas Iniciais

- `profiles`
- `areas`
- `operations`
- `contracts`
- `documents`
- `logistics_orders`
- `fiscal_documents`
- `rules`
- `exceptions`
- `pending_items`
- `evidence`
- `state_history`
- `import_runs`
- `job_logs`
- `audit_logs`

## Segurança

- Nunca expor `service_role` no frontend.
- Usar variáveis de ambiente no Netlify e no ambiente local.
- Ativar RLS em tabelas de negócio.
- Registrar alterações sensíveis em `audit_logs`.
- Separar permissões de leitura, edição operacional e administração.