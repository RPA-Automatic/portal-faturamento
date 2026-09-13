# Esquema fiscal e recuperação das migrations

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: na homologação dos contratos de dados

## Diagnóstico confirmado

As sete migrations fiscais de maio já estavam em `portal-faturamento/supabase/migrations/`. Elas foram executadas no projeto Supabase do Orchestrator durante a troca de repositório. Esse projeto contém também as migrations e tabelas `ao_*`, próprias do Orchestrator. Não copiar essas tabelas para o portal fiscal.

O destino `eukazzizamxratkavcap` estava sem migrations e sem tabelas em `public`. Em 2026-09-13 foram aplicadas as sete migrations históricas e duas evoluções: `fiscal_operational_model` e `fiscal_query_indexes`. Resultado: **32 tabelas públicas, todas com RLS, cinco views operacionais e 12 versões de regras em rascunho**. Nenhum dado operacional do Orchestrator foi transferido ou apagado.

O conector atribuiu timestamps de execução às migrations. Os identificadores foram alinhados aos arquivos canônicos somente após comparação SHA-256 exata dos statements realmente aplicados. Nomes e conteúdo SQL foram preservados; nenhuma migration ausente foi marcada como executada. O manifesto de implantação fica em `supabase/deployment-manifest.json`.

## Modelo adotado

| Grupo | Tabelas | Finalidade |
|---|---|---|
| Identidade e referências | `profiles`, `areas`, `operation_states` | Acesso aprovado, áreas e etapas E1–E6 |
| Núcleo | `operations`, `contracts`, `partners`, `operation_contract_links` | OP, snapshots de compra/venda e vínculos explícitos N:N |
| Logística e fiscal | `logistics_orders`, `fiscal_documents`, `operation_locations` | OL/movimentação, notas, origem, entrega, transbordo e destino final |
| Documentos | `documents`, `document_versions`, `document_reviews` | Cadastro, arquivo/versionamento e revisão por área |
| Verificações | `rules`, `rule_versions`, `rule_evaluations`, `operation_stage_assessments` | Catálogo versionado, resultado/evidência e avaliação das etapas |
| Tratamento | `pending_items`, `evidence`, `state_history`, `operation_milestones` | Pendência, responsável/prazo, prova, histórico, liberação e encerramento |
| Exceções | `exceptions`, `exception_approvals` | Exceção vinculada à OP/regra, evidência, aprovador e vigência |
| Ingestão | `import_runs`, `job_logs`, `reconciliation_items` | Hash, extração, versão do mapeamento, falhas e vínculos ambíguos |
| Staging | `stg_es4004_contracts`, `stg_gg4164_purchase_contracts`, `stg_gg2037_sales_contracts`, `stg_gplp40180_logistics_orders`, `stg_fiscal_documents` | Dados brutos dos cinco relatórios, sem substituir o domínio consolidado |
| Auditoria | `audit_logs` | Alterações sensíveis e eventos de decisão |

## Chaves e cardinalidade

- `operations.oper_b2b` preserva a chave textual canônica existente. Escopo global por filial continua uma decisão de negócio a validar antes de importações de outras origens.
- Contratos são snapshots diários; a chave passa a `(contract_type, contract_number, establishment, source_item_key, data_carga)`. Filial e item não podem ser inferidos da descrição comercial. Strings vazias mantêm compatibilidade com cargas históricas, mas não resolvem ambiguidades: enviá-las à reconciliação.
- `operation_contract_links` permite múltiplos contratos por OP e múltiplas OPs por snapshot de contrato. O campo legado `contracts.operation_id` continua compatível por trigger; novos consolidadores devem escrever vínculos explícitos. O trigger só remove um vínculo antigo quando ele próprio o criou, sem apagar vínculos confirmados por outro processo.
- As contagens de contratos do Farol representam vínculos a snapshots. Selecionar o snapshot vigente por origem/filial/item é responsabilidade do consolidador; não anexar todas as cargas históricas como novos contratos ativos.
- Documentos têm versões identificadas por `(document_id, version_no)`, hash SHA-256 e caminho exclusivo. Metadados antigos não são convertidos em versões de arquivo sem upload confirmado.
- FKs compostas impedem vincular avaliação, versão de documento ou evidência a outra OP. Revisões apontam para uma versão concreta; não são copiadas para sua sucessora.
- Uma origem/linha/campo tem uma ocorrência de reconciliação por execução de importação. Nova execução pode reprocessar o mesmo hash com um mapeamento corrigido.

## Semáforo e decisões

Ausência de pendências não representa aprovação. O Farol consulta avaliações explícitas de E1–E5: uma etapa ausente, vencida, reprovada ou baseada em documento substituído fica pendente/bloqueada. Uma nova versão invalida a avaliação que aponta para a versão anterior; avaliações não relacionadas permanecem válidas.

Com todas as etapas aprovadas ou explicitamente não aplicáveis, a operação permanece em E5/amarelo até haver decisão própria de encerramento. Liberação de embarque é outro marco e nunca encerra automaticamente a OP. As avaliações e decisões são registradas por backend autorizado, com pessoa responsável e evidência; não há aprovação fiscal automática neste incremento.

A matriz de aplicabilidade, saldo, precedência OL/liberação, calendário D-2 e aceites fiscais ainda precisa ser homologada. As 12 versões iniciais de regras são **rascunhos**. Exceções históricas genéricas de exportação/transferência foram desativadas; a dispensa exige escopo e aprovação próprios.

As views usam `security_invoker`; o resumo calcula validade na leitura e não depende de um job atualizar o cache. A consulta do Farol agrega cada relação separadamente para evitar multiplicação de contratos × notas × OLs × pendências.

## Segurança e integração

Novas tabelas: leitura somente de perfis internos ativos; escrita somente pelo backend `service_role`. Não conceder essa chave ao frontend. O fluxo de aprovação/escrita dessas novas entidades ainda será implementado e homologado. A ficha da OP é de consulta.

Históricos de versões, revisões, avaliações e marcos recusam UPDATE/DELETE, inclusive do backend; correções geram novo evento. Contas existentes sem perfil recebem perfil `pending/external`, sem aprovação automática. Perfis de acesso, regras e exceções mantêm policies administrativas. Logs e staging não ficam disponíveis ao usuário comum.

As políticas legadas de parceiros continuam exigindo revisão de escopo antes de liberar uso externo: o fato de um parceiro participar de uma OP não deve permitir inferir dados de outros parceiros. As novas tabelas não ampliam esse acesso.

## Recuperação dos dados da origem

Não é necessário mover arquivos de migration do Orchestrator: os arquivos fiscais canônicos já estão aqui. A próxima entrega é recuperar **dados**, separadamente de schema: backup restaurável, reprocessamento corrigido das compras, reconciliação de chaves e contagens, corte de escritores e somente então limpeza compensatória na origem. Não copiar `auth.users`, segredos nem objetos `ao_*`.

## Testes

`python3 scripts/test_database.py` cria um database descartável exclusivamente em `127.0.0.1`, aplica toda a cadeia e executa `supabase/tests/fiscal_model.sql`. `PG_BIN` e `PF_TEST_PG_PORT` configuram o binário e a porta locais. PostgreSQL 16.15 local e PostgreSQL 17 remoto foram verificados; o bootstrap local emula apenas os contratos mínimos de Auth/Storage e não substitui um teste completo desses serviços.

Os testes remotos usaram registros sintéticos em transação revertida. Cobrem N:N, vinculação cruzada negada, histórico imutável, ausência de falsa conclusão, separação liberação/encerramento, substituição documental, acesso interno/externo/pending, escrita do navegador negada e auditoria. Nenhum registro sintético permaneceu no banco.

[Diagrama de dados](../architecture/diagrams/fiscal-data-model.mmd) · [Decisão de ambientes](../decisions/ADR-0002-banco-fiscal-unico.md) · [Pesquisa de soluções](../product/market-benchmark.md)
