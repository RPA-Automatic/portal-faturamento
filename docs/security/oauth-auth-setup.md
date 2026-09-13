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
