> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; a reorganização documental local ainda aguarda commit/PR no GitHub. Estado planejado não equivale a implantação.

> Fonte: `docs/product/delivery-plan.md`

# Plano de entrega — quatro sprints

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: a cada sprint  
> Documentos relacionados: [Catálogo documental](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)

## Compromisso e premissas

Plano proposto para entregar o MVP do Farol de Liberação de Embarque. O escopo contempla requisitos, implementação, integração, testes, homologação, produção, operação assistida e encerramento da implantação. Não equivale a garantia de prazo: são quatro sprints de duas semanas (oito semanas), conforme definido pelo usuário. Capacidade da equipe, data de início, calendário do cliente e janela de assistência precisam ser acordados. Datas e horas não foram inventadas.

Um épico por produto no projeto Azure DevOps **RPA Automatic**. Este plano pertence ao épico **#26 — Portal de Faturamento**. Hierarquia Agile: Epic → Feature → User Story (entrega) → Task. Cada User Story pertence à sprint planejada; dependências entre User Stories condicionam o início. Tarefas dentro de uma entrega podem ocorrer em paralelo quando viável. A sprint do card representa alocação planejada, não conclusão.

As atividades já realizadas são insumos: documentação organizada, levantamento do acervo, Farol inicial, scripts e correção local de compras. A homologação e publicação desses insumos ainda precisam de evidência. Não marcar essas entregas completas apenas porque existe código.

## Escopo de MVP e limites

Inclui Farol por OP; detalhe com contratos, documentos, logística, pendências e histórico; tratamento por área; cinco relatórios TOTVS; reconciliação; regras E1–E6 aprovadas; autenticação/permissões; rastreabilidade; implantação e suporte inicial.

Ficam para evolução: integração direta com ERP, captura automática SharePoint, executor RPA, alterações automáticas no TOTVS, BI avançado e IA para decisões fiscais. A rotina inicial de cargas deve usar o mecanismo mais simples aprovado, com monitoramento e reprocessamento.

## Marcos e gates

| Sprint | Resultado esperado | Critério de saída |
|---|---|---|
| 1 | Requisitos e fundação confiável | Escopo e regras críticas aceitos; DEV exclusivo funcional; cargas reconciliadas; CI e testes básicos executados |
| 2 | Jornada operacional utilizável | Farol, detalhe e tratamento de pendências/documentos demonstrados com permissões e evidências em DEV |
| 3 | MVP integrado e candidato de release | Ingestão e regras integradas; testes críticos aprovados; pré-homologação concluída; bloqueadores resolvidos |
| 4 | Produção estável e implantação aceita | Homologação formal; go-live aprovado; smoke tests; operação assistida e transferência aceitas |

Se homologação, acessos ou estabilidade atrasarem, a operação assistida e o encerramento se estendem: não reduzir os gates para caber artificialmente na quarta sprint.

## Definition of Ready

Objetivo, requisito, critério de aceite e dependências conhecidos; dados de teste autorizados; acesso ao ambiente disponível; owner operacional confirmado. Decisões fiscais pendentes bloqueiam automação das respectivas regras.

## Definition of Done

Mudança revisada, testes relevantes aprovados, evidências anexadas/ligadas ao card, documentação atualizada, permissões conferidas e validação no ambiente da entrega concluída. Deploy de produção exige aceites e rollback. Conclusão da implantação exige aceite final e transferência operacional. Documento gerado não é aprovação do negócio.

## Planejamento detalhado

### Sprint 1

#### PF-F01 — Requisitos e critérios de liberação

Dependências: sem dependência interna; requer disponibilidade dos envolvidos e acessos pertinentes.

- **PF-F01-T01 — Consolidar escopo do MVP e atores por área**. Aceite: Relacionar Comercial, Fiscal, Contratos, Logística, Faturamento e Gestão; registrar escopo incluído/excluído e validar com o dono do produto.
- **PF-F01-T02 — Mapear cenários e regras a partir do acervo privado**. Aceite: Matriz RF-01 a RF-12 rastreada a referências neutras; contemplar múltiplos contratos, entregas parciais, cancelamento, exportação e exceções sem publicar dados reais.
- **PF-F01-T03 — Definir liberação, encerramento, responsabilidades e SLA**. Aceite: Registrar aprovação humana dos critérios de início/fim da OP, precedência OL/liberação, calendário D-2, matriz de responsabilidade e revalidação após correção documental.
- **PF-F01-T04 — Revisar jornada e aprovar critérios do MVP**. Aceite: Jornada Farol → detalhe OP → pendência → evidência validada com usuários; critérios de aceite por cenário registrados e decisões pendentes identificadas.

#### PF-F02 — Ambientes exclusivos e recuperação de dados

Dependências: sem dependência interna; requer disponibilidade dos envolvidos e acessos pertinentes.

- **PF-F02-T01 — Provisionar e registrar o DEV fiscal exclusivo**. Aceite: Destino DEV próprio registrado em supabase/targets.json; PROD permanece identificado separadamente; custos e permissões necessários tratados antes do provisionamento.
- **PF-F02-T02 — Revisar migrations, grants e RLS em DEV**. Aceite: As sete migrations existentes revisadas e aplicadas em DEV; acessos permitidos e negados testados por perfil, inclusive usuário externo; nenhuma alteração indevida em PROD.
- **PF-F02-T03 — Reprocessar cargas no destino fiscal e conferir vínculos**. Aceite: Backup e restauração verificados antes da transferência; mapeamento corrigido de compra usado; contagens, hashes, chaves e vínculos reconciliados; origem preservada até aceite.
- **PF-F02-T04 — Configurar autenticação e variáveis por ambiente**. Aceite: Login e logout dos fluxos aprovados funcionam em DEV; redirects e configuração pública apontam ao destino correto; segredos ausentes do bundle e Git.

#### PF-F03 — Base de desenvolvimento e qualidade

Dependências: sem dependência interna; requer disponibilidade dos envolvidos e acessos pertinentes.

- **PF-F03-T01 — Reconciliar branches e preparar dependências reproduzíveis**. Aceite: Divergência dev/main analisada; PR de reconciliação preserva alterações legítimas; lockfile e runtime definidos; atualizações de dependências validadas sem promoção prematura.
- **PF-F03-T02 — Implantar CI de frontend, importadores e documentação**. Aceite: PR executa typecheck, build, testes Python relevantes e verificação de links; pipeline bloqueia falha; execução remota comprovada, não apenas arquivo YAML criado.
- **PF-F03-T03 — Preparar fixtures sintéticas e ambiente de testes**. Aceite: Cenários verde, amarelo, vermelho, OP multicontrato, vínculo ambíguo e perfis distintos reproduzíveis; nenhum dado privado versionado.
- **PF-F03-T04 — Definir plano de testes e roteiro de homologação**. Aceite: Casos funcionais, permissões, importação repetida, falhas, acessibilidade e regressão mapeados aos requisitos; usuários homologadores e metas de volume/desempenho a confirmar.

### Sprint 2

#### PF-F04 — Farol operacional utilizável

Dependências: PF-F01, PF-F02, PF-F03.

- **PF-F04-T01 — Organizar frontend e navegação do domínio fiscal**. Aceite: Farol, detalhe e pendências navegáveis; componentes de outros domínios não aparecem nas jornadas; comportamento atual preservado.
- **PF-F04-T02 — Implementar filtros e prioridade operacional**. Aceite: Buscar OP, etapa, semáforo, unidade, área e prazo conforme dados homologados; filtros combinados e limpeza funcionam; não inferir datas ausentes.
- **PF-F04-T03 — Exibir atualização das fontes e motivos de bloqueio**. Aceite: OP informa fonte/data de atualização e bloqueios relevantes; ausência ou desatualização não aparece como verde automático.
- **PF-F04-T04 — Validar responsividade, acessibilidade e falhas do Farol**. Aceite: Uso por teclado, foco, contraste, carregamento, vazio, erro e tentativa novamente verificados; lista suporta paginação ou limite explícito sem ocultar OPs silenciosamente.

#### PF-F05 — Detalhe completo da operação

Dependências: PF-F01, PF-F02, PF-F03.

- **PF-F05-T01 — Implementar resumo da OP e contratos vinculados**. Aceite: Compra e venda separadas, múltiplos vínculos suportados; totais e chaves conferidos; OP inexistente ou sem acesso tratada.
- **PF-F05-T02 — Exibir logística, notas e instruções da OP**. Aceite: OL, origem, entrega e destino final distintos; documentos fiscais e instruções associados com estado conhecido; lacunas explícitas.
- **PF-F05-T03 — Exibir pendências, evidências e histórico**. Aceite: Cada impedimento informa área, severidade, regra, fonte e evidência; histórico ordenado mostra autor e momento sem expor segredos.
- **PF-F05-T04 — Testar drill-down e isolamento de acesso**. Aceite: Cenários multicontrato, sem documentos, vínculo ambíguo e acesso negado passam em DEV; navegação mantém contexto do Farol.

#### PF-F06 — Tratamento de documentos e pendências

Dependências: PF-F01, PF-F02, PF-F03.

- **PF-F06-T01 — Implementar recebimento e associação de documentos**. Aceite: Upload validado por tipo/tamanho; vínculo à OP/contrato confirmado; recebido, associado e validado são estados distintos; acesso ao arquivo é autorizado.
- **PF-F06-T02 — Implementar ações de pendência por área**. Aceite: Usuário autorizado assume/resolve/reabre com justificativa; concorrência tratada; usuário sem permissão é negado no backend.
- **PF-F06-T03 — Registrar auditoria e revalidação documental**. Aceite: Correção de documento preserva versão/evidência anterior e reabre verificações afetadas conforme regra aprovada; histórico não é sobrescrito.
- **PF-F06-T04 — Validar fluxo operacional ponta a ponta em DEV**. Aceite: Usuário encontra bloqueio, anexa evidência, resolve com permissão e vê o resultado; ações inválidas e falhas de rede não produzem falso sucesso.

### Sprint 3

#### PF-F07 — Ingestão TOTVS e reconciliação

Dependências: PF-F02, PF-F03, PF-F05.

- **PF-F07-T01 — Consolidar importação dos cinco relatórios principais**. Aceite: ES4004, GG4164, GG2037, GPLP e Documentos Fiscais normalizados com contrato de layout; identificadores textuais e zeros preservados; fórmulas arbitrárias não executadas.
- **PF-F07-T02 — Garantir idempotência e rastreabilidade da carga**. Aceite: Repetir arquivo não duplica entidades; arquivo/aba/coluna, assinatura, extração, execução e erros registrados; reprocessamento recupera falha parcial.
- **PF-F07-T03 — Implementar reconciliação de vínculos ambíguos**. Aceite: OP/contrato/item/filial com cardinalidade homologada; casos sem vínculo único entram em fila visível e exigem decisão rastreável.
- **PF-F07-T04 — Validar resultados e atualização no Farol**. Aceite: Contagens e campos comparados à fonte em ambiente controlado; importação repetida, layout inválido e arquivo defasado testados; atualização refletida na UI.

#### PF-F08 — Motor de verificações E1 a E6

Dependências: PF-F01, PF-F06, PF-F07.

- **PF-F08-T01 — Implementar verificações aprovadas e semáforo**. Aceite: Consolidação considera pior estado entre contratos e bloqueios; ausência de evidência gera pendência adequada; matriz fiscal aprovada é a única base de regra fiscal.
- **PF-F08-T02 — Parametrizar exceções, responsáveis e prazo**. Aceite: Exceção guarda escopo, vigência, motivo, responsável e evidência; SLA segue calendário aprovado; exportação não recebe dispensa universal.
- **PF-F08-T03 — Controlar transições, reprocessamento e conclusão**. Aceite: Cada transição registra antes/depois, regra, autor/job e evidência; liberação e encerramento separados; saldo ou movimentação pendente impede encerramento indevido.
- **PF-F08-T04 — Testar regras críticas e regressão de estados**. Aceite: Cenários completos/incompletos, múltiplos contratos, exceção vencida, documento corrigido e entrega parcial passam; execução repetida mantém resultado e auditoria coerentes.

#### PF-F09 — Qualidade integrada e candidato à homologação

Dependências: PF-F04, PF-F05, PF-F06, PF-F07, PF-F08.

- **PF-F09-T01 — Executar testes integrados e de permissões**. Aceite: Fluxo importação → regra → Farol → ação humana testado; isolamento por perfil e área validado; todos os defeitos classificados e rastreados.
- **PF-F09-T02 — Avaliar desempenho, acessibilidade e recuperação**. Aceite: Volume representativo acordado, tempos medidos e gargalos tratados; timeout, rede indisponível e restauração ensaiados sem acesso indevido a PROD.
- **PF-F09-T03 — Executar pré-homologação com usuários-chave**. Aceite: Roteiro dos cenários críticos executado em DEV/preview com evidências; dados preparados de forma autorizada; dúvidas de regra resolvidas com responsáveis.
- **PF-F09-T04 — Corrigir bloqueadores e congelar candidato de release**. Aceite: Defeitos críticos corrigidos e retestados; versão identificada, migrations listadas, limitações conhecidas e checklist de entrada em homologação completos.

### Sprint 4

#### PF-F10 — Homologação formal e preparação operacional

Dependências: PF-F09.

- **PF-F10-T01 — Executar homologação com todas as áreas**. Aceite: Casos aprovados executados por Comercial, Fiscal, Logística e Faturamento; resultado, evidência e responsável registrados por cenário.
- **PF-F10-T02 — Tratar defeitos e obter aceite de negócio**. Aceite: Bloqueadores resolvidos e retestados; exceções aceitas formalmente; aceite do dono do produto e responsável fiscal registrado, sem aprovação inferida.
- **PF-F10-T03 — Treinar usuários e preparar suporte**. Aceite: Guia de operação, tratamento de pendências e treinamento disponibilizados; responsáveis de suporte e escalonamento confirmados.
- **PF-F10-T04 — Revisar plano de implantação e rollback**. Aceite: Janela, responsável, backup, restauração, sequência de migrations/deploy, smoke test e gatilhos de rollback registrados e ensaiados antes da decisão de go-live.

#### PF-F11 — Implantação em produção

Dependências: PF-F10.

- **PF-F11-T01 — Executar checklist e decisão de go-live**. Aceite: Aceites, backup/restauração, acessos, variáveis, limites e evidências de testes conferidos; decisão humana e janela registradas; sem bloqueador aberto.
- **PF-F11-T02 — Aplicar migrations e publicar versão aprovada**. Aceite: Mesmas migrations validadas em DEV aplicadas em PROD; release/commit identificados; frontend publicado com destino correto e plano de reversão disponível.
- **PF-F11-T03 — Validar smoke test e carga inicial de produção**. Aceite: Login, permissões, Farol, detalhe, documento e pendência verificados em PROD; carga autorizada conciliada; falha crítica aciona plano de rollback.
- **PF-F11-T04 — Ativar monitoramento e rotina de cargas**. Aceite: Frequência acordada, alertas e responsáveis operacionais configurados; falha simulada gera alerta verificável; logs e métricas não expõem dados privados.

#### PF-F12 — Operação assistida e encerramento da implantação

Dependências: PF-F11.

- **PF-F12-T01 — Acompanhar ciclos reais durante operação assistida**. Aceite: Janela de assistência acordada, atendimentos registrados e ciclos reais de importação/liberação acompanhados; abrangência e duração documentadas.
- **PF-F12-T02 — Corrigir incidentes e estabilizar operação**. Aceite: Incidentes classificados, corrigidos e retestados; nenhuma ocorrência crítica aberta no encerramento; melhorias não bloqueantes seguem backlog.
- **PF-F12-T03 — Transferir operação e concluir documentação as-built**. Aceite: Runbooks, acessos responsáveis, inventário, arquitetura efetiva, release, backup, treinamento e evidências entregues ao suporte com aceite.
- **PF-F12-T04 — Formalizar encerramento e próximos incrementos**. Aceite: Aceite final da implantação registrado; critérios de estabilidade atendidos; pendências residuais têm owner/prioridade; retrospectiva e evolução futura registradas.

## Riscos, decisões e acompanhamento

| Risco/dependência | Tratamento | Papel a confirmar |
|---|---|---|
| DEV fiscal ainda indisponível | Resolver na sprint 1; não usar banco de outro produto | DevOps / administrador |
| Critérios fiscais e OL/liberação indefinidos | Matriz de decisão validada antes do motor | Fiscal / negócio |
| Dados misturados e erro de compra na origem | Backup, reprocessamento e conciliação; remover origem só após aceite | Dados / DevOps |
| Branches divergentes e dependências antigas | Revisão de diferenças, CI e regressão antes de promoção | Desenvolvimento |
| Homologadores indisponíveis | Reservar agenda nas sprints 1 e 3 | Dono do produto |
| Escopo superior à capacidade | Priorizar MVP, dividir tarefas e negociar extensão sem eliminar testes | Dono do produto / equipe |
| Assistência insuficiente para ciclos reais | Definir duração e metas na preparação operacional; estender se necessário | Operação / suporte |

Planning confirma capacidade e seleção; acompanhamento registra bloqueios e evidências; review demonstra o incremento; retrospectiva ajusta o processo. Não há responsáveis individuais, horas, datas de entrega nem percentual de conclusão presumidos.

Indicadores: tarefas aceitas, bloqueadores por idade/severidade, falhas de importação, taxa de vínculo, cobertura dos cenários críticos, incidentes em produção e completude das evidências. Metas de desempenho, disponibilidade e estabilidade devem ser acordadas com o cliente.

A fonte estruturada de provisionamento é `azure-devops/backlog.json`. Depois da criação dos cards, o Azure Boards controla seu estado; republicação de documentação não redefine status, responsável ou datas.


## Consultas de acompanhamento

- [00 - Backlog completo](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/d8b71d2e-7433-49f0-b360-80aae00e25ef)
- [01 - Sprint 1](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/85d9214d-c005-4874-b3a6-4250640574f8)
- [02 - Sprint 2](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/8f703990-a2b3-46ac-9bd8-bced80fc9329)
- [03 - Sprint 3](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/48c04abc-62b1-4559-afbb-8c555f794351)
- [04 - Sprint 4](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_queries/query/d24a1277-cd63-427c-86fd-0d3ff4d807dc)

## Cards criados no Azure Boards

Estado atual deve ser consultado no card; esta lista contém os identificadores de criação.

| Chave | Card |
|---|---|
| PF-F01 | [#27](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/27) |
| PF-F01-T01 | [#28](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/28) |
| PF-F01-T02 | [#29](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/29) |
| PF-F01-T03 | [#30](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/30) |
| PF-F01-T04 | [#31](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/31) |
| PF-F02 | [#32](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/32) |
| PF-F02-T01 | [#33](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/33) |
| PF-F02-T02 | [#34](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/34) |
| PF-F02-T03 | [#35](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/35) |
| PF-F02-T04 | [#36](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/36) |
| PF-F03 | [#37](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/37) |
| PF-F03-T01 | [#38](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/38) |
| PF-F03-T02 | [#39](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/39) |
| PF-F03-T03 | [#40](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/40) |
| PF-F03-T04 | [#41](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/41) |
| PF-F04 | [#42](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/42) |
| PF-F04-T01 | [#43](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/43) |
| PF-F04-T02 | [#44](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/44) |
| PF-F04-T03 | [#45](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/45) |
| PF-F04-T04 | [#46](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/46) |
| PF-F05 | [#47](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/47) |
| PF-F05-T01 | [#48](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/48) |
| PF-F05-T02 | [#49](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/49) |
| PF-F05-T03 | [#50](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/50) |
| PF-F05-T04 | [#51](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/51) |
| PF-F06 | [#52](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/52) |
| PF-F06-T01 | [#53](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/53) |
| PF-F06-T02 | [#54](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/54) |
| PF-F06-T03 | [#55](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/55) |
| PF-F06-T04 | [#56](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/56) |
| PF-F07 | [#57](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/57) |
| PF-F07-T01 | [#58](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/58) |
| PF-F07-T02 | [#59](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/59) |
| PF-F07-T03 | [#60](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/60) |
| PF-F07-T04 | [#61](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/61) |
| PF-F08 | [#62](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/62) |
| PF-F08-T01 | [#63](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/63) |
| PF-F08-T02 | [#64](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/64) |
| PF-F08-T03 | [#65](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/65) |
| PF-F08-T04 | [#66](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/66) |
| PF-F09 | [#67](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/67) |
| PF-F09-T01 | [#68](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/68) |
| PF-F09-T02 | [#69](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/69) |
| PF-F09-T03 | [#70](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/70) |
| PF-F09-T04 | [#71](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/71) |
| PF-F10 | [#72](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/72) |
| PF-F10-T01 | [#73](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/73) |
| PF-F10-T02 | [#74](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/74) |
| PF-F10-T03 | [#75](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/75) |
| PF-F10-T04 | [#76](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/76) |
| PF-F11 | [#77](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/77) |
| PF-F11-T01 | [#78](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/78) |
| PF-F11-T02 | [#79](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/79) |
| PF-F11-T03 | [#80](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/80) |
| PF-F11-T04 | [#81](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/81) |
| PF-F12 | [#82](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/82) |
| PF-F12-T01 | [#83](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/83) |
| PF-F12-T02 | [#84](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/84) |
| PF-F12-T03 | [#85](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/85) |
| PF-F12-T04 | [#86](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_workitems/edit/86) |

[Voltar ao produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)
