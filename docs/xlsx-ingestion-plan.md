# Plano de Ingestao dos XLSX

Este plano explica como usar os relatorios XLSX enviados para montar os vinculos entre contrato de compra, contrato de venda, fornecedor, cliente e operacao.

## Situacao Atual

Os nomes dos arquivos enviados indicam as fontes esperadas:

| Arquivo/Familia | Fonte | Papel no portal | Tabela staging prevista |
|---|---|---|---|
| `ES4004*.xlsx` | ES4004 | Hub de OP/Operacao B2B e contratos | `stg_es4004_contracts` |
| `GG4164*.xlsx` | GG4164 | Contratos de compra e fornecedores | `stg_gg4164_purchase_contracts` |
| `GG2037*.xlsx` | GG2037 | Contratos de venda e clientes | `stg_gg2037_sales_contracts` |
| `GPLP40180*.xlsx` | GPLP40180 | Ordens logisticas e OL/Rota | `stg_gplp40180_logistics_orders` |
| `DocumentosFiscais*.xlsx` | Documentos Fiscais | Notas, CFOP e dados fiscais | `stg_fiscal_documents` |

Tambem foram enviados arquivos como `GG4081`, `GG4160`, `GG402858269`, `GG408458243`, `GG411258197`, `RE0522`, `ACR303AA`, `APB322AA` e `CD0590`. Eles precisam ser abertos para confirmar se sao fontes auxiliares, relatorios equivalentes ou bases complementares.

## Arquivos Encontrados

Os arquivos foram encontrados fora do repositorio, em `C:\Projetos\Docs`. Para desenvolvimento recorrente, mantenha dados reais fora do Git e use uma pasta controlada ou Supabase Storage. Se for necessario criar exemplos versionados, use somente amostras anonimizadas.

| Arquivo | Aba principal | Linha de cabecalho | Staging sugerida |
|---|---|---:|---|
| `ES4004(56).xlsx` | `es4004` | 2 | `stg_es4004_contracts` |
| `GG4164(40).xlsx` | `GG4164` | 2 | `stg_gg4164_purchase_contracts` |
| `gg2037-03660.xlsx` | `GG2037` | 2 | `stg_gg2037_sales_contracts` |
| `GPLP40180(43).xlsx` | `GPLP40180` | 2 | `stg_gplp40180_logistics_orders` |
| `DocumentosFiscais-20260220091958.xlsx` | `Doc Fisc` | 2 | `stg_fiscal_documents` |
| `Checklist_MT.xlsx` | `Checklist_MT` | 3 | regras/checklist operacional |
| `Checklist_RS (1).xlsx` | `Checklist_RS` | 3 | regras/checklist operacional |
| `CHECKLIST_Pre_Faturamento_BIOND.xlsx` | `CheckList` | 3 | regras/checklist operacional |

Arquivos auxiliares mapeados para analise posterior: `ACR.lst.xlsx`, `ACR303AA.xlsx`, `APB322AA.xlsx`, `GG4081.xlsx`, `GG4089.xlsx`, `GG4160.xlsx`, `GG402874862.xlsx`, `GG408474836.xlsx` e `GG411274787.xlsx`.

## Chaves Canonicas

As chaves que devem guiar os vinculos sao:

- `oper_b2b`: OP/Operacao B2B.
- `contrato_compra`: contrato de compra/originacao.
- `contrato_venda`: contrato de venda/pedido.
- `codigo_parceiro`: codigo de cliente ou fornecedor.
- `ol_rota`: ordem logistica ou rota.
- `documento_fiscal`: nota ou documento fiscal.

## Estrategia de Relacionamento

1. `ES4004` deve ser tratado como hub sempre que trouxer `oper_b2b`, contrato e cliente/fornecedor.
2. `GG4164` complementa contratos de compra usando `operacao` + `contrato` + fornecedor.
3. `GG2037` complementa contratos de venda usando `operacao` + `contrato` + `contrato_compra` + cliente.
4. `GPLP40180` vincula logistica por `contrato` e, quando possivel, pela OP encontrada via contrato.
5. `Documentos Fiscais` vincula por documento fiscal, parceiro, datas e, quando nao houver OP/contrato direto, por evidencia indireta.

## Pipeline Recomendado

1. Upload ou leitura local do XLSX.
2. Criar registro em `import_runs`.
3. Inserir linhas brutas nas tabelas `stg_*`, preservando `raw_data`.
4. Normalizar textos, datas, numeros e codigos.
5. Fazer upsert em `partners`.
6. Fazer upsert em `operations` a partir da OP.
7. Fazer upsert em `contracts` vinculando compra/venda a OP e parceiro.
8. Fazer upsert em `logistics_orders` e `fiscal_documents`.
9. Gerar `pending_items` a partir das regras.
10. Registrar `evidence` para cada alerta ou bloqueio.
11. Recalcular o Farol pela funcao `recalculate_operation_farol`.

## Conferencias Antes de Programar a Ingestao

- Nome exato das abas de cada XLSX.
- Linha onde cabecalhos realmente comecam.
- Nomes reais das colunas, incluindo acentos e abreviacoes.
- Se contratos e OPs chegam como numero, texto ou texto com zeros a esquerda.
- Formato das datas.
- Separador decimal dos volumes e valores.
- Se cada arquivo representa uma data de carga ou se a data precisa ser extraida do nome/conteudo.

## Proximo Passo Tecnico

Com os arquivos salvos em `data/raw/`, a proxima entrega deve ser um script ou Edge Function de importacao que gere um relatorio de diagnostico com:

- abas encontradas;
- colunas por aba;
- quantidade de linhas;
- amostra das primeiras linhas;
- sugestao de mapeamento para cada tabela staging.
