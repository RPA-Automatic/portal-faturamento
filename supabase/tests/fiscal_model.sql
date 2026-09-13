-- Executar no banco de teste com ON_ERROR_STOP. Todos os dados são sintéticos e revertidos.
begin;
create function pg_temp.assert_true(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
insert into auth.users(id,email) values('10000000-0000-0000-0000-000000000001','internal@example.test'),('10000000-0000-0000-0000-000000000002','external@example.test'),('10000000-0000-0000-0000-000000000003','pending@example.test');
update public.profiles set status='active',access_level='internal',area='fiscal' where id='10000000-0000-0000-0000-000000000001';
update public.profiles set status='active',access_level='external' where id='10000000-0000-0000-0000-000000000002';
insert into public.operations(id,oper_b2b) values('20000000-0000-0000-0000-000000000001','TEST-OP-1'),('20000000-0000-0000-0000-000000000002','TEST-OP-2');
select public.recalculate_operation_farol('20000000-0000-0000-0000-000000000001');
select pg_temp.assert_true((select semaphore='vermelho' and current_stage='E1' from public.v_operations_farol where oper_b2b='TEST-OP-1'),'No evidence must not produce green/E6');
insert into public.contracts(id,operation_id,contract_number,contract_type,source_name)
values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','TEST-0001','compra','TEST');
insert into public.operation_contract_links(operation_id,contract_id,source_name) values('20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','TEST');
select pg_temp.assert_true((select count(*)=2 from public.operation_contract_links),'Contract supports multiple operations');
insert into public.documents(id,operation_id,title) values('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Synthetic instruction');
insert into public.document_versions(id,document_id,operation_id,version_no,file_sha256,storage_path,mime_type,size_bytes)
values('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',1,repeat('a',64),'test/v1.pdf','application/pdf',100);
insert into public.evidence(id,operation_id,evidence_type,source_name) values('60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','test','synthetic');
insert into public.operation_stage_assessments(operation_id,stage,result,reason,evidence_id,document_version_id,assessed_by)
select '20000000-0000-0000-0000-000000000001',code,'aprovado','Synthetic acceptance','60000000-0000-0000-0000-000000000001',
 case when code='E2' then '50000000-0000-0000-0000-000000000001'::uuid else null end,'10000000-0000-0000-0000-000000000001'
from public.operation_states where code<>'E6';
select pg_temp.assert_true((select semaphore='amarelo' and current_stage='E5' from public.v_operations_farol where oper_b2b='TEST-OP-1'),'All stages approved is not closure');
insert into public.operation_milestones(operation_id,milestone,decision,reason,evidence_id,decided_by)
values('20000000-0000-0000-0000-000000000001','liberacao_embarque','aprovado','Synthetic release','60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
select pg_temp.assert_true((select current_stage<>'E6' from public.v_operations_farol where oper_b2b='TEST-OP-1'),'Release is not closure');
insert into public.operation_milestones(operation_id,milestone,decision,reason,evidence_id,decided_by)
values('20000000-0000-0000-0000-000000000001','encerramento','aprovado','Synthetic closure','60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
select pg_temp.assert_true((select semaphore='verde' and current_stage='E6' from public.v_operations_farol where oper_b2b='TEST-OP-1'),'Explicit closure with checks can conclude');
insert into public.document_versions(document_id,operation_id,version_no,file_sha256,storage_path,mime_type,size_bytes)
values('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',2,repeat('b',64),'test/v2.pdf','application/pdf',101);
select pg_temp.assert_true((select result='pendente' from public.v_operation_stage_readiness where operation_id='20000000-0000-0000-0000-000000000001' and stage='E2'),'New document invalidates its affected assessment');
select pg_temp.assert_true((select result='aprovado' from public.v_operation_stage_readiness where operation_id='20000000-0000-0000-0000-000000000001' and stage='E1'),'Unrelated assessment remains approved');
select pg_temp.assert_true((select semaphore='vermelho' from public.v_operations_farol where oper_b2b='TEST-OP-1'),'Changed evidence cannot leave green');
do $$ begin
 begin update public.document_versions set size_bytes=120; raise exception 'Mutation accepted'; exception when sqlstate '55000' then null; end;
 begin
 insert into public.document_versions(document_id,operation_id,version_no,file_sha256,storage_path,mime_type,size_bytes)
 values('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002',3,repeat('c',64),'test/cross.pdf','application/pdf',100);
 raise exception 'Cross-operation version accepted'; exception when foreign_key_violation then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.assert_true((select count(*)=2 from public.document_versions),'Internal user can read versions');
do $$ begin
 begin insert into public.operation_contract_links(operation_id,contract_id,source_name) values('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','injected'); raise exception 'Client write accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select pg_temp.assert_true((select count(*)=0 from public.document_versions),'External user cannot read internal document versions');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select pg_temp.assert_true((select count(*)=0 from public.operation_stage_assessments),'Pending account has no operational access');
reset role;
select pg_temp.assert_true(not has_table_privilege('anon','public.document_versions','SELECT'),'Anonymous role has no grants');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.recalculate_operation_farol(uuid)','EXECUTE'),'Browser cannot recalculate arbitrary operations');
select pg_temp.assert_true((select count(*)>0 from public.audit_logs where table_name='public.operation_milestones'),'Milestones audited');
select pg_temp.assert_true((select count(*)=0 from public.rules r join public.rule_versions v on v.rule_id=r.id where v.approval_status='aprovada'),'Historical rules are not implicitly approved');
rollback;
