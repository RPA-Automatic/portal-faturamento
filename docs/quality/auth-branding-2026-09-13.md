# Validação de autenticação e identidade

> Status: Implementado no frontend; OAuth externo pendente  
> Responsável: @RodrigoFreitas16n91  
> Última revisão: 2026-09-13

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

Os testes de autenticação usam respostas simuladas. Não comprovam envio de e-mail, consentimento, validade de Client Secrets ou login completo em provedores reais. Esses testes operacionais dependem da configuração descrita no [guia OAuth](../security/oauth-auth-setup.md).
