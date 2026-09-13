# ADR-0002 — Banco fiscal remoto único e desenvolvimento local

> Status: Aprovado pelo usuário para organização dos ambientes  
> Data: 2026-09-13

O usuário confirmou `https://eukazzizamxratkavcap.supabase.co` como destino e informou que manterá apenas a branch principal do Supabase. Portanto, não se exige um novo projeto/branch pago para esta entrega.

Decisão: um banco remoto fiscal, classificado como produção em `supabase/targets.json`; testes de schema em PostgreSQL local descartável antes de qualquer aplicação remota. Git `dev` e `main` continuam sendo branches de código, não branches de banco. `dev: null` significa ausência de DEV remoto, não autorização para usar o Orchestrator como DEV.

A atualização da `main` foi autorizada explicitamente pelo usuário. Alterações de schema foram testadas localmente, aplicadas no banco fiscal e conferidas por consultas, RLS e Advisor. Esse ciclo não substitui homologação do negócio nem configura automaticamente operação assistida.

Dados históricos ficam preservados na origem até recuperação validada. Não criar sincronização automática de produção para testes, nem usar dados reais em cenários de demonstração. Ambiente local usa fixtures sintéticas.
