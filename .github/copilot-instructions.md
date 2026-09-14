# Portal Faturamento Engineering Context

Use the repository documentation as the source of truth before changing behavior:

- `docs/architecture/overview.md` e `docs/architecture/domain-model.md` para domínio e entidades canônicas;
- `docs/operations/development.md` para branches, ambientes, comandos e segredos;
- `docs/data/database.md` e `docs/security/security-lgpd-audit.md` para persistência e privacidade;
- `docs/product/operational-workflow.md` para o fluxo de negócio;
- `docs/governance/ai-assisted-development.md` para coordenação de agentes e prompts.

## Non-negotiable Rules

- Keep GitHub `dev` mapped to Netlify branch deploys and Supabase DEV; keep `main` mapped to production.
- Never place `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_*`, or equivalent privileged credentials in frontend code or Netlify frontend variables.
- Version every database change in `supabase/migrations/` and review RLS for every new or changed table.
- Preserve the canonical operation keys and evidence trail described in `docs/architecture/overview.md`.
- Read the relevant existing implementation and tests before editing. Keep changes focused and update documentation when domain behavior changes.
- Validate frontend changes with `npm run lint` and `npm run build` from `frontend/`.
- Ao concluir um incremento material, atualize o documento canônico e `docs/quality/current-status.md`, execute `scripts/sync_devops_increment.py` e publique somente a árvore `/portal-faturamento` quando autorizado. Não inferir estado, responsável, esforço ou conclusão dos cards.
