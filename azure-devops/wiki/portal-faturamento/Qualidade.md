> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; consulte código e decisões no repositório canônico. Estado planejado não equivale a implantação.

> Fonte: `docs/quality/auth-branding-2026-09-13.md`

# Validação de autenticação e identidade

> Status: Implementado no frontend; OAuth externo pendente  
> Responsável: @RodrigoFreitas16n91  
> Última revisão: 2026-09-13

> Atualização posterior: a identidade tipográfica provisória descrita neste registro foi substituída pela marca escolhida pelo responsável. Consulte a [identidade vigente](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FIdentidade-visual).

## Entrega

- Identidade pública RPA Automatic no login, cabeçalho, título, descrição e favicon; referências e imagem externa removidas do frontend.
- Proposta de logo rejeitada pelo responsável e retirada dos assets. Apresentação tipográfica provisória; nova direção visual aguarda definição.
- Tela única para entrar/cadastrar com e-mail e senha, com mensagens em português e rótulos acessíveis.
- PKCE pelo SDK Supabase, callback compartilhado entre consumidores, limpeza de parâmetros sensíveis e tratamento de falhas em query/hash.
- Provedores sociais em configuração, com ativação explícita por `VITE_AUTH_OAUTH_PROVIDERS` depois de criar os aplicativos próprios.
- Guia de configuração por provedor e script de diagnóstico público, sem imprimir Client IDs, Client Secrets ou URLs de autorização com estado.

## Diagnóstico remoto

A API pública de Auth do banco fiscal responde com chave publicável válida. E-mail está habilitado. Microsoft e GitHub redirecionam, mas seus Client IDs não correspondem aos identificadores dos aplicativos necessários. Google retorna provedor desabilitado. O responsável confirmou que ainda precisa criar os aplicativos OAuth.

Nenhuma credencial OAuth foi inventada ou substituída. Nenhuma migration, política RLS, conta ou permissão do banco foi alterada nesta entrega.

## Evidências locais

- Typecheck (`npm run lint`) e build Vite aprovados em Node.js 22.
- 18 testes Python aprovados.
- `test_portal_ui.cjs`: ficha, consulta sintética, fechamento, erro/retry e mobile aprovados.
- `test_auth_ui.cjs`: login por e-mail com rejeição e sucesso, confirmação de cadastro, persistência após recarga, logout, três URLs OAuth com PKCE, troca única de callback em StrictMode, erros em query/hash, código sem verificador, provedores indisponíveis, ausência de configuração e layout mobile aprovados.
- Revisão visual desktop/mobile com apresentação tipográfica da RPA Automatic, sem o logo rejeitado.

Os testes de autenticação usam respostas simuladas. Não comprovam envio de e-mail, consentimento, validade de Client Secrets ou login completo em provedores reais. Esses testes operacionais dependem da configuração descrita no [guia OAuth](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FSeguranca).


> Fonte: `docs/quality/schema-delivery-2026-09-13.md`

# Validação do esquema e ficha operacional

> Status: Evidência técnica; homologação de negócio pendente  
> Data: 2026-09-13

- Nove migrations executadas do zero em PostgreSQL 16.15 local descartável.
- Mesma cadeia aplicada no Supabase fiscal `eukazzizamxratkavcap`, PostgreSQL 17.
- SHA-256 dos statements remotos comparados aos arquivos e versões do histórico reconciliadas. Manifesto em `supabase/deployment-manifest.json`.
- 32 tabelas em `public`, todas com RLS; cinco views operacionais com `security_invoker`.
- Cenários SQL de integridade, isolamento, histórico, auditoria e Farol passaram localmente e no remoto. Dados sintéticos remotos foram revertidos por ROLLBACK; contagem posterior: zero OP e zero contas `@example.test`.
- TypeScript e build Vite passaram.
- Teste de navegador com API simulada: abertura da ficha, conteúdo da pendência, fechamento por Escape, erro/retry e viewport móvel; nenhum erro JavaScript. Capturas desktop/mobile foram inspecionadas. Isso não comprova sessão OAuth ou cargas reais ponta a ponta.

## Advisor

O Advisor não apontou tabela sem RLS nem exposição anônima. Apontou descoberta do schema GraphQL por `authenticated` em 29 objetos que precisam de SELECT para o frontend. Essa descoberta não equivale a leitura irrestrita: grants foram mantidos com policies e testes de acesso. [Explicação do aviso](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed).

Os 23 índices de FK ausentes foram corrigidos por migration complementar. Restam avisos informativos de índices ainda não usados, esperados em banco novo e vazio; não removê-los com base em ausência de tráfego. [Explicação do aviso de índices](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Limites

O banco do Orchestrator foi apenas consultado. Seus dados fiscais ainda precisam de backup/reprocessamento/reconciliação e corte de consumidores antes de limpeza. Não houve cópia de usuários nem dados reais. As novas aprovações, revisões e decisões têm schema, mas não workflow de escrita publicado. A ficha é de consulta, limitada a 100 linhas por seção e às permissões do usuário. Homologação fiscal, migração dos dados e operação assistida continuam pendentes.

## Reproduzir

- `PG_BIN=/caminho/postgresql/bin PF_TEST_PG_PORT=55482 python3 scripts/test_database.py`
- `python3 -m unittest discover -s scripts -p 'test_*.py' -v`
- `npm --prefix frontend ci`
- `npm --prefix frontend run lint` e `npm --prefix frontend run build`
- Node 22: `cd frontend && npx playwright install chromium`; depois, na raiz: `node scripts/test_portal_ui.cjs` (dados simulados; não acessa Supabase real).

## Reconciliação de main/dev

A main anterior (`604c5c0`) continha um protótipo diferente, com frontend na raiz e cinco tabelas próprias. O merge preserva ambos os históricos, adota o frontend em `frontend/`, mantém o fallback SPA do Netlify e arquiva a migration antiga fora da cadeia ativa. A CI passa a validar o frontend atual e as migrations em PostgreSQL 17, com Node 22.

## Dependências e publicação

O primeiro push confirmou CI remota aprovada em main/dev. A revisão adicional corrigiu os dez avisos do npm audit: atualizações do lockfile e React Router 7.18.3 (mantendo React 18 e HashRouter). O resultado local final é zero vulnerabilidades reportadas pelo npm audit; isso não equivale a garantia de ausência de falhas. Build, TypeScript e cenários de navegador foram repetidos após a atualização.

O runtime de desenvolvimento/CI/Netlify foi fixado em Node 22, e o import map antigo de CDNs foi removido: as dependências vêm do lockfile do Vite.

A escrita de variáveis pelo conector Netlify retornou sucesso, mas a consulta posterior e o bundle mostraram valores ausentes. A configuração pública foi registrada em `[context.production.environment]` no `netlify.toml`: URL fiscal e chave `sb_publishable_*`, própria para o navegador. Não contém service_role ou segredo. Os contextos de desenvolvimento não recebem esses valores de produção.


> Fonte: `docs/quality/devops-planning-2026-09-13.md`

# Evidência — organização DevOps e plano de implantação

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: na primeira planning  
> Documentos relacionados: [Plano de entrega](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FTo-do), [Operação DevOps](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FDevOps-e-operacao)

> Atualização posterior no mesmo dia: processo convertido para Agile; as 12 entregas fiscais agora são User Stories sob cinco Features. Consulte [hierarquia atual](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FOrganizacao-do-backlog). As contagens abaixo registram a configuração inicial.

## O que já havia dos pedidos do chat anterior

| Pedido | Evidência disponível | Limite |
|---|---|---|
| Separar documentação dos produtos | Índices e árvores docs/ próprios nos três repositórios | Reorganização local ainda sem commit/PR nesta entrega |
| Governança, especificações e diagramas | AGENTS, metadados, SDDs/arquitetura e fontes Mermaid/SVG | Documentação não comprova todas as capacidades implementadas |
| Evoluir experiência cockpit/canvas do Orchestrator | Visão, SDD e catálogo de agentes documentados | Evolução planejada, fora do desenvolvimento fiscal desta entrega |
| Revisar acervo fiscal | Inventário e requisitos neutros em fiscal-context e source-review | Regras fiscais, SLA e encerramento ainda exigem homologação |
| Corrigir importador de compras | Mapeamento local corrigido, testes e comparação com fonte registrados | Registros remotos ainda precisam de reprocessamento autorizado |
| Separar ambientes/bancos | Destinos locais corrigidos e bloqueios de carga preparados | DEV exclusivo, recuperação e implantação remota pendentes |
| Evoluir portal fiscal | Frontend com autenticação, Farol, filtros, indicadores e backlog | Detalhe da OP, ações, validação integrada e go-live no plano |

## Alterações remotas verificadas nesta entrega

Organização `rpa-automatic`, projeto privado compartilhado `RPA Automatic`. Consulta final da estrutura e do backlog em 2026-09-13, às 18:03 UTC; escopo limitado aos três produtos identificados, sem truncamento na árvore retornada ou no lote de 60 cards fiscais.

- Épicos #1 (SDA) e #26 (Faturamento) reutilizados; #87 criado para Orchestrator, que não tinha épico.
- Wiki com 39 páginas: 13 do Faturamento, 12 do Orchestrator, 12 do SDA e duas páginas compartilhadas de catálogo/padrão.
- Oito páginas antigas do SDA movidas com API nativa; IDs e conteúdo conferidos após cada movimento. Histórico mantido no repositório da Wiki.
- Faturamento: 12 Issues e 48 Tasks criadas sob #26; cada uma das quatro sprints contém três Issues e doze Tasks.
- 23 relações de dependência entre entregas verificadas. Cada Task tem pai, área e iteração corretos.
- Área fiscal incluída explicitamente no board da equipe; área padrão e sprint genérica anteriores preservadas. Quatro iterações fiscais selecionadas, sem datas inventadas.
- Cinco consultas compartilhadas verificadas: backlog completo com 61 itens, incluindo o épico, e 15 itens por sprint.
- Links de repositório e wiki associados aos três épicos. Nenhum responsável, hora realizada ou conclusão foi atribuído por inferência.

## Arquivos e rastreabilidade

Plano detalhado: `docs/product/delivery-plan.md`. Especificação técnica consolidada: `docs/architecture/SDD.md`. Decisão de organização: `docs/decisions/ADR-0001-organizacao-azure-devops.md`.

Configuração, IDs e evidências sem credenciais: `azure-devops/config.json`, `backlog.json`, `backlog-state.json`, `board-views.json`, `wiki-migration.json` e `verification.json`. Projeções em `azure-devops/wiki/`; catálogo/padrão em `azure-devops/portfolio/`.

Scripts fiscais: geração de wiki por lista explícita, publicação limitada à raiz e criação idempotente do backlog. O publicador SDA foi alterado para percorrer somente sua árvore; fontes de wiki foram realocadas no repositório correspondente. Índices dos três projetos apontam ao DevOps.

## Validações

- Faturamento: 13 testes passaram, incluindo publicação restrita, ETag, plano sem escrita, replay, bloqueio de symlink e regressão da leitura do campo Parent da API.
- SDA: 13 testes passaram; sete testes do runtime Azure foram ignorados por dependências opcionais ausentes. O novo teste prova que o publicador não recria páginas soltas na raiz.
- Reexecução do planejamento fiscal: 60 cards reutilizados, zero novas criações previstas. Republicação planejada das três árvores: todas as páginas inalteradas.
- Links internos da wiki conferidos contra a árvore remota. Links Markdown locais e `git diff --check` passaram nos três repositórios.
- Não houve navegador disponível para inspeção visual. Conteúdo, hierarquia, vínculos e IDs foram verificados pela API; renderização visual dos diagramas permanece sem inspeção nesta sessão.
- Frontend não foi modificado nesta entrega; typecheck/build já haviam passado na leitura inicial do projeto.

## Impacto e próximos passos

As alterações remotas atingiram Wiki, work items, consultas e configuração de área/iterações do board. Não alteraram permissões, Supabase, Netlify nem produção do portal. Nenhum commit, push ou PR GitHub foi executado nesta entrega; alterações locais anteriores foram preservadas.

Prazo proposto: quatro sprints de duas semanas, oito semanas no total. Definir data de início, capacidade, responsáveis e agenda dos homologadores na planning. Regras críticas e DEV exclusivo são prioridades da sprint 1. Operação assistida e encerramento dependem de estabilidade e aceite; estender a janela se necessário.


> Fonte: `docs/quality/source-review-2026-09-13.md`

# Revisão do acervo privado

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: 2026-10-13  
> Documentos relacionados: [Contexto fiscal](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FVisao-do-produto), Ingestão (`docs/data/xlsx-ingestion-plan.md`, fonte no repositório)

## Escopo e cobertura

O inventário de `docs/docs_antigos/`, excluindo diretórios Git e os resultados desta análise, encontrou 540 arquivos e 226 conteúdos distintos por SHA-256. Entre os conteúdos distintos há 17 XLSX, 20 DOCX, 21 PDF, 7 DOC, 9 ZIP, 2 EML e 1 MSG; o restante é composto principalmente por código e documentação histórica.

Foi feita extração textual de 20 DOCX e 21 PDFs e leitura estrutural das 17 planilhas. A inspeção dos nove ZIPs distintos não encontrou documentos suportados exclusivos ausentes das cópias extraídas (entradas de até 30 MB). Isso não equivale a revisão visual integral nem homologação de todos os documentos. Arquivos Word binários e mensagens foram inventariados; sua interpretação detalhada permanece pendente. PDFs com conteúdo em imagem também exigem leitura visual/OCR adicional.

A leitura aprofundada concentrou-se nas duas versões do PDD, nas reuniões de checklist e automação, e nos cabeçalhos e dados estruturais dos relatórios/checklists. Transcrições Comercial, Logística e Fiscal apresentam trechos severamente corrompidos; não foram usadas para estabelecer novas regras autônomas. O PDF de histórico de prompts é referência de ideias, não decisão aprovada.

O PDD-01 foi renderizado em 22 páginas; as páginas 2, 12 e 18 foram inspecionadas visualmente para conferir o fluxo, o mapeamento de instruções e as telas fiscais. O diagrama posiciona a criação da OL antes do envio da liberação, enquanto o texto descreve a liberação como entrada para criar a OL. Essa divergência de precedência deve ser resolvida antes de automatizar transições. Não houve revisão visual de todas as páginas do acervo.

## Rastreabilidade sem publicação dos originais

O manifesto com nomes originais, hashes e caminhos fica exclusivamente em `docs/docs_antigos/_analise_privada_2026-09-13/`, ignorado pelo Git. Os identificadores abaixo permitem revisão local sem publicar nomes de empresas, pessoas, documentos ou números de contratos.

| Referência neutra | Identificador privado | Papel |
|---|---|---|
| PDD-01 | SRC-564eba7c502b | PDD com fluxo e mapeamentos |
| PDD-02 | SRC-be7533e4bc83 | Outra versão do PDD; não presumir precedência por nome |
| ENT-01 | SRC-b4be2c70c79d | Reunião de checklist |
| ENT-02 | SRC-90a952becd2c | Reunião de automação |
| XLS-01 | SRC-9c141be6ba87 | Operações e contratos |
| XLS-02 | SRC-540e6b124832 | Compras |
| XLS-03 | SRC-85c70480f7cc | Vendas |
| XLS-04 | SRC-baf997c94edd | Logística |
| XLS-05 | SRC-3e7e53d9f52f | Documentos fiscais |
| XLS-06 | SRC-31288529a350 | Checklist geral |
| XLS-07 | SRC-d62c947496f2 | Checklist regional A |
| XLS-08 | SRC-63eb865aa426 | Checklist regional B |
| XLS-09 | SRC-6c7aac84e8c4 | Parceiros e inscrições |

## Achados de qualidade

- O checklist geral declara 1.048.557 linhas, mas tem somente 35 linhas não vazias, incluindo cabeçalhos. Dimensionamento de importação deve usar conteúdo real.
- Os três checklists têm 31, 33 e 34 colunas nas abas principais, com cabeçalhos na linha 3. Não podem compartilhar um mapeamento posicional único.
- Os cinco relatórios principais têm duas linhas de título/cabeçalho e resultam em 231, 93, 110, 2.370 e 155 registros, respectivamente.
- Alguns identificadores fiscais estão em fórmulas literais de texto. Preservar zeros e valores textuais; não avaliar fórmulas arbitrárias recebidas.
- O importador GG4164 tinha deslocamento de colunas a partir de Modalidade. A análise do remoto confirmou 93/93 registros com Safra e Frete divergentes de `raw_data`. O mapeamento local foi substituído por cabeçalhos explícitos; os registros remotos ainda precisam ser reprocessados.
- Há rótulos repetidos e campos com significados diferentes: Operação comercial não é necessariamente OP, e natureza de operação não é CFOP. Esses mapeamentos exigem contrato de dados explícito.
- Existem credenciais de agendamento em documentos operacionais. Não publicar os originais, carregar segredos no frontend ou copiar essas credenciais para o novo produto; revisar/rotacionar os acessos legados aplicáveis.

## Validação desta entrega

- Seis testes sintéticos passaram, cobrindo mapeamento de compra, layout incompleto e bloqueios de destino incorreto. Foram feitas também 930 comparações de dez campos nas 93 linhas reais de compra contra o conteúdo bruto, sem publicar os valores.
- O dry-run dos cinco relatórios confirmou as contagens esperadas e validou o novo mapeamento de compra sem transmitir linhas.
- Os arquivos originais foram preservados. Nenhuma planilha ou documento foi regravado.
- Não houve upload dos originais para APIs de extração externas ou Supabase Storage. A análise utilizou leitura local e os recursos desta sessão. Somente requisitos generalizados foram registrados na documentação canônica.
- O seletor PowerShell foi revisado, mas não executado: `pwsh` não está instalado no ambiente desta revisão.


> Fonte: `docs/quality/environment-audit-2026-09-13.md`

# Auditoria de sincronização — GitHub, Netlify e Supabase

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: após corrigir ambientes e promover branches
> Documentos relacionados: [Catálogo documental](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)  

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

Na auditoria inicial, os TOMLs DEV, scripts e parte da documentação associavam o ambiente DEV ao banco de outro produto. Na revisão posterior desta data, o vínculo local foi removido: `supabase/targets.json` define produção e deixa DEV pendente. O usuário escolheu outro projeto remoto exclusivo para DEV. Cargas pelos scripts são bloqueadas até registrar o destino correto; consultar o procedimento de separação (`docs/operations/database-separation.md`, fonte no repositório).

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



[Voltar ao produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)
