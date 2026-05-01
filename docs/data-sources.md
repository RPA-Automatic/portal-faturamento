# Fontes de Dados TOTVS/Datasul

## Objetivo

Normalizar relatórios exportados do TOTVS/Datasul e documentos operacionais para alimentar o Farol, as pendências e a auditoria.

## Fontes Principais

### ES4004

Fonte hub da operação.

Usos principais:

- OP/Operação B2B.
- Tipo de contrato.
- Contrato.
- Cliente/fornecedor.
- Produto, descrição, volume e finalidade.

### GG4164

Fonte de contratos de compra/originação.

Usos principais:

- ContratoCompra.
- Fornecedor.
- Código do fornecedor.
- CNPJ/CPF e inscrição estadual.
- Cidade/UF de origem.
- Quantidade e janela de entrega.

### GG2037

Fonte de contratos de venda.

Usos principais:

- ContratoVenda.
- ContratoCompra vinculado.
- Cliente.
- Código do cliente.
- Cliente de embarque.
- Cidade/UF.
- Frete e natureza da operação.

### GPLP40180

Fonte logística.

Usos principais:

- OL/Rota.
- Contrato.
- Status de trânsito.
- Evidência de criação de ordem logística.

### Documentos Fiscais

Fonte fiscal.

Usos principais:

- CFOP.
- Data de emissão.
- Documento fiscal emitido/recebido.
- Vínculos fiscais disponíveis.

## Chaves Canônicas

- `oper_b2b`: OP/Operação B2B.
- `contrato_compra`: contrato de compra/originação.
- `contrato_venda`: contrato de venda.
- `codigo_parceiro`: código normalizado de cliente ou fornecedor.

## Normalização

- Remover espaços no início e fim dos campos.
- Preservar valor original para auditoria.
- Normalizar códigos como texto.
- Padronizar datas.
- Padronizar status equivalentes para `OK`, `PENDENTE`, `ALERTA` ou `NAO_APLICA`.

Exemplos de equivalência:

- `SIM`, `OK`, `LIBERADO`, `APROVADO` => `OK`
- `NAO`, `NÃO`, vazio obrigatório => `PENDENTE`

## Estratégia de Ingestão

1. Receber arquivos XLSX em storage ou diretório controlado.
2. Registrar execução da carga.
3. Ler fontes e identificar data de referência.
4. Normalizar chaves.
5. Fazer upsert idempotente por OP, contrato e data de carga.
6. Gerar pendências de completude e consistência.
7. Registrar evidências de origem.
8. Atualizar o Farol consolidado.

## Idempotência

As cargas não devem duplicar operações ou contratos. A chave mínima recomendada para itens de fila é:

`oper_b2b + tipo_contrato + contrato + data_carga`

Quando houver garantia de unicidade por dia, pode-se usar:

`oper_b2b + contrato`