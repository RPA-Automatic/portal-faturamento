> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; consulte código e decisões no repositório canônico. Estado planejado não equivale a implantação.

> Fonte: `docs/product/market-benchmark.md`

# Referências de mercado — liberação e acompanhamento de embarques

> Status: Pesquisa para priorização, sem contratação ou homologação  
> Consultado em: 2026-09-13

Existem soluções com partes importantes desse processo. As fontes públicas não demonstram equivalência completa ao fluxo específico OP/compra/venda/Datasul do cliente. A comparação abaixo descreve capacidades publicadas pelos fornecedores, não resultados medidos por nós.

| Solução | Funcionalidades publicadas | Problema atendido | Aplicação ao Portal Faturamento |
|---|---|---|---|
| TOTVS Logística TMS / Portal Logístico | Gestão do transporte e documentos; regras de restrição de embarque; interação entre embarcador e transportadora | Evitar embarques fora das condições operacionais e reduzir informações dispersas | Checklist de bloqueios, documentos ligados à operação e visão por responsável; confirmar APIs e versão Datasul separadamente |
| SAP Transportation Management | Ordens e reservas de frete, origem/destino, datas, recursos, planejamento e integração com execução/documentos | Conectar planejamento e execução do transporte em registros rastreáveis | Separar OP, contratos, locais e movimentações; não reduzir várias OLs/entregas a um único campo |
| e2open Export Management | Verificações de exportação, classificação, restrições/licenças e documentos centralizados | Reduzir revisões manuais dispersas e riscos de conformidade na exportação | Regras versionadas, evidências e exceções com aprovação; não importar regras regulatórias estrangeiras para o motor fiscal brasileiro |

Fontes: [TOTVS — ficha técnica TMS](https://produtos.totvs.com/ficha-tecnica/tudo-sobre-o-totvs-logistica-tms/), [TOTVS — suíte logística e portal](https://www.totvs.com/logistica/), [SAP — Freight Order Management](https://help.sap.com/docs/SAP_TRANSPORTATION_MANAGEMENT/54cf405c9d9e4c96bf091967ea29d6a7/ff8bbbea9bd0421b9f833793d8d52b3d.html), [e2open — Export Management](https://www.e2open.com/global-trade/export-management).

## Prioridade para este produto

A inferência para nosso contexto é concentrar o portal na decisão de prontidão do embarque, com quatro perguntas: o que falta, quem resolve, qual o prazo e qual a evidência. Isso complementa o ERP existente.

1. **Agora:** Farol confiável, ficha da OP, vínculo múltiplo de contratos, histórico e versão documental. Schema e ficha de consulta entregues neste incremento; carga e validação operacional ainda pendentes.
2. **Próximas entregas:** reconciliação das fontes; aprovações por área; fila por prazo; tratamento de pendências; rastreabilidade do reprocessamento e atualidade das cargas.
3. **Após homologação:** notificações, recebimento de documentos, integrações diretas e agendamento. Priorizar interfaces oficiais e ações reversíveis.
4. **Fora do MVP:** roteirização, tarifação de frete, substituição de ERP/TMS, classificação fiscal automática e conformidade global completa.

Não foram pesquisados preços/licenças nem executadas demonstrações contratadas. A decisão de adquirir ou integrar uma solução exige análise específica de aderência, conectores Datasul e custo.



[Voltar ao produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)
