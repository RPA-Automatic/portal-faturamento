-- Hardening de autorizacao e RLS para LGPD.
-- Objetivo: separar autenticacao de autorizacao e impedir leitura ampla por qualquer usuario autenticado.

alter table public.profiles
  add column if not exists status text not null default 'pending',
  add column if not exists access_level text not null default 'external',
  add column if not exists partner_id uuid references public.partners(id) on delete set null,
  add column if not exists last_login_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_status_check,
  add constraint profiles_status_check check (status in ('pending', 'active', 'blocked'));

alter table public.profiles
  drop constraint if exists profiles_access_level_check,
  add constraint profiles_access_level_check check (access_level in ('internal', 'manager', 'read_only', 'external'));

create index if not exists idx_profiles_status_access on public.profiles(status, access_level);
create index if not exists idx_profiles_partner on public.profiles(partner_id);

-- Mantem perfis existentes utilizaveis apos aplicar a migration. Novos usuarios seguem como pending.
update public.profiles
set status = 'active',
    access_level = case when is_admin then 'manager' else coalesce(nullif(access_level, ''), 'internal') end
where status = 'pending'
  and created_at < now();

create or replace function public.current_profile_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin and p.status = 'active' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.current_profile_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.status = 'active' from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.current_profile_area()
returns public.area_code
language sql
stable
security definer
set search_path = public
as $$
  select p.area from public.profiles p where p.id = auth.uid() and p.status = 'active';
$$;

create or replace function public.current_profile_access_level()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.access_level from public.profiles p where p.id = auth.uid() and p.status = 'active';
$$;

create or replace function public.current_profile_partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.partner_id from public.profiles p where p.id = auth.uid() and p.status = 'active';
$$;

create or replace function public.current_profile_can_read_internal_data()
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
      where p.id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.current_profile_can_read_operation(target_operation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_can_read_internal_data(), false)
    or exists (
      select 1
      from public.profiles p
      join public.contracts c on c.partner_id = p.partner_id
      where p.id = auth.uid()
        and p.status = 'active'
        and p.access_level = 'external'
        and p.partner_id is not null
        and c.operation_id = target_operation_id
    );
$$;

create or replace function public.current_profile_can_read_partner(target_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_can_read_internal_data(), false)
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.status = 'active'
        and p.access_level = 'external'
        and p.partner_id = target_partner_id
    );
$$;

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, status, access_level)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'pending',
    'external'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_auth_users_profile on auth.users;
create trigger trg_auth_users_profile
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_auth_user_profile();

create or replace function public.bootstrap_admin_profile(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set status = 'active',
      access_level = 'manager',
      is_admin = true,
      updated_at = now()
  where lower(email) = lower(target_email);

  if not found then
    raise exception 'Profile with email % not found', target_email;
  end if;
end;
$$;

revoke all on function public.bootstrap_admin_profile(text) from public;
revoke all on function public.bootstrap_admin_profile(text) from anon;
revoke all on function public.bootstrap_admin_profile(text) from authenticated;
grant execute on function public.bootstrap_admin_profile(text) to service_role;

-- Views devem executar como invoker para respeitar RLS do usuario logado.
alter view if exists public.v_operations_farol set (security_invoker = true);
alter view if exists public.v_area_backlog set (security_invoker = true);
alter view if exists public.v_contract_drilldown set (security_invoker = true);

-- Profiles
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;

create policy "Users can read own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "Admins can read all profiles"
on public.profiles for select to authenticated
using (public.current_profile_is_admin());

create policy "Admins can manage profiles"
on public.profiles for all to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());

-- Reference tables
drop policy if exists "Authenticated users can read reference areas" on public.areas;
drop policy if exists "Authenticated users can read operation states" on public.operation_states;
drop policy if exists "Authenticated users can read rules" on public.rules;
drop policy if exists "Authenticated users can read exceptions" on public.exceptions;

create policy "Active users can read reference areas"
on public.areas for select to authenticated
using (public.current_profile_is_active());

create policy "Active users can read operation states"
on public.operation_states for select to authenticated
using (public.current_profile_is_active());

create policy "Active users can read rules"
on public.rules for select to authenticated
using (public.current_profile_is_active());

create policy "Internal users can read exceptions"
on public.exceptions for select to authenticated
using (public.current_profile_can_read_internal_data());

-- Operational read policies
drop policy if exists "Authenticated users can read operations" on public.operations;
drop policy if exists "Authenticated users can read partners" on public.partners;
drop policy if exists "Authenticated users can read contracts" on public.contracts;
drop policy if exists "Authenticated users can read logistics orders" on public.logistics_orders;
drop policy if exists "Authenticated users can read fiscal documents" on public.fiscal_documents;
drop policy if exists "Authenticated users can read documents" on public.documents;
drop policy if exists "Authenticated users can read pending items" on public.pending_items;
drop policy if exists "Authenticated users can read evidence" on public.evidence;
drop policy if exists "Authenticated users can read state history" on public.state_history;

create policy "Scoped users can read operations"
on public.operations for select to authenticated
using (public.current_profile_can_read_operation(id));

create policy "Scoped users can read partners"
on public.partners for select to authenticated
using (public.current_profile_can_read_partner(id));

create policy "Scoped users can read contracts"
on public.contracts for select to authenticated
using (
  public.current_profile_can_read_internal_data()
  or public.current_profile_can_read_partner(partner_id)
);

create policy "Scoped users can read logistics orders"
on public.logistics_orders for select to authenticated
using (public.current_profile_can_read_operation(operation_id));

create policy "Scoped users can read fiscal documents"
on public.fiscal_documents for select to authenticated
using (
  public.current_profile_can_read_operation(operation_id)
  or public.current_profile_can_read_partner(partner_id)
);

create policy "Scoped users can read documents"
on public.documents for select to authenticated
using (
  public.current_profile_can_read_operation(operation_id)
  or exists (
    select 1 from public.contracts c
    where c.id = documents.contract_id
      and public.current_profile_can_read_operation(c.operation_id)
  )
);

create policy "Scoped users can read pending items"
on public.pending_items for select to authenticated
using (public.current_profile_can_read_operation(operation_id));

create policy "Scoped users can read evidence"
on public.evidence for select to authenticated
using (public.current_profile_can_read_operation(operation_id));

create policy "Scoped users can read state history"
on public.state_history for select to authenticated
using (public.current_profile_can_read_operation(operation_id));

-- Update policies
drop policy if exists "Area users can update own pending items" on public.pending_items;

create policy "Area users can update own pending items"
on public.pending_items for update to authenticated
using (
  public.current_profile_is_admin()
  or (
    public.current_profile_is_active()
    and public.current_profile_access_level() in ('internal', 'manager')
    and public.current_profile_area() = pending_items.owner_area
  )
)
with check (
  public.current_profile_is_admin()
  or (
    public.current_profile_is_active()
    and public.current_profile_access_level() in ('internal', 'manager')
    and public.current_profile_area() = pending_items.owner_area
  )
);

-- Admin-only operational metadata
drop policy if exists "Admins can manage rules" on public.rules;
drop policy if exists "Admins can manage exceptions" on public.exceptions;

create policy "Admins can manage rules"
on public.rules for all to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());

create policy "Admins can manage exceptions"
on public.exceptions for all to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());
