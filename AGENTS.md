# Portal Faturamento

Trabalhe em português do Brasil. Leia `docs/README.md` antes de alterar produto, arquitetura, dados, segurança ou operação.

## Regras do repositório

- O domínio é faturamento e liberação de embarque com OP, contratos, TOTVS/Datasul, Farol e etapas E1 a E6.
- Não introduza conceitos de outros produtos sem integração explicitamente aprovada.
- A identidade pública é exclusivamente RPA Automatic. Nunca publicar nomes, logotipos, imagens, domínios ou referências de clientes ou de projetos usados como contexto; isso inclui telas, favicon, metadados, exemplos e mensagens de erro.
- A branch `dev` representa desenvolvimento; `main` representa produção.
- Mudanças Supabase devem ser versionadas em `supabase/migrations/`, validadas em DEV e acompanhadas de revisão de RLS.
- Nunca exponha `service_role`, `sb_secret_*`, credenciais OAuth ou dados privados no frontend, Git ou logs.
- Preserve chaves canônicas, evidências, histórico e regras descritas em `docs/architecture/` e `docs/data/`.
- Material em `docs/docs_antigos/` é fonte privada: nunca publicar nomes de empresas de origem, pessoas, clientes, credenciais, imagens ou dados reais. Derivar requisitos com identificadores neutros; não reaproveitar automaticamente código de sistemas legados.
- `supabase/targets.json` é a fonte das referências remotas: PROD está definido; DEV é local; o usuário confirmou um único banco remoto fiscal (ADR-0002). Nunca usar banco de outro produto para desenvolvimento fiscal.
- Para frontend, execute os comandos de validação documentados em `docs/operations/development.md`.
- Atualize o documento normativo correspondente e registre decisões arquiteturais relevantes em `docs/decisions/`.

## Conclusão

Informe arquivos alterados, validações executadas, impacto em dados/permissões e riscos remanescentes. Não afirme alteração em Supabase, Netlify ou GitHub remoto sem evidência.
