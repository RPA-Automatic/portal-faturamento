#!/usr/bin/env python3
"""Converte os cards planejados após a troca Basic → Agile pela interface."""
import argparse
import json
from pathlib import Path
from urllib.parse import quote, urlencode
from publish_devops_wiki import WikiError, authorization, request

ROOT = Path(__file__).resolve().parents[1]
STATE_MAP = {'To Do': 'New', 'Doing': 'Active', 'Done': 'Closed'}


def conversion_patch(current, spec):
    """Usa a revisão lida; não altera responsáveis, datas, descrição ou relações."""
    fields = current['fields']
    before_type = fields['System.WorkItemType']
    if before_type not in {spec['before_type'], spec['after_type']}:
        raise WikiError('Tipo alterado fora do plano: ' + str(current['id']))
    state = fields['System.State']
    target_state = STATE_MAP.get(state, state)
    patch = [{'op': 'test', 'path': '/rev', 'value': current['rev']}]
    if before_type != spec['after_type']:
        patch.append({'op': 'add', 'path': '/fields/System.WorkItemType', 'value': spec['after_type']})
    if state != target_state:
        patch.append({'op': 'add', 'path': '/fields/System.State', 'value': target_state})
    return patch if len(patch) > 1 else []


def parent_patch(current, old_parent, new_parent, org):
    parents = [(i, r) for i, r in enumerate(current.get('relations', []))
               if r['rel'] == 'System.LinkTypes.Hierarchy-Reverse']
    if len(parents) != 1:
        raise WikiError('Quantidade inesperada de pais: ' + str(current['id']))
    index, relation = parents[0]
    id = int(relation['url'].rsplit('/', 1)[-1])
    if id == new_parent:
        return []
    if id != old_parent:
        raise WikiError('Pai alterado fora do plano: ' + str(current['id']))
    return [{'op': 'test', 'path': '/rev', 'value': current['rev']},
            {'op': 'remove', 'path': '/relations/' + str(index)},
            {'op': 'add', 'path': '/relations/-', 'value': {
                'rel': 'System.LinkTypes.Hierarchy-Reverse',
                'url': org + '/_apis/wit/workItems/' + str(new_parent)}}]


def run(apply=False):
    cfg = json.loads((ROOT / 'azure-devops/config.json').read_text())
    plan = json.loads((ROOT / 'azure-devops/agile-migration-plan.json').read_text())
    if cfg['organization'] != plan['organization'] or cfg['project'] != plan['project']:
        raise WikiError('Destino difere do plano.')
    auth = authorization()
    base = cfg['organization'] + '/' + quote(cfg['project'], safe='') + '/_apis/'

    def call(method, path, body=None, params=None, patch=False):
        return request(method, base + path + '?' + urlencode({'api-version': '7.1', **(params or {})}),
            auth, body, {'Content-Type': 'application/json-patch+json'} if patch else None)[1]

    types = {x['name']: x for x in call('GET', 'wit/workitemtypes')['value']}
    if not {'Epic', 'Feature', 'User Story', 'Task', 'Issue', 'Bug'}.issubset(types):
        raise WikiError('Projeto ainda não oferece Agile. Troque Basic → Agile na interface; nenhum card foi alterado.')

    def item(id):
        data = call('GET', 'wit/workitems/' + str(id), params={'$expand': 'relations'})
        if data['fields']['System.TeamProject'] != cfg['project']:
            raise WikiError('Card fora do projeto configurado.')
        return data

    # Validação de todos os cards antes da primeira escrita real.
    changes = []
    for spec in plan['changes']:
        current = item(spec['id'])
        patch = conversion_patch(current, spec)
        if patch:
            call('PATCH', 'wit/workitems/' + str(spec['id']), patch,
                 {'validateOnly': 'true', 'suppressNotifications': 'true'}, patch=True)
        changes.append((spec, current, patch))
    actions = []
    for spec, current, patch in changes:
        if apply and patch:
            call('PATCH', 'wit/workitems/' + str(spec['id']), patch, patch=True)
            verified = item(spec['id'])
            if verified['fields']['System.WorkItemType'] != spec['after_type']:
                raise WikiError('Tipo remoto não confirmado.')
        actions.append({'id': spec['id'], 'type': spec['after_type'], 'action': 'convert' if patch else 'reuse'})
    wiql = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '" + cfg['project'].replace("'", "''") + "' AND [System.Tags] CONTAINS 'RPA-Hierarchy'"
    ids = [x['id'] for x in call('POST', 'wit/wiql', {'query': wiql})['workItems']]
    existing = [item(id) for id in ids]
    features = []
    for group in plan['feature_groups']:
        matches = [x for x in existing if group['key'] in {t.strip() for t in x['fields'].get('System.Tags', '').split(';')}]
        if len(matches) > 1:
            raise WikiError('Feature duplicada: ' + group['key'])
        feature = matches[0] if matches else None
        if feature and (feature['fields']['System.WorkItemType'] != 'Feature' or feature['fields'].get('System.Parent') != group['epic']):
            raise WikiError('Feature existente fora da hierarquia esperada.')
        if apply and not feature:
            fields = {'System.Title': group['key'] + ' — ' + group['title'],
                      'System.Description': '<p>Capacidade composta pelas User Stories vinculadas. O aceite depende das entregas filhas e suas evidências. Não representa uma sprint adicional.</p>',
                      'System.Tags': 'RPA-Hierarchy; ' + group['key'] + ('; portal-faturamento' if group['epic'] == 26 else '; SDA'),
                      'System.AreaPath': cfg['project'] + ('\\portal-faturamento' if group['epic'] == 26 else ''),
                      'System.IterationPath': cfg['project']}
            patch = [{'op': 'add', 'path': '/fields/' + k, 'value': v} for k, v in fields.items()]
            patch.append({'op': 'add', 'path': '/relations/-', 'value': {
                'rel': 'System.LinkTypes.Hierarchy-Reverse', 'url': cfg['organization'] + '/_apis/wit/workItems/' + str(group['epic'])}})
            feature = call('POST', 'wit/workitems/$Feature', patch, patch=True)
        features.append({'key': group['key'], 'id': feature['id'] if feature else None, 'stories': group['stories']})
        if apply:
            for id in group['stories']:
                current = item(id)
                patch = parent_patch(current, group['epic'], feature['id'], cfg['organization'])
                if patch:
                    call('PATCH', 'wit/workitems/' + str(id), patch, patch=True)
                if item(id)['fields'].get('System.Parent') != feature['id']:
                    raise WikiError('Novo pai não confirmado.')
    return {'mode': 'apply' if apply else 'plan', 'cards': actions, 'features': features}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    try:
        result = run(args.apply)
        text = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
        if args.out:
            args.out.write_text(text)
        print(text)
    except WikiError as exc:
        parser.exit(1, str(exc) + '\n')
