# Backend Supabase - Portal de Faturamento

Este diretorio contem o backend oficial do Portal de Faturamento e Liberacao de Embarque.

## Estrutura

- `migrations/`: migrations versionadas do backend novo.
- `config.toml`: configuracao local do Supabase CLI para este projeto.
- `README Portal Liberacao Embarque.md`: visao do projeto, links, stack e principios.

## Backend Oficial

A migration principal atual e `migrations/20260501000100_initial_backend_schema.sql`.

Ela cria o modelo de dados do portal operacional, incluindo tabelas normalizadas, tabelas de staging para XLSX TOTVS/Datasul, views do Farol, RLS e regras iniciais.

## Legado

A pasta local `supabase/` dentro deste diretorio, quando existir como `supabase/supabase/`, pertence ao historico do Portal de Cadastro. Ela foi ignorada no Git porque contem migrations antigas, snippets de SQL Editor e automacoes que nao devem ser publicadas junto com o backend novo sem revisao.

## Fluxo Recomendado

1. Criar ou ajustar migrations em `supabase/migrations/`.
2. Validar localmente com Supabase CLI antes do deploy.
3. Versionar somente migrations, docs e codigo revisado.
4. Manter dados reais, `.env`, snippets e rascunhos fora do Git.

## Supabase CLI no Windows/VS Code

Se o terminal do VS Code retornar `supabase: The term 'supabase' is not recognized`, instale a CLI e reabra o terminal.

Opcao recomendada via winget:

```powershell
winget install Supabase.CLI
```

Alternativa via Scoop:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
iwr -useb get.scoop.sh | iex
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Validacao:

```powershell
supabase --version
supabase status
```

Para `supabase start`, `supabase status` e `supabase db reset`, o Docker Desktop precisa estar aberto e com Linux containers ativo. Se aparecer erro com `dockerDesktopLinuxEngine`, abra o Docker Desktop e aguarde ele ficar `Running` antes de repetir o comando.

Nao e necessario criar containers manualmente no Docker Desktop nem adicionar `docker-compose.yml` ao repositorio. O Supabase CLI cria e gerencia os containers, redes e volumes locais a partir de `supabase/config.toml`. O Docker Desktop serve como runtime e painel de monitoramento.

Comandos uteis neste repo:

```powershell
supabase start
supabase db reset
```

Comandos que consultam o projeto remoto, como `supabase migration list` e `supabase db push`, exigem `supabase link`. Antes de `db push`, confirme sempre o projeto alvo. O projeto DEV e PROD devem receber migrations em momentos separados.

## Ambientes DEV e PROD

O arquivo `supabase/config.toml` fica apontado para DEV por padrao. Isso reduz o risco de um comando remoto usar uma configuracao visualmente associada ao PROD.

Arquivos versionados:

- `supabase/config.dev.toml`: projeto DEV `lvsocwetuhhqxlwyfdrw`.
- `supabase/config.prod.toml`: projeto PROD `eukazzizamxratkavcap`.
- `supabase/config.toml`: copia ativa usada pelo CLI, mantida como DEV no repositorio.

Para selecionar DEV e fazer link remoto:

```powershell
.\scripts\supabase\Set-SupabaseEnvironment.ps1 -Environment dev -Link
```

Para selecionar PROD, a flag explicita `-ConfirmProduction` e obrigatoria:

```powershell
.\scripts\supabase\Set-SupabaseEnvironment.ps1 -Environment prod -ConfirmProduction -Link
```

O estado local de link do Supabase fica em `supabase/.temp/` e nao deve ser versionado.

## Advisor de Seguranca

Os alertas atuais do Advisor devem ser tratados por migrations versionadas sempre que possivel.

Ja existe uma migration para corrigir:

- `Security Definer View` em `v_operations_farol`, `v_area_backlog` e `v_contract_drilldown` usando `security_invoker`;
- `Function Search Path Mutable` em funcoes publicas criticas;
- `Auth RLS Initialization Plan` na policy de leitura do proprio perfil.

Arquivo:

```text
supabase/migrations/20260506000200_fix_supabase_advisor_findings.sql
```

Alguns alertas nao sao resolvidos por SQL de migration e precisam ser feitos no painel do Supabase, por exemplo:

- habilitar leaked password protection em Auth;
- revisar MFA e politicas de senha;
- revisar redirect URLs dos providers OAuth.