#!/usr/bin/env python3
"""Planeja/cria o backlog fiscal sem duplicar épico ou redefinir cards existentes."""
import argparse
import html
import json
from pathlib import Path
from urllib.parse import quote, urlencode
from publish_devops_wiki import authorization, request, WikiError

ROOT = Path(__file__).resolve().parents[1]


def run(apply=False):
    cfg = json.loads((ROOT / 'azure-devops/config.json').read_text())
    backlog = json.loads((ROOT / 'azure-devops/backlog.json').read_text())
    auth = authorization()
    base = cfg['organization'] + '/' + quote(cfg['project'], safe='') + '/_apis/'

    def call(method, path, body=None, params=None, patch=False):
        return request(method, base + path + '?' + urlencode({'api-version': '7.1', **(params or {})}),
                       auth, body, {'Content-Type': 'application/json-patch+json'} if patch else None)

    def item(id):
        status, data, _ = call('GET', 'wit/workitems/' + str(id), params={'$expand': 'relations'})
        if status != 200 or data['fields']['System.TeamProject'] != cfg['project']:
            raise WikiError('Card fora do projeto esperado.')
        return data

    epic = item(cfg['epic_id'])
    if epic['fields']['System.WorkItemType'] != 'Epic' or backlog['epic_id'] != epic['id']:
        raise WikiError('Épico incorreto.')
    types = call('GET', 'wit/workitemtypes')[1]['value']
    agile = 'Feature' in {t['name'] for t in types}
    feature_ids = {}
    if agile:
        state_path = ROOT / 'azure-devops/agile-hierarchy-state.json'
        if not state_path.exists():
            raise WikiError('Conclua a migração de hierarquia antes de provisionar backlog Agile; Issues não serão recriadas.')
        for group in json.loads(state_path.read_text())['features']:
            if group['key'].startswith('PF-'):
                feature = item(group['id'])
                if feature['fields']['System.WorkItemType'] != 'Feature' or feature['fields'].get('System.Parent') != epic['id']:
                    raise WikiError('Feature fora do épico fiscal.')
                feature_ids[group['key']] = group['id']
    if not {'Epic', 'Issue', 'Task'}.issubset({t['name'] for t in types}):
        raise WikiError('Processo Basic esperado.')
    wiql = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '" + cfg['project'].replace("'", "''") + "' AND [System.Tags] CONTAINS 'Portal-Faturamento-Plan'"
    ids = [x['id'] for x in call('POST', 'wit/wiql', {'query': wiql})[1]['workItems']]
    existing = {}
    if ids:
        for start in range(0, len(ids), 200):
            records = call('POST', 'wit/workitemsbatch', {'ids': ids[start:start+200],
                'fields': ['System.Id', 'System.WorkItemType', 'System.Parent', 'System.Tags']})[1]['value']
            for record in records:
                for tag in record['fields'].get('System.Tags', '').split(';'):
                    tag = tag.strip()
                    if tag.startswith('PF-F'):
                        if tag in existing:
                            raise WikiError('Chave duplicada no Azure Boards: ' + tag)
                        existing[tag] = record
    nodes = []
    for kind, path, name in [('areas', '', 'portal-faturamento'), ('iterations', '', 'portal-faturamento')] + [
            ('iterations', '/portal-faturamento', 'Sprint ' + str(s)) for s in range(1, 5)]:
        endpoint = 'wit/classificationnodes/' + kind + path
        status, node, _ = call('GET', endpoint + '/' + quote(name, safe=''))
        if status == 404 and apply:
            node = call('POST', endpoint, {'name': name})[1]
        nodes.append({'kind': kind, 'name': name, 'action': 'create' if status == 404 else 'reuse'})
    actions = []
    mapping = {}
    wiki = cfg['organization'] + '/' + quote(cfg['project'], safe='') + '/_wiki/wikis/' + cfg['wiki_id'] + '?pagePath=%2Fportal-faturamento%2FTo-do'

    def ensure(spec, work_type, parent_id, sprint):
        current = existing.get(spec['key'])
        if current:
            if current['fields']['System.WorkItemType'] != work_type or current['fields'].get('System.Parent') != parent_id:
                raise WikiError('Tipo/pai divergente para ' + spec['key'])
            actions.append({'key': spec['key'], 'id': current['id'], 'action': 'reuse'})
            return current['id']
        actions.append({'key': spec['key'], 'action': 'create'})
        if not apply:
            return None
        acceptance = spec.get('acceptance') or 'Todas as tarefas filhas atendem aos critérios de aceite, com evidências; incremento validado na review. Dependências: ' + ', '.join(spec.get('depends_on', []))
        description = '<p>' + html.escape(acceptance) + '</p><p>Planejado para Sprint ' + str(sprint) + ' (duas semanas). Início, capacidade e responsáveis individuais a definir. Não representa conclusão.</p>'
        fields = {'System.Title': spec['key'] + ' — ' + spec['title'],
                  'System.Description': description,
                  'System.Tags': 'portal-faturamento; Portal-Faturamento-Plan; ' + spec['key'],
                  'System.AreaPath': cfg['project'] + '\\portal-faturamento',
                  'System.IterationPath': cfg['project'] + '\\portal-faturamento\\Sprint ' + str(sprint)}
        patch = [{'op': 'add', 'path': '/fields/' + k, 'value': v} for k, v in fields.items()]
        for rel, url in [('System.LinkTypes.Hierarchy-Reverse', cfg['organization'] + '/_apis/wit/workItems/' + str(parent_id)), ('Hyperlink', wiki), ('Hyperlink', cfg['repo_url'])]:
            patch.append({'op': 'add', 'path': '/relations/-', 'value': {'rel': rel, 'url': url}})
        created = call('POST', 'wit/workitems/$' + work_type, patch, patch=True)[1]
        verified = item(created['id'])
        if verified['fields'].get('System.Parent') != parent_id:
            raise WikiError('Hierarquia não confirmada após criação.')
        existing[spec['key']] = verified
        actions[-1]['id'] = verified['id']
        return verified['id']

    for spec in backlog['issues']:
        if agile and spec.get('feature_key') not in feature_ids:
            raise WikiError('Feature não configurada para ' + spec['key'])
        parent = ensure(spec, 'User Story' if agile else 'Issue',
                        feature_ids[spec['feature_key']] if agile else epic['id'], spec['sprint'])
        mapping[spec['key']] = parent
        for task in spec['tasks']:
            mapping[task['key']] = ensure(task, 'Task', parent, spec['sprint'])
    if apply:
        for spec in backlog['issues']:
            current = item(mapping[spec['key']])
            patch = [{'op': 'test', 'path': '/rev', 'value': current['rev']}]
            predecessors = {r['url'].rsplit('/', 1)[-1] for r in current.get('relations', []) if r['rel'] == 'System.LinkTypes.Dependency-Reverse'}
            for dependency in spec['depends_on']:
                id = mapping[dependency]
                if str(id) not in predecessors:
                    patch.append({'op': 'add', 'path': '/relations/-', 'value': {'rel': 'System.LinkTypes.Dependency-Reverse', 'url': cfg['organization'] + '/_apis/wit/workItems/' + str(id)}})
            if len(patch) > 1:
                call('PATCH', 'wit/workitems/' + str(current['id']), patch, patch=True)
                verified = item(current['id'])
                actual = {r['url'].rsplit('/', 1)[-1] for r in verified.get('relations', []) if r['rel'] == 'System.LinkTypes.Dependency-Reverse'}
                if not {str(mapping[d]) for d in spec['depends_on']}.issubset(actual):
                    raise WikiError('Dependências não confirmadas.')
    return {'mode': 'apply' if apply else 'plan', 'epic_id': epic['id'], 'nodes': nodes, 'items': actions}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    result = run(args.apply)
    data = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.out:
        args.out.write_text(data)
    print(data)
