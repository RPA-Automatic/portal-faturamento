# Desenvolvimento Assistido por IA

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: 2026-12-13
> Documentos relacionados: [Catálogo documental](../README.md)  

## Finalidade

Este projeto usa instruções, agentes e prompts reutilizáveis para coordenar o frontend React/Vite, o backend Supabase, a entrega Netlify e a documentação operacional. Esses recursos apoiam o trabalho; `AGENTS.md`, os documentos normativos, o código e os testes permanecem autoritativos.

## Mapa de recursos

| Recurso | Local | Responsabilidade |
| --- | --- | --- |
| Regras Codex | `AGENTS.md` | Domínio, segurança, validação e documentação |
| Contexto Copilot | `.github/copilot-instructions.md` | Regras equivalentes para o GitHub Copilot |
| Agente do produto | `.github/agents/portal-faturamento.agent.md` | Coordenar trabalho e exigir evidências |
| Prompt de especificação | `.github/prompts/feature-specification.prompt.md` | Transformar ideia em contrato implementável |
| Índice documental | `docs/README.md` | Localizar a fonte de verdade por assunto |
| Histórico de prompts | Este documento | Registrar decisões reutilizáveis de assistência por IA |
| Sincronização DevOps | `$rpa-devops-sync` | Atualizar documentação canônica, projeção da wiki e backlog quando o incremento mudar contratos ou escopo |

## Fluxo padrão

1. Use o prompt de especificação quando a solicitação atravessar fronteiras ou ainda não estiver implementável.
2. Leia os documentos relevantes de produto, arquitetura, dados, segurança e operação.
3. Faça mudanças Supabase primeiro em DEV, por migration versionada e revisão de RLS.
4. Use apenas configuração Supabase pública no frontend e valide lint/build.
5. Registre aqui decisões reutilizáveis sobre agentes ou prompts; decisões arquiteturais pertencem a ADRs.
6. Ao fechar um incremento, atualize o status canônico e execute `python3 scripts/sync_devops_increment.py --apply` quando a sessão já autorizar a publicação no Azure DevOps.

## Histórico de prompts

Registre decisões reutilizáveis neste formato:

```text
### AAAA-MM-DD - Título breve da decisão
- Solicitação:
- Decisão:
- Restrições:
- Validação:
- Acompanhamento:
```

### 2026-08-23 - Linha de base de contexto para modelo local

- Solicitação: escolher uma configuração local prática do Ollama para atividades de orquestração.
- Decisão: usar 16k como padrão do serviço e manter uma variante separada de 64k para testes deliberados de contexto longo.
- Restrições: a máquina possui 31 GiB de RAM, CPU Intel i5-1135G7 e GPU integrada Intel Iris Xe. Um modelo 26B depende principalmente da CPU e consome muita memória.
- Validação: `systemctl show ollama --property=Environment` informou `OLLAMA_CONTEXT_LENGTH=16384`; `ollama ps` informou `64000` para `meu-modelo-64k:latest`.
- Acompanhamento: preferir modelos de programação/raciocínio entre 7B e 9B para uso interativo e medir a memória antes de ampliar o contexto.

### 2026-09-13 - Sincronização DevOps por incremento

- Solicitação: manter documentação e Azure DevOps atualizados durante a evolução do Portal de Faturamento.
- Decisão: usar a skill automática `$rpa-devops-sync` e o orquestrador `scripts/sync_devops_increment.py` ao concluir cada incremento material.
- Restrições: a wiki permanece limitada a `/portal-faturamento`; documentos privados nunca são publicados; estado, responsável, esforço, datas e conclusão dos cards não são inferidos do código.
- Validação: geração local, testes do publicador, preflight com ETag e leitura posterior da página publicada.
- Acompanhamento: mudanças de escopo também atualizam o plano de entrega e o backlog canônico antes do provisionamento idempotente.

## Checklist de mudança

- [ ] Solicitação classificada pela fronteira afetada.
- [ ] Fontes de verdade relevantes lidas.
- [ ] Impactos de DEV e PROD separados.
- [ ] Segredos excluídos do frontend e dos logs.
- [ ] Migration e RLS revisadas quando houver alteração de dados.
- [ ] Validação focada concluída.
- [ ] Decisão de prompt ou arquitetura registrada quando o conhecimento reutilizável mudar.
- [ ] Status atual, projeção da wiki e impacto no backlog sincronizados com evidência.
