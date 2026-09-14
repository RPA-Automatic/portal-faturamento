> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; consulte código e decisões no repositório canônico. Estado planejado não equivale a implantação.

> Fonte: `docs/data/fiscal-schema.md`

# Esquema fiscal e recuperação das migrations

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: na homologação dos contratos de dados

## Diagnóstico confirmado

As sete migrations fiscais de maio já estavam em `portal-faturamento/supabase/migrations/`. Elas foram executadas no projeto Supabase do Orchestrator durante a troca de repositório. Esse projeto contém também as migrations e tabelas `ao_*`, próprias do Orchestrator. Não copiar essas tabelas para o portal fiscal.

O destino `eukazzizamxratkavcap` recebeu as sete migrations históricas e quatro evoluções do modelo fiscal. O resultado remoto validado é **11 migrations, 51 tabelas públicas, todas com RLS, cinco views operacionais, 15 tipos documentais, 33 campos extraíveis, 17 famílias de planilha e 12 requisitos de dossiê em rascunho**. Nenhum dado operacional de outro produto deve ser transferido.

O conector atribuiu timestamps de execução às migrations. Os identificadores foram alinhados aos arquivos canônicos somente após comparação SHA-256 exata dos statements realmente aplicados. Nomes e conteúdo SQL foram preservados; nenhuma migration ausente foi marcada como executada. O manifesto de implantação fica em `supabase/deployment-manifest.json`.

## Modelo adotado

| Grupo | Tabelas | Finalidade |
|---|---|---|
| Identidade e referências | `profiles`, `areas`, `operation_states` | Acesso aprovado, áreas e etapas E1–E6 |
| Núcleo | `operations`, `contracts`, `partners`, `operation_contract_links` | OP, snapshots de compra/venda e vínculos explícitos N:N |
| Logística e fiscal | `logistics_orders`, `fiscal_documents`, `operation_locations` | OL/movimentação, notas, origem, entrega, transbordo e destino final |
| Documentos | `documents`, `document_versions`, `document_reviews` | Cadastro, arquivo/versionamento e revisão por área |
| Dossiê documental | `document_type_catalog`, `document_field_catalog`, `document_type_fields`, `document_requirement_sets`, `document_requirements`, `operation_document_requirements` | Tipos, campos esperados, requisitos versionados e atendimento por OP |
| Vínculos documentais | `document_contract_links`, `document_fiscal_links`, `document_logistics_links` | Relações N:N do documento com contratos, notas e OLs da mesma OP |
| Extração documental | `document_extractions`, `document_extracted_fields` | Execuções de extração, campos tipados, confiança, origem e revisão humana |
| Verificações | `rules`, `rule_versions`, `rule_evaluations`, `operation_stage_assessments` | Catálogo versionado, resultado/evidência e avaliação das etapas |
| Tratamento | `pending_items`, `evidence`, `state_history`, `operation_milestones` | Pendência, responsável/prazo, prova, histórico, liberação e encerramento |
| Exceções | `exceptions`, `exception_approvals` | Exceção vinculada à OP/regra, evidência, aprovador e vigência |
| Ingestão | `import_runs`, `job_logs`, `reconciliation_items` | Hash, extração, versão do mapeamento, falhas e vínculos ambíguos |
| Staging | `stg_es4004_contracts`, `stg_gg4164_purchase_contracts`, `stg_gg2037_sales_contracts`, `stg_gplp40180_logistics_orders`, `stg_fiscal_documents` | Dados brutos dos cinco relatórios, sem substituir o domínio consolidado |
| Cobertura integral de fontes | `source_datasets`, `source_records`, `operation_source_links` | Staging privado de todas as 17 famílias XLSX e vínculo reconciliável com OP/contrato |
| Checklist e controles auxiliares | `checklist_templates`, `checklist_items`, `operation_checklist_answers`, `operation_financial_checks`, `operation_inventory_checks` | Perguntas versionadas e resultados financeiros/estoque relevantes à liberação |
| Auditoria | `audit_logs` | Alterações sensíveis e eventos de decisão |

## Chaves e cardinalidade

- `operations.oper_b2b` preserva a chave textual canônica existente. Escopo global por filial continua uma decisão de negócio a validar antes de importações de outras origens.
- Contratos são snapshots diários; a chave passa a `(contract_type, contract_number, establishment, source_item_key, data_carga)`. Filial e item não podem ser inferidos da descrição comercial. Strings vazias mantêm compatibilidade com cargas históricas, mas não resolvem ambiguidades: enviá-las à reconciliação.
- `operation_contract_links` permite múltiplos contratos por OP e múltiplas OPs por snapshot de contrato. O campo legado `contracts.operation_id` continua compatível por trigger; novos consolidadores devem escrever vínculos explícitos. O trigger só remove um vínculo antigo quando ele próprio o criou, sem apagar vínculos confirmados por outro processo.
- As contagens de contratos do Farol representam vínculos a snapshots. Selecionar o snapshot vigente por origem/filial/item é responsabilidade do consolidador; não anexar todas as cargas históricas como novos contratos ativos.
- Documentos têm versões identificadas por `(document_id, version_no)`, hash SHA-256 e caminho exclusivo. Metadados antigos não são convertidos em versões de arquivo sem upload confirmado.
- `documents.document_type_code` usa catálogo extensível. O enum `documents.type` permanece temporariamente para compatibilidade com integrações anteriores.
- Um documento pode sustentar vários contratos, notas ou ordens da mesma OP. FKs compostas impedem vínculo cruzado entre operações.
- Campos extraídos são tipados e registram página/referência, confiança e verificação. O banco não mantém texto integral extraído nessa camada e nunca considera confiança do extrator como aprovação.
- FKs compostas impedem vincular avaliação, versão de documento ou evidência a outra OP. Revisões apontam para uma versão concreta; não são copiadas para sua sucessora.
- Uma origem/linha/campo tem uma ocorrência de reconciliação por execução de importação. Nova execução pode reprocessar o mesmo hash com um mapeamento corrigido.

## Semáforo e decisões

Ausência de pendências não representa aprovação. O Farol consulta avaliações explícitas de E1–E5: uma etapa ausente, vencida, reprovada ou baseada em documento substituído fica pendente/bloqueada. Uma nova versão invalida a avaliação que aponta para a versão anterior; avaliações não relacionadas permanecem válidas.

Com todas as etapas aprovadas ou explicitamente não aplicáveis, a operação permanece em E5/amarelo até haver decisão própria de encerramento. Liberação de embarque é outro marco e nunca encerra automaticamente a OP. As avaliações e decisões são registradas por backend autorizado, com pessoa responsável e evidência; não há aprovação fiscal automática neste incremento.

A matriz de aplicabilidade, saldo, precedência OL/liberação, calendário D-2 e aceites fiscais ainda precisa ser homologada. As 12 versões iniciais de regras são **rascunhos**. Exceções históricas genéricas de exportação/transferência foram desativadas; a dispensa exige escopo e aprovação próprios.

As views usam `security_invoker`; o resumo calcula validade na leitura e não depende de um job atualizar o cache. A consulta do Farol agrega cada relação separadamente para evitar multiplicação de contratos × notas × OLs × pendências.

## Segurança e integração

Novas tabelas: leitura somente de perfis internos ativos; escrita somente pelo backend `service_role`. Não conceder essa chave ao frontend. O fluxo de aprovação/escrita dessas novas entidades ainda será implementado e homologado. A ficha da OP é de consulta.

Catálogos e templates podem ser mantidos por administradores ativos. Registros de origem, extrações, vínculos e respostas operacionais continuam reservados ao backend. Dados fiscais pessoais permanecem protegidos por RLS e não devem aparecer em logs de importação.

Históricos de versões, revisões, avaliações e marcos recusam UPDATE/DELETE, inclusive do backend; correções geram novo evento. Contas existentes sem perfil recebem perfil `pending/external`, sem aprovação automática. Perfis de acesso, regras e exceções mantêm policies administrativas. Logs e staging não ficam disponíveis ao usuário comum.

As políticas legadas de parceiros continuam exigindo revisão de escopo antes de liberar uso externo: o fato de um parceiro participar de uma OP não deve permitir inferir dados de outros parceiros. As novas tabelas não ampliam esse acesso.

## Recuperação dos dados da origem

Não é necessário mover arquivos de migration do Orchestrator: os arquivos fiscais canônicos já estão aqui. A próxima entrega é recuperar **dados**, separadamente de schema: backup restaurável, reprocessamento corrigido das compras, reconciliação de chaves e contagens, corte de escritores e somente então limpeza compensatória na origem. Não copiar `auth.users`, segredos nem objetos `ao_*`.

## Testes

`python3 scripts/test_database.py` cria um database descartável exclusivamente em `127.0.0.1`, aplica toda a cadeia e executa `supabase/tests/fiscal_model.sql`. `PG_BIN` e `PF_TEST_PG_PORT` configuram o binário e a porta locais. PostgreSQL 16.15 local e PostgreSQL 17 remoto foram verificados; o bootstrap local emula apenas os contratos mínimos de Auth/Storage e não substitui um teste completo desses serviços.

Os testes remotos usaram registros sintéticos em transação revertida. Cobrem N:N, vinculação cruzada negada, histórico imutável, ausência de falsa conclusão, separação liberação/encerramento, substituição documental, acesso interno/externo/pending, escrita do navegador negada e auditoria. Nenhum registro sintético permaneceu no banco.

Diagrama de dados (`docs/architecture/diagrams/fiscal-data-model.mmd`, fonte no repositório) · [Decisão de ambientes](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FDecisoes) · [Pesquisa de soluções](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FReferencias-de-mercado)


> Fonte: `docs/data/legacy-source-coverage.md`

# Cobertura das fontes históricas no modelo fiscal

> Status: Implementado e validado; carga operacional pendente  
> Responsável: @RodrigoFreitas16n91  
> Última revisão: 2026-09-13  
> Documentos relacionados: [Esquema fiscal](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FModelo-de-dados), [Revisão privada](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FQualidade), [ADR-0003](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FDecisoes)

## Escopo

O acervo privado foi deduplicado por SHA-256. Foram examinadas 68 fontes funcionais distintas: 17 XLSX, 20 DOCX, 21 PDF, 7 DOC, 2 EML e 1 MSG. Cópias idênticas, resultados da própria análise e repositórios históricos empacotados não contam como fonte funcional.

O relatório individual fica em `docs/docs_antigos/_analise_privada_2026-09-13/legacy-source-coverage.json`, fora do Git. Cada linha contém somente identificador neutro, extensão, papel, método de leitura, campos detectados e tabelas de destino. A documentação pública não replica nomes, números ou conteúdo real.

## Matriz de cobertura

| Família | Fontes distintas | Informação aproveitada | Destino no banco |
|---|---:|---|---|
| Relatórios de operação | 1 | OP, contratos, volumes, produto, filial, situação | staging tipado + `source_records` + `operations` |
| Relatórios de contratos | 2 | compra/venda, partes, prazos, produto, frete, quantidade | staging tipado + `source_records` + `contracts` |
| Relatório logístico | 1 | OL/rota, notas, origem, entrega, destino final, pesos e frete | staging tipado + `source_records` + `logistics_orders` |
| Relatório fiscal | 1 | nota, série, natureza, CFOP, emissão e valores | staging tipado + `source_records` + `fiscal_documents` |
| Cadastro de parceiros | 1 | identificadores, inscrições, localidade e indicadores fiscais/logísticos | `source_records` + `partners` + reconciliação |
| Relatório de estoque | 1 | depósito, item, documentos, quantidade, peso e qualidade | `source_records` + `operation_inventory_checks` |
| Relatórios financeiros | 7 | títulos, saldo, vencimento, crédito, adiantamento, previsão e fixação | `source_records` + `operation_financial_checks` |
| Checklists | 3 | perguntas, área, etapa, status, prazos e observações | `checklist_templates`, `checklist_items`, `operation_checklist_answers` |
| Autorizações de transferência | 6 | partes, emissão, quantidade/unidade, produto, identificadores e assinatura | catálogo, documento, versão, extração, revisão e requisito da OP |
| Instruções fiscais | 10 | contrato, produto, natureza, CFOP, locais, frete e condições | catálogo, vínculos N:N, extração, revisão e requisito da OP |
| Instrução de embarque | 1 | quantidade, janela, entrega, destino e condições logísticas | dossiê, campos extraídos e vínculo com OL/contratos |
| Liberações de embarque | 6 | OP, contratos, quantidade, partes, locais e decisão | dossiê e evidência do marco de liberação |
| Notas fiscais | 5 | número/série, emissão, CFOP, NCM, quantidade e dados adicionais | documento + `fiscal_documents` + vínculo N:N |
| Procedimentos fiscais | 4 | natureza, CFOP, dados adicionais e cenário | dossiê e revisão fiscal |
| Orientação de emissão | 1 | condições de emissão/troca e referência contratual | dossiê e revisão fiscal |
| Confirmações comerciais | 2 | condições, referência e comunicação | documento e vínculo com contratos |
| Instrução de descarga | 1 | terminal, descarga e agendamento | documento e vínculo com logística |
| Manual de agendamento | 1 | referência do portal e procedimento, sem credenciais | documento de apoio logístico |
| Comunicações EML/MSG | 3 | assunto, data, envio, retorno, divergência ou aceite | evidência de comunicação e revisão |
| Referências de processo | 6 | fluxo, papéis, perguntas e requisitos candidatos | documentação, templates em rascunho e regras a homologar |
| Outros documentos de apoio | 5 | condições contratuais/fiscais complementares | `documents`, extração e reconciliação de tipo |

Uma mesma fonte pode sustentar mais de uma entidade. A soma da tabela por papéis primários permanece 68; informações secundárias aparecem nos campos detectados do relatório privado.

## Dossiê base

A migration cria um conjunto `BASE_DOSSIE_EMBARQUE` em rascunho, com 12 requisitos candidatos: instruções de compra e venda, autorização, confirmação, procedimento/orientação fiscal, instrução e liberação de embarque, descarga, agendamento, comunicação e nota fiscal. Ele não é aplicado automaticamente a OPs enquanto o responsável de negócio não aprovar escopo e condições.

Os três formatos de checklist também são registrados como templates em rascunho. O template geral contém 15 verificações observadas, distribuídas entre E1 e E5. Status, áreas e bloqueios precisam ser homologados antes de gerar pendências automáticas.

## Sequência segura de carga

1. Importar relatórios e checklists para staging, preservando hash, aba, linha e conteúdo bruto.
2. Consolidar OP, contratos, parceiros, fiscal e logística; enviar ambiguidades à reconciliação.
3. Inventariar e subir os arquivos no bucket privado, criando `documents` e `document_versions`.
4. Extrair somente campos catalogados, registrando página/referência e confiança.
5. Associar documentos a todas as entidades aplicáveis e revisar os campos críticos.
6. Instanciar o conjunto documental aprovado para cada OP e calcular pendências.

Os arquivos reais ainda não são carregados automaticamente no banco: o remoto não possui OPs consolidadas às quais vinculá-los. Registrar documentos órfãos ou expor caminhos privados reduziria a qualidade e a segurança da implantação.

O importador foi validado sobre as 17 planilhas: 20.587 linhas não vazias podem entrar em `source_records`, e 2.959 registros das cinco fontes centrais também passam pelo staging tipado. A execução remota da carga permanece uma ação operacional controlada porque grava dados privados; o esquema e os catálogos já estão aplicados.


> Fonte: `docs/architecture/domain-model.md`

# Modelo de Domínio

> Atualização de 2026-09-13: o modelo versionado possui onze migrations e 51 tabelas com RLS. A ficha da OP consulta o dossiê, checklist e verificações auxiliares. Consulte o [modelo vigente](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FModelo-de-dados) e a [ADR-0003](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FDecisoes).

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: 2026-12-13
> Documentos relacionados: [Catálogo documental](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)  

## Entidades Principais

### Operacao

Representa a OP/Operação B2B consolidada no Farol.

Campos esperados:

- `id`
- `oper_b2b`
- `descricao`
- `produto`
- `safra`
- `unidade`
- `quantidade`
- `origem`
- `destino`
- `estado_macro`
- `status_semaforo`
- `data_carga`
- `created_at`
- `updated_at`

### Contrato

Representa contratos de compra e venda vinculados à operação.

Campos esperados:

- `id`
- `operacao_id`
- `tipo_contrato` (`Compra` ou `Venda`)
- `numero`
- `codigo_parceiro`
- `nome_parceiro`
- `status_liberacao`
- `quantidade`
- `janela_inicio`
- `janela_fim`

### Documento e dossiê

Representa documentos localizados, importados ou gerados.

Tipos do catálogo atual:

- instruções fiscais de compra e venda;
- instrução e liberação de embarque;
- autorização de transferência;
- liberação fiscal, nota e orientação de emissão;
- procedimento fiscal;
- confirmação comercial e evidência de comunicação;
- instrução de descarga, manual de agendamento e ordem logística;
- outro, sempre sujeito a reconciliação.

O dossiê separa tipo, requisito, atendimento, versão, revisão e campos extraídos. Um documento pode sustentar vários contratos, notas e ordens da mesma OP. O catálogo de campos inclui partes, emissão, quantidade/unidade, produto, contratos, vigência, locais, frete, CFOP/NCM, nota, OL, agendamento e assinatura.

### Fonte de dados

`source_datasets` cataloga as 17 famílias XLSX. `source_records` preserva linha, aba, hash e todas as colunas antes da normalização. `operation_source_links` registra vínculo candidato ou confirmado com OP/contrato, método e confiança.

### Checklist e verificações auxiliares

Templates e itens de checklist são versionados; respostas apontam para documento/evidência. Resultados financeiros e de estoque ficam em entidades próprias, vinculados à linha de origem, sem substituir a decisão operacional homologada.

### Pendencia

Representa bloqueios e alertas do Farol.

Campos esperados:

- `id`
- `operacao_id`
- `contrato_id`
- `documento_id`
- `regra_id`
- `estado`
- `area_responsavel`
- `severidade`
- `status`
- `mensagem`
- `valor_encontrado`
- `valor_esperado`
- `fonte`
- `proximo_passo`
- `created_at`
- `resolved_at`

### Regra

Define validações de completude e consistência.

Campos esperados:

- `id`
- `codigo`
- `nome`
- `estado`
- `tipo`
- `severidade`
- `area_responsavel`
- `condicao`
- `mensagem_padrao`
- `ativa`
- `versao`

### Evidencia

Registra a origem que sustenta uma decisão do sistema.

Campos esperados:

- `id`
- `operacao_id`
- `pendencia_id`
- `documento_id`
- `tipo`
- `origem`
- `arquivo`
- `aba`
- `coluna`
- `valor`
- `storage_path`
- `created_at`

### HistoricoEstado

Registra transições da máquina de estados.

Campos esperados:

- `id`
- `operacao_id`
- `estado_anterior`
- `estado_novo`
- `status_anterior`
- `status_novo`
- `motivo`
- `actor_type`
- `actor_id`
- `created_at`

## Regras de Consolidação

- A OP fica vermelha se houver qualquer pendência bloqueante aberta.
- A OP fica amarela se não houver bloqueio, mas houver alerta aberto.
- A OP fica verde quando todos os estados obrigatórios estiverem OK.
- O estado macro da OP deve ser o menor estado pendente entre contratos e documentos vinculados.

## Áreas

- Comercial
- Fiscal/TAX
- Gestão de Contratos
- Logística
- Faturamento
- Administração



[Voltar ao produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)
