# Banco de Dados Supabase

## Objetivo

Este backend PostgreSQL modela os relatórios Datasul/TOTVS usados no portal de faturamento e liberação de embarque. O desenho combina tabelas normalizadas para o produto com tabelas de staging para preservar os dados originais dos XLSX.

## Relatórios Base

| Relatório | Uso no Portal | Tabela de staging |
|---|---|---|
| ES4004 | Hub de OP/Operação B2B e contratos | `stg_es4004_contracts` |
| GG4164 | Contratos de compra/originação | `stg_gg4164_purchase_contracts` |
| GG2037 | Contratos de venda | `stg_gg2037_sales_contracts` |
| GPLP40180 | Ordens de logística/OL | `stg_gplp40180_logistics_orders` |
| Documentos Fiscais | Dados fiscais e CFOP | `stg_fiscal_documents` |

## Tabelas Normalizadas

- `operations`: uma linha por OP/Operação B2B, com estado atual e semáforo.
- `contracts`: contratos de compra e venda vinculados à operação.
- `partners`: clientes, fornecedores e emitentes normalizados por código.
- `logistics_orders`: OL/rota, transporte, origem/destino e status logístico.
- `fiscal_documents`: documentos fiscais, CFOP, emissão e valores fiscais.
- `documents`: documentos operacionais e evidências armazenadas.
- `rules`: regras parametrizadas do Farol E1..E6.
- `pending_items`: pendências por regra, área, etapa e severidade.
- `evidence`: evidências por arquivo, aba, coluna, linha e valor.
- `state_history`: histórico auditável de transições de estado.
- `import_runs` e `job_logs`: observabilidade das cargas e jobs.
- `exceptions`: exceções parametrizáveis, como exportação e transferência Porto Rio Grande.

## Estados do Farol

- `E1`: Documentação Básica.
- `E2`: Validação Fiscal.
- `E3`: Contratos e Regras TOTVS.
- `E4`: Logística.
- `E5`: Faturamento.
- `E6`: Concluído.

## Status de Contrato

O banco usa `normalized_contract_status` para padronizar status operacionais dos relatórios:

- `andamento`
- `concluido`
- `cancelado`
- `desconhecido`

A função `normalize_contract_status(text)` centraliza a primeira normalização para textos como `Aprovado`, `Normal`, `Cancelado`, `Fechado` e similares.

## Views Operacionais

- `v_operations_farol`: base principal do dashboard Farol, com contadores de contratos, OLs, documentos fiscais, pendências, sla e aging.
- `v_area_backlog`: backlog agrupado por área, etapa, severidade e status.
- `v_contract_drilldown`: visão de detalhe por contrato vinculado à OP.

## Segurança

As tabelas principais já nascem com Row Level Security habilitado. A camada de segurança foi evoluída a partir de padrões existentes no portal de cadastro, mas aplicada ao domínio deste produto.

Neste contexto, "adaptar ao domínio de OP/contratos/faturamento" significa não copiar tabelas, triggers e fluxos de leads/cadastro. Significa reaproveitar os mesmos conceitos de segurança em cima das entidades corretas do Portal de Faturamento:

- `operations`: OP/Operação B2B e estágio E1..E6.
- `contracts`: contratos de compra e venda.
- `partners`: clientes, fornecedores e parceiros.
- `logistics_orders`: OL, rota, origem/destino e transporte.
- `fiscal_documents`: documentos fiscais, CFOP e valores.
- `documents`: arquivos e hashes de documentos operacionais.
- `pending_items`: pendências por etapa, área e severidade.
- `evidence`: evidências manuais ou importadas.
- `audit_logs`: trilha de auditoria das alterações sensíveis.

Políticas e funções atuais:

- Usuários novos nascem com perfil `pending` e sem acesso operacional amplo.
- Usuários internos ativos podem ler dados operacionais conforme escopo.
- Usuários externos devem ser vinculados a `partner_id` para enxergar somente dados do próprio parceiro.
- Staging, imports, job logs e audit logs ficam restritos a administradores/service role.
- Pendências podem ser resolvidas por RPC controlada, gerando evidência e auditoria.
- Documentos de OP devem usar bucket privado `operation-documents` com policies em `storage.objects`.
- Jobs de backend devem usar service role somente em ambiente server-side seguro.

Padrões reaproveitados do portal de cadastro:

- funções `security definer` com `set search_path` fixo;
- policies usando `(select auth.uid())` quando aplicável;
- bloqueio explícito de operações destrutivas para usuários autenticados;
- RPCs para alterações sensíveis;
- policies específicas para Storage privado;
- auditoria automática em tabelas sensíveis.

## Como Aplicar

Com Supabase CLI configurado:

```bash
supabase link --project-ref eukazzizamxratkavcap
supabase db push
```

Para ambiente local:

```bash
supabase start
supabase db reset
```

## Próxima Etapa

Importar os dados dos arquivos xlsx  para popular primeiro as tabelas de staging e depois consolidar `operations`, `contracts`, `partners`, `logistics_orders`, `fiscal_documents`, `pending_items` e `evidence` de forma idempotente.