# Modelo de Domínio

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

### Documento

Representa documentos localizados, importados ou gerados.

Tipos iniciais:

- `INSTRUCAO_COMPRA`
- `INSTRUCAO_VENDA`
- `LIBERACAO_EMBARQUE`
- `LIBERACAO_FISCAL`
- `NOTA_FISCAL`
- `ORDEM_LOGISTICA`

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