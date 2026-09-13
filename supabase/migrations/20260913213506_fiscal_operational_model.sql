-- Evolução aditiva do modelo fiscal. As sete migrations anteriores permanecem intactas.
-- Escritas nas novas entidades são reservadas ao backend até homologação dos fluxos.
alter table public.operations add column planned_shipping_at timestamptz,
  add column documentary_due_at timestamptz;
alter table public.pending_items add column assigned_to uuid references public.profiles(id),
  add column due_at timestamptz;
create index idx_pending_assigned on public.pending_items(assigned_to) where assigned_to is not null;
create index idx_pending_due on public.pending_items(due_at) where status in ('aberta','em_tratativa');
alter table public.import_runs add column file_sha256 text check (file_sha256 ~ '^[a-f0-9]{64}$'),
  add column extracted_at timestamptz,
  add column mapping_version text;
-- Hash não é único: reprocessamento com mapeamento corrigido precisa de nova execução auditável.
create index idx_import_fingerprint on public.import_runs(source_name,file_sha256,mapping_version);

create table public.operation_contract_links (
  operation_id uuid not null references public.operations(id),
  contract_id uuid not null references public.contracts(id),
  source_name text not null,
  import_run_id uuid references public.import_runs(id),
  linked_at timestamptz not null default now(),
  primary key(operation_id,contract_id)
);
create index idx_operation_contract_links_contract on public.operation_contract_links(contract_id);
create index idx_operation_contract_links_import on public.operation_contract_links(import_run_id);
insert into public.operation_contract_links(operation_id,contract_id,source_name)
select operation_id,id,'legacy_contract_operation' from public.contracts where operation_id is not null;
-- Compatibilidade: escritores antigos continuam populando o vínculo explícito.
create function private.sync_contract_operation_link() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.operation_id is not null then
    insert into public.operation_contract_links(operation_id,contract_id,source_name)
    values(new.operation_id,new.id,'legacy_contract_operation') on conflict do nothing;
  end if;
  if tg_op = 'UPDATE' and old.operation_id is distinct from new.operation_id then
    delete from public.operation_contract_links where operation_id=old.operation_id
      and contract_id=new.id and source_name='legacy_contract_operation';
  end if;
  return new;
end $$;
revoke all on function private.sync_contract_operation_link() from public,anon,authenticated;
create trigger trg_contract_operation_link after insert or update of operation_id on public.contracts
for each row execute function private.sync_contract_operation_link();

create table public.operation_locations (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id),
  role text not null check(role in ('origem','entrega','transbordo','destino_final')),
  sequence_no integer not null default 1 check(sequence_no>0),
  partner_id uuid references public.partners(id),
  location_code text,
  description text not null check(length(btrim(description))>0),
  city text, state text, country text not null default 'BR',
  source_name text not null,
  evidence_id uuid references public.evidence(id),
  created_at timestamptz not null default now(),
  unique(operation_id,role,sequence_no)
);
create index idx_operation_locations_partner on public.operation_locations(partner_id);
create index idx_operation_locations_evidence on public.operation_locations(evidence_id);

alter table public.documents add constraint documents_id_operation_unique unique(id,operation_id);
alter table public.evidence add constraint evidence_id_operation_unique unique(id,operation_id);
create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  operation_id uuid not null,
  version_no integer not null check(version_no>0),
  file_sha256 text not null check(file_sha256 ~ '^[a-f0-9]{64}$'),
  storage_path text not null unique check(length(btrim(storage_path))>0),
  mime_type text not null,
  size_bytes bigint not null check(size_bytes>0 and size_bytes<=52428800),
  received_at timestamptz not null default now(),
  received_by uuid references public.profiles(id),
  unique(document_id,version_no),
  unique(id,operation_id),
  foreign key(document_id,operation_id) references public.documents(id,operation_id)
);
create index idx_document_versions_operation on public.document_versions(operation_id);
create index idx_document_versions_received_by on public.document_versions(received_by);
create table public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id),
  area public.area_code not null references public.areas(code),
  result text not null check(result in ('aprovado','rejeitado')),
  reason text not null check(length(btrim(reason))>0),
  reviewed_by uuid not null references public.profiles(id),
  reviewed_at timestamptz not null default now()
);
create index idx_document_reviews_version on public.document_reviews(document_version_id,reviewed_at desc);
create index idx_document_reviews_reviewer on public.document_reviews(reviewed_by);
-- Nenhuma aprovação se propaga a uma nova versão do documento.

create table public.rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.rules(id),
  version_no integer not null check(version_no>0),
  definition jsonb not null check(jsonb_typeof(definition)='object'),
  approval_status text not null default 'rascunho' check(approval_status in ('rascunho','aprovada','retirada')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(rule_id,version_no),
  check(approval_status<>'aprovada' or (approved_by is not null and approved_at is not null))
);
create index idx_rule_versions_approver on public.rule_versions(approved_by);
-- Corrige a instrução histórica sem armazenar segredos no checklist.
update public.rules set condition_description='Agendamento deve possuir portal e referência segura de acesso quando necessário.',
 evidence_description='Requisito de agendamento e referência a cofre de credenciais; nunca armazenar senha no portal.'
 where code='R-E4-002';
insert into public.rule_versions(rule_id,version_no,definition)
select id,version,jsonb_build_object('code',code,'stage',stage,'owner_area',owner_area,
  'condition',condition_description,'severity',severity) from public.rules;
-- Catálogo histórico é candidato a homologação, não autoriza dispensas universais.
update public.exceptions set active=false where code in ('EXPORTACAO_SEM_LIBERACAO_EMBARQUE','TRANSFERENCIA_PORTO_RIO_GRANDE');

create table public.rule_evaluations (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id),
  rule_version_id uuid not null references public.rule_versions(id),
  contract_id uuid,
  document_version_id uuid,
  import_run_id uuid references public.import_runs(id),
  result text not null check(result in ('pendente','aprovado','reprovado','nao_aplicavel')),
  reason text not null check(length(btrim(reason))>0),
  evidence_id uuid,
  evaluated_at timestamptz not null default now(),
  unique(id,operation_id),
  foreign key(operation_id,contract_id) references public.operation_contract_links(operation_id,contract_id),
  foreign key(document_version_id,operation_id) references public.document_versions(id,operation_id),
  foreign key(evidence_id,operation_id) references public.evidence(id,operation_id),
  check(result='pendente' or evidence_id is not null)
);
create index idx_rule_evaluations_operation on public.rule_evaluations(operation_id,evaluated_at desc);
create index idx_rule_evaluations_rule on public.rule_evaluations(rule_version_id);
create index idx_rule_evaluations_contract on public.rule_evaluations(operation_id,contract_id);
create index idx_rule_evaluations_document on public.rule_evaluations(document_version_id,operation_id);
create index idx_rule_evaluations_evidence on public.rule_evaluations(evidence_id,operation_id);
create index idx_rule_evaluations_import on public.rule_evaluations(import_run_id);

create table public.operation_stage_assessments (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id),
  stage public.operation_stage not null check(stage<>'E6'),
  result text not null check(result in ('pendente','aprovado','reprovado','nao_aplicavel')),
  reason text not null check(length(btrim(reason))>0),
  evidence_id uuid,
  document_version_id uuid,
  assessed_by uuid not null references public.profiles(id),
  assessed_at timestamptz not null default now(),
  valid_until timestamptz,
  foreign key(evidence_id,operation_id) references public.evidence(id,operation_id),
  foreign key(document_version_id,operation_id) references public.document_versions(id,operation_id),
  check(result='pendente' or evidence_id is not null),
  check(valid_until is null or valid_until>assessed_at)
);
create index idx_stage_assessments_operation on public.operation_stage_assessments(operation_id,stage,assessed_at desc,id desc);
create index idx_stage_assessments_evidence on public.operation_stage_assessments(evidence_id,operation_id);
create index idx_stage_assessments_document on public.operation_stage_assessments(document_version_id,operation_id);
create index idx_stage_assessments_actor on public.operation_stage_assessments(assessed_by);

create table public.operation_milestones (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id),
  milestone text not null check(milestone in ('liberacao_embarque','encerramento')),
  decision text not null check(decision in ('aprovado','revogado')),
  reason text not null check(length(btrim(reason))>0),
  evidence_id uuid not null,
  decided_by uuid not null references public.profiles(id),
  decided_at timestamptz not null default now(),
  foreign key(evidence_id,operation_id) references public.evidence(id,operation_id)
);
create index idx_operation_milestones_latest on public.operation_milestones(operation_id,milestone,decided_at desc,id desc);
create index idx_operation_milestones_evidence on public.operation_milestones(evidence_id,operation_id);
create index idx_operation_milestones_actor on public.operation_milestones(decided_by);

create table public.exception_approvals (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id),
  exception_id uuid not null references public.exceptions(id),
  rule_version_id uuid not null references public.rule_versions(id),
  reason text not null check(length(btrim(reason))>0),
  evidence_id uuid not null,
  approved_by uuid not null references public.profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null check(ends_at>starts_at),
  revoked_at timestamptz,
  foreign key(evidence_id,operation_id) references public.evidence(id,operation_id)
);
create index idx_exception_approvals_operation on public.exception_approvals(operation_id,ends_at);
create index idx_exception_approvals_exception on public.exception_approvals(exception_id);
create index idx_exception_approvals_rule on public.exception_approvals(rule_version_id);
create index idx_exception_approvals_evidence on public.exception_approvals(evidence_id,operation_id);
create index idx_exception_approvals_actor on public.exception_approvals(approved_by);

create table public.reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id),
  source_table text not null check(source_table in ('stg_es4004_contracts','stg_gg4164_purchase_contracts','stg_gg2037_sales_contracts','stg_gplp40180_logistics_orders','stg_fiscal_documents','documents')),
  source_row_id uuid not null,
  field_name text not null,
  reason text not null,
  status text not null default 'aberta' check(status in ('aberta','resolvida','descartada')),
  resolution_note text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(import_run_id,source_table,source_row_id,field_name),
  check(status='aberta' or (resolved_by is not null and resolved_at is not null and length(btrim(resolution_note))>0))
);
create index idx_reconciliation_resolver on public.reconciliation_items(resolved_by);

-- Privilégios explícitos: não depender dos grants padrão de cada projeto Supabase.
grant usage on schema public to authenticated,service_role;
grant all on all tables in schema public to service_role;
grant select on public.areas,public.operation_states,public.profiles,public.operations,public.partners,
 public.contracts,public.logistics_orders,public.fiscal_documents,public.documents,public.rules,
 public.exceptions,public.pending_items,public.evidence,public.state_history,
 public.v_operations_farol,public.v_area_backlog,public.v_contract_drilldown to authenticated;
grant insert,update on public.documents,public.pending_items to authenticated;
grant insert on public.evidence to authenticated;
grant insert,update,delete on public.profiles,public.rules,public.exceptions to authenticated;
-- Policies existentes continuam restringindo estes privilégios por perfil/área.
do $$ declare t text; begin
  foreach t in array array['operation_contract_links','operation_locations','document_versions','document_reviews',
    'rule_versions','rule_evaluations','operation_stage_assessments','operation_milestones','exception_approvals','reconciliation_items'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy internal_read on public.%I for select to authenticated using ((select private.current_profile_can_read_internal_data()))',t);
  end loop;
end $$;
-- Históricos recebem somente INSERT pelo backend; correções geram novos eventos.
create function private.prevent_history_mutation() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Histórico imutável: registre um novo evento.' using errcode='55000'; end $$;
revoke all on function private.prevent_history_mutation() from public,anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['document_versions','document_reviews','rule_evaluations','operation_stage_assessments','operation_milestones'] loop
    execute format('create trigger immutable_history before update or delete on public.%I for each row execute function private.prevent_history_mutation()',t);
    execute format('create trigger audit_history after insert on public.%I for each row execute function public.audit_row_change()',t);
  end loop;
end $$;

-- Perfis de contas que antecedem o trigger: nenhum acesso é aprovado implicitamente.
insert into public.profiles(id,email,full_name,status,access_level)
select id,email,coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name'),'pending','external'
from auth.users on conflict(id) do nothing;

create view public.v_operation_stage_readiness with(security_invoker=true) as
select o.id as operation_id,s.code as stage,
 case when a.id is null or a.valid_until<=now() or
   (a.document_version_id is not null and exists (
    select 1 from public.document_versions newer join public.document_versions basis on basis.id=a.document_version_id
    where newer.document_id=basis.document_id and newer.version_no>basis.version_no))
   then 'pendente' else a.result end as result,
 a.reason,a.assessed_at,a.valid_until
from public.operations o cross join public.operation_states s
left join lateral (
 select x.* from public.operation_stage_assessments x where x.operation_id=o.id and x.stage=s.code
 order by x.assessed_at desc,x.id desc limit 1
) a on true where s.code<>'E6';
grant select on public.v_operation_stage_readiness to authenticated,service_role;

-- Ausência de pendência NÃO significa operação concluída.
create or replace function public.recalculate_operation_farol(target_operation_id uuid) returns void
language plpgsql security invoker set search_path=public,private as $$
declare next_stage public.operation_stage; next_semaphore public.semaphore_status;
 previous_stage public.operation_stage; previous_semaphore public.semaphore_status;
begin
 select current_stage,semaphore into previous_stage,previous_semaphore from public.operations where id=target_operation_id for update;
 if not found then return; end if;
 select min(stage) into next_stage from (
   select stage from public.pending_items where operation_id=target_operation_id and status in ('aberta','em_tratativa')
   union all select stage from public.v_operation_stage_readiness where operation_id=target_operation_id and result not in ('aprovado','nao_aplicavel')
 ) remaining;
 if next_stage is not null then
   next_semaphore:=case when exists(select 1 from public.pending_items where operation_id=target_operation_id and status in ('aberta','em_tratativa') and severity='bloqueante')
     or exists(select 1 from public.v_operation_stage_readiness where operation_id=target_operation_id and result not in ('aprovado','nao_aplicavel'))
     then 'vermelho'::public.semaphore_status else 'amarelo'::public.semaphore_status end;
 elsif (select decision from public.operation_milestones where operation_id=target_operation_id and milestone='encerramento' order by decided_at desc,id desc limit 1)='aprovado' then
   next_stage:='E6'; next_semaphore:='verde';
 else next_stage:='E5'; next_semaphore:='amarelo'; end if;
 update public.operations set current_stage=next_stage,semaphore=next_semaphore where id=target_operation_id;
 if previous_stage is distinct from next_stage or previous_semaphore is distinct from next_semaphore then
   insert into public.state_history(operation_id,previous_stage,new_stage,previous_semaphore,new_semaphore,reason,actor_type)
   values(target_operation_id,previous_stage,next_stage,previous_semaphore,next_semaphore,'Verificações explícitas; encerramento independente de liberação','system');
 end if;
end $$;
-- Recalcular é função técnica de backend; não é endpoint de aprovação.
revoke all on function public.recalculate_operation_farol(uuid) from public,anon,authenticated;
grant execute on function public.recalculate_operation_farol(uuid) to service_role;
-- O trigger de pendências precisa recalcular sem conceder UPDATE geral em operations.
create or replace function public.recalculate_operation_farol_trigger() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then perform public.recalculate_operation_farol(old.operation_id); return old; end if;
 perform public.recalculate_operation_farol(new.operation_id); return new;
end $$;
revoke all on function public.recalculate_operation_farol_trigger() from public,anon,authenticated;

do $$ declare t text; begin
 foreach t in array array['document_versions','operation_stage_assessments','operation_milestones'] loop
   execute format('create trigger recalculate_farol after insert on public.%I for each row execute function public.recalculate_operation_farol_trigger()',t);
 end loop;
end $$;

-- Resumo calculado na leitura: validade expirada não depende de um job atualizar o cache.
create view public.v_operation_readiness_summary with(security_invoker=true) as
select o.id as operation_id,
 coalesce(r.first_pending_stage,case when closure.decision='aprovado' then 'E6'::public.operation_stage else 'E5'::public.operation_stage end) as current_stage,
 case when r.has_blocker then 'vermelho'::public.semaphore_status
      when r.first_pending_stage is not null or closure.decision is distinct from 'aprovado' then 'amarelo'::public.semaphore_status
      else 'verde'::public.semaphore_status end as semaphore,
 coalesce(release.decision,'pendente') as shipment_release_status,
 coalesce(closure.decision,'pendente') as closure_status
from public.operations o
left join lateral (
 select min(stage) as first_pending_stage,coalesce(bool_or(blocker),false) as has_blocker from (
  select stage,severity='bloqueante' as blocker from public.pending_items where operation_id=o.id and status in ('aberta','em_tratativa')
  union all select stage,true from public.v_operation_stage_readiness where operation_id=o.id and result not in ('aprovado','nao_aplicavel')
 ) outstanding
) r on true
left join lateral (select decision from public.operation_milestones where operation_id=o.id and milestone='liberacao_embarque' order by decided_at desc,id desc limit 1) release on true
left join lateral (select decision from public.operation_milestones where operation_id=o.id and milestone='encerramento' order by decided_at desc,id desc limit 1) closure on true;
grant select on public.v_operation_readiness_summary to authenticated,service_role;

-- Mesma interface do dashboard, sem multiplicar contratos x OL x notas x pendências.
create or replace view public.v_operations_farol with(security_invoker=true) as
select o.id,o.oper_b2b,o.description,o.item_code,o.item_description,o.finalidade,o.normalized_status,
 s.current_stage,os.name as current_stage_name,s.semaphore,
 coalesce(c.purchases,0) as purchase_contracts_count,coalesce(c.sales,0) as sales_contracts_count,
 (select count(*) from public.logistics_orders lo where lo.operation_id=o.id) as logistics_orders_count,
 (select count(*) from public.fiscal_documents fd where fd.operation_id=o.id) as fiscal_documents_count,
 p.blockers as blocking_pending_count,p.warnings as warning_pending_count,p.oldest as oldest_open_pending_at,
 case when p.oldest is null then 0 else extract(day from now()-p.oldest)::integer end as aging_days,o.updated_at,
 o.planned_shipping_at,o.documentary_due_at,s.shipment_release_status,s.closure_status
from public.operations o join public.v_operation_readiness_summary s on s.operation_id=o.id
join public.operation_states os on os.code=s.current_stage
left join lateral (
 select count(*) filter(where contracts.contract_type='compra') as purchases,
        count(*) filter(where contracts.contract_type='venda') as sales
 from public.operation_contract_links links join public.contracts on contracts.id=links.contract_id
 where links.operation_id=o.id
) c on true
left join lateral (
 select count(*) filter(where severity='bloqueante') as blockers,
 count(*) filter(where severity='atencao') as warnings,min(opened_at) as oldest
 from public.pending_items where operation_id=o.id and status in ('aberta','em_tratativa')
) p on true;

-- Relatórios diários são snapshots. A filial/item desambiguam números reutilizados.
alter table public.contracts add column establishment text not null default '',
 add column source_item_key text not null default '';
alter table public.contracts drop constraint contracts_contract_type_contract_number_data_carga_key;
alter table public.contracts add constraint contracts_snapshot_key
 unique(contract_type,contract_number,establishment,source_item_key,data_carga);
comment on column public.contracts.source_item_key is 'Chave textual do item na origem; não inferir a partir da descrição comercial.';
comment on table public.operation_contract_links is 'Vínculos explícitos entre OP e snapshots de contrato; associação ambígua vai para reconciliação.';
