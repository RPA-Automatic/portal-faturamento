-- Dossiê documental e cobertura das fontes privadas do Portal de Faturamento.
-- O catálogo é neutro: nenhum nome, número ou conteúdo de cliente é persistido pela migration.

create table public.document_type_catalog (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (length(btrim(name)) > 0),
  category text not null check (category in ('fiscal','comercial','logistica','faturamento','comunicacao','apoio')),
  stage public.operation_stage not null,
  owner_area public.area_code not null references public.areas(code),
  requires_review boolean not null default true,
  active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_document_type_catalog_updated_at before update on public.document_type_catalog
for each row execute function public.set_updated_at();

insert into public.document_type_catalog(code,name,category,stage,owner_area,requires_review,description) values
 ('instrucao_fiscal_compra','Instrução fiscal de compra','fiscal','E1','fiscal',true,'Orientações fiscais aplicáveis ao contrato de compra.'),
 ('instrucao_fiscal_venda','Instrução fiscal de venda','fiscal','E1','fiscal',true,'Orientações fiscais aplicáveis ao contrato de venda.'),
 ('instrucao_embarque','Instrução de embarque','logistica','E4','logistica',true,'Condições operacionais emitidas para o embarque.'),
 ('autorizacao_transferencia','Autorização de transferência','comercial','E1','comercial',true,'Autorização formal de transferência de quantidade entre partes.'),
 ('liberacao_embarque','Liberação de embarque','logistica','E4','logistica',true,'Documento formal que sustenta a decisão de liberação.'),
 ('liberacao_fiscal','Liberação fiscal','fiscal','E2','fiscal',true,'Aceite fiscal documentado.'),
 ('nota_fiscal','Nota fiscal','faturamento','E5','faturamento',true,'Documento fiscal emitido ou recebido.'),
 ('orientacao_emissao_nf','Orientação para emissão de nota','fiscal','E2','fiscal',true,'Orientações específicas para emissão ou troca de notas.'),
 ('procedimento_fiscal','Procedimento fiscal','fiscal','E2','fiscal',true,'Procedimento de natureza de operação, CFOP e dados adicionais.'),
 ('confirmacao_comercial','Confirmação comercial','comercial','E1','comercial',true,'Confirmação de condições negociais ou contratuais.'),
 ('instrucao_descarga','Instrução de descarga','logistica','E4','logistica',true,'Orientações de recebimento, descarga ou terminal.'),
 ('manual_agendamento','Manual de agendamento','apoio','E4','logistica',false,'Manual ou orientação de uso de portal de agendamento, sem credenciais.'),
 ('evidencia_email','Evidência de comunicação','comunicacao','E4','logistica',true,'Mensagem que comprova envio, recebimento, divergência ou aceite.'),
 ('ordem_logistica','Ordem logística','logistica','E4','logistica',true,'Ordem, rota ou referência logística.'),
 ('outro','Outro documento','apoio','E1','administracao',true,'Documento ainda não classificado; exige reconciliação.')
on conflict(code) do update set name=excluded.name,category=excluded.category,stage=excluded.stage,
 owner_area=excluded.owner_area,requires_review=excluded.requires_review,description=excluded.description;

alter table public.documents add column document_type_code text references public.document_type_catalog(code);
update public.documents set document_type_code=case type::text
  when 'instrucao_compra' then 'instrucao_fiscal_compra'
  when 'instrucao_venda' then 'instrucao_fiscal_venda'
  when 'liberacao_embarque' then 'liberacao_embarque'
  when 'liberacao_fiscal' then 'liberacao_fiscal'
  when 'nota_fiscal' then 'nota_fiscal'
  when 'ordem_logistica' then 'ordem_logistica'
  else 'outro' end;
alter table public.documents alter column document_type_code set default 'outro',
 alter column document_type_code set not null;
create index idx_documents_type_code on public.documents(document_type_code,operation_id);

create table public.document_requirement_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version_no integer not null check(version_no > 0),
  name text not null check(length(btrim(name)) > 0),
  scope jsonb not null default '{}'::jsonb check(jsonb_typeof(scope)='object'),
  approval_status text not null default 'rascunho' check(approval_status in ('rascunho','aprovado','retirado')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(code,version_no),
  check(approval_status<>'aprovado' or (approved_by is not null and approved_at is not null))
);

create table public.document_requirements (
  id uuid primary key default gen_random_uuid(),
  requirement_set_id uuid not null references public.document_requirement_sets(id),
  document_type_code text not null references public.document_type_catalog(code),
  stage public.operation_stage not null,
  owner_area public.area_code not null references public.areas(code),
  required_when jsonb not null default '{}'::jsonb check(jsonb_typeof(required_when)='object'),
  min_documents integer not null default 1 check(min_documents > 0),
  requires_review boolean not null default true,
  blocking boolean not null default true,
  sort_order integer not null default 0,
  instructions text,
  unique(requirement_set_id,document_type_code,sort_order)
);
create index idx_document_requirements_type on public.document_requirements(document_type_code);

insert into public.document_requirement_sets(code,version_no,name,scope)
values('BASE_DOSSIE_EMBARQUE',1,'Dossiê base para liberação de embarque',
 '{"source":"legacy_private_review","requires_business_validation":true}'::jsonb);
insert into public.document_requirements(requirement_set_id,document_type_code,stage,owner_area,required_when,blocking,sort_order,instructions)
select s.id,v.document_type_code,v.stage::public.operation_stage,v.owner_area::public.area_code,v.required_when,v.blocking,v.sort_order,v.instructions
from public.document_requirement_sets s cross join (values
 ('instrucao_fiscal_compra','E1','fiscal','{}'::jsonb,true,10,'Associar ao contrato de compra e submeter à revisão fiscal.'),
 ('instrucao_fiscal_venda','E1','fiscal','{}'::jsonb,true,20,'Associar ao contrato de venda e submeter à revisão fiscal.'),
 ('autorizacao_transferencia','E1','comercial','{"when":"transfer_requires_authorization"}'::jsonb,true,30,'Confirmar partes, quantidade, produto, emissão e assinatura.'),
 ('confirmacao_comercial','E1','comercial','{"when":"commercial_confirmation_received"}'::jsonb,false,40,'Preservar condições e referência da confirmação.'),
 ('procedimento_fiscal','E2','fiscal','{"when":"fiscal_scenario_requires_procedure"}'::jsonb,true,50,'Validar natureza, CFOP e dados adicionais aplicáveis.'),
 ('orientacao_emissao_nf','E2','fiscal','{"when":"invoice_guidance_required"}'::jsonb,true,60,'Vincular a orientação vigente para emissão ou troca.'),
 ('instrucao_embarque','E4','logistica','{}'::jsonb,true,70,'Conferir quantidade, período e destinos.'),
 ('liberacao_embarque','E4','logistica','{}'::jsonb,true,80,'Usar como evidência da decisão de liberação, sem encerrar a OP.'),
 ('instrucao_descarga','E4','logistica','{"when":"destination_requires_unloading_instruction"}'::jsonb,true,90,'Conferir terminal, descarga e agendamento.'),
 ('manual_agendamento','E4','logistica','{"when":"appointment_required"}'::jsonb,false,100,'Guardar apenas a referência do portal; nunca credenciais.'),
 ('evidencia_email','E4','logistica','{"when":"release_sent_by_email"}'::jsonb,false,110,'Preservar comunicação como evidência, sujeita a revisão.'),
 ('nota_fiscal','E5','faturamento','{}'::jsonb,true,120,'Vincular cada nota à OP e aos contratos aplicáveis.')
) as v(document_type_code,stage,owner_area,required_when,blocking,sort_order,instructions)
where s.code='BASE_DOSSIE_EMBARQUE' and s.version_no=1;

create table public.operation_document_requirements (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id),
  requirement_id uuid not null references public.document_requirements(id),
  document_id uuid,
  status text not null default 'pendente' check(status in ('pendente','recebido','em_revisao','aprovado','rejeitado','dispensado','nao_aplicavel')),
  reason text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(operation_id,requirement_id,document_id),
  foreign key(document_id,operation_id) references public.documents(id,operation_id),
  check(status not in ('aprovado','rejeitado') or document_id is not null),
  check(status not in ('dispensado','nao_aplicavel') or (length(btrim(reason))>0 and decided_by is not null and decided_at is not null))
);
create index idx_operation_document_requirements_status on public.operation_document_requirements(operation_id,status);
create index idx_operation_document_requirements_document on public.operation_document_requirements(document_id,operation_id);
create unique index uq_operation_document_requirement_pending
on public.operation_document_requirements(operation_id,requirement_id) where document_id is null;
create trigger trg_operation_document_requirements_updated_at before update on public.operation_document_requirements
for each row execute function public.set_updated_at();

-- Um arquivo pode sustentar vários contratos, notas e ordens da mesma OP.
alter table public.fiscal_documents add constraint fiscal_documents_id_operation_unique unique(id,operation_id);
alter table public.logistics_orders add constraint logistics_orders_id_operation_unique unique(id,operation_id);
create table public.document_contract_links (
  document_id uuid not null,
  operation_id uuid not null,
  contract_id uuid not null,
  link_role text not null default 'evidencia' check(link_role in ('principal','evidencia','referencia')),
  linked_at timestamptz not null default now(),
  primary key(document_id,operation_id,contract_id),
  foreign key(document_id,operation_id) references public.documents(id,operation_id),
  foreign key(operation_id,contract_id) references public.operation_contract_links(operation_id,contract_id)
);
create index idx_document_contract_links_contract on public.document_contract_links(operation_id,contract_id);
create table public.document_fiscal_links (
  document_id uuid not null,
  operation_id uuid not null,
  fiscal_document_id uuid not null,
  link_role text not null default 'evidencia' check(link_role in ('representa','evidencia','referencia')),
  linked_at timestamptz not null default now(),
  primary key(document_id,operation_id,fiscal_document_id),
  foreign key(document_id,operation_id) references public.documents(id,operation_id),
  foreign key(fiscal_document_id,operation_id) references public.fiscal_documents(id,operation_id)
);
create index idx_document_fiscal_links_fiscal on public.document_fiscal_links(fiscal_document_id,operation_id);
create table public.document_logistics_links (
  document_id uuid not null,
  operation_id uuid not null,
  logistics_order_id uuid not null,
  link_role text not null default 'evidencia' check(link_role in ('instrucao','evidencia','referencia')),
  linked_at timestamptz not null default now(),
  primary key(document_id,operation_id,logistics_order_id),
  foreign key(document_id,operation_id) references public.documents(id,operation_id),
  foreign key(logistics_order_id,operation_id) references public.logistics_orders(id,operation_id)
);
create index idx_document_logistics_links_order on public.document_logistics_links(logistics_order_id,operation_id);

create table public.document_field_catalog (
  field_key text primary key check(field_key ~ '^[a-z][a-z0-9_]*$'),
  label text not null,
  value_type text not null check(value_type in ('text','date','datetime','number','boolean','identifier','email','json')),
  sensitive boolean not null default false,
  description text,
  created_at timestamptz not null default now()
);
insert into public.document_field_catalog(field_key,label,value_type,sensitive) values
 ('sender_partner','Emitente/remetente','text',false),('recipient_partner','Destinatário','text',false),
 ('sender_tax_id','Documento do remetente','identifier',true),('recipient_tax_id','Documento do destinatário','identifier',true),
 ('issue_date','Data de emissão','date',false),('operation_number','Número da OP','identifier',false),
 ('purchase_contract','Contrato de compra','identifier',false),('sales_contract','Contrato de venda','identifier',false),
 ('authorized_quantity','Quantidade autorizada','number',false),('quantity_unit','Unidade da quantidade','text',false),
 ('product','Produto','text',false),('crop','Safra','text',false),('valid_from','Início da vigência','date',false),
 ('valid_until','Fim da vigência','date',false),('origin','Origem','text',false),('delivery_location','Local de entrega','text',false),
 ('transshipment_location','Local de transbordo','text',false),('final_destination','Destino final','text',false),
 ('freight_mode','Modalidade de frete','text',false),('shipment_start','Início do embarque','date',false),
 ('shipment_end','Fim do embarque','date',false),('fiscal_nature','Natureza fiscal','text',false),
 ('cfop','CFOP','identifier',false),('ncm','NCM','identifier',false),('additional_invoice_data','Dados adicionais da nota','text',false),
 ('invoice_number','Número da nota fiscal','identifier',false),('invoice_series','Série da nota fiscal','identifier',false),
 ('logistics_order','Ordem logística/rota','identifier',false),('appointment_required','Exige agendamento','boolean',false),
 ('portal_reference','Referência do portal de agendamento','text',false),('signature_present','Assinatura presente','boolean',false),
 ('message_date','Data da comunicação','datetime',false),('message_subject','Assunto da comunicação','text',false)
on conflict(field_key) do update set label=excluded.label,value_type=excluded.value_type,sensitive=excluded.sensitive;

create table public.document_type_fields (
  document_type_code text not null references public.document_type_catalog(code),
  field_key text not null references public.document_field_catalog(field_key),
  required_for_review boolean not null default false,
  multiple boolean not null default false,
  sort_order integer not null default 0,
  primary key(document_type_code,field_key)
);
insert into public.document_type_fields(document_type_code,field_key,required_for_review,sort_order) values
 ('autorizacao_transferencia','sender_partner',true,10),('autorizacao_transferencia','recipient_partner',true,20),
 ('autorizacao_transferencia','issue_date',true,30),('autorizacao_transferencia','authorized_quantity',true,40),
 ('autorizacao_transferencia','quantity_unit',true,50),('autorizacao_transferencia','product',true,60),
 ('autorizacao_transferencia','sender_tax_id',false,70),('autorizacao_transferencia','recipient_tax_id',false,80),
 ('autorizacao_transferencia','signature_present',true,90),
 ('instrucao_fiscal_compra','purchase_contract',true,10),('instrucao_fiscal_compra','product',true,20),
 ('instrucao_fiscal_compra','fiscal_nature',true,30),('instrucao_fiscal_compra','cfop',true,40),
 ('instrucao_fiscal_compra','origin',false,50),('instrucao_fiscal_compra','delivery_location',false,60),
 ('instrucao_fiscal_venda','sales_contract',true,10),('instrucao_fiscal_venda','product',true,20),
 ('instrucao_fiscal_venda','fiscal_nature',true,30),('instrucao_fiscal_venda','cfop',true,40),
 ('instrucao_embarque','shipment_start',false,10),('instrucao_embarque','shipment_end',false,20),
 ('instrucao_embarque','authorized_quantity',true,30),('instrucao_embarque','delivery_location',true,40),
 ('instrucao_embarque','final_destination',false,50),('instrucao_embarque','freight_mode',false,60),
 ('liberacao_embarque','operation_number',true,10),('liberacao_embarque','purchase_contract',true,20),
 ('liberacao_embarque','sales_contract',true,30),('liberacao_embarque','authorized_quantity',true,40),
 ('liberacao_embarque','origin',true,50),('liberacao_embarque','delivery_location',true,60),
 ('liberacao_embarque','signature_present',false,70),
 ('nota_fiscal','invoice_number',true,10),('nota_fiscal','invoice_series',false,20),
 ('nota_fiscal','issue_date',true,30),('nota_fiscal','cfop',true,40),('nota_fiscal','ncm',false,50),
 ('nota_fiscal','authorized_quantity',false,60),('nota_fiscal','additional_invoice_data',false,70),
 ('instrucao_descarga','delivery_location',true,10),('instrucao_descarga','appointment_required',false,20),
 ('manual_agendamento','portal_reference',true,10),
 ('evidencia_email','message_date',true,10),('evidencia_email','message_subject',true,20)
on conflict(document_type_code,field_key) do update set required_for_review=excluded.required_for_review,sort_order=excluded.sort_order;

create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id),
  extractor text not null check(length(btrim(extractor))>0),
  extractor_version text not null check(length(btrim(extractor_version))>0),
  status text not null check(status in ('processando','extraido','revisao_necessaria','validado','falhou')),
  text_sha256 text check(text_sha256 is null or text_sha256 ~ '^[a-f0-9]{64}$'),
  error_code text,
  extracted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  unique(document_version_id,extractor,extractor_version),
  check(status<>'validado' or (reviewed_by is not null and reviewed_at is not null))
);
create index idx_document_extractions_version on public.document_extractions(document_version_id,extracted_at desc);
create table public.document_extracted_fields (
  id uuid primary key default gen_random_uuid(),
  extraction_id uuid not null references public.document_extractions(id),
  field_key text not null references public.document_field_catalog(field_key),
  value_type text not null check(value_type in ('text','date','datetime','number','boolean','identifier','email','json')),
  value_text text,
  value_number numeric,
  value_date date,
  value_boolean boolean,
  value_json jsonb,
  unit text,
  source_page integer check(source_page is null or source_page>0),
  source_reference text,
  confidence numeric(5,4) check(confidence is null or confidence between 0 and 1),
  verification_status text not null default 'nao_revisado' check(verification_status in ('nao_revisado','confirmado','corrigido','rejeitado')),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  check(num_nonnulls(value_text,value_number,value_date,value_boolean,value_json)=1),
  check(verification_status='nao_revisado' or (verified_by is not null and verified_at is not null))
);
create index idx_document_extracted_fields_lookup on public.document_extracted_fields(extraction_id,field_key);

-- Camada comum para que todas as planilhas privadas possam entrar em staging sem perder colunas.
create table public.source_datasets (
  code text primary key check(code ~ '^[A-Z][A-Z0-9_]*$'),
  name text not null,
  domain text not null check(domain in ('operacao','contrato','logistica','fiscal','cadastro','financeiro','estoque','checklist')),
  normalization_target text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.source_datasets(code,name,domain,normalization_target) values
 ('ES4004','Operações B2B','operacao','operations,operation_contract_links'),
 ('GG4164','Contratos de compra','contrato','contracts,partners'),
 ('GG2037','Contratos de venda','contrato','contracts,partners'),
 ('GPLP40180','Ordens e movimentações logísticas','logistica','logistics_orders'),
 ('DOCUMENTOS_FISCAIS','Documentos fiscais','fiscal','fiscal_documents'),
 ('CHECKLIST_PRE_FATURAMENTO','Checklist pré-faturamento','checklist','checklist_templates'),
 ('CHECKLIST_REGIONAL_A','Checklist regional A','checklist','checklist_templates'),
 ('CHECKLIST_REGIONAL_B','Checklist regional B','checklist','checklist_templates'),
 ('CADASTRO_PARCEIROS','Cadastro fiscal e logístico de parceiros','cadastro','partners,operation_locations'),
 ('CONTAS_RECEBER_ANALITICO','Contas a receber analítico','financeiro','operation_financial_checks'),
 ('CONTAS_RECEBER_POSICAO','Posição de contas a receber','financeiro','operation_financial_checks'),
 ('CONTAS_PAGAR','Contas a pagar','financeiro','operation_financial_checks'),
 ('ADIANTAMENTOS_FORNECEDOR','Adiantamentos de fornecedor','financeiro','operation_financial_checks'),
 ('PREVISAO_CONTRATUAL','Previsão financeira contratual','financeiro','operation_financial_checks'),
 ('FIXACOES_CONTRATO','Fixações de contrato','financeiro','operation_financial_checks'),
 ('PREVISAO_PAGAMENTO','Previsão de pagamento','financeiro','operation_financial_checks'),
 ('MAPA_ESTOQUE','Mapa de estoque e qualidade','estoque','operation_inventory_checks')
on conflict(code) do update set name=excluded.name,domain=excluded.domain,normalization_target=excluded.normalization_target;

create table public.source_records (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id),
  dataset_code text not null references public.source_datasets(code),
  sheet_name text not null,
  source_row_no integer not null check(source_row_no>0),
  source_row_key text,
  raw_data jsonb not null check(jsonb_typeof(raw_data)='object'),
  row_sha256 text not null check(row_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(import_run_id,dataset_code,sheet_name,source_row_no)
);
create index idx_source_records_dataset on public.source_records(dataset_code,created_at desc);
create index idx_source_records_row_key on public.source_records(dataset_code,source_row_key) where source_row_key is not null;

create table public.operation_source_links (
  id uuid primary key default gen_random_uuid(),
  source_record_id uuid not null references public.source_records(id),
  operation_id uuid not null references public.operations(id),
  contract_id uuid,
  match_method text not null check(match_method in ('chave_exata','chave_composta','reconciliacao_manual')),
  match_status text not null default 'candidato' check(match_status in ('candidato','confirmado','rejeitado')),
  confidence numeric(5,4) check(confidence is null or confidence between 0 and 1),
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(source_record_id,operation_id,contract_id),
  foreign key(operation_id,contract_id) references public.operation_contract_links(operation_id,contract_id),
  check(match_status<>'confirmado' or (confirmed_by is not null and confirmed_at is not null))
);
create index idx_operation_source_links_operation on public.operation_source_links(operation_id,match_status);

create table public.operation_financial_checks (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id),
  contract_id uuid,
  check_type text not null check(check_type in ('credito','contas_receber','contas_pagar','adiantamento','previsao_pagamento','fixacao_preco')),
  result text not null check(result in ('pendente','regular','bloqueado','nao_aplicavel')),
  amount numeric(18,2),
  currency text,
  due_date date,
  source_record_id uuid references public.source_records(id),
  evidence_id uuid,
  checked_at timestamptz not null default now(),
  unique(id,operation_id),
  foreign key(operation_id,contract_id) references public.operation_contract_links(operation_id,contract_id),
  foreign key(evidence_id,operation_id) references public.evidence(id,operation_id)
);
create index idx_operation_financial_checks_operation on public.operation_financial_checks(operation_id,check_type,checked_at desc);

create table public.operation_inventory_checks (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id),
  item_code text,
  warehouse_code text,
  available_quantity numeric(18,4),
  unit text,
  quality_data jsonb not null default '{}'::jsonb check(jsonb_typeof(quality_data)='object'),
  result text not null check(result in ('pendente','suficiente','insuficiente','nao_aplicavel')),
  source_record_id uuid references public.source_records(id),
  evidence_id uuid,
  checked_at timestamptz not null default now(),
  foreign key(evidence_id,operation_id) references public.evidence(id,operation_id)
);
create index idx_operation_inventory_checks_operation on public.operation_inventory_checks(operation_id,checked_at desc);

-- Catálogo de checklist observado nas planilhas, versionado e sem regras aprovadas por inferência.
create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version_no integer not null check(version_no>0),
  name text not null,
  scope jsonb not null default '{}'::jsonb check(jsonb_typeof(scope)='object'),
  approval_status text not null default 'rascunho' check(approval_status in ('rascunho','aprovado','retirado')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(code,version_no),
  check(approval_status<>'aprovado' or (approved_by is not null and approved_at is not null))
);
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates(id),
  rule_id uuid references public.rules(id),
  document_requirement_id uuid references public.document_requirements(id),
  field_key text not null,
  label text not null,
  stage public.operation_stage not null,
  owner_area public.area_code not null references public.areas(code),
  input_type text not null check(input_type in ('boolean','tri_state','text','email','date','number','select','document','approval')),
  required_when jsonb not null default '{}'::jsonb check(jsonb_typeof(required_when)='object'),
  blocks_stage boolean not null default true,
  sort_order integer not null default 0,
  help_text text,
  unique(template_id,field_key)
);
create index idx_checklist_items_stage on public.checklist_items(template_id,stage,sort_order);
create table public.operation_checklist_answers (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id),
  checklist_item_id uuid not null references public.checklist_items(id),
  answer_status text not null default 'vazio' check(answer_status in ('vazio','sim','nao','nao_aplicavel','validado')),
  answer_value jsonb,
  notes text,
  document_id uuid,
  evidence_id uuid,
  answered_by uuid references public.profiles(id),
  answered_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(operation_id,checklist_item_id),
  foreign key(document_id,operation_id) references public.documents(id,operation_id),
  foreign key(evidence_id,operation_id) references public.evidence(id,operation_id),
  check(answer_status='vazio' or answered_by is not null)
);
create index idx_operation_checklist_answers_status on public.operation_checklist_answers(operation_id,answer_status);
create trigger trg_operation_checklist_answers_updated_at before update on public.operation_checklist_answers
for each row execute function public.set_updated_at();

insert into public.checklist_templates(code,version_no,name,scope) values
 ('PRE_FATURAMENTO_GERAL',1,'Checklist geral de pré-faturamento','{"source":"legacy_private_review","requires_business_validation":true}'),
 ('CHECKLIST_REGIONAL_A',1,'Checklist regional A','{"source":"legacy_private_review","requires_business_validation":true}'),
 ('CHECKLIST_REGIONAL_B',1,'Checklist regional B','{"source":"legacy_private_review","requires_business_validation":true}');
insert into public.checklist_items(template_id,field_key,label,stage,owner_area,input_type,blocks_stage,sort_order)
select t.id,v.field_key,v.label,v.stage::public.operation_stage,v.owner_area::public.area_code,v.input_type,v.blocks_stage,v.sort_order
from public.checklist_templates t cross join (values
 ('purchase_instruction_received','Instrução fiscal de compra recebida','E1','comercial','document',true,10),
 ('sales_instruction_received','Instrução fiscal de venda recebida','E1','comercial','document',true,20),
 ('purchase_instruction_reviewed','Instrução de compra validada pelo Fiscal','E2','fiscal','approval',true,30),
 ('incoming_cfop_reviewed','CFOP de entrada validado','E2','fiscal','approval',true,40),
 ('outgoing_cfop_reviewed','CFOP de saída validado','E2','fiscal','approval',true,50),
 ('delivery_location_registered','Local de entrega cadastrado','E2','fiscal','tri_state',true,60),
 ('partner_registration_reviewed','Cadastros das partes validados','E2','fiscal','approval',true,70),
 ('erp_rules_created','Regras do ERP criadas','E3','gestao_contratos','tri_state',true,80),
 ('sales_order_released','Pedido de venda liberado','E3','gestao_contratos','tri_state',true,90),
 ('appointment_required','Necessita agendamento','E4','logistica','boolean',false,100),
 ('logistics_order_created','Ordem logística criada','E4','logistica','tri_state',true,110),
 ('first_invoice_reviewed','Primeira nota validada','E5','faturamento','approval',true,120),
 ('additional_invoice_data_reviewed','Dados adicionais da nota validados','E5','faturamento','approval',true,130),
 ('report_recipient_confirmed','Destinatário de relatórios confirmado','E5','faturamento','email',false,140),
 ('movement_status_reviewed','Situação do movimento revisada','E5','faturamento','approval',true,150)
) as v(field_key,label,stage,owner_area,input_type,blocks_stage,sort_order)
where t.code='PRE_FATURAMENTO_GERAL' and t.version_no=1;

-- As novas tabelas são internas e escritas apenas pelo backend até a homologação dos fluxos.
do $$ declare t text; begin
  foreach t in array array[
    'document_type_catalog','document_requirement_sets','document_requirements','operation_document_requirements',
    'document_contract_links','document_fiscal_links','document_logistics_links','document_field_catalog','document_type_fields','document_extractions',
    'document_extracted_fields','source_datasets','source_records','operation_source_links',
    'operation_financial_checks','operation_inventory_checks','checklist_templates','checklist_items',
    'operation_checklist_answers'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('create policy internal_read on public.%I for select to authenticated using ((select private.current_profile_can_read_internal_data()))',t);
  end loop;
end $$;

-- Tabelas de catálogo também podem ser mantidas por administrador autenticado.
grant insert,update,delete on public.document_type_catalog,public.document_requirement_sets,
 public.document_requirements,public.document_field_catalog,public.document_type_fields,public.source_datasets,
 public.checklist_templates,public.checklist_items to authenticated;
do $$ declare t text; begin
  foreach t in array array['document_type_catalog','document_requirement_sets','document_requirements','document_field_catalog','document_type_fields','source_datasets','checklist_templates','checklist_items'] loop
    execute format('create policy admin_insert on public.%I for insert to authenticated with check ((select private.current_profile_is_admin()))',t);
    execute format('create policy admin_update on public.%I for update to authenticated using ((select private.current_profile_is_admin())) with check ((select private.current_profile_is_admin()))',t);
    execute format('create policy admin_delete on public.%I for delete to authenticated using ((select private.current_profile_is_admin()))',t);
  end loop;
end $$;

comment on table public.document_type_catalog is 'Taxonomia extensível do dossiê documental; substitui o uso exclusivo do enum legado.';
comment on table public.document_extracted_fields is 'Campos estruturados extraídos de arquivos; valores só se tornam decisão após revisão/evidência.';
comment on table public.source_records is 'Staging genérico e privado para preservar todas as colunas dos XLSX antes da normalização homologada.';
