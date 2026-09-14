# Especificação técnica — Portal de Liberação de Embarque

> Atualização de 2026-09-13: o modelo versionado possui onze migrations e 51 tabelas com RLS, incluindo dossiê documental, checklist e cobertura das 17 famílias XLSX. Consulte o [modelo vigente](../data/fiscal-schema.md) e a [ADR-0003](../decisions/ADR-0003-dossie-documental-e-fontes.md).

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: a cada incremento  
> Documentos relacionados: [Arquitetura](overview.md), [Domínio](domain-model.md), [Plano de entrega](../product/delivery-plan.md)

## Objetivo e estado atual

Uma linha por OP no Farol deve mostrar o que impede o embarque, a área responsável e a evidência de cada verificação. Liberação de embarque e encerramento da operação são eventos distintos.

O frontend existente é React 18, TypeScript e Vite. `frontend/App.tsx` verifica a sessão, consulta `v_operations_farol` e `v_area_backlog`, apresenta indicadores, filtros, colunas E1–E6 e tabela de operações. O script `lint` executa TypeScript (`tsc --noEmit`); não equivale a uma configuração de ESLint. O build compila o frontend, sem provar autenticação ou conectividade remota.

A ficha da OP implementa consulta de contratos, dossiê documental, documentos/versões, checklist, verificações financeiras e de estoque, etapas, pendências, locais, logística e histórico. Tratamento operacional e aprovações continuam planejados. As migrations e os scripts de ingestão constituem a base do backend; existência de arquivo ou campo extraído não comprova aprovação.

## Componentes e contratos

| Componente | Responsabilidade | Situação |
|---|---|---|
| SPA React/Vite | Login, Farol, filtros, indicadores e backlog por área | Implementado localmente |
| Detalhe da OP | Contratos, dossiê, documentos, checklist, controles auxiliares, etapas, logística, impedimentos e histórico | Consulta implementada; validação com dados reais pendente |
| Ações operacionais | Receber/associar/validar documento; resolver/reabrir pendência | Sprint 2 |
| Cliente de dados | Consultas autenticadas às views do Farol e backlog | Implementado; validar no DEV correto |
| PostgreSQL e políticas | Entidades, dossiê, staging integral, evidências e autorização por perfil | 11 migrations aplicadas; 51 tabelas remotas com RLS |
| Importadores Python | Leitura dos relatórios e carga controlada | 17 famílias validadas; consolidação operacional pendente |
| Reconciliação e regras | Idempotência, vínculos, pior estado e exceções parametrizadas | Consolidação e homologação na sprint 3 |
| Rotina monitorada | Cargas, falhas, reprocessamento e alertas | Preparar antes da entrada em operação |

## Contratos de dados

O modelo canônico é definido em `docs/architecture/domain-model.md` e `docs/data/database.md`. OP possui múltiplos contratos de compra/venda; documentos e movimentações logísticas não podem ser reduzidos a um par único. As chaves compostas e a cardinalidade OP–contrato–item–filial precisam de validação contra os relatórios.

As cinco fontes principais possuem staging tipado. As 17 famílias XLSX também entram em `source_records`, preservando aba, linha, hash e conteúdo bruto. Cada carga deve preservar fonte, assinatura, data de extração e identificadores textuais. Ausência em arquivo antigo não comprova ausência no ERP. Vínculo ambíguo exige reconciliação explícita.

Arquivos de OP passam por inventário, classificação, upload privado, versionamento, extração de campos, associação e revisão. Autorizações, instruções, notas, liberações, procedimentos, manuais e comunicações mantêm tipos separados. Um documento pode se relacionar a múltiplas entidades da mesma OP.

## Estados e verificações

E1 Documentação → E2 Fiscal → E3 Contratos/TOTVS → E4 Logística → E5 Faturamento → E6 Concluído. As áreas podem trabalhar em paralelo, mas o avanço deve respeitar as dependências aprovadas. Semáforo consolidado reflete bloqueios e alertas dos contratos vinculados.

Documento recebido não é documento validado. Mudanças de documento devem invalidar apenas as aprovações afetadas conforme regra acordada e preservar histórico. Exceções precisam de escopo, vigência, responsável e evidência. Regras fiscais, calendário D-2, precedência OL/liberação e encerramento com saldo dependem de aceite do negócio.

## Segurança e falhas

As decisões de permissão precisam ser aplicadas no backend. Testar acesso permitido e negado, inclusive entre perfis e OPs. Nenhuma chave privilegiada ou senha de portal de agendamento pode entrar no frontend, checklist ou documentação. Arquivos devem ter acesso autorizado e validação de tipo/tamanho.

Consultas devem distinguir carregamento, vazio, erro e falta de permissão. Operações de escrita precisam de controle de concorrência e confirmação do resultado. Carga repetida não deve duplicar dados; após timeout, reconciliar o destino antes de repetir. Transições precisam de regra, autor/job, evidência e valores antes/depois.

## Qualidade, entrega e operação

GitHub mantém o código; Azure Boards acompanha trabalho e aceite; a Wiki apresenta a documentação operacional por produto; `docs/` é a fonte técnica canônica. `dev` é desenvolvimento e `main` produção. Mudanças de banco são versionadas e validadas primeiro em DEV.

Plano de testes: regras e estados, ingestão/idempotência, vínculos ambíguos, permissões, fluxo operacional, acessibilidade, recuperação e regressão. Metas de desempenho, volume e disponibilidade precisam ser acordadas. Homologação, go-live e encerramento exigem evidência humana; build aprovado não substitui esses gates.

O plano de quatro sprints inclui backup/restauração, rollback, smoke test, observabilidade, treinamento, operação assistida e transferência de suporte. O produto só é considerado implantado após aceite e estabilidade acordados.
