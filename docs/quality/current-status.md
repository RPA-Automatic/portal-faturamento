# Estado atual do Portal de Faturamento

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Última revisão: 2026-09-13  
> Próxima revisão: a cada incremento  
> Documentos relacionados: [Visão](../product/vision.md), [Especificação técnica](../architecture/SDD.md), [Modelo fiscal](../data/fiscal-schema.md), [Azure DevOps](../operations/azure-devops.md)

## Produto e exemplos

O frontend implementa autenticação por e-mail, apresentação da jornada E1–E6, Farol por OP, indicadores, filtros, visão em quadro e tabela, backlog por área e ficha detalhada da operação. A jornada da tela de acesso apresenta nome e descrição de cada etapa por mouse, teclado ou toque.

Os exemplos versionados são exclusivamente sintéticos. Os testes reproduzem login, cadastro, confirmação, sessão, erros, cenários de Farol, detalhe de OP, documentos, pendências, responsividade e falhas de consulta. Ainda não existe uma base demonstrativa persistente preenchida: o Supabase remoto não possui OPs operacionais consolidadas, e o acervo histórico privado não é usado como demonstração.

## Modelo e dados

O Supabase fiscal possui 11 migrations e 51 tabelas públicas com RLS. O modelo cobre OP, parceiros, contratos N:N, locais, ordens logísticas, notas, documentos e versões, revisões, pendências, evidências, etapas, marcos, exceções, auditoria, dossiê, extrações, checklist, financeiro e estoque.

O catálogo contém 15 tipos documentais, 33 campos extraíveis, 17 famílias XLSX, 12 requisitos de dossiê e três checklists em rascunho. A auditoria privada examinou 68 fontes distintas. O importador preserva todas as abas e linhas não vazias das 17 planilhas no staging comum; cinco relatórios centrais também possuem staging tipado. A consolidação, reconciliação e homologação das regras ainda são necessárias antes de usar esses dados no Farol.

## Arquitetura

- React 18, TypeScript, Vite e Tailwind CSS no frontend.
- Supabase Auth, PostgreSQL, RLS e Storage privado no backend.
- Importadores Python para inventário, staging e registro documental.
- GitHub com `dev` para desenvolvimento, `main` para produção e validações automatizadas.
- Netlify como hospedagem do SPA; a publicação do código mais recente está bloqueada pelo limite de créditos da conta.
- Azure DevOps como acompanhamento do épico, Features, User Stories, Tasks, sprints e wiki operacional.

O desenho separa conteúdo bruto, normalização, evidência, decisão e apresentação. Arquivo recebido ou campo extraído não equivale a aprovação. Vínculos ambíguos seguem para reconciliação, e liberações precisam manter autor, regra, evidência e histórico.

## Azure DevOps

O produto permanece no projeto compartilhado `RPA Automatic`, sob o épico #26 e a árvore de wiki `/portal-faturamento`. A estrutura possui cinco Features, 12 User Stories e 48 Tasks distribuídas em quatro sprints de duas semanas. Queries separadas permitem acompanhar Features, Stories, Tasks, Bugs e Issues. A consulta remota de 2026-09-13 às 22:20 (America/Sao_Paulo) encontrou os 65 itens em estado `New`: o planejamento está provisionado, mas o progresso realizado ainda precisa ser revisado nos cards contra os critérios de aceite.

`docs/` é a fonte técnica. `azure-devops/wiki/` é uma projeção gerada por lista explícita, e o publicador impede escrita fora da árvore do produto. A skill `$rpa-devops-sync` e `scripts/sync_devops_increment.py` passam a sincronizar documentação e wiki ao final de cada incremento material. `scripts/update_devops_task_progress.py` registra estado e evidência somente na Task indicada e validada; não modifica responsável, esforço, datas ou aceite por inferência.

## Próximos gates

1. Criar fixtures persistentes anonimizadas para demonstração e homologação.
2. Consolidar as fontes de staging em OPs, contratos, logística, fiscal, financeiro e estoque.
3. Homologar requisitos documentais, checklists e regras do Farol.
4. Implementar ações operacionais de associação, revisão, aprovação e tratamento de pendências.
5. Configurar os aplicativos OAuth e validar os provedores ponta a ponta.
6. Liberar capacidade de deploy no Netlify e publicar o frontend atual.
7. Executar homologação, deploy controlado, operação assistida e aceite final.
