# Configuracao OAuth Supabase

Data: 2026-05-06

## Diagnostico Atual

Os botoes do frontend chamam corretamente o Supabase Auth:

- Microsoft: provider `azure`.
- GitHub: provider `github`.
- Google/Gmail: provider `google`.
- Redirect dinamico: `window.location.origin`.
- Fluxo OAuth do frontend: `implicit`, apropriado para SPA Vite/Netlify sem backend SSR. O retorno esperado usa tokens no hash da URL e evita erro de PKCE `code verifier not found in storage`.

Os erros vistos no navegador indicam configuracao incorreta dos provedores no painel do Supabase ou no provedor OAuth, nao falha no React.

O cadastro por e-mail e senha aceita qualquer e-mail valido, incluindo Gmail e Outlook. Para login social, cada provider precisa estar habilitado no Supabase com Client ID e Secret reais.

## Erro `Unregistered API key`

Esse erro aparece quando o deploy esta usando uma chave publica do Supabase invalida, de outro projeto ou removida.

No Netlify da branch DEV, configure novamente:

```text
VITE_SUPABASE_URL=https://lvsocwetuhhqxlwyfdrw.supabase.co
VITE_SUPABASE_ANON_KEY=<Publishable key do projeto DEV>
```

No Supabase, a chave fica em Project Settings > API > Project API keys. Use a chave publica/publishable do projeto correto. Depois de alterar variaveis na Netlify, execute um novo deploy.

## Microsoft / Azure

Erro observado:

```text
AADSTS700016: Application with identifier 'rodrigofreitas16n91' was not found in the directory ...
```

Esse erro acontece quando o campo `Client ID` configurado no Supabase nao e o Application/Client ID real do app registrado no Microsoft Entra ID. O `Client ID` da Microsoft deve ser um GUID, nao e-mail, nome de usuario ou nome do app.

### Configuracao Correta

No Microsoft Entra ID:

1. Criar ou abrir um App registration.
2. Copiar o campo `Application (client) ID`.
3. Criar um `Client secret` em Certificates & secrets.
4. Em Authentication, adicionar Redirect URI do tipo Web:

```text
https://lvsocwetuhhqxlwyfdrw.supabase.co/auth/v1/callback
```

Para PROD, adicionar tambem:

```text
https://eukazzizamxratkavcap.supabase.co/auth/v1/callback
```

No Supabase DEV, em Authentication > Providers > Azure:

```text
Enabled: on
Client ID: Application (client) ID do Entra, em formato GUID
Client Secret: segredo criado no Entra
Azure tenant: organizations ou o Tenant ID correto
```

Use `organizations` se apenas contas corporativas Microsoft devem entrar. Use um Tenant ID especifico se somente um tenant corporativo deve ser permitido. Evite `common` se o app nao foi configurado para multi-tenant.

## GitHub

Se a tela do GitHub abre mas nao conclui o login, geralmente o problema esta no OAuth App do GitHub ou no provider GitHub do Supabase.

Erro comum observado:

```text
https://github.com/login/oauth/authorize?client_id=<email-ou-usuario>
```

Se o `client_id` na URL parece um e-mail, usuario ou nome comum, o provider GitHub do Supabase esta configurado errado. O Client ID deve vir de GitHub Developer Settings > OAuth Apps.

No GitHub Developer Settings > OAuth Apps:

```text
Homepage URL: https://dev--portal-faturamento-fiscal.netlify.app
Authorization callback URL: https://lvsocwetuhhqxlwyfdrw.supabase.co/auth/v1/callback
```

Para PROD, use outro OAuth App ou adicione/ajuste callback para:

```text
https://eukazzizamxratkavcap.supabase.co/auth/v1/callback
```

No Supabase DEV, em Authentication > Providers > GitHub:

```text
Enabled: on
Client ID: Client ID do OAuth App GitHub
Client Secret: Client Secret do OAuth App GitHub
```

O `Client ID` do GitHub nao e o usuario GitHub e nao e e-mail. Ele e gerado pelo OAuth App.

## Google / Gmail

No Google Cloud Console, crie ou abra um OAuth Client do tipo Web application.

Authorized JavaScript origins para DEV:

```text
https://dev--portal-faturamento-fiscal.netlify.app
```

Authorized redirect URIs para DEV:

```text
https://lvsocwetuhhqxlwyfdrw.supabase.co/auth/v1/callback
```

No Supabase DEV, em Authentication > Providers > Google:

```text
Enabled: on
Client ID: Client ID do OAuth Client do Google
Client Secret: Client Secret do OAuth Client do Google
```

O login social do Google cobre contas Gmail e Google Workspace. Contas Outlook entram pelo provider Microsoft/Azure ou pelo cadastro normal por e-mail e senha.

## URL Configuration no Supabase

Em Authentication > URL Configuration, configurar por ambiente.

DEV:

```text
Site URL: https://dev--portal-faturamento-fiscal.netlify.app
Redirect URLs:
http://localhost:5173
http://127.0.0.1:5173
https://dev--portal-faturamento-fiscal.netlify.app
```

PROD:

```text
Site URL: https://portal-liberacao-embarque.netlify.app
Redirect URLs:
https://portal-liberacao-embarque.netlify.app
```

Se o nome real do site Netlify for outro, usar exatamente o dominio que aparece no navegador. OAuth e sensivel a diferenca entre `http`, `https`, `localhost`, `127.0.0.1` e subdominios de deploy preview.

## Variaveis Netlify

Branch `dev` deve apontar para Supabase DEV:

```text
VITE_SUPABASE_URL=https://lvsocwetuhhqxlwyfdrw.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key do DEV>
```

Branch `main` deve apontar para Supabase PROD:

```text
VITE_SUPABASE_URL=https://eukazzizamxratkavcap.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key do PROD>
```

## Checklist de Teste

1. Conferir se `Client ID` da Microsoft e GUID.
2. Conferir callback Microsoft para o projeto Supabase correto.
3. Conferir se `Client ID` do GitHub nao e e-mail e veio do OAuth App.
4. Conferir callback GitHub para o projeto Supabase correto.
5. Conferir Google OAuth Client ID/Secret e callback.
6. Conferir URLs autorizadas no Supabase Auth.
7. Conferir `VITE_SUPABASE_ANON_KEY` da Netlify para resolver `Unregistered API key`.
8. Fazer novo deploy Netlify depois de alterar variaveis de ambiente.
9. Testar Microsoft, Google e GitHub em janela anonima para evitar cache de sessao antiga.
