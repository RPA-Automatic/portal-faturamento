-- Revoga execucao publica de funcao legada criada fora do historico oficial.
-- A funcao pode existir em ambientes DEV/PROD antigos como event trigger helper.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public;
    revoke all on function public.rls_auto_enable() from anon;
    revoke all on function public.rls_auto_enable() from authenticated;
  end if;
end;
$$;
