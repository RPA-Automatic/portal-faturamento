# Revisão atual de privacidade e LGPD — Portal Faturamento

> Status: Em revisão
> Responsável: RPA Automatic — responsável por privacidade a designar
> Versão: 1.0
> Última revisão: 2026-09-13
> Próxima revisão: antes de novas cargas de dados pessoais
> Documentos relacionados: [Catálogo documental](../README.md)

**Conformidade integral não comprovada.** A revisão atual distingue o endurecimento já aplicado das pendências de governança. O relatório histórico de maio não descreve as políticas atuais.

Consulta remota somente de metadados: 32 tabelas públicas com RLS, nenhuma com SELECT anônimo; cinco views com `security_invoker=true`; 15 funções públicas SECURITY DEFINER sem EXECUTE concedido aos papéis anônimo/autenticado. Bucket `operation-documents` privado, limite 50 MB. Políticas operacionais consultam perfil ativo e escopo da operação. Não foram lidos dados pessoais nem criados usuários ou registros de teste em produção.

O assessor de segurança retornou proteção de senhas vazadas desativada e 29 alertas sobre metadados de schema disponíveis ao papel autenticado via GraphQL. A exposição de metadados não comprova acesso indevido às linhas. Avaliar necessidade dessa interface e executar testes de acesso por perfil em DEV. A região do banco é `us-east-2`, nos EUA; contratos e mecanismo de transferência internacional não foram comprovados.

## Correções do incremento

- Fontes locais com licença preservada, sem chamadas externas de fontes pelo navegador.
- Cabeçalhos CSP, `nosniff`, restrição de enquadramento, referência e permissões de câmera/microfone/geolocalização.
- Nome neutro para a etapa de contratos do ERP em lista e quadro, preservando códigos e dados canônicos.
- Erro do Farol não exibe mensagens brutas do banco.
- Provedores de login não configurados ocultos; fluxo federado habilitado continua identificando a conta de destino.
- Referências comparativas de produto substituídas por critérios próprios RPA Automatic.

Nenhuma alteração remota de schema, políticas, usuários ou documentos foi executada neste incremento.

## Pendências prioritárias

| Ação | Critério de conclusão |
|---|---|
| Controlador e canal de privacidade | Razão social e contato reais aprovados; aviso acessível antes do cadastro |
| Registro de tratamento | Finalidade, categorias, base legal, papéis por cliente e operadores documentados |
| Contratos e transferências | Regiões, suboperadores e mecanismo aplicável avaliados |
| Retenção | Prazo justificado por categoria, inclusive documentos fiscais, auditoria, anexos e backups; descarte testado com exceções legais |
| Atendimento aos titulares | Canal com verificação de identidade proporcional; acesso, exportação, correção e exclusão/anonimização com isolamento e evidência |
| Auditoria mínima | Revisar cópias de linhas completas em `old_data`/`new_data`; restringir campos, acesso e retenção |
| Acesso administrativo | MFA, revisão de permissões e proteção de senhas vazadas conforme plano |
| Incidentes e continuidade | Responsáveis, procedimento de resposta/comunicação e restauração testados |

Código legado não usado pela entrada atual ainda contém um serviço de upload para bucket distinto. Não foi tratado como upload ativo comprovado; precisa ser removido ou homologado antes de reativação. Contratos, arquivos privados, histórico Git completo e backups não foram auditados integralmente.

O [relatório transversal dos três projetos](https://github.com/RPA-Automatic/portal-orchestrator-ai/blob/main/docs/security/lgpd-review-2026-09-13.md) concentra o inventário e o plano conjunto. A revisão está baseada na [LGPD, texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) e nas evidências técnicas descritas, sem certificação ou parecer jurídico.

## Validação do incremento

TypeScript e build Vite passaram em Node 22.23.2. Testes `test_auth_ui.cjs` e `test_portal_ui.cjs` passaram com interceptação local e dados sintéticos; 18 testes Python de scripts passaram. Os testes de autenticação exercitam login, cadastro, reenvio, logout, PKCE, callback único, erros sem detalhes do provedor e ausência de botões não configurados. Nenhum teste gravou no banco remoto. A alteração não inclui migrations.
