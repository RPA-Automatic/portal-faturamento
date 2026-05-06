# Auditoria de Seguranca e LGPD

Data: 2026-05-06

## Escopo

Auditoria do workspace atual com foco em:

- exposicao de segredos no Git;
- isolamento de dados privados;
- RLS e policies Supabase;
- uso de chaves no frontend e scripts;
- riscos LGPD nas tabelas operacionais.

Esta auditoria avalia o repositorio e a migration versionada. O ambiente Supabase DEV/PROD deve ser validado tambem no dashboard/SQL Editor, porque configuracoes manuais podem divergir do Git.

## Pontos Positivos

- Dados reais ficam fora do Git em `data/private/`.
- Arquivos operacionais reais em `docs/**/*.xlsx`, `docs/**/*.docx` e `docs/**/*.pdf` estao ignorados.
- Export legado `supabase/supabase/` esta ignorado, evitando publicar snippets e historico antigo.
- Frontend usa somente variaveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Scripts administrativos usam `SUPABASE_SERVICE_ROLE_KEY` somente por variavel de ambiente local.
- RLS esta habilitado nas principais tabelas do schema inicial.
- Existe separacao conceitual entre dados brutos `stg_*`, modelo operacional, regras, pendencias e evidencias.

## Achados Criticos

### 1. Leitura ampla para qualquer usuario autenticado

As policies atuais permitem leitura para qualquer usuario autenticado em tabelas sensiveis:

- `operations`
- `partners`
- `contracts`
- `logistics_orders`
- `fiscal_documents`
- `documents`
- `pending_items`
- `evidence`
- `state_history`

Risco LGPD: se cadastro por e-mail, GitHub ou Azure permitir acesso sem aprovacao, qualquer usuario autenticado pode ler dados de clientes, fornecedores, documentos fiscais, contratos, documentos operacionais e evidencias.

Recomendacao: trocar `using (true)` por uma politica baseada em perfil ativo, area, papel e escopo operacional.

### 2. Falta de estado de aprovacao no perfil

A tabela `profiles` tem `area` e `is_admin`, mas nao possui campos como:

- `status` (`pending`, `active`, `blocked`);
- `role` ou `access_level`;
- `partner_id` para usuarios externos;
- `allowed_operation_ids` ou regras de escopo.

Risco LGPD: autenticacao e autorizacao ficam misturadas. Login bem-sucedido vira acesso amplo.

Recomendacao: exigir perfil ativo para qualquer leitura operacional.

### 3. Usuarios externos ainda nao tem isolamento por cliente/fornecedor

O portal possui fluxo de acesso externo, mas o schema ainda nao limita usuario externo ao proprio cliente/parceiro.

Risco LGPD: cliente externo poderia visualizar dados de outros clientes/fornecedores se conseguir autenticar.

Recomendacao: antes de liberar acesso externo real, criar modelo `external_user_partners` ou vincular `profiles.partner_id`, e filtrar contratos/operacoes por parceiro.

## Achados Altos

### 4. Views herdam exposicao das tabelas base

As views `v_operations_farol`, `v_area_backlog` e `v_contract_drilldown` sao boas para o frontend, mas precisam respeitar o mesmo modelo de acesso.

Recomendacao: criar views seguras por perfil ou garantir que as policies das tabelas base estejam restritivas. Para dashboards executivos, considerar RPCs `security definer` bem revisadas que retornem somente dados permitidos.

### 5. `documents.metadata` pode carregar dados pessoais ou detalhes sensiveis

Os documentos registrados usam hash, caminho logico e metadata do inventario. Isso e bom, mas `metadata` pode conter nome de arquivo, OP, contratos e contexto operacional.

Recomendacao: tratar `documents.metadata` como dado sensivel. Evitar expor metadata integral no frontend; criar campos derivados seguros para listagem.

### 6. Staging contem `raw_data` completo

As tabelas `stg_*` guardam o bruto dos XLSX em `raw_data`. Isso e bom para auditoria/reprocessamento, mas amplia o volume de dado sensivel.

Recomendacao: nao criar policies de leitura para usuarios comuns em staging. Acesso a `stg_*` deve ser somente admin/job/service role.

## Achados Medios

### 7. `supabase/config.toml` referencia projeto PROD

O arquivo aponta `project_id = "eukazzizamxratkavcap"`, que e o projeto PROD conhecido.

Recomendacao: documentar claramente o fluxo `supabase link` antes de `db push` e considerar config separada ou scripts explicitos para DEV/PROD.

### 8. Cadastro externo precisa de governanca

Email/senha e GitHub sao uteis, mas precisam de aprovacao, dominio permitido, convite ou perfil pendente.

Recomendacao: usuarios novos devem nascer sem permissao operacional ate aprovacao administrativa.

### 9. Senhas de portais logisticos nao devem virar texto exposto

Os checklists mencionam `PORTAL`, `USUARIO`, `SENHA`. Senhas de terceiros nao devem ser armazenadas em texto puro nem exibidas para areas sem necessidade.

Recomendacao: evitar armazenar senha no banco operacional. Se inevitavel, usar cofre/secret manager e registrar apenas referencia/estado de validacao.

## Recomendacoes de Hardening

### Curto prazo

1. Criar campos de governanca em `profiles`: `status`, `access_level`, `partner_id` e `last_login_at`.
2. Criar funcao `current_profile_is_active()`.
3. Alterar policies de leitura operacional para exigir perfil ativo.
4. Bloquear leitura comum em staging, import_runs, job_logs e audit_logs.
5. Restringir acesso externo por parceiro antes de liberar clientes/parceiros.
6. Criar tela/admin simples para aprovar usuarios e definir area.

### Medio prazo

1. Criar `audit_logs` automatico para alteracoes em pendencias, documentos e checklist.
2. Criar mascaramento de documentos fiscais/CNPJ/CPF quando o usuario nao precisar do dado completo.
3. Criar politicas de retencao para `raw_data`, arquivos importados e documentos antigos.
4. Separar roles: `admin`, `gestor`, `operador_area`, `externo`, `leitura`.
5. Criar buckets Storage privados com signed URLs curtas e policies por escopo.

## Exemplo de Direcao para RLS

As policies abaixo sao conceituais e devem virar migration revisada:

```sql
create or replace function public.current_profile_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.status = 'active' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Exemplo: leitura operacional somente para perfil ativo ou admin.
create policy "Active users can read operations"
on public.operations for select to authenticated
using (public.current_profile_is_admin() or public.current_profile_is_active());
```

Para usuarios externos, a regra deve ser mais restritiva:

```sql
-- Exemplo conceitual: externo le apenas operacoes vinculadas ao parceiro dele.
exists (
  select 1
  from public.contracts c
  join public.profiles p on p.id = auth.uid()
  where c.operation_id = operations.id
    and c.partner_id = p.partner_id
    and p.status = 'active'
)
```

## Veredito

O repositorio esta razoavelmente protegido contra vazamento acidental de arquivos e chaves. Para LGPD, o ponto central e manter autenticacao separada de autorizacao: login valido nao pode significar acesso operacional amplo.

## Evolucao Aplicada

As migrations de hardening adicionadas em 2026-05-06 corrigem os principais pontos desta auditoria no modelo versionado:

- `20260506000100_harden_rls_profiles.sql`: cria aprovacao de perfil, escopo interno/externo e policies por parceiro/operacao.
- `20260506000200_fix_supabase_advisor_findings.sql`: corrige `security_invoker`, `search_path` e uso de `(select auth.uid())`.
- `20260506000300_add_audit_and_controlled_pending_rpc.sql`: adiciona auditoria automatica, restringe staging/logs e cria RPC para resolver pendencias.
- `20260506000400_add_private_operation_document_storage.sql`: cria bucket privado `operation-documents` e policies por escopo em `storage.objects`.
- `20260506000500_fix_local_advisor_warnings.sql`: remove exposicao `anon`, consolida policies permissivas duplicadas e tira helpers `SECURITY DEFINER` da API publica.

Essas migrations reaproveitam padroes bons do portal de cadastro, mas sem importar o schema legado. A adaptacao foi feita nas entidades atuais: OP, contratos, parceiros, OLs, documentos fiscais, documentos operacionais, pendencias, evidencias e auditoria.

## Pendencias de Validacao

Antes de considerar o ambiente DEV pronto para usuarios reais, aplicar as migrations no projeto Supabase DEV, promover pelo menos um administrador com `public.bootstrap_admin_profile(email)` e reexecutar o Supabase Advisor. Em seguida, validar login de usuario `pending`, usuario interno ativo, administrador e usuario externo vinculado a parceiro.

Alguns avisos de GraphQL para o role `authenticated` podem permanecer em tabelas consumidas diretamente pelo frontend via REST. Remover `SELECT` de `authenticated` elimina a descoberta no GraphQL, mas tambem quebra consultas PostgREST diretas; por isso essa decisao deve ser tomada junto com uma mudanca arquitetural para expor dados apenas por views/RPCs especificas.