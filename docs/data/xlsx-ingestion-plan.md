# Plano de Ingestao dos XLSX

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: 2026-12-13
> Documentos relacionados: [Catálogo documental](../README.md)  

Este plano explica como usar os relatorios XLSX enviados para montar os vinculos entre contrato de compra, contrato de venda, fornecedor, cliente e operacao.

## Revisão de 2026-09-13

O acervo atual também está em `docs/docs_antigos/`, integralmente privado e ignorado pelo Git. Consulte a [revisão do acervo](../quality/source-review-2026-09-13.md). O ambiente remoto único foi confirmado; desenvolvimento e testes de migrations usam PostgreSQL local descartável antes da aplicação remota.

O GG4164 usa mapeamento por cabeçalhos explícitos. As 93 linhas históricas têm divergência de Safra/Frete em relação ao `raw_data` e precisam ser reprocessadas após preservar a evidência original. Os demais layouts ainda precisam de homologação por campo antes da transferência final.

## Situacao Atual

Os nomes dos arquivos enviados indicam as fontes esperadas:

| Arquivo/Familia | Fonte | Papel no portal | Tabela staging prevista |
|---|---|---|---|
| `ES4004*.xlsx` | ES4004 | Hub de OP/Operacao B2B e contratos | `stg_es4004_contracts` |
| `GG4164*.xlsx` | GG4164 | Contratos de compra e fornecedores | `stg_gg4164_purchase_contracts` |
| `GG2037*.xlsx` | GG2037 | Contratos de venda e clientes | `stg_gg2037_sales_contracts` |
| `GPLP40180*.xlsx` | GPLP40180 | Ordens logisticas e OL/Rota | `stg_gplp40180_logistics_orders` |
| `DocumentosFiscais*.xlsx` | Documentos Fiscais | Notas, CFOP e dados fiscais | `stg_fiscal_documents` |

As demais famílias foram classificadas como financeiro, estoque, cadastro de parceiros ou checklist. Todas entram no staging comum; a transformação para tabelas operacionais depende da homologação de chaves e campos.

## Arquivos Encontrados

Os arquivos reais de operacao ficam no workspace, mas fora do Git, em `data/private/`. Essa pasta e ignorada pelo repositorio.

Organizacao atual:

| Pasta privada | Conteudo | Uso |
|---|---|---|
| `data/private/relatorios-xlsx/` | Relatorios XLSX do Datasul/TOTVS e checklists | Fonte para staging e normalizacao |
| `data/private/documentos-processo/` | DOCX/PDF de entendimento e processo | Referencia operacional e regras |
| `data/private/operacoes/` | Pastas reais de OPs | Exemplos de documentos por operacao |

Para desenvolvimento recorrente, mantenha dados reais fora do Git e use uma pasta controlada ou Supabase Storage. Se for necessario criar exemplos versionados, use somente amostras anonimizadas.

| Arquivo | Aba principal | Linha de cabecalho | Staging sugerida |
|---|---|---:|---|
| `ES4004(56).xlsx` | `es4004` | 2 | `stg_es4004_contracts` |
| `GG4164(40).xlsx` | `GG4164` | 2 | `stg_gg4164_purchase_contracts` |
| `gg2037-03660.xlsx` | `GG2037` | 2 | `stg_gg2037_sales_contracts` |
| `GPLP40180(43).xlsx` | `GPLP40180` | 2 | `stg_gplp40180_logistics_orders` |
| `DocumentosFiscais-20260220091958.xlsx` | `Doc Fisc` | 2 | `stg_fiscal_documents` |
| `Checklist_MT.xlsx` | `Checklist_MT` | 3 | regras/checklist operacional |
| `Checklist_RS (1).xlsx` | `Checklist_RS` | 3 | regras/checklist operacional |
| `Checklist geral privado (XLS-06)` | `CheckList` | 3 | regras/checklist operacional |

Arquivos auxiliares mapeados para analise posterior: `ACR.lst.xlsx`, `ACR303AA.xlsx`, `APB322AA.xlsx`, `GG4081.xlsx`, `GG4089.xlsx`, `GG4160.xlsx`, `GG402874862.xlsx`, `GG408474836.xlsx` e `GG411274787.xlsx`.

## Inventario Estrutural Atual

Foi criado o script `scripts/inventory_xlsx.py` para gerar inventario local sem exportar dados de linha. O resultado fica em `data/private/xlsx-inventory.json`, tambem fora do Git.

O inventario registra:

- nome do arquivo;
- tamanho;
- hash SHA-256;
- abas;
- quantidade estimada de linhas;
- linha provavel de cabecalho;
- nomes das colunas.

Resumo dos arquivos analisados:

| Arquivo | Aba principal | Linhas estimadas | Linha de cabecalho | Classificacao inicial |
|---|---|---:|---:|---|
| `ES4004(56).xlsx` | `es4004` | 233 | 2 | Hub OP/contratos |
| `GG4164(40).xlsx` | `GG4164` | 95 | 2 | Contratos de compra |
| `gg2037-03660.xlsx` | `GG2037` | 112 | 2 | Contratos de venda |
| `GPLP40180(43).xlsx` | `GPLP40180` | 2372 | 2 | Ordens logisticas |
| `DocumentosFiscais-20260220091958.xlsx` | `Doc Fisc` | 157 | 2 | Documentos fiscais |
| `Checklist_MT.xlsx` | `Checklist_MT` | 53 | 3 | Checklist operacional |
| `Checklist_RS (1).xlsx` | `Checklist_RS` | 28 | 3 | Checklist operacional |
| `Checklist geral privado (XLS-06)` | `CheckList` | 1048557 | 3 | Checklist operacional com dimensao inflada pela planilha |
| `ACR.lst.xlsx` | `Sheet` | 1003 | 1 | Contas a receber / titulos |
| `ACR303AA.xlsx` | `Sheet` | 1799 | 1 | Contas a receber / titulos |
| `APB322AA.xlsx` | `Sheet` | 311 | 1 | Contas a pagar / fornecedores |
| `GG402874862.xlsx` | `Mapa Estoque` | 5203 | 1 | Estoque |
| `GG4081.xlsx` | `Sheet` | 66 | 1 | Adiantamentos/financeiro fornecedor |
| `GG4089.xlsx` | `Sheet` | 82 | 1 | Previsao/adiantamento por contrato |
| `GG4160.xlsx` | `Sheet` | 67 | 1 | Previsao de pagamento por contrato |
| `GG408474836.xlsx` | `Extrato Fornecedor` | 1431 | 1 | Cadastro/extrato fornecedor |
| `GG411274787.xlsx` | `Fixação Componente` / `Fixação Preço` | 7143 / 330 | 1 | Fixacoes de preco/componente |

Para atualizar o inventario local:

```bash
python scripts/inventory_xlsx.py data/private/relatorios-xlsx --output data/private/xlsx-inventory.json
```

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
2. `GG4164` complementa compras por contrato e parceiro, incluindo filial/item conforme o grão validado. `Operação` é descrição comercial no recorte inspecionado; não usar como número da OP.
3. `GG2037` complementa vendas por contrato, vínculo de compra e cliente. Buscar a OP pelo ES4004; não inferir uma OP numérica do campo descritivo `Operação`.
4. `GPLP40180` vincula logistica por `contrato` e, quando possivel, pela OP encontrada via contrato.
5. `Documentos Fiscais` vincula por documento fiscal, parceiro, datas e, quando nao houver OP/contrato direto, por evidencia indireta.

## Pipeline Recomendado

1. Ler o XLSX em ambiente server-side/local seguro, nunca direto do frontend.
2. Calcular SHA-256 do arquivo.
3. Criar registro em `import_runs` com fonte, nome do arquivo, hash, status e metadados.
4. Inserir todas as abas e linhas não vazias em `source_records`, preservando coluna, aba, número da linha e hash; para as cinco fontes centrais, preencher também `stg_*`.
5. Normalizar textos, datas, numeros e codigos.
6. Fazer upsert em `partners`.
7. Fazer upsert em `operations` a partir da OP.
8. Fazer upsert em `contracts` vinculando compra/venda a OP e parceiro.
9. Fazer upsert em `logistics_orders` e `fiscal_documents`.
10. Gerar `pending_items` a partir das regras.
11. Registrar `evidence` para cada alerta ou bloqueio.
12. Recalcular o Farol pela funcao `recalculate_operation_farol`.

## Carga no Supabase

Recomendacao de implementacao:

1. Validar a carga no PostgreSQL local descartável.
2. Executar o script local com service role mantida fora do Git.
3. Carregar as 17 famílias em `source_records`; as cinco fontes centrais também alimentam as tabelas `stg_*` existentes.
4. Validar contagens e chaves canonicas.
5. Implementar a consolidacao para as tabelas normalizadas.
6. So depois promover o mesmo fluxo para producao.

As migrations oficiais definem staging para cinco fontes principais. A existência no banco fiscal deve ser validada; o banco de produção estava vazio na auditoria:

| Fonte | Tabela staging |
|---|---|
| ES4004 | `stg_es4004_contracts` |
| GG4164 | `stg_gg4164_purchase_contracts` |
| GG2037 | `stg_gg2037_sales_contracts` |
| GPLP40180 | `stg_gplp40180_logistics_orders` |
| Documentos Fiscais | `stg_fiscal_documents` |

A migration de dossiê acrescenta `source_datasets`, `source_records` e `operation_source_links`. Essa camada recebe as **17 famílias XLSX** e preserva cada linha como JSONB com hash, aba e número da linha. Os cinco relatórios principais continuam usando suas tabelas tipadas; fontes financeiras, cadastro de parceiros, estoque, fixações e checklists permanecem no staging comum até a homologação do mapeamento normalizado.

Os relatórios financeiros, de estoque, cadastro, fixações e checklists já entram no staging comum. Novas tabelas tipadas só serão criadas quando o mapeamento de negócio de cada família estiver homologado.

### Script local de importacao

O script `scripts/import_xlsx_to_supabase.py` carrega todas as 17 famílias no staging comum e mantém o staging tipado dos cinco relatórios centrais.

Validar leitura sem enviar dados:

```bash
python scripts/import_xlsx_to_supabase.py docs/docs_antigos --dry-run
```

Resultado validado no acervo deduplicado:

| Escopo | Arquivos | Linhas não vazias |
|---|---:|---:|
| Staging comum `source_records` | 17 | 20.587 |
| Staging tipado adicional | 5 | 2.959 |

Para importar no Supabase DEV, configure variaveis locais no terminal. Nunca salve `SUPABASE_SERVICE_ROLE_KEY` no Git.

```bash
export SUPABASE_URL="https://SEU_PROJETO_DEV.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua_service_role_key_dev"
python scripts/import_xlsx_to_supabase.py docs/docs_antigos
```

No PowerShell:

```powershell
$env:SUPABASE_URL = "https://SEU_PROJETO_DEV.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "sua_service_role_key_dev"
c:/Projetos/portal-faturamento/.venv/Scripts/python.exe scripts/import_xlsx_to_supabase.py data/private/relatorios-xlsx
```

O script cria um `import_runs` por arquivo e grava o SHA-256 em `import_runs.metadata.sha256`.

## Controle de Documentos e Hash

A tabela `documents` ja possui `file_signature`, `storage_path`, `source_url` e `metadata`. Isso permite registrar, no futuro, cada arquivo fisico com:

- hash SHA-256 em `file_signature`;
- caminho no Supabase Storage em `storage_path`;
- tipo de documento em `type`;
- relacao com `operation_id`, `contract_id`, `fiscal_document_id` ou `logistics_order_id` quando conhecida;
- metadados do inventario em `metadata`.

As pastas reais de OP em `data/private/operacoes/` devem ser usadas como amostras para mapear nomes de arquivos, documentos obrigatorios e vinculacoes por OP/contrato antes de automatizar upload para Storage.

### Inventario e registro de documentos de OP

Foi criado `scripts/inventory_documents.py` para inventariar os documentos das pastas de OP. O inventario privado fica em `data/private/documents-inventory.json`.

Validar inventario:

```bash
python scripts/inventory_documents.py data/private/operacoes --output data/private/documents-inventory.json
```

Foram identificados 33 documentos nas pastas de OP, incluindo:

- instrucoes fiscais de compra/venda;
- liberacoes de embarque;
- manuais e instrucoes de descarga/agendamento;
- notas fiscais;
- e-mails `.eml` e `.msg` com evidencias do processo.

Foi criado tambem `scripts/register_documents_to_supabase.py` para registrar os hashes na tabela `documents`.

Validar payload sem enviar:

```bash
python scripts/register_documents_to_supabase.py data/private/documents-inventory.json --dry-run
```

Registrar no Supabase DEV:

```powershell
$env:SUPABASE_URL = "https://SEU_PROJETO_DEV.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "sua_service_role_key_dev"
c:/Projetos/portal-faturamento/.venv/Scripts/python.exe scripts/register_documents_to_supabase.py data/private/documents-inventory.json
```

Neste primeiro momento, o script registra `file_signature`, `title`, `type`, `storage_path` planejado e metadados. Em uma etapa posterior, a automacao deve subir os arquivos para Supabase Storage e manter o mesmo `storage_path`.

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
