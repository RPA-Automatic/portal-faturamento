# Modelo de Domínio

> Atualização de 2026-09-13: o modelo versionado possui onze migrations e 51 tabelas com RLS. A ficha da OP consulta o dossiê, checklist e verificações auxiliares. Consulte o [modelo vigente](../data/fiscal-schema.md) e a [ADR-0003](../decisions/ADR-0003-dossie-documental-e-fontes.md).

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: 2026-12-13
> Documentos relacionados: [Catálogo documental](../README.md)  

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
