#!/usr/bin/env python3
"""Acrescenta checklists verificáveis às Tasks fiscais, sem substituir sua descrição."""
import argparse
import html
import json
import re
from pathlib import Path
from urllib.parse import quote
from publish_devops_wiki import authorization, request, WikiError

ROOT = Path(__file__).resolve().parents[1]
MARKER = 'Subtarefas e verificações (PF-checklist-v1)'


def checklist(spec):
    parts = [part.strip().rstrip('.') for part in spec['acceptance'].split(';') if part.strip()]
    parts.append('Registrar evidências no card e conferir os critérios de aceite antes de concluir')
    return '<h3>' + MARKER + '</h3><p>Marcação manual: trocar ☐ por ☑ ao verificar cada passo. Trabalho com responsável ou esforço próprio deve ser outra Task da mesma User Story.</p><ul>' + ''.join('<li>☐ ' + html.escape(part) + '.</li>' for part in parts) + '</ul>'


def run(apply=False):
    cfg = json.loads((ROOT / 'azure-devops/config.json').read_text())
    backlog = json.loads((ROOT / 'azure-devops/backlog.json').read_text())
    ids = {x['key']: x['id'] for x in json.loads((ROOT / 'azure-devops/backlog-state.json').read_text())['items']}
    auth = authorization()
    base = cfg['organization'] + '/' + quote(cfg['project'], safe='') + '/_apis/wit/workitems/'
    prepared = []
    for story in backlog['issues']:
        for task in story['tasks']:
            url = base + str(ids[task['key']]) + '?api-version=7.1&%24expand=relations'
            current = request('GET', url, auth)[1]
            fields = current['fields']
            if (fields['System.TeamProject'] != cfg['project'] or fields['System.WorkItemType'] != 'Task'
                    or fields.get('System.Parent') != ids[story['key']]):
                raise WikiError('Task fora da hierarquia esperada.')
            original = fields.get('System.Description', '')
            content = original if MARKER in original else original + checklist(task)
            prepared.append((url, current, original, content))
    result = []
    for url, current, original, content in prepared:
        if apply and content != original:
            patch = [{'op': 'test', 'path': '/rev', 'value': current['rev']},
                     {'op': 'add', 'path': '/fields/System.Description', 'value': content}]
            request('PATCH', url, auth, patch, {'Content-Type': 'application/json-patch+json'})
            verified = request('GET', url, auth)[1]
            # Azure sanitiza HTML adicionando espaços antes das tags de fechamento.
            normalize = lambda value: re.sub(r'\s+(?=<)', '', value).strip()
            if normalize(verified['fields']['System.Description']) != normalize(content):
                raise WikiError('Checklist remoto difere do conteúdo preparado.')
        result.append({'id': current['id'], 'action': 'append' if content != original else 'reuse'})
    return {'mode': 'apply' if apply else 'plan', 'tasks': result}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    result = json.dumps(run(args.apply), ensure_ascii=False, indent=2) + '\n'
    if args.out:
        args.out.write_text(result)
    print(result)
