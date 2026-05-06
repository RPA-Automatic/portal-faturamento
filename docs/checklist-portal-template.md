# Template do Portal de Checklist Operacional

## Objetivo

Substituir os checklists em XLSX por um portal operacional por OP, onde Comercial, Fiscal, Logistica e Faturamento trabalham em uma unica fila Kanban E1..E6, com regras, evidencias, responsaveis e historico.

O XLSX deve ser tratado como fonte de regras e amostra historica, nao como tela final. No portal, cada campo vira uma pergunta controlada, uma regra automatica ou uma evidencia pendente.

## Visao Recomendada

A primeira tela deve continuar sendo o Kanban por etapa, mas cada cartao precisa mostrar as informacoes essenciais da operacao:

| Bloco | Campos principais |
|---|---|
| Identificacao | OP, grao/produto, safra, status, etapa, semaforo |
| Contratos | contrato compra, fornecedor, contrato venda, cliente |
| Datas | data prevista Datasul, inicio embarque, fim embarque, aging da pendencia |
| Volumes | peso/quantidade contrato, entregue, a entregar, fiscal |
| Fiscal | CFOP in, CFOP out, primeira NF, observacoes de NF |
| Logistica | necessita agendamento, OL criada, origem, destino, destino final |
| Responsabilidade | area dona da pendencia, responsavel, proxima acao |

Ao clicar no cartao, abrir um painel lateral de detalhe da OP com abas:

1. Resumo
2. Checklist
3. Contratos
4. Logistica
5. Fiscal/NF
6. Documentos
7. Historico

## Template Visual Sugerido

### Kanban Executivo

Colunas fixas:

| Etapa | Nome | Dono principal | Objetivo |
|---|---|---|---|
| E1 | Documentacao Basica | Comercial/Faturamento | Garantir instrucoes fiscais e documentos iniciais |
| E2 | Validacao Fiscal | Fiscal | Validar CFOP, cadastros, regras fiscais e NF inicial |
| E3 | Contratos e Regras TOTVS | Comercial/Gestao de Contratos | Garantir contratos, pedido e regras Datasul |
| E4 | Logistica | Logistica | Garantir OL, agendamento, origem/destino e acesso a portais |
| E5 | Faturamento | Faturamento | Conferir NF, observacoes, liberacao e dados adicionais |
| E6 | Concluido | Todas | Sem pendencias bloqueantes |

Cada cartao deve ter no maximo informacao para decisao rapida:

- OP + produto/safra
- fornecedor -> cliente
- contrato compra / contrato venda
- periodo de embarque
- quantidade/peso
- chips: Fiscal, Logistica, Faturamento, Comercial
- pendencias bloqueantes e alertas

### Painel Lateral da OP

O detalhe deve ser orientado a acao, com uma linha por item de checklist:

| Campo | UI recomendada | Estado |
|---|---|---|
| `I.F. Compra ?` | toggle Sim/Nao/N/A + anexo | bloqueia E1 se vazio ou Nao |
| `I.F. Venda ?` | toggle Sim/Nao/N/A + anexo | bloqueia E1 se vazio ou Nao |
| `Necessita Agendamento ?` | toggle Sim/Nao | se Sim, exige dados logisticos |
| `I.F Compra Validada Fiscal` | aprovacao Fiscal | bloqueia E2 se nao validado |
| `Validar Primeira NF Fornecedor/Cliente` | checklist + link NF | bloqueia E5 quando aplicavel |
| `Criar Regras no Datasul` | toggle + responsavel | bloqueia E3 se vazio ou Nao |
| `OL Criada ?` | toggle + numero OL | bloqueia E4 se vazio ou Nao |
| `CFOP in` | input/valor vindo de NF | alerta/bloqueio se vazio ou inconsistente |
| `CFOP out` | input/valor vindo de NF | alerta/bloqueio se vazio ou inconsistente |
| `Cadastro Local de entrega` | toggle + codigo cadastro | bloqueia E2/E4 conforme regra |
| `Validar Cadastros CLI XFOR` | aprovacao Fiscal/Cadastro | bloqueia E2 se Nao |
| `OBS NF Dados Adicionais` | campo texto obrigatorio condicional | alerta se vazio quando regra exigir |
| `Pedido Liberado ?` | toggle + fonte GG1001/GG1090 | bloqueia E3 se Nao |
| `Consulta Site Monsanto` | toggle/N.A. | etapa Comercial/Logistica conforme produto |
| `Status Movimento` | status controlado | alimenta semaforo |
| `email do cliente para relatorios` | input email | alerta se vazio quando relatorio for obrigatorio |

## Modelo de Regras

Boa pratica: separar definicao da regra, resposta da area e pendencia gerada.

O schema atual ja possui `rules`, `pending_items` e `evidence`. Recomenda-se adicionar uma camada especifica de checklist:

### `checklist_templates`

Define os checklists por versao, UF, produto ou tipo de operacao.

Campos sugeridos:

- `id`
- `code` (`CHECKLIST_RS_SOJA`, `CHECKLIST_MT_SOJA`, `PRE_FATURAMENTO_BIOND`)
- `name`
- `scope_state` (`RS`, `MT`, null)
- `product_code` ou `product_name`
- `active`
- `version`

### `checklist_items`

Define cada pergunta/campo do checklist.

Campos sugeridos:

- `id`
- `template_id`
- `rule_id`
- `field_key`
- `label`
- `stage` (`E1`..`E6`)
- `owner_area`
- `input_type` (`boolean`, `tri_state`, `text`, `email`, `date`, `number`, `select`)
- `required_when`
- `blocks_stage`
- `sort_order`
- `help_text`

### `operation_checklist_answers`

Guarda a resposta real por OP.

Campos sugeridos:

- `operation_id`
- `checklist_item_id`
- `answer_value`
- `answer_status` (`vazio`, `sim`, `nao`, `na`, `validado`)
- `notes`
- `document_id`
- `answered_by`
- `answered_at`
- `updated_at`

Com isso, o portal consegue mostrar o checklist, controlar permissao por area e recalcular pendencias sem depender de colunas fixas no frontend.

## Mapeamento Inicial dos Campos

| Campo do XLSX | Area | Etapa | Regra inicial |
|---|---|---|---|
| I.F. Compra ? | Comercial | E1 | deve ser Sim ou N/A para avancar |
| I.F. Venda ? | Comercial | E1 | deve ser Sim ou N/A para avancar |
| I.F Compra Validada Fiscal | Fiscal | E2 | deve ser validado pelo Fiscal |
| CFOP in | Fiscal | E2 | obrigatorio quando houver NF de entrada |
| CFOP out | Fiscal | E2 | obrigatorio quando houver NF de saida |
| Cadastro Local de entrega | Fiscal/Logistica | E2 | obrigatorio quando destino/local entrega for usado |
| Validar Cadastros CLI XFOR | Fiscal/Cadastro | E2 | deve estar validado antes de faturar |
| Criar Regras no Datasul | Gestao de Contratos | E3 | deve ser Sim antes de seguir para logistica |
| Pedido Liberado ? | Comercial/Gestao de Contratos | E3 | deve ser Sim antes do faturamento |
| Necessita Agendamento ? | Logistica | E4 | se Sim, exige dados de agenda/portal |
| OL Criada ? | Logistica | E4 | deve ser Sim ou possuir OL importada |
| Consulta Site Monsanto | Logistica/Comercial | E4 | obrigatoria quando produto/regra exigir |
| Validar Primeira NF Fornecedor/Cliente | Faturamento | E5 | deve ser validado quando houver primeira NF |
| OBS NF Dados Adicionais | Faturamento | E5 | obrigatoria quando houver observacao fiscal |
| email do cliente para relatorios | Faturamento/Comercial | E5 | alerta se vazio quando relatorio for requerido |
| Status Movimento | Faturamento | E5/E6 | conclui ou abre pendencia conforme status |

## Regras de Semaforo

- Vermelho: existe item obrigatorio da etapa atual vazio ou marcado como Nao.
- Amarelo: existe item recomendado vazio, observacao pendente ou divergencia nao bloqueante.
- Verde: todos os itens obrigatorios da etapa estao Sim, Validado ou N/A.

A OP sempre deve ficar na primeira etapa com pendencia bloqueante. Se nao houver bloqueios nem alertas, vai para E6.

## Permissoes por Area

| Area | Pode editar |
|---|---|
| Comercial | IF compra/venda, pedido, cliente, email, observacoes comerciais |
| Fiscal | CFOP, validacao fiscal, cadastros, primeira NF fiscal |
| Gestao de Contratos | regras Datasul, contrato compra/venda, pedido liberado |
| Logistica | agendamento, OL, origem/destino, portal, usuario, senha |
| Faturamento | NF, dados adicionais, status movimento, conclusao fiscal-operacional |
| Administracao | templates, regras, excecoes e usuarios |

## Proxima Implementacao Recomendada

1. Criar migration com `checklist_templates`, `checklist_items` e `operation_checklist_answers`.
2. Criar script para importar os tres XLSX de checklist como templates e respostas historicas.
3. Criar funcao de consolidacao staging -> `operations`, `contracts`, `partners`, `logistics_orders`, `fiscal_documents`.
4. Criar funcao de regras que gera/resolve `pending_items` a partir das respostas do checklist.
5. Evoluir o frontend com painel lateral de OP e aba `Checklist`.
6. Depois, substituir o preenchimento em XLSX pelo preenchimento diretamente no portal.