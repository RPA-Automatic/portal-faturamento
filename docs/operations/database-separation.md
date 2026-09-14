# Separação dos bancos e recuperação das cargas fiscais

> Atualização de 2026-09-13: onze migrations aplicadas no banco fiscal, 51 tabelas com RLS e ficha da OP disponível para consulta. Ambiente remoto único confirmado pelo usuário; DEV local. Consulte o [modelo vigente](../data/fiscal-schema.md) e a [ADR-0002](../decisions/ADR-0002-banco-fiscal-unico.md). As referências abaixo a DEV remoto pendente e sete migrations descrevem o diagnóstico anterior.

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: antes da execução remota  
> Documentos relacionados: [Auditoria de ambientes](../quality/environment-audit-2026-09-13.md), [Revisão do acervo](../quality/source-review-2026-09-13.md)

## Destinos definidos

O usuário definiu produção fiscal em `eukazzizamxratkavcap` e outro projeto exclusivo para DEV. Na consulta de 2026-09-13, o conector expôs apenas produção fiscal e o projeto `lvsocwetuhhqxlwyfdrw`, pertencente ao Orchestrator. O DEV fiscal ainda não foi identificado/provisionado.

`supabase/targets.json` é a fonte de referências remotas para os scripts. DEV está `null`; cargas remotas DEV ficam bloqueadas. Os `project_id` dos TOMLs DEV são identificadores locais do CLI, não comprovam vínculo remoto. O vínculo efetivo do CLI também depende de `supabase link` e de `supabase/.temp/project-ref` quando existente. Não executar `db push` fora do projeto validado.

## Inventário confirmado por contagem exata

Produção fiscal não possui tabelas em `public`. No banco do Orchestrator foram encontrados os seguintes registros fiscais:

| Grupo | Tabelas e contagens |
|---|---|
| Staging | ES4004: 231; compra: 93; venda: 110; logística: 2.370; documentos fiscais: 155 |
| Evidências e carga | documents: 33; import_runs: 6; audit_logs: 9 |
| Configuração | areas: 6; operation_states: 6; rules: 12; exceptions: 2; profiles: 1 |
| Domínio sem linhas | operations, partners, contracts, logistics_orders, fiscal_documents, pending_items, evidence, state_history, job_logs |

São 22 tabelas fiscais em `public`. Os 33 documentos têm hash e nenhum tem `operation_id`; a contagem de objetos em Storage é zero. Registro de metadados não comprova upload do arquivo. Existem 2 execuções, 20 eventos, 7 recursos e 1 workspace do Orchestrator que devem permanecer intactos. Há 1 usuário em Auth, compartilhando o banco atual.

Não foram encontradas FKs entre `ao_*` e as tabelas fiscais. Porém, há o trigger fiscal `trg_auth_users_profile` em `auth.users`, funções auxiliares, views e policies que precisam ser tratados na separação. A ausência de FK cruzada não é prova de ausência de todas as dependências.

## Correções locais executadas

- Removida a referência ao Orchestrator dos TOMLs DEV e do seletor de ambiente.
- Importação XLSX e registro de documentos validam o destino fiscal antes de enviar dados/chaves. Produção exige `--environment prod --confirm-production`.
- Mapeamento de compra passou a usar cabeçalhos explícitos. O dry-run também valida o mapeamento completo antes de qualquer inserção.
- Os dados antigos permanecem na origem, inclusive o `raw_data` necessário à reconciliação.

## Procedimento de execução

1. Provisionar/identificar o projeto DEV fiscal e registrar sua referência em `targets.json`. Validar organização, região, custos, versão PostgreSQL e URL do projeto antes de vincular.
2. Capturar backup lógico dos objetos fiscais, definições, grants, policies, triggers, configurações e dados da origem, com hash e contagens. Guardar fora do Git e testar restauração. O inventário documental não é backup de banco.
3. Aplicar em DEV a cadeia das sete migrations oficiais de `supabase/migrations/`, revisando funções privilegiadas, grants, trigger Auth, views `security_invoker` e policies de Storage. Não usar migrations históricas existentes dentro do acervo privado.
4. Reprocessar as cinco fontes com o importador corrigido em lotes rastreáveis. Conservar os lotes originais como evidência: não copiar cegamente as colunas de staging com mapeamento errado.
5. Reconciliar por hash, arquivo, linha, chave e campo, além de contagens. Verificar todos os mapeamentos dos demais relatórios e diferenças de layout. O mecanismo atual de deduplicação por nome de arquivo precisa ser revisto antes da ingestão recorrente.
6. Validar os 33 metadados de documentos contra os originais locais. Não dar como disponíveis anexos ausentes do Storage. Planejar upload e autorização de leitura separadamente.
7. Definir acesso fiscal, criar/invitar usuários próprios e associar perfis no destino. Não copiar `auth.users`, tokens ou credenciais do Orchestrator para fazer o perfil fiscal funcionar.
8. Validar RLS com usuários sintéticos de áreas distintas, acesso externo e administrador. Executar testes de importação, consulta, anexo e auditoria.
9. Promover migrations e configuração validadas para produção fiscal. Dados privados históricos exigem classificação e necessidade de uso explícitas; preferir dados sintéticos para testes e demonstrações.
10. Atualizar aplicação, integrações e variáveis para o destino fiscal e testar ponta a ponta. Paralisar escritores fiscais na origem durante a transferência final e reconciliar novamente.
11. Após backup restaurável, reconciliação e corte de consumidores, preparar uma migration compensatória no Orchestrator removendo somente objetos fiscais explicitamente inventariados. Não usar `DROP SCHEMA public CASCADE`, não excluir Auth e não apagar entradas do histórico para simular que migrations nunca foram executadas.
12. Confirmar execução, eventos, recursos e autenticação do Orchestrator, e o fluxo fiscal no destino. Manter a origem recuperável durante a janela de rollback acordada.

## Bloqueios e rollback

O projeto DEV remoto falta. Nesta etapa não houve cópia de linhas, aplicação de migrations ou exclusão remota. Não há ainda backup restaurado/testado nem validação de todos os consumidores. Esses são pré-requisitos concretos para a limpeza do banco compartilhado.

Antes do corte, rollback consiste em manter a aplicação na configuração anterior com escritores controlados. Depois de novas gravações no destino, voltar a apontar para a origem sem reconciliar o delta perde atualizações; exigir plano de replay e nova contagem. A limpeza da origem deve ser a última ação, depois de validação e recuperação demonstradas.
