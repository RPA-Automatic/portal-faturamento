# Contexto do checklist fiscal e liberação de embarque

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: 2026-10-13  
> Documentos relacionados: [Fluxo operacional](operational-workflow.md), [Evidências e lacunas](../quality/source-review-2026-09-13.md), [Separação dos bancos](../operations/database-separation.md)

## Objetivo do produto

O Portal Faturamento Fiscal deve antecipar impedimentos ao embarque, centralizar o acompanhamento das operações e orientar cada área sobre a próxima ação. Uma operação precisa apresentar contratos associados, instruções fiscais, pendências, responsáveis, prazo e evidências. O checklist é a representação das verificações necessárias; o Farol resume seus resultados.

A unidade de acompanhamento é a OP, com detalhamento por contrato, documento e movimentação logística. A interface deve responder: o que falta para liberar, quem resolve, de qual fonte veio a informação e quando ela foi atualizada. A existência de um arquivo não comprova sua validade fiscal nem sua vinculação ao contrato correto.

## Processo observado e mudanças de responsabilidade

Os PDDs descrevem negociação, geração dos contratos no ERP, obtenção das instruções de compra e venda, validação fiscal, liberação, criação da OL e faturamento/troca de notas. As reuniões registram uma transição de atividades do Comercial para Faturamento, com apoio comercial. Portanto, a distribuição de tarefas deve ser configurável por operação/unidade e validada com os responsáveis; não fixada em nomes de pessoas.

O processo começa pelo monitoramento de negócios e prazos de entrega. Esperar um aviso informal de que o embarque começará perde a oportunidade de resolver pendências antecipadamente. Relatórios importados em momentos diferentes exigem indicação de data de extração e atualização; ausência em um relatório antigo não comprova inexistência da informação no ERP.

O fluxo E1–E6 permanece como visão macro existente. Há trabalho paralelo e dependências entre áreas. Em particular, a instrução pode precisar do destino antes de existir OL, enquanto a logística utiliza a instrução para criar a OL. A proposta é registrar o destino informado e sua evidência, e depois reconciliá-lo com a OL, evitando uma dependência circular de aprovação.

## Requisitos derivados das evidências

| ID | Requisito proposto | Evidência privada | Critério de aceite proposto |
|---|---|---|---|
| RF-01 | Descobrir contratos e acompanhar prazos antes do embarque | PDD-01, ENT-01, ENT-02, XLS-01–03 | Novos registros geram acompanhamento; a data de atualização permanece visível |
| RF-02 | Relacionar OP, compra e venda sem presumir um par único | PDD-01, XLS-01 | Uma OP comporta múltiplos contratos; vínculo inconclusivo gera pendência |
| RF-03 | Distinguir documento recebido, associado e validado | PDD-01, ENT-02, XLS-06–08 | Upload isolado não conclui validação fiscal |
| RF-04 | Conferir instruções, parceiro, filial e local de entrega | PDD-01, XLS-09 | Divergências exibem campo, fonte e responsável; CNPJ/IE não identificam sozinhos um contrato |
| RF-05 | Exibir quatro pré-requisitos operacionais de faturamento | ENT-02 | OP vinculada, OL, compra liberada e pedido aprovado são verificações independentes |
| RF-06 | Separar compra/venda, natureza de operação e CFOP | PDD-01, XLS-02–03, XLS-05 | Natureza interna do ERP não é tratada automaticamente como CFOP fiscal; regras dependem de validação especializada |
| RF-07 | Distinguir origem, entrega, transbordo e destino final | PDD-01, ENT-02, XLS-04 | O destino final pode diferir da entrega intermediária e permanece rastreável |
| RF-08 | Parametrizar frete, agendamento e documentos exigidos | ENT-01–02, XLS-06–08 | Cada cenário define responsáveis e requisitos; nenhuma senha fica em campos do checklist |
| RF-09 | Registrar exceções com escopo, vigência e aprovação | PDD-01 | Dispensa de liberação/troca não é aplicada a toda exportação por inferência |
| RF-10 | Priorizar pelo prazo documental e de embarque | XLS-06–08, ENT-01 | D-2 é uma premissa a validar por calendário, horário e unidade; não equivale automaticamente a 48 horas |
| RF-11 | Manter ficha operacional para conferências recorrentes | ENT-02, documentos operacionais | Resumo apresenta instruções aprovadas e versão, evitando redigitação de observações a cada nota |
| RF-12 | Distinguir liberação de embarque e encerramento da operação | ENT-01–02, relatórios de saldo | Primeira nota ou ausência de pendência não encerra automaticamente contrato com saldo/movimentação pendente |

As regras são requisitos candidatos, não legislação fiscal nem homologação de procedimentos. CFOP, NCM, retenções, classificação de produto e exceções exigem uma matriz aprovada pelo responsável fiscal. As transcrições descrevem casos concretos e contêm erros de reconhecimento; não sustentam regras universais.

## Fontes e limites

| Família | Informação observada | Limite relevante |
|---|---|---|
| ES4004 | OP, tipo de contrato, contrato, parceiro, filial, volumes e finalidade | Várias linhas podem pertencer à mesma OP; duas colunas possuem o rótulo Descrição |
| GG4164 | Compra, fornecedor, frete, safra, prazos, situação, volumes e assinatura | Campo Operação é descrição comercial; não é necessariamente o número da OP |
| GG2037 | Venda, pedido, natureza, frete, crédito, situação e vínculo de compra | Operação também pode ser uma descrição; não usar como chave numérica da OP |
| GPLP40180 | OL/rota, contrato, nota, origem, entrega, destino final, pesos e frete | O relatório tem grão de movimentação; várias linhas não significam várias OLs |
| Documentos fiscais | Emissão, parceiro, natureza, CFOP e valores tributários | Associação à OP pode exigir reconciliação; manter identificadores como texto |
| GG4084 | Parceiro, inscrições, UF, indicadores logísticos e grupo de imposto | O recorte não cobre todos os detalhes de endereço exigidos pelo PDD |
| Checklists regionais | Requisitos, responsáveis, prazos, status e observações | Layouts diferentes e preenchimento manual; não são prova automática de conformidade |
| Financeiro, estoque e fixações | Saldos, pagamentos, estoque e preço | Uso futuro condicionado a requisito; não ampliar o MVP para um ERP completo |

## Experiência e implementação incremental

1. Farol com filtros por OP, unidade, área, prazo e motivo de bloqueio, indicando a atualidade das fontes.
2. Página da OP com contratos, documentos, instruções aprovadas, logística, pendências e histórico.
3. Fila de reconciliação para documentos sem vínculo único e campos não disponíveis nos relatórios.
4. Motor de verificações determinísticas e parametrizadas, com revisão humana para divergências e validações fiscais.
5. Integrações de documentos e avisos, com idempotência, rastreabilidade e permissões próprias.
6. Automação de ações no ERP somente após mapear os contratos das integrações e homologar cada cenário.

Integrações antigas de captura comercial não são requisitos do checklist fiscal. O reaproveitamento permitido é de padrões de engenharia (autenticação, auditoria, idempotência e tratamento de falhas), reimplementados no contexto do produto. Nenhum código, endpoint, identidade visual ou informação privada de origem deve ser incorporado automaticamente.

## Lacunas de decisão

- Critério de início e término da OP, inclusive saldo, cancelamento, entrega parcial e troca de notas.
- Matriz de aprovação fiscal por cenário; precedência entre relatório, documento e decisão humana.
- Calendário e gatilho do SLA documental; regras específicas de agendamento.
- Chave composta e cardinalidade OP–contrato–item–filial, testadas em todos os relatórios.
- Fonte autorizada para destino final antes da criação da OL.
- Responsabilidade de Comercial/Faturamento por unidade e acesso de parceiros externos.
- Reprocessamento de um documento corrigido: quais aprovações devem voltar a ficar pendentes.

O schema existente é uma base técnica. A leitura do acervo não prova que todas essas capacidades já estejam implementadas.
