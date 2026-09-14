> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; consulte código e decisões no repositório canônico. Estado planejado não equivale a implantação.

> Fonte: `docs/security/security-lgpd-audit.md`

# Auditoria de Seguranca e LGPD

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: 2026-12-13
> Documentos relacionados: [Catálogo documental](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)  

Data: 2026-05-06

> Registro histórico. Os achados abaixo descrevem a situação de maio, antes do endurecimento de RLS. Para o estado atual consulte a revisão de privacidade de setembro (`docs/security/lgpd-review-2026-09-13.md`, fonte no repositório), a [validação do esquema](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FQualidade) e [autenticação vigente](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento%2FSeguranca).

## Escopo

Auditoria do workspace atual com foco em:

- exposicao de segredos no Git;
- isolamento de dados privados;
- RLS e policies Supabase;
- uso de chaves no frontend e scripts;
- riscos LGPD nas tabelas operacionais.

Esta auditoria avalia o repositorio e a migration versionada. O ambiente Supabase DEV/PROD deve ser validado tambem no dashboard/SQL Editor, porque configuracoes manuais podem divergir do Git.

## Pontos Positivos

- Dados reais ficam fora do Git em `data/private/`.
- Arquivos operacionais reais em `docs/**/*.xlsx`, `docs/**/*.docx` e `docs/**/*.pdf` estao ignorados.
- Export legado `supabase/supabase/` esta ignorado, evitando publicar snippets e historico antigo.
- Frontend usa somente variaveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Scripts administrativos usam `SUPABASE_SERVICE_ROLE_KEY` somente por variavel de ambiente local.
- RLS esta habilitado nas principais tabelas do schema inicial.
- Existe separacao conceitual entre dados brutos `stg_*`, modelo operacional, regras, pendencias e evidencias.

## Achados Criticos

### 1. Leitura ampla para qualquer usuario autenticado

As policies atuais permitem leitura para qualquer usuario autenticado em tabelas sensiveis:

- `operations`
- `partners`
- `contracts`
- `logistics_orders`
- `fiscal_documents`
- `documents`
- `pending_items`
- `evidence`
- `state_history`

Risco LGPD: se cadastro por e-mail, GitHub ou Azure permitir acesso sem aprovacao, qualquer usuario autenticado pode ler dados de clientes, fornecedores, documentos fiscais, contratos, documentos operacionais e evidencias.

Recomendacao: trocar `using (true)` por uma politica baseada em perfil ativo, area, papel e escopo operacional.

### 2. Falta de estado de aprovacao no perfil

A tabela `profiles` tem `area` e `is_admin`, mas nao possui campos como:

- `status` (`pending`, `active`, `blocked`);
- `role` ou `access_level`;
- `partner_id` para usuarios externos;
- `allowed_operation_ids` ou regras de escopo.

Risco LGPD: autenticacao e autorizacao ficam misturadas. Login bem-sucedido vira acesso amplo.

Recomendacao: exigir perfil ativo para qualquer leitura operacional.

### 3. Usuarios externos ainda nao tem isolamento por cliente/fornecedor

O portal possui fluxo de acesso externo, mas o schema ainda nao limita usuario externo ao proprio cliente/parceiro.

Risco LGPD: cliente externo poderia visualizar dados de outros clientes/fornecedores se conseguir autenticar.

Recomendacao: antes de liberar acesso externo real, criar modelo `external_user_partners` ou vincular `profiles.partner_id`, e filtrar contratos/operacoes por parceiro.

## Achados Altos

### 4. Views herdam exposicao das tabelas base

As views `v_operations_farol`, `v_area_backlog` e `v_contract_drilldown` sao boas para o frontend, mas precisam respeitar o mesmo modelo de acesso.

Recomendacao: criar views seguras por perfil ou garantir que as policies das tabelas base estejam restritivas. Para dashboards executivos, considerar RPCs `security definer` bem revisadas que retornem somente dados permitidos.

### 5. `documents.metadata` pode carregar dados pessoais ou detalhes sensiveis

Os documentos registrados usam hash, caminho logico e metadata do inventario. Isso e bom, mas `metadata` pode conter nome de arquivo, OP, contratos e contexto operacional.

Recomendacao: tratar `documents.metadata` como dado sensivel. Evitar expor metadata integral no frontend; criar campos derivados seguros para listagem.

### 6. Staging contem `raw_data` completo

As tabelas `stg_*` guardam o bruto dos XLSX em `raw_data`. Isso e bom para auditoria/reprocessamento, mas amplia o volume de dado sensivel.

Recomendacao: nao criar policies de leitura para usuarios comuns em staging. Acesso a `stg_*` deve ser somente admin/job/service role.

## Achados Medios

### 7. `supabase/config.toml` referencia projeto PROD

O arquivo aponta `project_id = "eukazzizamxratkavcap"`, que e o projeto PROD conhecido.

Recomendacao: documentar claramente o fluxo `supabase link` antes de `db push` e considerar config separada ou scripts explicitos para DEV/PROD.

### 8. Cadastro externo precisa de governanca

Email/senha e GitHub sao uteis, mas precisam de aprovacao, dominio permitido, convite ou perfil pendente.

Recomendacao: usuarios novos devem nascer sem permissao operacional ate aprovacao administrativa.

### 9. Senhas de portais logisticos nao devem virar texto exposto

Os checklists mencionam `PORTAL`, `USUARIO`, `SENHA`. Senhas de terceiros nao devem ser armazenadas em texto puro nem exibidas para areas sem necessidade.

Recomendacao: evitar armazenar senha no banco operacional. Se inevitavel, usar cofre/secret manager e registrar apenas referencia/estado de validacao.

## Recomendacoes de Hardening

### Curto prazo

1. Criar campos de governanca em `profiles`: `status`, `access_level`, `partner_id` e `last_login_at`.
2. Criar funcao `current_profile_is_active()`.
3. Alterar policies de leitura operacional para exigir perfil ativo.
4. Bloquear leitura comum em staging, import_runs, job_logs e audit_logs.
5. Restringir acesso externo por parceiro antes de liberar clientes/parceiros.
6. Criar tela/admin simples para aprovar usuarios e definir area.

### Medio prazo

1. Criar `audit_logs` automatico para alteracoes em pendencias, documentos e checklist.
2. Criar mascaramento de documentos fiscais/CNPJ/CPF quando o usuario nao precisar do dado completo.
3. Criar politicas de retencao para `raw_data`, arquivos importados e documentos antigos.
4. Separar roles: `admin`, `gestor`, `operador_area`, `externo`, `leitura`.
5. Criar buckets Storage privados com signed URLs curtas e policies por escopo.

## Exemplo de Direcao para RLS

As policies abaixo sao conceituais e devem virar migration revisada:

```sql
create or replace function public.current_profile_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.status = 'active' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Exemplo: leitura operacional somente para perfil ativo ou admin.
create policy "Active users can read operations"
on public.operations for select to authenticated
using (public.current_profile_is_admin() or public.current_profile_is_active());
```

Para usuarios externos, a regra deve ser mais restritiva:

```sql
-- Exemplo conceitual: externo le apenas operacoes vinculadas ao parceiro dele.
exists (
  select 1
  from public.contracts c
  join public.profiles p on p.id = auth.uid()
  where c.operation_id = operations.id
    and c.partner_id = p.partner_id
    and p.status = 'active'
)
```

## Veredito

O repositorio esta razoavelmente protegido contra vazamento acidental de arquivos e chaves. Para LGPD, o ponto central e manter autenticacao separada de autorizacao: login valido nao pode significar acesso operacional amplo.

## Evolucao Aplicada

As migrations de hardening adicionadas em 2026-05-06 corrigem os principais pontos desta auditoria no modelo versionado:

- `20260506000100_harden_rls_profiles.sql`: cria aprovacao de perfil, escopo interno/externo e policies por parceiro/operacao.
- `20260506000200_fix_supabase_advisor_findings.sql`: corrige `security_invoker`, `search_path` e uso de `(select auth.uid())`.
- `20260506000300_add_audit_and_controlled_pending_rpc.sql`: adiciona auditoria automatica, restringe staging/logs e cria RPC para resolver pendencias.
- `20260506000400_add_private_operation_document_storage.sql`: cria bucket privado `operation-documents` e policies por escopo em `storage.objects`.
- `20260506000500_fix_local_advisor_warnings.sql`: remove exposicao `anon`, consolida policies permissivas duplicadas e tira helpers `SECURITY DEFINER` da API publica.

Essas migrations reaproveitam padroes bons do sistema legado, mas sem importar o schema legado. A adaptacao foi feita nas entidades atuais: OP, contratos, parceiros, OLs, documentos fiscais, documentos operacionais, pendencias, evidencias e auditoria.

## Pendencias de Validacao

Antes de considerar o ambiente DEV pronto para usuarios reais, aplicar as migrations no projeto Supabase DEV, promover pelo menos um administrador com `public.bootstrap_admin_profile(email)` e reexecutar o Supabase Advisor. Em seguida, validar login de usuario `pending`, usuario interno ativo, administrador e usuario externo vinculado a parceiro.

Alguns avisos de GraphQL para o role `authenticated` podem permanecer em tabelas consumidas diretamente pelo frontend via REST. Remover `SELECT` de `authenticated` elimina a descoberta no GraphQL, mas tambem quebra consultas PostgREST diretas; por isso essa decisao deve ser tomada junto com uma mudanca arquitetural para expor dados apenas por views/RPCs especificas.


> Fonte: `docs/security/oauth-auth-setup.md`

# Login do Portal Faturamento — RPA Automatic

> Status: Em configuração  
> Responsável: @RodrigoFreitas16n91  
> Versão: 2.0  
> Última revisão: 2026-09-13

## Diagnóstico verificado

O banco fiscal responde com chave publicável válida. A consulta pública de Auth indica e-mail habilitado, Microsoft/GitHub habilitados com Client IDs inválidos e Google desabilitado. O responsável confirmou que os aplicativos OAuth ainda não foram criados. Habilitar um provedor no painel sem cadastrar suas credenciais não conclui a integração.

O frontend usa PKCE e o próprio SDK Supabase para trocar o código por sessão uma única vez, inclusive em React StrictMode. Erros de retorno são tratados tanto na query quanto no fragmento da URL, sem mostrar diagnósticos privados na tela. Login por e-mail e senha permanece disponível; os botões sociais mostram “Em configuração” até a habilitação controlada descrita abaixo.

## Valores para copiar

| Campo | Valor |
|---|---|
| Nome público do aplicativo | `RPA Automatic — Portal Faturamento` |
| Site / Homepage / origem JavaScript | `https://portal-fiscal-faturamento.netlify.app` |
| Retorno ao portal | `https://portal-fiscal-faturamento.netlify.app/` |
| Callback OAuth dos três provedores | `https://eukazzizamxratkavcap.supabase.co/auth/v1/callback` |
| Banco remoto | `eukazzizamxratkavcap` |

O callback do provedor aponta para o Supabase. O retorno do Supabase aponta para o portal. São endereços diferentes com funções diferentes.

## 1. Preparar o Supabase

1. Abra [URL Configuration do projeto fiscal](https://supabase.com/dashboard/project/eukazzizamxratkavcap/auth/url-configuration).
2. Defina **Site URL** como `https://portal-fiscal-faturamento.netlify.app/`.
3. Inclua exatamente essa mesma URL em **Redirect URLs** e salve.
4. Abra [Sign In / Providers](https://supabase.com/dashboard/project/eukazzizamxratkavcap/auth/providers). Mantenha Email habilitado. Configure cada provedor com seu aplicativo próprio nos passos seguintes.
5. Não copie nomes, imagens, domínios ou credenciais de clientes. Use exclusivamente a identidade RPA Automatic nos aplicativos e nas telas de consentimento.

Não adicionar curingas amplos de produção. O desenvolvimento usa banco local; não é necessário criar uma segunda branch paga no Supabase. [Referência de redirecionamentos](https://supabase.com/docs/guides/auth/redirect-urls).

Essa configuração também controla o retorno da confirmação de cadastro por e-mail. Se a URL enviada pelo portal não estiver na lista permitida, o Supabase usa o **Site URL**; um valor antigo como `http://localhost:3000` faz o link abrir fora do portal publicado. O frontend de produção envia explicitamente `https://portal-fiscal-faturamento.netlify.app/`, reconhece links expirados e permite reenviar a confirmação. Cada link é de uso único; após um reenvio, deve-se abrir somente o e-mail mais recente.

O SMTP padrão do Supabase é adequado apenas para avaliação e, em projetos novos, envia mensagens somente a integrantes da organização. Antes da homologação com usuários externos, configurar um SMTP próprio em **Project Settings → Authentication → SMTP Settings**, validar remetente e domínio e testar entrega, spam, expiração e reenvio. No plano gratuito, projetos novos com SMTP padrão também podem ter restrições para personalizar os templates de Auth. [Mudanças do provedor padrão de e-mail](https://supabase.com/changelog/29370-supabase-auth-changes-to-default-email-provider) e [mudanças nos templates do plano gratuito](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

## 2. GitHub

1. Abra [GitHub OAuth Apps](https://github.com/settings/developers) → **New OAuth App**. Use uma conta administrativa da RPA Automatic; para propriedade organizacional, abra as configurações de desenvolvedor da organização.
2. Preencha **Application name**, **Homepage URL** e **Authorization callback URL** com os valores da tabela. Deixe Device Flow desmarcado.
3. Registre o aplicativo. Copie o **Client ID** gerado e crie um **Client Secret**.
4. No Supabase → **Sign In / Providers → GitHub**, substitua os valores anteriores pelo Client ID e Client Secret desse aplicativo. Habilite e salve.

O Client ID é um identificador emitido pelo GitHub. Nome de usuário, e-mail, senha e Personal Access Token não substituem esse identificador ou o Client Secret. [Guia oficial](https://supabase.com/docs/guides/auth/social-login/auth-github).

## 3. Microsoft

1. Abra [Microsoft Entra](https://entra.microsoft.com/) → **App registrations → New registration**.
2. Use o nome da tabela. Se o portal aceitar contas corporativas de várias organizações e pessoais Outlook/Hotmail, selecione a opção que inclui ambos. Se o acesso for restrito, selecione somente o tenant autorizado e mantenha a mesma restrição no Supabase.
3. Em **Redirect URI**, escolha plataforma **Web** e informe o callback Supabase da tabela.
4. Registre e copie **Application (client) ID** — deve ter formato GUID.
5. Em **Certificates & secrets**, crie um segredo e copie seu **Value**, não o Secret ID. Registre responsável e vencimento no cofre da equipe.
6. No Supabase → **Azure**, preencha Client ID e Client Secret. Para múltiplas organizações e contas pessoais, use tenant `https://login.microsoftonline.com/common`; para um único tenant, use `https://login.microsoftonline.com/<tenant-id>`. Habilite e salve.

O portal solicita o escopo `email` exigido para identificar a conta. [Guia Supabase](https://supabase.com/docs/guides/auth/social-login/auth-azure) e [registro no Entra](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app).

## 4. Google / Gmail

1. Abra [Google Cloud Console](https://console.cloud.google.com/) e crie/selecione um projeto pertencente à RPA Automatic.
2. Em **Google Auth Platform**, configure **Branding** com nome RPA Automatic e e-mails de suporte/contato sob sua responsabilidade. Não use o logo rejeitado.
3. Em **Audience**, selecione External para permitir Gmail e contas de outras organizações. Enquanto estiver em Testing, adicione explicitamente os usuários de teste.
4. Em **Data Access**, configure apenas `openid`, e-mail e perfil para login.
5. Em **Clients**, crie um OAuth Client do tipo **Web application**.
6. Em **Authorized JavaScript origins**, informe a URL do site, sem barra final. Em **Authorized redirect URIs**, informe o callback Supabase da tabela.
7. Copie Client ID e Client Secret para **Supabase → Google**; habilite e salve.
8. Antes do acesso amplo, revise a audiência e os requisitos de publicação/verificação apresentados pelo Google.

Gmail também pode ser usado no cadastro por e-mail e senha; isso não equivale ao login social Google. [Guia oficial](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 5. Validar e habilitar no portal

Os Client Secrets devem ficar somente nos painéis dos provedores/Supabase e no cofre autorizado. Não enviar pelo chat, não gravar no Git e não usar variáveis `VITE_` para segredos.

Depois de configurar um provedor:

1. Execute `python3 scripts/check_auth_providers.py`. Esse diagnóstico usa apenas informações públicas, não testa a validade de um Client Secret nem a conclusão do login.
2. Para validar o login real, habilite esse provedor no frontend e publique. Em `netlify.toml`, no bloco `[context.production.environment]`, ajuste `VITE_AUTH_OAUTH_PROVIDERS`. Exemplo para validar só GitHub: `"github"`; com os três configurados: `"azure,github,google"`. Valores possíveis: `azure`, `github`, `google`.
3. Execute os testes e faça novo deploy pela `main`. A configuração é incorporada ao build. Alterações no Supabase não mudam sozinhas a lista publicada pelo frontend.
4. Em janela privada, inicie o login no portal, aceite o consentimento e confirme o retorno ao mesmo domínio, com sessão e sem parâmetros sensíveis na URL. Recarregue a página e teste **Sair**.
5. Teste cancelamento e conta sem autorização. Registrar-se ou autenticar-se não concede acesso às operações: o perfil nasce `pending` e as políticas RLS continuam exigindo autorização.
6. Se o teste real falhar, retire o provedor da lista e publique novamente enquanto corrige a configuração.

## Verificação local

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
node scripts/test_auth_ui.cjs
node scripts/test_portal_ui.cjs
```

Os testes de navegador usam contas sintéticas e respostas simuladas. Eles validam o frontend, o envio PKCE, a troca única de código, o tratamento de erros, cadastro, sessão e logout. Não substituem o teste real em cada provedor. [Fluxo PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).



[Voltar ao produto](https://dev.azure.com/rpa-automatic/RPA%20Automatic/_wiki/wikis/a872b434-77b1-4e65-ba18-923abf5021f1?pagePath=%2Fportal-faturamento)
