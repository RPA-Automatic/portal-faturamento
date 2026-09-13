#!/usr/bin/env python3
"""Gera a wiki fiscal a partir de uma lista explícita de documentos canônicos."""
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SECTIONS = {
    'Organizacao-do-backlog': ['governance/work-item-hierarchy.md'],
    'Visao-do-produto': ['product/vision.md', 'product/fiscal-context.md'],
    'Arquitetura': ['architecture/overview.md'],
    'Especificacao-tecnica': ['architecture/SDD.md'],
    'Fluxo-operacional': ['product/operational-workflow.md'],
    'Modelo-de-dados': ['data/fiscal-schema.md', 'architecture/domain-model.md'],
    'Referencias-de-mercado': ['product/market-benchmark.md'],
    'Integracoes': ['integrations/totvs-data-sources.md'],
    'Seguranca': ['security/security-lgpd-audit.md', 'security/oauth-auth-setup.md'],
    'Identidade-visual': ['product/brand.md'],
    'DevOps-e-operacao': ['operations/azure-devops.md', 'operations/development.md'],
    'To-do': ['product/delivery-plan.md'],
    'Decisoes': ['decisions/ADR-0001-organizacao-azure-devops.md'],
    'Qualidade': ['quality/auth-branding-2026-09-13.md', 'quality/schema-delivery-2026-09-13.md', 'quality/devops-planning-2026-09-13.md', 'quality/source-review-2026-09-13.md', 'quality/environment-audit-2026-09-13.md'],
}


def main():
    cfg = json.loads((ROOT / 'azure-devops/config.json').read_text())
    folder = ROOT / 'azure-devops/wiki/portal-faturamento'
    folder.mkdir(parents=True, exist_ok=True)
    base = cfg['organization'] + '/' + quote(cfg['project'], safe='') + '/_wiki/wikis/' + cfg['wiki_id'] + '?pagePath='

    def link(section=''):
        return base + quote('/portal-faturamento' + ('/' + section if section else ''), safe='')

    sources = {(ROOT / 'docs' / source).resolve(): section for section, files in SECTIONS.items() for source in files}

    def project_links(content, source):
        def replace(match):
            label, target = match.group(1), match.group(2)
            if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target) or target.startswith('#'):
                return match.group(0)
            path = (source.parent / target.split('#')[0]).resolve()
            if path in sources:
                return '[' + label + '](' + link(sources[path]) + ')'
            if path == (ROOT / 'docs/README.md').resolve():
                return '[' + label + '](' + link() + ')'
            if not path.is_relative_to(ROOT):
                return label + ' (referência local)'
            return label + ' (`' + path.relative_to(ROOT).as_posix() + '`, fonte no repositório)'
        return re.sub(r'\[([^\]]*)\]\(([^)]+)\)', replace, content)

    banner = '> Projeção operacional revisada em 2026-09-13. `docs/` é a fonte técnica canônica; consulte código e decisões no repositório canônico. Estado planejado não equivale a implantação.\n\n'
    for section, files in SECTIONS.items():
        content = banner
        for relative in files:
            source = ROOT / 'docs' / relative
            content += '> Fonte: `docs/' + relative + '`\n\n' + project_links(source.read_text(), source) + '\n\n'
        if section == 'To-do' and (ROOT / 'azure-devops/backlog-state.json').exists():
            if (ROOT / 'azure-devops/board-views.json').exists():
                views = json.loads((ROOT / 'azure-devops/board-views.json').read_text())
                content += '## Consultas de acompanhamento\n\n'
                for query in views['queries']:
                    content += '- [' + query['name'] + '](' + query['url'] + ')\n'
                content += '\n'
            state = json.loads((ROOT / 'azure-devops/backlog-state.json').read_text())
            content += '## Cards criados no Azure Boards\n\nEstado atual deve ser consultado no card; esta lista contém os identificadores de criação.\n\n| Chave | Card |\n|---|---|\n'
            for item in state['items']:
                content += '| ' + item['key'] + ' | [#' + str(item['id']) + '](' + cfg['organization'] + '/' + quote(cfg['project'], safe='') + '/_workitems/edit/' + str(item['id']) + ') |\n'
        content += '\n[Voltar ao produto](' + link() + ')\n'
        (folder / (section + '.md')).write_text(content)
    diagrams = '# Diagramas\n\n' + banner + 'As representações de ambientes e fluxo descrevem a arquitetura desejada; não comprovam provisionamento ou automação concluída. Fontes `.mmd` e derivados `.svg` ficam em `docs/architecture/diagrams/`.\n\n'
    for name in ['context', 'containers', 'totvs-farol-flow', 'auth-rls-sequence', 'environments']:
        source = ROOT / 'docs/architecture/diagrams' / (name + '.mmd')
        diagrams += '## ' + name + '\n\n::: mermaid\n' + source.read_text().replace('flowchart ', 'graph ', 1) + ':::\n\n'
    (folder / 'Diagramas.md').write_text(diagrams + '[Voltar ao produto](' + link() + ')\n')
    intro = '# Portal Faturamento — Liberação de Embarque\n\n' + banner
    intro += '[Épico #26](' + cfg['organization'] + '/' + quote(cfg['project'], safe='') + '/_workitems/edit/26) · [Código no GitHub](' + cfg['repo_url'] + ')\n\n'
    intro += 'O portal antecipa impedimentos de embarque e apresenta, por OP, o que falta, quem resolve e qual evidência sustenta a liberação.\n\n'
    intro += '## Situação verificada\n\nFarol inicial, filtros, indicadores e autenticação existem no código. Documentação organizada e correção local do importador de compras disponíveis. Ficha de consulta da OP e esquema fiscal de 32 tabelas implantados. Cargas, ações de aprovação, validação integral das regras e implantação operacional permanecem no plano. Typecheck e build locais passaram em 2026-09-13; isso não comprova operação remota.\n\n'
    intro += '## Entrega em quatro sprints\n\nQuatro sprints de duas semanas (oito semanas), com início/capacidade a definir; 5 Features, 12 User Stories e 48 Tasks sob o épico #26.\n\n| Sprint | Foco |\n|---|---|\n| 1 | Requisitos, ambientes e qualidade base |\n| 2 | Farol, detalhe e tratamento operacional |\n| 3 | Integrações, regras e testes integrados |\n| 4 | Homologação, deploy, assistência e encerramento |\n\n'
    intro += '## Documentação\n\n'
    for section in [*SECTIONS, 'Diagramas']:
        intro += '- [' + section.replace('-', ' ') + '](' + link(section) + ')\n'
    (folder.parent / 'portal-faturamento.md').write_text(intro)
    print(f'Wiki fiscal gerada: {len(SECTIONS) + 2} páginas; fontes privadas excluídas por lista explícita.')


if __name__ == '__main__':
    main()
