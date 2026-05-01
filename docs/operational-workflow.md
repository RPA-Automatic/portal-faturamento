# Fluxo Operacional

## Grão do Processo

- Principal: uma linha por OP/Operação B2B.
- Detalhe: ContratoCompra, ContratoVenda, documento, OL e pendência.
- Consolidação: o estado da OP deve refletir o pior estado entre seus contratos e pendências vinculadas.

## Estados Macro

### E1 - Documentação Básica

Áreas: Comercial e Faturamento.

Valida I.F. Compra, I.F. Venda, documentação salva na pasta da OP e cumprimento do SLA D-2.

Pendência típica: documento obrigatório ausente, instrução fiscal não localizada ou documentação não salva.

### E2 - Validação Fiscal

Área: Fiscal/TAX.

Valida CFOP, cadastros cliente x fornecedor, regras fiscais, local de entrega, instruções fiscais e pendências tributárias.

Pendência típica: CFOP incompatível, cadastro incompleto, divergência fiscal ou regra tributária não validada.

### E3 - Contratos e Regras TOTVS

Áreas: Comercial e Gestão de Contratos.

Valida contrato de compra liberado, pedido de venda liberado, regras Datasul criadas e vínculo correto entre OP, contratos e parceiros.

Pendência típica: contrato não liberado, pedido não liberado, regra Datasul ausente ou vínculo inconsistente.

### E4 - Logística

Área: Logística.

Valida criação da OL, dados de agendamento, transportadora, portal, usuário, senha e requisitos para embarque.

Pendência típica: OL não criada, dados de agendamento incompletos ou transportadora não validada.

### E5 - Faturamento

Área: Faturamento.

Valida primeira NF fornecedor/cliente, observações fiscais, emissão/troca de documentos fiscais e divergências antes da conclusão.

Pendência típica: NF não recebida, NF não emitida, observação fiscal pendente ou divergência operacional.

### E6 - Concluído

Operação sem pendências bloqueantes, com evidências registradas e status final verde.

## Semáforo

- Verde: etapa atual OK e sem pendências bloqueantes.
- Amarelo: alerta, inconsistência não bloqueante ou exceção com impacto controlado.
- Vermelho: pendência bloqueante para avanço da operação.

## Exceções Parametrizáveis

- Exportação: pode dispensar Liberação de Embarque, conforme regra configurada.
- Transferência Porto Rio Grande: pode seguir direto para logística, conforme regra configurada.

As exceções não devem ser fixas em código. Devem ser mantidas em tabela de configuração com vigência, motivo, responsável e evidência.

## Auditoria

Cada transição deve registrar:

- OP e contratos afetados.
- Estado anterior e novo estado.
- Usuário ou job responsável.
- Data/hora.
- Evidência associada.
- Regra que motivou o status.