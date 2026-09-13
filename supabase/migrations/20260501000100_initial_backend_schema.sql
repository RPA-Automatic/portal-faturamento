-- Portal de Faturamento e Liberacao de Embarque
-- Schema inicial Supabase/PostgreSQL baseado nos relatorios Datasul/TOTVS:
-- ES4004, GG4164, GG2037, GPLP40180 e Documentos Fiscais.

create extension if not exists pgcrypto;

do $$ begin
  create type public.area_code as enum (
    'comercial',
    'fiscal',
    'gestao_contratos',
    'logistica',
    'faturamento',
    'administracao'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.operation_stage as enum ('E1', 'E2', 'E3', 'E4', 'E5', 'E6');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.semaphore_status as enum ('verde', 'amarelo', 'vermelho');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.contract_type as enum ('compra', 'venda');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.normalized_contract_status as enum (
    'andamento',
    'concluido',
    'cancelado',
    'desconhecido'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.pending_severity as enum ('bloqueante', 'atencao');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.pending_status as enum ('aberta', 'em_tratativa', 'resolvida', 'dispensada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_type as enum (
    'instrucao_compra',
    'instrucao_venda',
    'liberacao_embarque',
    'liberacao_fiscal',
    'nota_fiscal',
    'ordem_logistica',
    'outro'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'canceled');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_contract_status(status_text text)
returns public.normalized_contract_status
language sql
immutable
as $$
  select case
    when status_text is null or btrim(status_text) = '' then 'desconhecido'::public.normalized_contract_status
    when lower(status_text) like '%cancel%' then 'cancelado'::public.normalized_contract_status
    when lower(status_text) like '%conclu%' then 'concluido'::public.normalized_contract_status
    when lower(status_text) like '%finaliz%' then 'concluido'::public.normalized_contract_status
    when lower(status_text) like '%fech%' then 'concluido'::public.normalized_contract_status
    when lower(status_text) like '%normal%' then 'andamento'::public.normalized_contract_status
    when lower(status_text) like '%aprov%' then 'andamento'::public.normalized_contract_status
    when lower(status_text) like '%pend%' then 'andamento'::public.normalized_contract_status
    else 'desconhecido'::public.normalized_contract_status
  end;
$$;

create table if not exists public.areas (
  code public.area_code primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  area public.area_code references public.areas(code),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.current_profile_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.current_profile_area()
returns public.area_code
language sql
stable
security definer
set search_path = public
as $$
  select p.area from public.profiles p where p.id = auth.uid();
$$;

create table if not exists public.operation_states (
  code public.operation_stage primary key,
  state_order smallint not null unique,
  name text not null,
  owner_area public.area_code not null references public.areas(code),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_file_name text not null,
  storage_path text,
  data_carga date not null default current_date,
  status public.job_status not null default 'queued',
  rows_total integer not null default 0,
  rows_processed integer not null default 0,
  rows_failed integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_runs_source_name_check check (source_name in ('ES4004', 'GG4164', 'GG2037', 'GPLP40180', 'DOCUMENTOS_FISCAIS', 'CHECKLIST_RS', 'OUTRO'))
);

create trigger trg_import_runs_updated_at
before update on public.import_runs
for each row execute function public.set_updated_at();

create table if not exists public.operations (
  id uuid primary key default gen_random_uuid(),
  oper_b2b text not null unique,
  description text,
  item_code text,
  item_description text,
  finalidade text,
  filial text,
  moeda text,
  source_status text,
  normalized_status public.normalized_contract_status not null default 'desconhecido',
  current_stage public.operation_stage not null default 'E1',
  semaphore public.semaphore_status not null default 'vermelho',
  volume_alocado numeric(18, 4),
  volume_realizado numeric(18, 4),
  volume_disponivel numeric(18, 4),
  volume_pendente numeric(18, 4),
  data_carga date not null default current_date,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_operations_stage_semaphore on public.operations(current_stage, semaphore);
create index if not exists idx_operations_status on public.operations(normalized_status);

create trigger trg_operations_updated_at
before update on public.operations
for each row execute function public.set_updated_at();

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  partner_code text not null unique,
  name text,
  document_number text,
  state_registration text,
  city text,
  state text,
  country text default 'BR',
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_partners_name on public.partners using gin (to_tsvector('portuguese', coalesce(name, '')));

create trigger trg_partners_updated_at
before update on public.partners
for each row execute function public.set_updated_at();

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid references public.operations(id) on delete set null,
  contract_number text not null,
  contract_type public.contract_type not null,
  partner_id uuid references public.partners(id) on delete set null,
  partner_code_original text,
  partner_name_original text,
  purchase_contract_number text,
  sales_contract_number text,
  source_status text,
  normalized_status public.normalized_contract_status not null default 'desconhecido',
  item_code text,
  item_description text,
  safra text,
  cultura text,
  modalidade text,
  frete text,
  cidade text,
  uf text,
  quantidade_original numeric(18, 4),
  quantidade_contrato numeric(18, 4),
  quantidade_cancelada numeric(18, 4),
  quantidade_entregue numeric(18, 4),
  quantidade_a_entregar numeric(18, 4),
  unidade_medida text,
  preco_fixado numeric(18, 6),
  valor_total numeric(18, 2),
  data_inclusao date,
  prazo_inicio_entrega date,
  prazo_fim_entrega date,
  data_ultima_entrega date,
  data_carga date not null default current_date,
  source_name text not null,
  source_row_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contract_type, contract_number, data_carga)
);

create index if not exists idx_contracts_operation on public.contracts(operation_id);
create index if not exists idx_contracts_type_number on public.contracts(contract_type, contract_number);
create index if not exists idx_contracts_partner on public.contracts(partner_id);
create index if not exists idx_contracts_status on public.contracts(normalized_status);

create trigger trg_contracts_updated_at
before update on public.contracts
for each row execute function public.set_updated_at();

create table if not exists public.logistics_orders (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid references public.operations(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  contract_number text,
  ol_rota text not null,
  tipo text,
  safra text,
  status_transito text,
  status_frete text,
  placa text,
  emissor_code text,
  emissor_name text,
  nota_fiscal text,
  serie text,
  romaneio text,
  item_code text,
  item_description text,
  transportadora_code text,
  transportadora_name text,
  origem_code text,
  origem_name text,
  origem_city text,
  origem_uf text,
  destino_code text,
  destino_name text,
  destino_city text,
  destino_uf text,
  destino_final_code text,
  destino_final_name text,
  destino_final_city text,
  modalidade text,
  data_emissao_nf date,
  data_carregamento date,
  data_descarga date,
  peso_fiscal numeric(18, 4),
  peso_origem numeric(18, 4),
  peso_destino numeric(18, 4),
  peso_quebra numeric(18, 4),
  valor_nota_fiscal numeric(18, 2),
  valor_frete_provisorio numeric(18, 2),
  valor_frete_ctrc numeric(18, 2),
  valor_frete_pago numeric(18, 2),
  valor_frete_a_pagar numeric(18, 2),
  data_carga date not null default current_date,
  source_row_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_logistics_contract on public.logistics_orders(contract_number);
create index if not exists idx_logistics_operation on public.logistics_orders(operation_id);
create index if not exists idx_logistics_status on public.logistics_orders(status_transito);
create unique index if not exists uq_logistics_orders_business_key
on public.logistics_orders(ol_rota, contract_number, coalesce(nota_fiscal, ''), data_carga);

create trigger trg_logistics_orders_updated_at
before update on public.logistics_orders
for each row execute function public.set_updated_at();

create table if not exists public.fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid references public.operations(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  establishment text,
  partner_code_original text,
  emitente text,
  document_number text not null,
  serie text,
  nat_oper text,
  uf text,
  pais text,
  emissao date,
  cfop text,
  uf_orig_dest text,
  data_documento date,
  especie text,
  tipo_natureza_operacao text,
  direcao text,
  valor_contabil numeric(18, 2),
  base_icms numeric(18, 2),
  base_ipi numeric(18, 2),
  valor_icms_trib numeric(18, 2),
  valor_icms_nao_trib numeric(18, 2),
  valor_icms_outras numeric(18, 2),
  valor_ipi numeric(18, 2),
  valor_pis numeric(18, 2),
  valor_cofins numeric(18, 2),
  data_carga date not null default current_date,
  source_row_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fiscal_documents_cfop on public.fiscal_documents(cfop);
create index if not exists idx_fiscal_documents_partner on public.fiscal_documents(partner_id);
create index if not exists idx_fiscal_documents_emissao on public.fiscal_documents(emissao);
create unique index if not exists uq_fiscal_documents_business_key
on public.fiscal_documents(document_number, coalesce(serie, ''), coalesce(partner_code_original, ''), data_carga);

create trigger trg_fiscal_documents_updated_at
before update on public.fiscal_documents
for each row execute function public.set_updated_at();

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid references public.operations(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  fiscal_document_id uuid references public.fiscal_documents(id) on delete set null,
  logistics_order_id uuid references public.logistics_orders(id) on delete set null,
  type public.document_type not null default 'outro',
  title text not null,
  storage_path text,
  source_url text,
  file_signature text,
  status text not null default 'pendente',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_operation on public.documents(operation_id);
create index if not exists idx_documents_type on public.documents(type);

create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  stage public.operation_stage not null,
  rule_type text not null check (rule_type in ('completude', 'consistencia')),
  severity public.pending_severity not null,
  owner_area public.area_code not null references public.areas(code),
  entity_name text not null,
  condition_description text not null,
  evidence_description text,
  default_message text not null,
  active boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_rules_updated_at
before update on public.rules
for each row execute function public.set_updated_at();

create table if not exists public.exceptions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  operation_finalidade text,
  suppressed_stage public.operation_stage,
  owner_area public.area_code references public.areas(code),
  active boolean not null default true,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_exceptions_updated_at
before update on public.exceptions
for each row execute function public.set_updated_at();

create table if not exists public.pending_items (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  rule_id uuid references public.rules(id) on delete set null,
  stage public.operation_stage not null,
  owner_area public.area_code not null references public.areas(code),
  severity public.pending_severity not null,
  status public.pending_status not null default 'aberta',
  message text not null,
  found_value text,
  expected_value text,
  source_name text,
  source_field text,
  next_step text,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pending_items_resolution_check check (
    (status in ('resolvida', 'dispensada') and resolved_at is not null)
    or (status in ('aberta', 'em_tratativa'))
  )
);

create index if not exists idx_pending_items_operation on public.pending_items(operation_id);
create index if not exists idx_pending_items_area_status on public.pending_items(owner_area, status);
create index if not exists idx_pending_items_stage_severity on public.pending_items(stage, severity);

create trigger trg_pending_items_updated_at
before update on public.pending_items
for each row execute function public.set_updated_at();

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid references public.operations(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  pending_item_id uuid references public.pending_items(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  evidence_type text not null,
  source_name text not null,
  source_file_name text,
  source_sheet text,
  source_column text,
  source_row_number integer,
  source_value text,
  storage_path text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_evidence_operation on public.evidence(operation_id);
create index if not exists idx_evidence_pending on public.evidence(pending_item_id);

create table if not exists public.state_history (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  previous_stage public.operation_stage,
  new_stage public.operation_stage not null,
  previous_semaphore public.semaphore_status,
  new_semaphore public.semaphore_status not null,
  reason text,
  actor_type text not null default 'system' check (actor_type in ('system', 'user', 'job')),
  actor_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_state_history_operation_created on public.state_history(operation_id, created_at desc);

create table if not exists public.job_logs (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references public.import_runs(id) on delete cascade,
  job_name text not null,
  status public.job_status not null,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null,
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- Staging: preserva dados originais dos relatorios e facilita reprocessamento auditavel.
create table if not exists public.stg_es4004_contracts (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references public.import_runs(id) on delete cascade,
  row_number integer,
  oper_b2b text,
  descricao text,
  contrato text,
  tipo_contr text,
  tipo_preco text,
  moeda text,
  finalidade text,
  item text,
  item_descricao text,
  status text,
  volume_alocado numeric(18, 4),
  volume_realizado numeric(18, 4),
  volume_disponivel numeric(18, 4),
  volume_pendente numeric(18, 4),
  filial text,
  cliente_fornec text,
  nome text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_stg_es4004_oper_contract on public.stg_es4004_contracts(oper_b2b, contrato);

create table if not exists public.stg_gg4164_purchase_contracts (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references public.import_runs(id) on delete cascade,
  row_number integer,
  codigo text,
  fornecedor text,
  cpf_cnpj text,
  inscr_estad text,
  endereco text,
  cidade text,
  est text,
  comprador text,
  contrato text,
  descricao text,
  porto text,
  item text,
  desc_item text,
  dt_inclusao date,
  pz_ini_entr date,
  pz_fim_ent date,
  dt_ult_ent date,
  pendencia_juridica text,
  tipo text,
  moeda text,
  preco_fixado numeric(18, 6),
  qtd_orig_contrato numeric(18, 4),
  qtd_cancelada numeric(18, 4),
  qtd_contrato numeric(18, 4),
  un text,
  qtd_recebida numeric(18, 4),
  qtd_a_entregar numeric(18, 4),
  modalidade text,
  safra text,
  regiao text,
  frete text,
  uf text,
  referencia text,
  operacao text,
  tipo_de_compra text,
  situacao text,
  status text,
  tipo_status text,
  contrato_assinado text,
  fim_exportacao text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_stg_gg4164_oper_contract on public.stg_gg4164_purchase_contracts(operacao, contrato);

create table if not exists public.stg_gg2037_sales_contracts (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references public.import_runs(id) on delete cascade,
  row_number integer,
  codigo text,
  cliente text,
  vendedor text,
  contrato text,
  situacao text,
  cod_item text,
  descricao_item text,
  natureza_op text,
  mes_ano_embarque text,
  nr_trade_slip text,
  versao text,
  pedido text,
  pz_ini_entr date,
  pz_fim_ent date,
  dt_ult_ent date,
  tipo text,
  moeda text,
  preco_fixado numeric(18, 6),
  preco_fat numeric(18, 6),
  forma_pagto text,
  vol_orig_contr numeric(18, 4),
  vol_contr numeric(18, 4),
  um text,
  vol_entregue numeric(18, 4),
  vol_a_entregar numeric(18, 4),
  vol_cancel numeric(18, 4),
  vl_total numeric(18, 2),
  uf text,
  cidade text,
  safra text,
  cultura text,
  regiao text,
  cliente_faturamento text,
  frete text,
  frete_proprio text,
  fornecedor text,
  contrato_compra text,
  referencia text,
  operacao text,
  status_contrato text,
  descricao_status text,
  situacao_credito text,
  status_pedido text,
  cliente_embarque text,
  cod_inscricao text,
  nome_inscricao text,
  email_inscricao text,
  dt_inclusao_contrato date,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_stg_gg2037_oper_contract on public.stg_gg2037_sales_contracts(operacao, contrato);
create index if not exists idx_stg_gg2037_purchase_contract on public.stg_gg2037_sales_contracts(contrato_compra);

create table if not exists public.stg_gplp40180_logistics_orders (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references public.import_runs(id) on delete cascade,
  row_number integer,
  emissor text,
  nome text,
  contrato text,
  produtor_contrato text,
  ol_rota text,
  tipo text,
  safra text,
  dt_emis_nf date,
  estab text,
  nota_fiscal text,
  serie text,
  romaneio text,
  peso_fiscal numeric(18, 4),
  vl_nota_fiscal numeric(18, 2),
  usuario_reg text,
  item text,
  descricao text,
  status_transito text,
  placa text,
  data_carregamento date,
  peso_origem numeric(18, 4),
  data_descarga date,
  peso_destino numeric(18, 4),
  peso_quebra numeric(18, 4),
  origem text,
  nome_origem text,
  cidade_origem text,
  uf_origem text,
  destino text,
  nome_destino text,
  cidade_destino text,
  uf_destino text,
  destino_final_ol text,
  nome_dest_final text,
  cidade_dest_final text,
  modalidade text,
  transp text,
  nome_transportadora text,
  status_frete text,
  data_pagamento date,
  vl_frete_pago numeric(18, 2),
  vl_frete_a_pagar numeric(18, 2),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_stg_gplp_contract_ol on public.stg_gplp40180_logistics_orders(contrato, ol_rota);

create table if not exists public.stg_fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references public.import_runs(id) on delete cascade,
  row_number integer,
  est text,
  cliente_fornec text,
  emitente text,
  doc_fisc text,
  ser text,
  nat_oper text,
  uf text,
  pais text,
  emissao date,
  icms_ret text,
  cfop text,
  uf_orig_dest text,
  dt_docto date,
  esp text,
  tp_nat_op text,
  direcao text,
  vl_contabil numeric(18, 2),
  base_icms numeric(18, 2),
  base_ipi numeric(18, 2),
  vl_icms_trib numeric(18, 2),
  vl_icms_nao_trib numeric(18, 2),
  vl_icms_outras numeric(18, 2),
  vl_ipi numeric(18, 2),
  vl_pis numeric(18, 2),
  vl_cofins numeric(18, 2),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_stg_fiscal_doc on public.stg_fiscal_documents(doc_fisc, ser, cliente_fornec);
create index if not exists idx_stg_fiscal_cfop on public.stg_fiscal_documents(cfop);

create or replace function public.recalculate_operation_farol(target_operation_id uuid)
returns void
language plpgsql
as $$
declare
  next_stage public.operation_stage;
  next_semaphore public.semaphore_status;
  previous_stage public.operation_stage;
  previous_semaphore public.semaphore_status;
begin
  select current_stage, semaphore
    into previous_stage, previous_semaphore
  from public.operations
  where id = target_operation_id;

  if previous_stage is null then
    return;
  end if;

  select pi.stage
    into next_stage
  from public.pending_items pi
  where pi.operation_id = target_operation_id
    and pi.status in ('aberta', 'em_tratativa')
    and pi.severity = 'bloqueante'
  order by pi.stage asc
  limit 1;

  if next_stage is not null then
    next_semaphore := 'vermelho';
  elsif exists (
    select 1
    from public.pending_items pi
    where pi.operation_id = target_operation_id
      and pi.status in ('aberta', 'em_tratativa')
      and pi.severity = 'atencao'
  ) then
    select pi.stage
      into next_stage
    from public.pending_items pi
    where pi.operation_id = target_operation_id
      and pi.status in ('aberta', 'em_tratativa')
    order by pi.stage asc
    limit 1;
    next_semaphore := 'amarelo';
  else
    next_stage := 'E6';
    next_semaphore := 'verde';
  end if;

  update public.operations
  set current_stage = next_stage,
      semaphore = next_semaphore,
      last_seen_at = now()
  where id = target_operation_id;

  if previous_stage is distinct from next_stage or previous_semaphore is distinct from next_semaphore then
    insert into public.state_history (
      operation_id,
      previous_stage,
      new_stage,
      previous_semaphore,
      new_semaphore,
      reason,
      actor_type
    ) values (
      target_operation_id,
      previous_stage,
      next_stage,
      previous_semaphore,
      next_semaphore,
      'Recalculo automatico do Farol por pendencias abertas',
      'system'
    );
  end if;
end;
$$;

create or replace function public.recalculate_operation_farol_trigger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_operation_farol(old.operation_id);
    return old;
  end if;

  perform public.recalculate_operation_farol(new.operation_id);
  return new;
end;
$$;

drop trigger if exists trg_pending_items_recalculate_farol on public.pending_items;
create trigger trg_pending_items_recalculate_farol
after insert or update or delete on public.pending_items
for each row execute function public.recalculate_operation_farol_trigger();

create or replace view public.v_operations_farol as
select
  o.id,
  o.oper_b2b,
  o.description,
  o.item_code,
  o.item_description,
  o.finalidade,
  o.normalized_status,
  o.current_stage,
  os.name as current_stage_name,
  o.semaphore,
  count(distinct c.id) filter (where c.contract_type = 'compra') as purchase_contracts_count,
  count(distinct c.id) filter (where c.contract_type = 'venda') as sales_contracts_count,
  count(distinct lo.id) as logistics_orders_count,
  count(distinct fd.id) as fiscal_documents_count,
  count(distinct pi.id) filter (where pi.status in ('aberta', 'em_tratativa') and pi.severity = 'bloqueante') as blocking_pending_count,
  count(distinct pi.id) filter (where pi.status in ('aberta', 'em_tratativa') and pi.severity = 'atencao') as warning_pending_count,
  min(pi.opened_at) filter (where pi.status in ('aberta', 'em_tratativa')) as oldest_open_pending_at,
  case
    when min(pi.opened_at) filter (where pi.status in ('aberta', 'em_tratativa')) is null then 0
    else extract(day from now() - min(pi.opened_at) filter (where pi.status in ('aberta', 'em_tratativa')))::integer
  end as aging_days,
  o.updated_at
from public.operations o
left join public.operation_states os on os.code = o.current_stage
left join public.contracts c on c.operation_id = o.id
left join public.logistics_orders lo on lo.operation_id = o.id
left join public.fiscal_documents fd on fd.operation_id = o.id
left join public.pending_items pi on pi.operation_id = o.id
group by o.id, os.name;

create or replace view public.v_area_backlog as
select
  pi.owner_area,
  a.name as owner_area_name,
  pi.stage,
  pi.severity,
  pi.status,
  count(*) as pending_count,
  min(pi.opened_at) as oldest_pending_at
from public.pending_items pi
join public.areas a on a.code = pi.owner_area
where pi.status in ('aberta', 'em_tratativa')
group by pi.owner_area, a.name, pi.stage, pi.severity, pi.status;

create or replace view public.v_contract_drilldown as
select
  o.oper_b2b,
  o.current_stage,
  o.semaphore,
  c.contract_type,
  c.contract_number,
  c.purchase_contract_number,
  c.sales_contract_number,
  c.normalized_status as contract_status,
  c.partner_code_original,
  coalesce(p.name, c.partner_name_original) as partner_name,
  c.item_description,
  c.quantidade_contrato,
  c.quantidade_entregue,
  c.quantidade_a_entregar,
  c.prazo_inicio_entrega,
  c.prazo_fim_entrega,
  count(distinct pi.id) filter (where pi.status in ('aberta', 'em_tratativa')) as open_pending_count
from public.operations o
join public.contracts c on c.operation_id = o.id
left join public.partners p on p.id = c.partner_id
left join public.pending_items pi on pi.contract_id = c.id
group by o.oper_b2b, o.current_stage, o.semaphore, c.id, p.name;

insert into public.areas (code, name, description) values
  ('comercial', 'Comercial', 'Responsavel por contratos, instrucoes e documentacao inicial.'),
  ('fiscal', 'Fiscal/TAX', 'Responsavel por CFOP, cadastros, regras fiscais e validacoes tributarias.'),
  ('gestao_contratos', 'Gestao de Contratos', 'Responsavel por regras Datasul e liberacoes de contrato/pedido.'),
  ('logistica', 'Logistica', 'Responsavel por OL, transporte, agendamento e requisitos logisticos.'),
  ('faturamento', 'Faturamento', 'Responsavel por NFs, observacoes fiscais e conclusao documental.'),
  ('administracao', 'Administracao', 'Responsavel por parametros, usuarios e governanca do portal.')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.operation_states (code, state_order, name, owner_area, description) values
  ('E1', 1, 'Documentacao Basica', 'comercial', 'I.F. Compra, I.F. Venda, documentos salvos na pasta da OP e SLA D-2.'),
  ('E2', 2, 'Validacao Fiscal', 'fiscal', 'CFOP, cadastros cliente x fornecedor, local de entrega e regras fiscais.'),
  ('E3', 3, 'Contratos e Regras TOTVS', 'gestao_contratos', 'Regras Datasul, contrato compra liberado e pedido venda liberado.'),
  ('E4', 4, 'Logistica', 'logistica', 'OL criada, agendamento, transportadora e requisitos para embarque.'),
  ('E5', 5, 'Faturamento', 'faturamento', 'Primeira NF, documentos fiscais, observacoes e divergencias.'),
  ('E6', 6, 'Concluido', 'faturamento', 'Operacao sem pendencias bloqueantes e evidencias registradas.')
on conflict (code) do update set
  state_order = excluded.state_order,
  name = excluded.name,
  owner_area = excluded.owner_area,
  description = excluded.description;

insert into public.rules (code, name, stage, rule_type, severity, owner_area, entity_name, condition_description, evidence_description, default_message) values
  ('R-E1-001', 'I.F. Compra obrigatoria', 'E1', 'completude', 'bloqueante', 'faturamento', 'Documento', 'Operacao deve possuir Instrucao Fiscal de Compra localizada ou validada.', 'Checklist_RS: I.F. Compra ?; documentos da pasta da OP.', 'I.F. Compra ausente ou nao validada.'),
  ('R-E1-002', 'I.F. Venda obrigatoria', 'E1', 'completude', 'bloqueante', 'faturamento', 'Documento', 'Operacao deve possuir Instrucao Fiscal de Venda localizada ou validada.', 'Checklist_RS: I.F. Venda ?; documentos da pasta da OP.', 'I.F. Venda ausente ou nao validada.'),
  ('R-E1-003', 'Documentacao D-2', 'E1', 'completude', 'bloqueante', 'comercial', 'Operacao', 'Documentacao da OP deve estar salva ate D-2.', 'Checklist_RS: Envio Documentacao SLA (D-2).', 'Documentacao da OP nao registrada no SLA D-2.'),
  ('R-E2-001', 'CFOP entrada validado', 'E2', 'consistencia', 'bloqueante', 'fiscal', 'DocumentoFiscal', 'CFOP de entrada deve estar validado quando aplicavel.', 'Documentos Fiscais: CFOP; Checklist_RS: CFOP in.', 'CFOP de entrada pendente ou divergente.'),
  ('R-E2-002', 'CFOP saida validado', 'E2', 'consistencia', 'bloqueante', 'fiscal', 'DocumentoFiscal', 'CFOP de saida deve estar validado quando aplicavel.', 'Documentos Fiscais: CFOP; Checklist_RS: CFOP out.', 'CFOP de saida pendente ou divergente.'),
  ('R-E2-003', 'Cadastros cliente fornecedor', 'E2', 'consistencia', 'bloqueante', 'fiscal', 'Parceiro', 'Cadastros cliente x fornecedor devem estar coerentes.', 'GG4164/GG2037/ES4004: CodigoParceiro; Checklist_RS: Validar Cadastros CLI X FOR.', 'Cadastro cliente x fornecedor pendente ou incoerente.'),
  ('R-E3-001', 'Regras Datasul criadas', 'E3', 'completude', 'bloqueante', 'gestao_contratos', 'Contrato', 'Regras no Datasul devem estar criadas antes do avanco.', 'Checklist_RS: Criar Regras no Datasul.', 'Regras Datasul ainda nao criadas.'),
  ('R-E3-002', 'Contrato compra liberado', 'E3', 'completude', 'bloqueante', 'gestao_contratos', 'Contrato', 'Contrato de compra deve estar liberado no GG1001B.', 'Checklist_RS: Contrato Compra Liberado ? GG1001B.', 'Contrato de compra nao liberado.'),
  ('R-E3-003', 'Pedido venda liberado', 'E3', 'completude', 'bloqueante', 'gestao_contratos', 'Contrato', 'Pedido de venda deve estar liberado no GG1001/GG1090.', 'Checklist_RS: Pedido Liberado ? GG1001 (GG1090).', 'Pedido de venda nao liberado.'),
  ('R-E4-001', 'OL criada', 'E4', 'completude', 'bloqueante', 'logistica', 'OrdemLogistica', 'Operacao deve possuir OL criada quando aplicavel.', 'GPLP40180: Ol/Rota; Checklist_RS: OL Criada ?.', 'OL nao criada ou nao localizada.'),
  ('R-E4-002', 'Dados de agendamento', 'E4', 'completude', 'bloqueante', 'logistica', 'OrdemLogistica', 'Portal, usuario e senha devem existir quando houver necessidade de agendamento.', 'Checklist_RS: Necessita Agendamento ?, PORTAL, USUARIO, SENHA.', 'Dados de agendamento incompletos.'),
  ('R-E5-001', 'Primeira NF validada', 'E5', 'completude', 'atencao', 'faturamento', 'DocumentoFiscal', 'Primeira NF fornecedor/cliente deve estar validada quando houver observacao fiscal.', 'Documentos Fiscais e Checklist_RS: Validar Primeira NF Fornecedor/Cliente.', 'Primeira NF pendente de validacao.')
on conflict (code) do update set
  name = excluded.name,
  stage = excluded.stage,
  rule_type = excluded.rule_type,
  severity = excluded.severity,
  owner_area = excluded.owner_area,
  entity_name = excluded.entity_name,
  condition_description = excluded.condition_description,
  evidence_description = excluded.evidence_description,
  default_message = excluded.default_message,
  updated_at = now();

insert into public.exceptions (code, name, description, operation_finalidade, suppressed_stage, owner_area) values
  ('EXPORTACAO_SEM_LIBERACAO_EMBARQUE', 'Exportacao sem Liberacao de Embarque', 'Operacoes de exportacao podem dispensar a etapa de Liberacao de Embarque antes da OL.', 'Exportacao', 'E4', 'comercial'),
  ('TRANSFERENCIA_PORTO_RIO_GRANDE', 'Transferencia Porto Rio Grande', 'Operacoes transferidas no Porto Rio Grande podem seguir sem emissao de Liberacao de Embarque.', 'Transferencia Porto Rio Grande', 'E4', 'comercial')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  operation_finalidade = excluded.operation_finalidade,
  suppressed_stage = excluded.suppressed_stage,
  owner_area = excluded.owner_area,
  updated_at = now();

alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.operation_states enable row level security;
alter table public.import_runs enable row level security;
alter table public.operations enable row level security;
alter table public.partners enable row level security;
alter table public.contracts enable row level security;
alter table public.logistics_orders enable row level security;
alter table public.fiscal_documents enable row level security;
alter table public.documents enable row level security;
alter table public.rules enable row level security;
alter table public.exceptions enable row level security;
alter table public.pending_items enable row level security;
alter table public.evidence enable row level security;
alter table public.state_history enable row level security;
alter table public.job_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.stg_es4004_contracts enable row level security;
alter table public.stg_gg4164_purchase_contracts enable row level security;
alter table public.stg_gg2037_sales_contracts enable row level security;
alter table public.stg_gplp40180_logistics_orders enable row level security;
alter table public.stg_fiscal_documents enable row level security;

create policy "Authenticated users can read reference areas"
on public.areas for select to authenticated using (true);

create policy "Authenticated users can read operation states"
on public.operation_states for select to authenticated using (true);

create policy "Users can read own profile"
on public.profiles for select to authenticated using (id = auth.uid());

create policy "Admins can read all profiles"
on public.profiles for select to authenticated using (public.current_profile_is_admin());

create policy "Authenticated users can read operations"
on public.operations for select to authenticated using (true);

create policy "Authenticated users can read partners"
on public.partners for select to authenticated using (true);

create policy "Authenticated users can read contracts"
on public.contracts for select to authenticated using (true);

create policy "Authenticated users can read logistics orders"
on public.logistics_orders for select to authenticated using (true);

create policy "Authenticated users can read fiscal documents"
on public.fiscal_documents for select to authenticated using (true);

create policy "Authenticated users can read documents"
on public.documents for select to authenticated using (true);

create policy "Authenticated users can read rules"
on public.rules for select to authenticated using (true);

create policy "Authenticated users can read exceptions"
on public.exceptions for select to authenticated using (true);

create policy "Authenticated users can read pending items"
on public.pending_items for select to authenticated using (true);

create policy "Area users can update own pending items"
on public.pending_items for update to authenticated
using (
  public.current_profile_is_admin()
  or public.current_profile_area() = pending_items.owner_area
)
with check (
  public.current_profile_is_admin()
  or public.current_profile_area() = pending_items.owner_area
);

create policy "Authenticated users can read evidence"
on public.evidence for select to authenticated using (true);

create policy "Authenticated users can read state history"
on public.state_history for select to authenticated using (true);

create policy "Admins can manage rules"
on public.rules for all to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());

create policy "Admins can manage exceptions"
on public.exceptions for all to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());