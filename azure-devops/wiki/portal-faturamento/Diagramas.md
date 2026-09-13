# Diagramas

> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; a reorganização documental local ainda aguarda commit/PR no GitHub. Estado planejado não equivale a implantação.

As representações de ambientes e fluxo descrevem a arquitetura desejada; não comprovam provisionamento ou automação concluída. Fontes `.mmd` e derivados `.svg` ficam em `docs/architecture/diagrams/`.

## context

::: mermaid
graph LR
    User[Áreas operacionais] --> Portal[Portal Faturamento]
    Portal --> Supabase[Supabase Auth e PostgreSQL]
    Reports[Relatórios TOTVS/Datasul] --> Ingestion[Ingestão controlada]
    Ingestion --> Supabase
    Supabase --> Farol[Farol, pendências e auditoria]
    User --> Farol
:::

## containers

::: mermaid
graph TB
    Browser[Navegador] --> SPA[React + Vite]
    SPA --> Auth[Supabase Auth]
    SPA --> API[Supabase Data API]
    API --> DB[(PostgreSQL + RLS)]
    Import[Scripts de ingestão] --> Staging[(Tabelas staging)]
    Staging --> Rules[Normalização e regras]
    Rules --> DB
    Netlify[Netlify] --> SPA
:::

## totvs-farol-flow

::: mermaid
graph LR
    E[ES4004] --> Stage[Staging idempotente]
    C[GG4164 e GG2037] --> Stage
    L[GPLP40180] --> Stage
    F[Documentos fiscais] --> Stage
    Stage --> Normalize[Normalizar chaves canônicas]
    Normalize --> Validate[Motor de validações]
    Validate --> Ops[(Operações e contratos)]
    Validate --> Pending[(Pendências e evidências)]
    Ops --> Farol[Farol E1–E6]
    Pending --> Farol
:::

## auth-rls-sequence

::: mermaid
sequenceDiagram
    actor User as Usuário
    participant UI as React SPA
    participant Auth as Supabase Auth
    participant DB as PostgreSQL/RLS
    User->>UI: Entrar
    UI->>Auth: Autenticar
    Auth-->>UI: Sessão/JWT
    UI->>DB: Consulta com JWT
    DB->>DB: Avaliar role e ownership
    alt autorizado
        DB-->>UI: Linhas permitidas
    else negado
        DB-->>UI: Sem dados/erro de permissão
    end
:::

## environments

::: mermaid
graph LR
    DevBranch[Branch dev] --> DevBuild[Netlify branch deploy]
    DevBuild --> DevDB[Supabase DEV]
    DevDB --> Review[Validação e aprovação]
    Review --> Main[Branch main]
    Main --> ProdBuild[Netlify produção]
    ProdBuild --> ProdDB[Supabase PROD]
    DevDB -. sem promoção automática de dados .-> ProdDB
:::

[Voltar ao produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)
