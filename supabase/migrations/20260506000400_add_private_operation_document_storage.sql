-- Storage privado para documentos de OP/contratos/faturamento.
-- Adapta o padrao legado de storage.objects para o dominio atual do portal.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'operation-documents',
  'operation-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.current_profile_can_write_internal_data()
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

create or replace function public.current_profile_can_read_document(target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_can_read_internal_data(), false)
    or exists (
      select 1
      from public.documents d
      left join public.contracts c on c.id = d.contract_id
      left join public.fiscal_documents fd on fd.id = d.fiscal_document_id
      left join public.logistics_orders lo on lo.id = d.logistics_order_id
      where d.id = target_document_id
        and (
          public.current_profile_can_read_operation(d.operation_id)
          or public.current_profile_can_read_operation(c.operation_id)
          or public.current_profile_can_read_operation(fd.operation_id)
          or public.current_profile_can_read_operation(lo.operation_id)
        )
    );
$$;

create or replace function public.current_profile_can_read_storage_path(target_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_can_read_internal_data(), false)
    or exists (
      select 1
      from public.documents d
      where d.storage_path = target_storage_path
        and public.current_profile_can_read_document(d.id)
    );
$$;

drop policy if exists "Scoped users can download operation documents" on storage.objects;
drop policy if exists "Internal users can upload operation documents" on storage.objects;
drop policy if exists "Internal users can update operation documents" on storage.objects;
drop policy if exists "Admins can delete operation documents" on storage.objects;

create policy "Scoped users can download operation documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'operation-documents'
  and public.current_profile_can_read_storage_path(name)
);

create policy "Internal users can upload operation documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'operation-documents'
  and public.current_profile_can_write_internal_data()
);

create policy "Internal users can update operation documents"
on storage.objects for update to authenticated
using (
  bucket_id = 'operation-documents'
  and public.current_profile_can_write_internal_data()
)
with check (
  bucket_id = 'operation-documents'
  and public.current_profile_can_write_internal_data()
);

create policy "Admins can delete operation documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'operation-documents'
  and public.current_profile_is_admin()
);

drop policy if exists "Internal users can create documents" on public.documents;
drop policy if exists "Internal users can update documents" on public.documents;
drop policy if exists "Internal users can create evidence" on public.evidence;

create policy "Internal users can create documents"
on public.documents for insert to authenticated
with check (
  public.current_profile_can_write_internal_data()
  and (
    operation_id is null
    or public.current_profile_can_read_operation(operation_id)
  )
);

create policy "Internal users can update documents"
on public.documents for update to authenticated
using (
  public.current_profile_can_write_internal_data()
  and (
    operation_id is null
    or public.current_profile_can_read_operation(operation_id)
  )
)
with check (
  public.current_profile_can_write_internal_data()
  and (
    operation_id is null
    or public.current_profile_can_read_operation(operation_id)
  )
);

create policy "Internal users can create evidence"
on public.evidence for insert to authenticated
with check (
  public.current_profile_can_write_internal_data()
  and (
    operation_id is null
    or public.current_profile_can_read_operation(operation_id)
  )
);