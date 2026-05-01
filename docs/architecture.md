## Arquitetura: Automação de Validação (TOTVS → Farol)

### Objetivo
Automatizar o cruzamento e a validação de operações (originação → venda → liberação de embarque → logística → fiscal) que hoje são conferidas manualmente no TOTVS, operação a operação. A automação inicial trabalha em lote diário com relatórios XLSX exportados, mais documentos de regras (DOCX/PDF), entregando um Farol e uma lista de pendências/exceções por área.

### Escopo da Fase 1 (MVP Operacional)
- Ingestão de relatórios XLSX exportados (fontes principais + auxiliares).
- Extração de regras e critérios a partir de PDD/POP/RACI e instruções fiscais (DOCX/PDF).
- Normalização de chaves e campos críticos (OP/Oper B2B, ContratoCompra, ContratoVenda, CódigoParceiro).
- Motor de validações: completude, consistência e evidências.
- Saídas: datasets/tabelas para consumo (Power BI/Excel) + relatórios de pendências.

### Fontes (alto nível)
- Hub de Operações: ES4004 (Oper B2B/OP + contratos compra/venda + Cliente/Fornec e demais dados de operação).
- Contratos Compra: GG4164 (contrato compra + código fornecedor/parceiro + dados comerciais).
- Contratos Venda: GG2037 (contrato venda + código cliente/parceiro + dados comerciais).
- Logística: GPLP40180 (ordem/logística/etapas/janelas/locais/status).
- Fiscal: Documentos Fiscais (NF-e e correlatos; chaves fiscais, CFOP, datas, valores, vínculos).
- Regras e papéis: PDD + POP-Fat + RACI + instruções fiscais + PDF de referência.

### Modelo Canônico (entidades)
- Operacao (grão do Farol): 1 linha por Oper B2B/OP.
  - Atributos: status por etapa, datas-chave, produto, quantidade, origem/destino, pendências, exceções, evidências.
- ContratoCompra: 0..N por Operacao.
- ContratoVenda: 0..N por Operacao.
- Parceiro: representado por CódigoParceiro canônico, com PapelParceiro (Cliente/Fornecedor) derivado pelo TipoContrato.
- OrdemLogistica (OL/Ordem): 0..N por Operacao.
- DocumentoFiscal: 0..N por Operacao e/ou por Contrato, com fallback por chave NF-e.

### Chaves e Regras de Junção
- Chaves principais: Oper B2B/OP + ContratoCompra + ContratoVenda.
- ES4004 é a tabela-hub quando disponível: Operacao referencia contratos e o Cliente/Fornec (CódigoParceiro).
- CódigoParceiro: campo canônico para match; pode aparecer como Cliente/Fornec, Código, Cod Cliente, Cod Fornecedor, Parceiro etc.
- Validação de consistência: Operacao ↔ (ContratoCompra, ContratoVenda) ↔ CódigoParceiro.
- Fallback fiscal: quando OP/contrato não estiverem presentes na base fiscal, usar chaves fiscais (NF-e) e campos complementares (datas, parceiro, produto) para evidenciar relação.

### Normalização e Qualidade de Dados
- Tipos: converter datas para padrão único; números com separadores; textos com trim e padronização.
- Identificadores: normalizar Oper B2B/OP, Contratos e CódigoParceiro (string numérica sem zeros não-significativos, conforme decisão).
- Ambiguidade: quando existirem CodCliente e CodFornecedor separados, preservar ambos e derivar CódigoParceiro + PapelParceiro.

### Motor de Regras (validações)
- Regras de completude por etapa: “o que precisa existir para avançar” (PDD/POP/RACI).
- Regras de consistência cruzada: divergência de quantidade, datas, UF/CFOP, parceiro, OP×contrato.
- Classificação de severidade: Bloqueante (vermelho) vs Atenção (amarelo) vs OK (verde).
- Evidência obrigatória: cada alerta aponta a origem (arquivo/aba/coluna ou documento/seção) e o valor encontrado.

### Outputs (para operação)
- Dataset Operacao_Farol: 1 linha por Operacao com status e pendências.
- Dataset Operacao_Pendencias: múltiplas linhas por Operacao, detalhando regra falhada, campo ausente/divergente, responsável e evidência.
- Dataset Operacao_Evidencias: trilha de auditoria por campo.

### Governança e Operação
- Execução diária (D+0) com versionamento por data de carga.
- Catálogo de fontes: quais relatórios entraram e qual versão.
- RACI aplicado: cada pendência aponta “dono” e SLA esperado.

### Evoluções (fase 2+)
- Integração direta TOTVS (API/DB) para near real-time.
- Workflow (tarefas, aceite, trilha formal) e geração do PDF de liberação automaticamente.
