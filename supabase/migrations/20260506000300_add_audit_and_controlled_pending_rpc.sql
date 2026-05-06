-- Hardening inspirado no portal de cadastro, adaptado ao dominio de OP/contratos/faturamento.
-- Aplica auditoria, acesso restrito a dados tecnicos e RPC controlada para pendencias.

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_record_id uuid;
  previous_data jsonb;
  next_data jsonb;
begin
  if tg_op = 'INSERT' then
    changed_record_id := new.id;
    next_data := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    changed_record_id := new.id;
    previous_data := to_jsonb(old);
    next_data := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    changed_record_id := old.id;
    previous_data := to_jsonb(old);
  end if;

  insert into public.audit_logs (
    table_name,
    record_id,
    action,
    actor_id,
    old_data,
    new_data
  ) values (
    tg_table_schema || '.' || tg_table_name,
    changed_record_id,
    tg_op,
    (select auth.uid()),
    previous_data,
    next_data
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function public.audit_row_change() from public;
grant execute on function public.audit_row_change() to service_role;

drop trigger if exists trg_audit_operations on public.operations;
create trigger trg_audit_operations
after insert or update or delete on public.operations
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_partners on public.partners;
create trigger trg_audit_partners
after insert or update or delete on public.partners
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_contracts on public.contracts;
create trigger trg_audit_contracts
after insert or update or delete on public.contracts
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_logistics_orders on public.logistics_orders;
create trigger trg_audit_logistics_orders
after insert or update or delete on public.logistics_orders
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_fiscal_documents on public.fiscal_documents;
create trigger trg_audit_fiscal_documents
after insert or update or delete on public.fiscal_documents
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_documents on public.documents;
create trigger trg_audit_documents
after insert or update or delete on public.documents
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_pending_items on public.pending_items;
create trigger trg_audit_pending_items
after insert or update or delete on public.pending_items
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_evidence on public.evidence;
create trigger trg_audit_evidence
after insert or update or delete on public.evidence
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles
after insert or update or delete on public.profiles
for each row execute function public.audit_row_change();

-- Logs tecnicos e staging nao devem ficar visiveis a usuarios comuns.
drop policy if exists "Admins can read audit logs" on public.audit_logs;
drop policy if exists "Admins can read import runs" on public.import_runs;
drop policy if exists "Admins can read job logs" on public.job_logs;
drop policy if exists "Admins can read staging ES4004" on public.stg_es4004_contracts;
drop policy if exists "Admins can read staging GG4164" on public.stg_gg4164_purchase_contracts;
drop policy if exists "Admins can read staging GG2037" on public.stg_gg2037_sales_contracts;
drop policy if exists "Admins can read staging GPLP40180" on public.stg_gplp40180_logistics_orders;
drop policy if exists "Admins can read staging fiscal documents" on public.stg_fiscal_documents;

create policy "Admins can read audit logs"
on public.audit_logs for select to authenticated
using (public.current_profile_is_admin());

create policy "Admins can read import runs"
on public.import_runs for select to authenticated
using (public.current_profile_is_admin());

create policy "Admins can read job logs"
on public.job_logs for select to authenticated
using (public.current_profile_is_admin());

create policy "Admins can read staging ES4004"
on public.stg_es4004_contracts for select to authenticated
using (public.current_profile_is_admin());

create policy "Admins can read staging GG4164"
on public.stg_gg4164_purchase_contracts for select to authenticated
using (public.current_profile_is_admin());

create policy "Admins can read staging GG2037"
on public.stg_gg2037_sales_contracts for select to authenticated
using (public.current_profile_is_admin());

create policy "Admins can read staging GPLP40180"
on public.stg_gplp40180_logistics_orders for select to authenticated
using (public.current_profile_is_admin());

create policy "Admins can read staging fiscal documents"
on public.stg_fiscal_documents for select to authenticated
using (public.current_profile_is_admin());

create or replace function public.resolve_pending_item(
  target_pending_item_id uuid,
  next_status public.pending_status,
  resolution_note text default null
)
returns public.pending_items
language plpgsql
security definer
set search_path = public
as $$
declare
  target_item public.pending_items;
  updated_item public.pending_items;
begin
  if next_status not in ('resolvida', 'dispensada', 'em_tratativa') then
    raise exception 'Status % nao permitido para resolucao manual de pendencia.', next_status using errcode = '22023';
  end if;

  select *
    into target_item
  from public.pending_items
  where id = target_pending_item_id
  for update;

  if not found then
    raise exception 'Pendencia % nao encontrada.', target_pending_item_id using errcode = 'P0002';
  end if;

  if not (
    public.current_profile_is_admin()
    or (
      public.current_profile_is_active()
      and public.current_profile_access_level() in ('internal', 'manager')
      and public.current_profile_area() = target_item.owner_area
    )
  ) then
    raise exception 'Usuario sem permissao para atualizar esta pendencia.' using errcode = '42501';
  end if;

  update public.pending_items
  set status = next_status,
      resolved_at = case when next_status in ('resolvida', 'dispensada') then now() else null end,
      next_step = coalesce(nullif(resolution_note, ''), next_step),
      updated_at = now()
  where id = target_pending_item_id
  returning * into updated_item;

  insert into public.evidence (
    operation_id,
    contract_id,
    pending_item_id,
    document_id,
    evidence_type,
    source_name,
    source_value,
    payload
  ) values (
    updated_item.operation_id,
    updated_item.contract_id,
    updated_item.id,
    updated_item.document_id,
    'manual_resolution',
    'portal',
    resolution_note,
    jsonb_build_object(
      'status', next_status,
      'actor_id', (select auth.uid()),
      'owner_area', updated_item.owner_area,
      'resolved_at', updated_item.resolved_at
    )
  );

  return updated_item;
end;
$$;

revoke all on function public.resolve_pending_item(uuid, public.pending_status, text) from public;
grant execute on function public.resolve_pending_item(uuid, public.pending_status, text) to authenticated;

-- Mantem delete direto negado de forma explicita para o papel autenticado.
drop policy if exists "Authenticated users cannot delete operations" on public.operations;
drop policy if exists "Authenticated users cannot delete contracts" on public.contracts;
drop policy if exists "Authenticated users cannot delete partners" on public.partners;
drop policy if exists "Authenticated users cannot delete documents" on public.documents;
drop policy if exists "Authenticated users cannot delete pending items" on public.pending_items;
drop policy if exists "Authenticated users cannot delete evidence" on public.evidence;

create policy "Authenticated users cannot delete operations"
on public.operations for delete to authenticated
using (false);

create policy "Authenticated users cannot delete contracts"
on public.contracts for delete to authenticated
using (false);

create policy "Authenticated users cannot delete partners"
on public.partners for delete to authenticated
using (false);

create policy "Authenticated users cannot delete documents"
on public.documents for delete to authenticated
using (false);

create policy "Authenticated users cannot delete pending items"
on public.pending_items for delete to authenticated
using (false);

create policy "Authenticated users cannot delete evidence"
on public.evidence for delete to authenticated
using (false);