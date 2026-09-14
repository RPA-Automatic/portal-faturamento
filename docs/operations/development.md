# Desenvolvimento local e publicação

> Status: Aprovado  
> Responsável: @RodrigoFreitas16n91  
> Versão: 2.0  
> Última revisão: 2026-09-13

## Ambientes

O projeto usa Node.js 22, React/Vite e Supabase. `dev` é a branch de desenvolvimento; `main` publica produção no Netlify. O banco remoto fiscal é único, conforme a [ADR-0002](../decisions/ADR-0002-banco-fiscal-unico.md); testes de banco devem usar uma instância local isolada.

| Ambiente | Aplicação | Banco |
|---|---|---|
| Desenvolvimento | Vite local | Supabase/Postgres local |
| CI | Build e testes sintéticos | Postgres 17 efêmero |
| Produção | `https://portal-fiscal-faturamento.netlify.app` | `eukazzizamxratkavcap` |

Não apontar testes de carga ou cenários sintéticos para o banco remoto. Não provisionar outra branch paga como pré-requisito do desenvolvimento.

## Configuração local

Copie `frontend/.env.example` para `frontend/.env.local` e configure URL e chave pública do banco local. Esse arquivo é ignorado pelo Git.

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<chave publica local>
VITE_AUTH_OAUTH_PROVIDERS=
VITE_PUBLIC_SITE_URL=http://localhost:3000/
```

A lista de provedores sociais permanece vazia até os aplicativos estarem configurados. A chave publicável `sb_publishable_*` pode estar no frontend; `sb_secret_*`, `service_role` e Client Secrets OAuth nunca podem estar em arquivos públicos ou variáveis `VITE_`.

`VITE_PUBLIC_SITE_URL` define o retorno de cadastro, reenvio de confirmação e OAuth. Em produção, deve corresponder exatamente à URL permitida no Supabase. No desenvolvimento local, pode ser omitida para usar automaticamente a origem aberta no navegador.

```bash
npm --prefix frontend ci
npm --prefix frontend run dev
```

O Vite deste repositório usa a porta 3000 por padrão. Para OAuth local, registre exatamente o endereço efetivamente usado e o callback da instância Supabase local. Não reutilize credenciais de aplicativos de clientes.

Os estilos Tailwind são compilados pelo PostCSS a partir de `frontend/styles.css`; não há dependência do Play CDN em execução. `frontend/tailwind.config.cjs` inclui os componentes e arquivos TypeScript usados pela interface, com caminhos relativos à configuração. Ao criar outra pasta com componentes, inclua-a na lista de conteúdo. Use nomes de classes completos para que o build detecte também os estados condicionais. O CSS específico da entrada está em `frontend/components/Auth.css`.

## Autenticação

O acesso por e-mail permite cadastro, confirmação, login e logout. A conta criada não recebe acesso automático às operações: depende do perfil autorizado e das políticas RLS. Os provedores sociais planejados são Microsoft (`azure`), GitHub (`github`) e Google (`google`).

O SDK usa PKCE, armazena a sessão e processa o callback uma única vez. Não reintroduzir troca manual concorrente de tokens ou roteamento que consuma o fragmento OAuth antes do SDK.

A configuração dos aplicativos, os callbacks e a habilitação por `VITE_AUTH_OAUTH_PROVIDERS` estão no [passo a passo OAuth](../security/oauth-auth-setup.md). Não declarar um provedor homologado somente porque seu botão aparece ou porque `/authorize` responde com redirecionamento.

## Validação

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
node scripts/test_auth_ui.cjs
node scripts/test_portal_ui.cjs
python3 -m unittest discover -s scripts -p 'test_*.py' -v
```

`lint` executa TypeScript (`tsc --noEmit`). Os testes de navegador requerem Chromium do Playwright; a instalação em CI já está configurada. Eles interceptam o Supabase com dados sintéticos e não autenticam contas reais nos provedores.

Para alterações de banco, execute também `python3 scripts/test_database.py` contra Postgres local. O script cria e descarta um banco isolado, aplica migrations e verifica invariantes e RLS. Versões e hash das migrations remotas constam no manifesto de implantação.

## Publicação

1. Desenvolver e validar na `dev`.
2. Revisar alterações e documentação. Para migrations, validar localmente antes de aplicar no alvo fiscal autorizado.
3. Integrar a `main`; o Netlify compila `frontend/` e publica `frontend/dist/`.
4. Confirmar o commit efetivamente publicado, os checks de CI e a interface no domínio de produção.
5. Validar login real após configurar cada provedor OAuth. Registrar limitações e evidências sem credenciais ou dados pessoais.

A configuração pública de produção está em `[context.production.environment]` de `netlify.toml`. Ela contém URL fiscal, chave publicável e lista de provedores habilitados. Nenhum segredo OAuth pertence a esse arquivo. Previews e branch deploys precisam de sua própria configuração explícita; não herdar produção para testes de escrita.
