-- Índices apontados pelo Advisor e necessários aos joins da ficha e à reconciliação.
create index idx_document_reviews_area on public.document_reviews(area);
create index idx_document_versions_document_operation on public.document_versions(document_id,operation_id);
create index idx_documents_contract on public.documents(contract_id);
create index idx_documents_fiscal on public.documents(fiscal_document_id);
create index idx_documents_logistics on public.documents(logistics_order_id);
create index idx_evidence_contract on public.evidence(contract_id);
create index idx_evidence_document on public.evidence(document_id);
create index idx_exceptions_area on public.exceptions(owner_area);
create index idx_fiscal_documents_contract on public.fiscal_documents(contract_id);
create index idx_fiscal_documents_operation on public.fiscal_documents(operation_id);
create index idx_job_logs_import on public.job_logs(import_run_id);
create index idx_logistics_orders_contract_id on public.logistics_orders(contract_id);
create index idx_operation_states_area on public.operation_states(owner_area);
create index idx_pending_contract on public.pending_items(contract_id);
create index idx_pending_document on public.pending_items(document_id);
create index idx_pending_rule on public.pending_items(rule_id);
create index idx_profiles_area on public.profiles(area);
create index idx_rules_area on public.rules(owner_area);
create index idx_stg_es4004_import on public.stg_es4004_contracts(import_run_id);
create index idx_stg_fiscal_import on public.stg_fiscal_documents(import_run_id);
create index idx_stg_gg2037_import on public.stg_gg2037_sales_contracts(import_run_id);
create index idx_stg_gg4164_import on public.stg_gg4164_purchase_contracts(import_run_id);
create index idx_stg_gplp_import on public.stg_gplp40180_logistics_orders(import_run_id);
-- CHECK não deve aceitar NULL como nota de resolução.
alter table public.reconciliation_items add constraint reconciliation_note_required
 check(status='aberta' or resolution_note is not null);
