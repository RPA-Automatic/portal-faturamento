# Auditoria de sincronização — GitHub, Netlify e Supabase

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: após corrigir ambientes e promover branches
> Documentos relacionados: [Catálogo documental](../README.md)  

## Resultado executivo

Os nomes e URLs dos serviços estão corretos, mas o Portal Faturamento ainda não está operacionalmente sincronizado com o novo Supabase. Nenhuma alteração remota foi aplicada nesta auditoria.

## GitHub

- Repositório: `RPA-Automatic/portal-faturamento`.
- Branch padrão remota: `main`.
- `main`: `604c5c01991125993f3f8ae49f7d92757bba4d73`.
- `dev`: `3e9ca276ce31fbeeb5e477751a7942342e5a78a7`.
- As branches divergiram: `dev` possui 25 commits ausentes em `main` e `main` possui 10 commits ausentes em `dev`. É necessário reconciliar por PR; não fazer merge cego.
- Não há execução de GitHub Actions registrada para `dev`; as execuções recentes de `main` são jobs agendados e não substituem CI de build/testes da branch de desenvolvimento.
- As mudanças de governança desta auditoria permanecem locais e ainda não estão no GitHub.

## Netlify

- Site: `portal-fiscal-faturamento` (`ec741365-13dd-4382-a751-d3119aad1ca3`).
- URL pública: https://portal-fiscal-faturamento.netlify.app/ — respondeu HTTP 200.
- Deploy de produção: `6aa6bb3ce275bb5dcdc7c7ae`, estado `ready`, branch `main`, commit `604c5c0`.
- Framework detectado: Vite; regra de redirect processada.
- O site não possui variáveis Netlify cadastradas. O frontend em `dev` requer `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; uma futura promoção dessa versão ficará sem autenticação até configurar valores públicos do projeto correto.

## Supabase

- Projeto esperado: `Portal Faturamento` (`eukazzizamxratkavcap`).
- URL: https://eukazzizamxratkavcap.supabase.co.
- Estado: `ACTIVE_HEALTHY`.
- Banco: PostgreSQL 17 em `us-east-2`.
- Na consulta de 2026-09-13, não havia tabelas em `public` nem migrations no histórico remoto.
- O repositório possui sete migrations de faturamento que ainda precisam ser revisadas e aplicadas neste projeto em fluxo DEV/produção definido.
- Advisors não reportaram achados porque o schema está vazio; isso não comprova prontidão.

## Inconsistência crítica

Na auditoria inicial, os TOMLs DEV, scripts e parte da documentação associavam o ambiente DEV ao banco de outro produto. Na revisão posterior desta data, o vínculo local foi removido: `supabase/targets.json` define produção e deixa DEV pendente. O usuário escolheu outro projeto remoto exclusivo para DEV. Cargas pelos scripts são bloqueadas até registrar o destino correto; consultar o [procedimento de separação](../operations/database-separation.md).

## Próxima sequência segura

1. Provisionar o DEV fiscal exclusivo; `eukazz...` foi confirmado como PROD pelo usuário.
2. Corrigir refs locais e variáveis Netlify sem registrar chaves secretas.
3. Revisar as sete migrations, aplicar primeiro no ambiente definido como DEV e validar RLS.
4. Reconciliar `dev` e `main` por PR, executar build/testes e publicar preview.
5. Só depois promover produção e avaliar a remoção recuperável das tabelas de faturamento no banco do Orchestrator.

## Validação local

- `npm run lint`: aprovado.
- `npm run build`: aprovado com Vite 6.4.2.
- `npm audit`: 10 dependências reportadas, sendo 5 altas, 4 moderadas e 1 baixa. Há correções disponíveis; atualizar dependências deve ocorrer em mudança própria com teste de regressão. Principais advisories: [Vite](https://github.com/advisories/GHSA-fx2h-pf6j-xcff), [React Router DOM](https://github.com/advisories/GHSA-jjmj-jmhj-qwj2) e [ws](https://github.com/advisories/GHSA-96hv-2xvq-fx4p).
