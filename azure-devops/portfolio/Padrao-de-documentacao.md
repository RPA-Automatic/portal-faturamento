# Padrão de documentação por produto

Decisão confirmada em 2026-09-13: manter o Team Project RPA Automatic; um Epic por produto; uma página principal /<slug> com subpáginas próprias.

## Estrutura mínima

Visão e escopo; arquitetura; especificação técnica; diagramas; fluxo operacional; dados/integrações; segurança; DevOps/operação; to-do e roadmap; decisões; qualidade e homologação. Adicionar seções específicas quando houver conteúdo real. Páginas existentes em inglês podem ser mantidas sob seu produto para preservar identidade e histórico.

## Fonte e ciclo de atualização

`docs/README.md` é o índice canônico de cada repositório. Wiki é uma projeção operacional revisada; indicar fonte, data, versão, estado implementado/planejado e pendências. Documentação técnica local aguarda commit/PR quando indicado; não presumir que a publicação da wiki publicou código no GitHub.

O publicador escreve somente dentro da raiz do produto, usa controle de versão/ETag e verifica a escrita. Não publicar páginas genéricas de produto na raiz compartilhada. Movimentações usam a API nativa e preservam ID/histórico. Não publicar acervo privado ou credenciais.

## Trabalho e aceite

Hierarquia Agile: Epic → Feature → User Story → Task. Subtarefas são checklists dentro da Task; trabalho independente vira outra Task sob a mesma User Story. Issues registram impedimentos e Bugs registram defeitos reproduzíveis. Reutilizar épicos existentes. Tarefas têm critérios de aceite, dependências, sprint e evidências. Não inventar responsável, horas, prazo ou conclusão. Planejamento confirma capacidade; Closed exige aceite e testes.

## Isolamento

Árvore de wiki e tags organizam navegação; não alteram permissões. Se for necessário isolamento de acesso, revisar a arquitetura do projeto e autorização antes de implantar.
