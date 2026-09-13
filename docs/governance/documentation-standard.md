# Padrão de governança documental

> Status: Aprovado  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: 2027-03-13
> Documentos relacionados: [Catálogo documental](../README.md)  

## Fonte de verdade

Cada assunto possui um documento canônico listado em `docs/README.md`. Evite copiar regras normativas para múltiplos arquivos; use links. Código, migrations e testes definem o estado implementado.

## Metadados

Documentos normativos informam `Status`, `Responsável`, `Versão`, `Última revisão`, `Próxima revisão` e, quando aplicável, `Relacionados`. Status permitidos: `Rascunho`, `Em revisão`, `Aprovado`, `Substituído` e `Arquivado`.

## Ciclo de vida

1. Crie como `Rascunho` e identifique fontes e pendências.
2. Passe para `Em revisão` quando critérios e impactos estiverem completos.
3. Somente o owner ou revisor designado marca `Aprovado`.
4. Ao substituir, mantenha link para o sucessor; mova análises pontuais para `archive/`.
5. Revise documentos no prazo ou quando código, contrato, segurança ou operação mudar.

## ADRs

Use `decisions/ADR-NNNN-titulo.md` para decisões difíceis de reverter ou que cruzem limites de sistema. Registre contexto, alternativas, decisão, consequências, validação e condição de revisão.

## Diagramas

O arquivo `.mmd` é a fonte. O `.svg` de mesmo nome é derivado para consumo no GitHub. Mudanças devem atualizar ambos e preservar título, acessibilidade e ausência de dados sensíveis.

## Conteúdo seguro

Não inclua credenciais, tokens, dados pessoais desnecessários, documentos privados de clientes ou URLs temporárias assinadas. Separe evidência, hipótese, proposta e decisão aprovada.
