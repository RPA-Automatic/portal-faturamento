# Prompt Base do Produto

```text
Crie um portal web profissional para controle de faturamento de Notas Fiscais em operações B2B, com foco em rastreabilidade, controle sequencial por área, baixo custo operacional e arquitetura escalável baseada em Supabase.

O portal deve controlar o fluxo operacional em etapas sequenciais por área:

E1 - Documentação Básica
Áreas: Comercial / Faturamento
Valida I.F. Compra, I.F. Venda, documentação salva na pasta da OP e SLA D-2.

E2 - Validação Fiscal
Área: Fiscal / TAX
Valida CFOP, cadastros cliente x fornecedor, regras fiscais, local de entrega, instruções fiscais e pendências tributárias.

E3 - Contratos e Regras TOTVS
Área: Comercial / Gestão de Contratos
Valida contrato de compra liberado, pedido de venda liberado, regras Datasul criadas e vínculo correto entre OP, contratos e parceiros.

E4 - Logística
Área: Logística
Valida criação da OL, dados de agendamento, transportadora, portal, usuário, senha e requisitos para embarque.

E5 - Faturamento
Área: Faturamento
Valida primeira NF fornecedor/cliente, observações fiscais, emissão/troca de documentos fiscais e divergências antes da conclusão.

E6 - Concluído
Operação sem pendências bloqueantes, com evidências registradas e status final verde.

Requisitos funcionais:
- Dashboard Farol com uma linha por OP/Operação B2B.
- Drill-down por ContratoCompra, ContratoVenda, documento fiscal, OL e pendência.
- Semáforo automático: verde, amarelo e vermelho.
- Backlog por área: Comercial, Fiscal, Logística e Faturamento.
- Aging por etapa e por pendência.
- Histórico auditável de movimentações, evidências, usuários e datas.
- Controle de pendências estruturadas com regra, severidade, dono, evidência, fonte do dado e próximo passo.
- Permissões por perfil, permitindo que cada área atualize somente seus campos.
- Exceções parametrizáveis, como Exportação e Transferência Porto Rio Grande, que podem dispensar Liberação de Embarque.
- Consolidação do status da OP pelo pior estado entre seus contratos vinculados.
- Importação/ingestão de dados vindos de relatórios TOTVS/Datasul: ES4004, GG4164, GG2037, GPLP e Documentos Fiscais.
- Normalização das chaves OP, ContratoCompra, ContratoVenda e CódigoParceiro.

Stack recomendada:
- Frontend: Next.js com TypeScript.
- UI: Tailwind CSS, shadcn/ui e Lucide Icons.
- Backend/API: Next.js API Routes ou Supabase Edge Functions.
- Banco de dados: Supabase PostgreSQL.
- Autenticação: Supabase Auth com Row Level Security.
- Storage: Supabase Storage para evidências e documentos.
- Filas e jobs: Supabase Queues ou pgmq para processamento assíncrono.
- Agendamentos: Supabase Cron ou n8n para cargas diárias.
- ORM/query layer: Drizzle ORM ou Supabase Client tipado.
- Validação: Zod.
- Testes: Vitest, Playwright e testes de integração para regras críticas.
- Observabilidade: logs estruturados, tabela de execuções e auditoria no PostgreSQL.
- Deploy: Netlify para frontend e Supabase para dados, autenticação, storage e funções.

Boas práticas obrigatórias:
- Clean Code, SOLID e separação clara entre domínio, aplicação, infraestrutura e interface.
- Código TypeScript fortemente tipado.
- Componentes pequenos, reutilizáveis e orientados ao domínio.
- Regras de negócio isoladas em serviços/funções testáveis.
- Migrações versionadas do banco.
- Políticas RLS por perfil e área.
- Idempotência nas cargas de dados para evitar duplicação.
- Auditoria completa de alterações.
- Tratamento estruturado de erros.
- Processamento assíncrono para importações, validações e reprocessamentos.
- Uso de containers Docker para ambiente local com banco, APIs, filas e serviços auxiliares.
- CI/CD com lint, testes, build e validação de migrations.

Arquitetura esperada:
- Aplicação web modular, com camadas bem definidas.
- Banco PostgreSQL como fonte principal de verdade.
- Tabelas principais para operações, contratos, documentos, pendências, estados, evidências, usuários, áreas, regras, exceções e logs de execução.
- Máquina de estados para controlar o avanço sequencial das operações.
- Jobs assíncronos para ingestão dos XLSX, normalização, validação de documentos e atualização do Farol.
- Modelo preparado para crescer sem alto custo, usando recursos nativos do Supabase antes de introduzir serviços externos.

Interface:
Use uma interface corporativa, limpa, objetiva e operacional. Priorize tabelas densas, filtros eficientes, status visuais claros, painéis por área, navegação rápida entre dashboard, backlog, detalhe da OP, documentos, pendências e histórico. Evite aparência de landing page; o primeiro acesso deve ser o painel operacional.
```