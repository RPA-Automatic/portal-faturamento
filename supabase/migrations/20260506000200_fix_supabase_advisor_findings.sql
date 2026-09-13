-- Ajustes apontados pelo Supabase Advisor.
-- Corrige Security Definer View, Function Search Path Mutable e Auth RLS Initialization Plan.

-- Views devem respeitar RLS do usuario invocador.
alter view if exists public.v_operations_farol set (security_invoker = true);
alter view if exists public.v_area_backlog set (security_invoker = true);
alter view if exists public.v_contract_drilldown set (security_invoker = true);

-- Fix: Function Search Path Mutable
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
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
set search_path = public
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

create or replace function public.recalculate_operation_farol(target_operation_id uuid)
returns void
language plpgsql
set search_path = public
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
set search_path = public
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

-- Fix: Auth RLS Initialization Plan no Supabase Advisor.
-- O SELECT força initPlan e evita reavaliar auth.uid() por linha.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));
