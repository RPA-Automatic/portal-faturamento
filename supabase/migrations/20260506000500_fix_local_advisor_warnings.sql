-- Correcoes adicionais do Supabase Advisor local.
-- Reduz exposicao anon em GraphQL/REST, evita policies permissivas duplicadas e tira helpers SECURITY DEFINER da API publica.

create schema if not exists private;

grant usage on schema private to authenticated;
grant usage on schema private to service_role;

revoke all on schema private from public;
revoke all on schema private from anon;

-- Tabelas do dominio nao devem ser descobertas antes do login.
revoke select on all tables in schema public from anon;
revoke select on all tables in schema storage from anon;
revoke usage on schema graphql_public from anon;

alter default privileges in schema public revoke select on tables from anon;

-- Staging e logs tecnicos nao devem ser consultados por usuarios comuns via GraphQL/REST direto.
revoke select on table public.audit_logs from authenticated;
revoke select on table public.import_runs from authenticated;
revoke select on table public.job_logs from authenticated;
revoke select on table public.stg_es4004_contracts from authenticated;
revoke select on table public.stg_gg4164_purchase_contracts from authenticated;
revoke select on table public.stg_gg2037_sales_contracts from authenticated;
revoke select on table public.stg_gplp40180_logistics_orders from authenticated;
revoke select on table public.stg_fiscal_documents from authenticated;

create or replace function private.current_profile_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin and p.status = 'active' from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

create or replace function private.current_profile_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.status = 'active' from public.profiles p where p.id = (select auth.uid())), false);
$$;

create or replace function private.current_profile_area()
returns public.area_code
language sql
stable
security definer
set search_path = public
as $$
  select p.area from public.profiles p where p.id = (select auth.uid()) and p.status = 'active';
$$;

create or replace function private.current_profile_access_level()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.access_level from public.profiles p where p.id = (select auth.uid()) and p.status = 'active';
$$;

create or replace function private.current_profile_partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.partner_id from public.profiles p where p.id = (select auth.uid()) and p.status = 'active';
$$;

create or replace function private.current_profile_can_read_internal_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.status = 'active'
        and (p.is_admin or p.access_level in ('internal', 'manager', 'read_only'))
      from public.profiles p
      where p.id = (select auth.uid())
    ),
    false
  );
$$;

create or replace function private.current_profile_can_write_internal_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.status = 'active'
        and (p.is_admin or p.access_level in ('internal', 'manager'))
      from public.profiles p
      where p.id = (select auth.uid())
    ),
    false
  );
$$;

create or replace function private.current_profile_can_read_operation(target_operation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_profile_can_read_internal_data(), false)
    or exists (
      select 1
      from public.profiles p
      join public.contracts c on c.partner_id = p.partner_id
      where p.id = (select auth.uid())
        and p.status = 'active'
        and p.access_level = 'external'
        and p.partner_id is not null
        and c.operation_id = target_operation_id
    );
$$;

create or replace function private.current_profile_can_read_partner(target_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_profile_can_read_internal_data(), false)
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.status = 'active'
        and p.access_level = 'external'
        and p.partner_id = target_partner_id
    );
$$;

create or replace function private.current_profile_can_read_document(target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_profile_can_read_internal_data(), false)
    or exists (
      select 1
      from public.documents d
      left join public.contracts c on c.id = d.contract_id
      left join public.fiscal_documents fd on fd.id = d.fiscal_document_id
      left join public.logistics_orders lo on lo.id = d.logistics_order_id
      where d.id = target_document_id
        and (
          private.current_profile_can_read_operation(d.operation_id)
          or private.current_profile_can_read_operation(c.operation_id)
          or private.current_profile_can_read_operation(fd.operation_id)
          or private.current_profile_can_read_operation(lo.operation_id)
        )
    );
$$;

create or replace function private.current_profile_can_read_storage_path(target_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_profile_can_read_internal_data(), false)
    or exists (
      select 1
      from public.documents d
      where d.storage_path = target_storage_path
        and private.current_profile_can_read_document(d.id)
    );
$$;

grant execute on all functions in schema private to authenticated;
grant execute on all functions in schema private to service_role;
revoke all on all functions in schema private from public;
revoke all on all functions in schema private from anon;

-- Consolidacao das policies que geravam Multiple Permissive Policies.
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;

create policy "Profiles are visible by owner or admin"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.current_profile_is_admin());

create policy "Admins can insert profiles"
on public.profiles for insert to authenticated
with check (private.current_profile_is_admin());

create policy "Admins can update profiles"
on public.profiles for update to authenticated
using (private.current_profile_is_admin())
with check (private.current_profile_is_admin());

create policy "Admins can delete profiles"
on public.profiles for delete to authenticated
using (private.current_profile_is_admin());

drop policy if exists "Active users can read rules" on public.rules;
drop policy if exists "Admins can manage rules" on public.rules;

create policy "Active users can read rules"
on public.rules for select to authenticated
using (private.current_profile_is_active());

create policy "Admins can insert rules"
on public.rules for insert to authenticated
with check (private.current_profile_is_admin());

create policy "Admins can update rules"
on public.rules for update to authenticated
using (private.current_profile_is_admin())
with check (private.current_profile_is_admin());

create policy "Admins can delete rules"
on public.rules for delete to authenticated
using (private.current_profile_is_admin());

drop policy if exists "Internal users can read exceptions" on public.exceptions;
drop policy if exists "Admins can manage exceptions" on public.exceptions;

create policy "Internal users can read exceptions"
on public.exceptions for select to authenticated
using (private.current_profile_can_read_internal_data());

create policy "Admins can insert exceptions"
on public.exceptions for insert to authenticated
with check (private.current_profile_is_admin());

create policy "Admins can update exceptions"
on public.exceptions for update to authenticated
using (private.current_profile_is_admin())
with check (private.current_profile_is_admin());

create policy "Admins can delete exceptions"
on public.exceptions for delete to authenticated
using (private.current_profile_is_admin());

-- Recria policies operacionais usando helpers fora do schema exposto pela API.
drop policy if exists "Active users can read reference areas" on public.areas;
drop policy if exists "Active users can read operation states" on public.operation_states;
drop policy if exists "Scoped users can read operations" on public.operations;
drop policy if exists "Scoped users can read partners" on public.partners;
drop policy if exists "Scoped users can read contracts" on public.contracts;
drop policy if exists "Scoped users can read logistics orders" on public.logistics_orders;
drop policy if exists "Scoped users can read fiscal documents" on public.fiscal_documents;
drop policy if exists "Scoped users can read documents" on public.documents;
drop policy if exists "Scoped users can read pending items" on public.pending_items;
drop policy if exists "Scoped users can read evidence" on public.evidence;
drop policy if exists "Scoped users can read state history" on public.state_history;
drop policy if exists "Area users can update own pending items" on public.pending_items;
drop policy if exists "Internal users can create documents" on public.documents;
drop policy if exists "Internal users can update documents" on public.documents;
drop policy if exists "Internal users can create evidence" on public.evidence;

create policy "Active users can read reference areas"
on public.areas for select to authenticated
using (private.current_profile_is_active());

create policy "Active users can read operation states"
on public.operation_states for select to authenticated
using (private.current_profile_is_active());

create policy "Scoped users can read operations"
on public.operations for select to authenticated
using (private.current_profile_can_read_operation(id));

create policy "Scoped users can read partners"
on public.partners for select to authenticated
using (private.current_profile_can_read_partner(id));

create policy "Scoped users can read contracts"
on public.contracts for select to authenticated
using (
  private.current_profile_can_read_internal_data()
  or private.current_profile_can_read_partner(partner_id)
);

create policy "Scoped users can read logistics orders"
on public.logistics_orders for select to authenticated
using (private.current_profile_can_read_operation(operation_id));

create policy "Scoped users can read fiscal documents"
on public.fiscal_documents for select to authenticated
using (
  private.current_profile_can_read_operation(operation_id)
  or private.current_profile_can_read_partner(partner_id)
);

create policy "Scoped users can read documents"
on public.documents for select to authenticated
using (
  private.current_profile_can_read_operation(operation_id)
  or exists (
    select 1 from public.contracts c
    where c.id = documents.contract_id
      and private.current_profile_can_read_operation(c.operation_id)
  )
);

create policy "Scoped users can read pending items"
on public.pending_items for select to authenticated
using (private.current_profile_can_read_operation(operation_id));

create policy "Scoped users can read evidence"
on public.evidence for select to authenticated
using (private.current_profile_can_read_operation(operation_id));

create policy "Scoped users can read state history"
on public.state_history for select to authenticated
using (private.current_profile_can_read_operation(operation_id));

create policy "Area users can update own pending items"
on public.pending_items for update to authenticated
using (
  private.current_profile_is_admin()
  or (
    private.current_profile_is_active()
    and private.current_profile_access_level() in ('internal', 'manager')
    and private.current_profile_area() = pending_items.owner_area
  )
)
with check (
  private.current_profile_is_admin()
  or (
    private.current_profile_is_active()
    and private.current_profile_access_level() in ('internal', 'manager')
    and private.current_profile_area() = pending_items.owner_area
  )
);

create policy "Internal users can create documents"
on public.documents for insert to authenticated
with check (
  private.current_profile_can_write_internal_data()
  and (operation_id is null or private.current_profile_can_read_operation(operation_id))
);

create policy "Internal users can update documents"
on public.documents for update to authenticated
using (
  private.current_profile_can_write_internal_data()
  and (operation_id is null or private.current_profile_can_read_operation(operation_id))
)
with check (
  private.current_profile_can_write_internal_data()
  and (operation_id is null or private.current_profile_can_read_operation(operation_id))
);

create policy "Internal users can create evidence"
on public.evidence for insert to authenticated
with check (
  private.current_profile_can_write_internal_data()
  and (operation_id is null or private.current_profile_can_read_operation(operation_id))
);

-- Storage policies usando helpers privados.
drop policy if exists "Scoped users can download operation documents" on storage.objects;
drop policy if exists "Internal users can upload operation documents" on storage.objects;
drop policy if exists "Internal users can update operation documents" on storage.objects;
drop policy if exists "Admins can delete operation documents" on storage.objects;

create policy "Scoped users can download operation documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'operation-documents'
  and private.current_profile_can_read_storage_path(name)
);

create policy "Internal users can upload operation documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'operation-documents'
  and private.current_profile_can_write_internal_data()
);

create policy "Internal users can update operation documents"
on storage.objects for update to authenticated
using (
  bucket_id = 'operation-documents'
  and private.current_profile_can_write_internal_data()
)
with check (
  bucket_id = 'operation-documents'
  and private.current_profile_can_write_internal_data()
);

create policy "Admins can delete operation documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'operation-documents'
  and private.current_profile_is_admin()
);

-- A RPC de resolucao nao precisa elevar privilegio; as policies e a checagem interna bastam.
create or replace function public.resolve_pending_item(
  target_pending_item_id uuid,
  next_status public.pending_status,
  resolution_note text default null
)
returns public.pending_items
language plpgsql
security invoker
set search_path = public, private
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
    private.current_profile_is_admin()
    or (
      private.current_profile_is_active()
      and private.current_profile_access_level() in ('internal', 'manager')
      and private.current_profile_area() = target_item.owner_area
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

-- Functions publicas auxiliares nao devem ser chamadas como RPC.
revoke all on function public.audit_row_change() from public, anon, authenticated;
revoke all on function public.current_profile_access_level() from public, anon, authenticated;
revoke all on function public.current_profile_area() from public, anon, authenticated;
revoke all on function public.current_profile_can_read_document(uuid) from public, anon, authenticated;
revoke all on function public.current_profile_can_read_internal_data() from public, anon, authenticated;
revoke all on function public.current_profile_can_read_operation(uuid) from public, anon, authenticated;
revoke all on function public.current_profile_can_read_partner(uuid) from public, anon, authenticated;
revoke all on function public.current_profile_can_read_storage_path(text) from public, anon, authenticated;
revoke all on function public.current_profile_can_write_internal_data() from public, anon, authenticated;
revoke all on function public.current_profile_is_active() from public, anon, authenticated;
revoke all on function public.current_profile_is_admin() from public, anon, authenticated;
revoke all on function public.current_profile_partner_id() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user_profile() from public, anon, authenticated;

revoke all on function public.resolve_pending_item(uuid, public.pending_status, text) from public, anon;
grant execute on function public.resolve_pending_item(uuid, public.pending_status, text) to authenticated;