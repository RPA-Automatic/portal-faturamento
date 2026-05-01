create extension if not exists pgcrypto;

create type public.release_status as enum (
  'draft',
  'pending',
  'approved',
  'rejected',
  'shipped',
  'cancelled'
);

create table public.portal_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  provider text,
  role text not null default 'operator' check (role in ('admin', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  document_number text,
  city text,
  state text check (state is null or char_length(state) = 2),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_number)
);

create table public.carriers (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  document_number text,
  contact_email text,
  contact_phone text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_number)
);

create table public.shipment_releases (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  invoice_key text,
  customer_id uuid references public.customers (id),
  customer_name text not null,
  carrier_id uuid references public.carriers (id),
  carrier_name text,
  order_number text,
  shipment_number text,
  origin_city text,
  destination_city text,
  destination_state text check (destination_state is null or char_length(destination_state) = 2),
  gross_weight_kg numeric(14, 3),
  total_amount numeric(14, 2),
  scheduled_ship_date date,
  status public.release_status not null default 'pending',
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invoice_key)
);

create table public.release_documents (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.shipment_releases (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  uploaded_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create index shipment_releases_created_by_idx on public.shipment_releases (created_by);
create index shipment_releases_status_idx on public.shipment_releases (status);
create index shipment_releases_invoice_number_idx on public.shipment_releases (invoice_number);
create index release_documents_release_id_idx on public.release_documents (release_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger portal_profiles_set_updated_at
before update on public.portal_profiles
for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger carriers_set_updated_at
before update on public.carriers
for each row execute function public.set_updated_at();

create trigger shipment_releases_set_updated_at
before update on public.shipment_releases
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.portal_profiles (id, email, full_name, avatar_url, provider)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_app_meta_data ->> 'provider'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      avatar_url = excluded.avatar_url,
      provider = excluded.provider;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.portal_profiles
    where id = user_id and role = 'admin'
  );
$$;

alter table public.portal_profiles enable row level security;
alter table public.customers enable row level security;
alter table public.carriers enable row level security;
alter table public.shipment_releases enable row level security;
alter table public.release_documents enable row level security;

create policy "Users can read their profile" on public.portal_profiles
  for select using (auth.uid() = id);

create policy "Admins can read all profiles" on public.portal_profiles
  for select using (public.is_admin(auth.uid()));

create policy "Users can update their profile" on public.portal_profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Authenticated users can read customers" on public.customers
  for select to authenticated using (true);

create policy "Authenticated users can manage customers" on public.customers
  for all to authenticated using (true) with check (true);

create policy "Authenticated users can read carriers" on public.carriers
  for select to authenticated using (true);

create policy "Authenticated users can manage carriers" on public.carriers
  for all to authenticated using (true) with check (true);

create policy "Authenticated users can read releases" on public.shipment_releases
  for select to authenticated using (true);

create policy "Authenticated users can insert releases" on public.shipment_releases
  for insert to authenticated with check (created_by = auth.uid());

create policy "Release owners and admins can update releases" on public.shipment_releases
  for update to authenticated using (
    created_by = auth.uid()
    or public.is_admin(auth.uid())
  ) with check (
    created_by = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "Authenticated users can read release documents" on public.release_documents
  for select to authenticated using (true);

create policy "Authenticated users can insert release documents" on public.release_documents
  for insert to authenticated with check (uploaded_by = auth.uid());
