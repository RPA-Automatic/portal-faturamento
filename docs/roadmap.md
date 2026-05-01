# Roadmap

## Fase 0 - Fundação

- Criar aplicação Next.js com TypeScript.
- Configurar Tailwind CSS, shadcn/ui e Lucide Icons.
- Configurar Supabase Client.
- Configurar autenticação inicial.
- Definir migrations base.
- Criar Docker/Supabase local.
- Configurar lint, testes e CI.

## Fase 1 - MVP Operacional

- Dashboard Farol com uma linha por OP.
- Cadastro/listagem de operações e contratos.
- Estados E1 a E6.
- Pendências por área e severidade.
- Semáforo automático.
- Detalhe da OP com contratos, documentos e histórico.
- Perfis e permissões por área.

## Fase 2 - Ingestão TOTVS

- Importação de XLSX ES4004, GG4164, GG2037, GPLP e Documentos Fiscais.
- Normalização de OP, contratos e código de parceiro.
- Upsert idempotente.
- Registro de execução da carga.
- Evidências por arquivo, aba e coluna.

## Fase 3 - Motor de Regras

- Regras parametrizadas por estado.
- Validações de completude e consistência.
- Consolidação do pior estado por OP.
- Exceções parametrizáveis.
- Reprocessamento de pendências.

## Fase 4 - Automação e Observabilidade

- Filas para ingestão e validação.
- Cron diário D+0.
- Logs estruturados.
- KPIs de aging e backlog.
- Auditoria completa de alterações.

## Fase 5 - Evolução

- Busca automática de documentos em SharePoint ou pasta controlada.
- Integração direta com TOTVS quando disponível.
- Geração assistida de documentos de liberação.
- Notificações por área.
- Views analíticas e exportações para BI.