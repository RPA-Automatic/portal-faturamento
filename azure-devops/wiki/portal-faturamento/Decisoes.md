> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; consulte código e decisões no repositório canônico. Estado planejado não equivale a implantação.

> Fonte: `docs/decisions/ADR-0001-organizacao-azure-devops.md`

# ADR-0001 — Organização por produto no Azure DevOps

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: quando mudar a estrutura de equipes  
> Documentos relacionados: [Operação Azure DevOps](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FDevOps-e-operacao)

## Contexto

A wiki compartilhada publicava páginas do SDA diretamente na raiz, misturando a navegação entre produtos. O usuário criou o épico #26 para o Faturamento e confirmou que os produtos devem permanecer no projeto Azure DevOps RPA Automatic.

## Alternativas

Criar Team Projects independentes; criar wikis independentes no mesmo projeto; ou manter projeto/wiki compartilhados com árvore e épico por produto.

## Decisão registrada

Usar RPA Automatic, um épico por produto e páginas sob o slug correspondente. Reutilizar #1 (SDA) e #26 (Faturamento). GitHub continua como repositório de código; docs/ é canônico; Wiki é a superfície operacional. Planejar o Faturamento em quatro sprints de duas semanas.

## Consequências

Navegação e backlog precisam de identificação explícita de produto. O publicador deve impedir escrita fora de sua raiz. Mudanças de documentação mantêm rastreabilidade até a fonte. A autorização existente do projeto compartilhado se aplica às páginas; separação de navegação não cria isolamento de permissões.

## Validação e revisão

Consultar árvore remota, conferir IDs das páginas movidas, conteúdo publicado e relações dos cards. Repetir publicações deve resultar em zero alterações quando a fonte não mudar. Revisar a decisão se houver exigência de isolamento de acesso ou equipes independentes.


> Fonte: `docs/decisions/ADR-0002-banco-fiscal-unico.md`

# ADR-0002 — Banco fiscal remoto único e desenvolvimento local

> Status: Aprovado pelo usuário para organização dos ambientes  
> Data: 2026-09-13

O usuário confirmou `https://eukazzizamxratkavcap.supabase.co` como destino e informou que manterá apenas a branch principal do Supabase. Portanto, não se exige um novo projeto/branch pago para esta entrega.

Decisão: um banco remoto fiscal, classificado como produção em `supabase/targets.json`; testes de schema em PostgreSQL local descartável antes de qualquer aplicação remota. Git `dev` e `main` continuam sendo branches de código, não branches de banco. `dev: null` significa ausência de DEV remoto, não autorização para usar o Orchestrator como DEV.

A atualização da `main` foi autorizada explicitamente pelo usuário. Alterações de schema foram testadas localmente, aplicadas no banco fiscal e conferidas por consultas, RLS e Advisor. Esse ciclo não substitui homologação do negócio nem configura automaticamente operação assistida.

Dados históricos ficam preservados na origem até recuperação validada. Não criar sincronização automática de produção para testes, nem usar dados reais em cenários de demonstração. Ambiente local usa fixtures sintéticas.


> Fonte: `docs/decisions/ADR-0003-dossie-documental-e-fontes.md`

# ADR-0003 — Dossiê documental e cobertura das fontes históricas

> Status: Aceito para implementação técnica; regras de negócio permanecem em homologação  
> Data: 2026-09-13  
> Responsável: @RodrigoFreitas16n91

## Contexto

O modelo anterior distinguia somente sete tipos em um enum e concentrava informações adicionais em `documents.metadata`. Um arquivo podia apontar diretamente para apenas um contrato, uma nota e uma ordem logística. Também existiam tabelas de staging para cinco relatórios, enquanto o acervo privado contém 17 planilhas distintas, além de documentos de autorização, instrução, liberação, faturamento, logística e comunicação.

A revisão individual das 68 fontes distintas mostrou que o portal precisa conhecer o dossiê esperado para cada cenário, controlar seu atendimento e preservar campos estruturados extraídos do conteúdo. A presença do arquivo não equivale a associação correta, revisão ou aprovação.

## Decisão

- Adotar catálogo extensível de tipos e campos documentais, mantendo o enum anterior somente para compatibilidade.
- Versionar conjuntos de requisitos documentais por cenário e instanciá-los por OP.
- Permitir que um documento se vincule a vários contratos, documentos fiscais e ordens logísticas da mesma OP.
- Guardar cada execução de extração e seus campos tipados, com página/referência, confiança e estado de verificação.
- Preservar todas as planilhas em staging genérico (`source_records`) antes da normalização homologada.
- Relacionar linhas de origem a OP e contrato com método, confiança e confirmação explícitos.
- Modelar checklist, verificações financeiras e disponibilidade de estoque como resultados próprios, sem transformar relatórios auxiliares em regras automáticas.
- Manter novas tabelas privadas, com RLS, leitura interna ativa e escrita de operação reservada ao backend.

## Consequências

O banco passa a representar o dossiê completo e a proveniência das informações. O importador pode evoluir sem descartar colunas ainda não homologadas. A classificação, o vínculo e os valores extraídos precisam de reconciliação ou revisão quando não houver chave exata. Catálogos e templates nascem como estrutura técnica; nenhum requisito fiscal é aprovado pela migration.

Arquivos originais, nomes de empresas, pessoas, números reais e conteúdo integral permanecem fora do Git e da wiki.



[Voltar ao produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)
