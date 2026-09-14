# Cobertura das fontes históricas no modelo fiscal

> Status: Implementado e validado; carga operacional pendente  
> Responsável: @RodrigoFreitas16n91  
> Última revisão: 2026-09-13  
> Documentos relacionados: [Esquema fiscal](fiscal-schema.md), [Revisão privada](../quality/source-review-2026-09-13.md), [ADR-0003](../decisions/ADR-0003-dossie-documental-e-fontes.md)

## Escopo

O acervo privado foi deduplicado por SHA-256. Foram examinadas 68 fontes funcionais distintas: 17 XLSX, 20 DOCX, 21 PDF, 7 DOC, 2 EML e 1 MSG. Cópias idênticas, resultados da própria análise e repositórios históricos empacotados não contam como fonte funcional.

O relatório individual fica em `docs/docs_antigos/_analise_privada_2026-09-13/legacy-source-coverage.json`, fora do Git. Cada linha contém somente identificador neutro, extensão, papel, método de leitura, campos detectados e tabelas de destino. A documentação pública não replica nomes, números ou conteúdo real.

## Matriz de cobertura

| Família | Fontes distintas | Informação aproveitada | Destino no banco |
|---|---:|---|---|
| Relatórios de operação | 1 | OP, contratos, volumes, produto, filial, situação | staging tipado + `source_records` + `operations` |
| Relatórios de contratos | 2 | compra/venda, partes, prazos, produto, frete, quantidade | staging tipado + `source_records` + `contracts` |
| Relatório logístico | 1 | OL/rota, notas, origem, entrega, destino final, pesos e frete | staging tipado + `source_records` + `logistics_orders` |
| Relatório fiscal | 1 | nota, série, natureza, CFOP, emissão e valores | staging tipado + `source_records` + `fiscal_documents` |
| Cadastro de parceiros | 1 | identificadores, inscrições, localidade e indicadores fiscais/logísticos | `source_records` + `partners` + reconciliação |
| Relatório de estoque | 1 | depósito, item, documentos, quantidade, peso e qualidade | `source_records` + `operation_inventory_checks` |
| Relatórios financeiros | 7 | títulos, saldo, vencimento, crédito, adiantamento, previsão e fixação | `source_records` + `operation_financial_checks` |
| Checklists | 3 | perguntas, área, etapa, status, prazos e observações | `checklist_templates`, `checklist_items`, `operation_checklist_answers` |
| Autorizações de transferência | 6 | partes, emissão, quantidade/unidade, produto, identificadores e assinatura | catálogo, documento, versão, extração, revisão e requisito da OP |
| Instruções fiscais | 10 | contrato, produto, natureza, CFOP, locais, frete e condições | catálogo, vínculos N:N, extração, revisão e requisito da OP |
| Instrução de embarque | 1 | quantidade, janela, entrega, destino e condições logísticas | dossiê, campos extraídos e vínculo com OL/contratos |
| Liberações de embarque | 6 | OP, contratos, quantidade, partes, locais e decisão | dossiê e evidência do marco de liberação |
| Notas fiscais | 5 | número/série, emissão, CFOP, NCM, quantidade e dados adicionais | documento + `fiscal_documents` + vínculo N:N |
| Procedimentos fiscais | 4 | natureza, CFOP, dados adicionais e cenário | dossiê e revisão fiscal |
| Orientação de emissão | 1 | condições de emissão/troca e referência contratual | dossiê e revisão fiscal |
| Confirmações comerciais | 2 | condições, referência e comunicação | documento e vínculo com contratos |
| Instrução de descarga | 1 | terminal, descarga e agendamento | documento e vínculo com logística |
| Manual de agendamento | 1 | referência do portal e procedimento, sem credenciais | documento de apoio logístico |
| Comunicações EML/MSG | 3 | assunto, data, envio, retorno, divergência ou aceite | evidência de comunicação e revisão |
| Referências de processo | 6 | fluxo, papéis, perguntas e requisitos candidatos | documentação, templates em rascunho e regras a homologar |
| Outros documentos de apoio | 5 | condições contratuais/fiscais complementares | `documents`, extração e reconciliação de tipo |

Uma mesma fonte pode sustentar mais de uma entidade. A soma da tabela por papéis primários permanece 68; informações secundárias aparecem nos campos detectados do relatório privado.

## Dossiê base

A migration cria um conjunto `BASE_DOSSIE_EMBARQUE` em rascunho, com 12 requisitos candidatos: instruções de compra e venda, autorização, confirmação, procedimento/orientação fiscal, instrução e liberação de embarque, descarga, agendamento, comunicação e nota fiscal. Ele não é aplicado automaticamente a OPs enquanto o responsável de negócio não aprovar escopo e condições.

Os três formatos de checklist também são registrados como templates em rascunho. O template geral contém 15 verificações observadas, distribuídas entre E1 e E5. Status, áreas e bloqueios precisam ser homologados antes de gerar pendências automáticas.

## Sequência segura de carga

1. Importar relatórios e checklists para staging, preservando hash, aba, linha e conteúdo bruto.
2. Consolidar OP, contratos, parceiros, fiscal e logística; enviar ambiguidades à reconciliação.
3. Inventariar e subir os arquivos no bucket privado, criando `documents` e `document_versions`.
4. Extrair somente campos catalogados, registrando página/referência e confiança.
5. Associar documentos a todas as entidades aplicáveis e revisar os campos críticos.
6. Instanciar o conjunto documental aprovado para cada OP e calcular pendências.

Os arquivos reais ainda não são carregados automaticamente no banco: o remoto não possui OPs consolidadas às quais vinculá-los. Registrar documentos órfãos ou expor caminhos privados reduziria a qualidade e a segurança da implantação.

O importador foi validado sobre as 17 planilhas: 20.587 linhas não vazias podem entrar em `source_records`, e 2.959 registros das cinco fontes centrais também passam pelo staging tipado. A execução remota da carga permanece uma ação operacional controlada porque grava dados privados; o esquema e os catálogos já estão aplicados.
