---
name: 'Portal Feature Specification'
description: 'Create an implementation-ready specification for a Portal Faturamento feature spanning React, Supabase, Netlify, security, and documentation.'
agent: 'Portal Faturamento'
---

# Portal Feature Specification

Create a concise technical specification for this request:

> ${input:request:Describe the feature or problem}

Use os documentos indexados em `docs/README.md` como contexto. Não implemente código nesta etapa. Retorne em português do Brasil:

## Outcome

- user and operational problem;
- desired behavior and explicit non-goals;
- assumptions and unresolved questions.

## Impact Map

- frontend routes, components, types, and states;
- Supabase tables, functions, storage, migrations, indexes, and RLS;
- authentication, authorization, privacy, and audit implications;
- Netlify environment and deployment impact;
- architecture and operational documents to update.

## Contract

- inputs and outputs;
- validation and error states;
- loading, empty, success, and permission-denied states;
- acceptance criteria written as observable behavior.

## Delivery Sequence

1. DEV database and security changes;
2. frontend implementation;
3. focused validation;
4. documentation and prompt-history record;
5. production promotion considerations.

End with the smallest safe first implementation slice and its validation command. Never include or request secret values.
