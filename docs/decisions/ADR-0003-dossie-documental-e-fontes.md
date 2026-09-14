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
