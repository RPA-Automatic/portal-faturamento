#!/usr/bin/env python3
"""Planeja ou registra estado e evidência em uma Task fiscal identificada por chave estável."""
from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from urllib.parse import quote, urlparse

from publish_devops_wiki import WikiError, authorization, request


ROOT = Path(__file__).resolve().parents[1]


def allowed_evidence(value: str) -> bool:
    parsed = urlparse(value)
    if parsed.scheme != 'https':
        return False
    if parsed.netloc == 'github.com':
        return parsed.path.startswith('/RPA-Automatic/portal-faturamento/')
    if parsed.netloc == 'dev.azure.com':
        return parsed.path.startswith('/rpa-automatic/RPA%20Automatic/') or parsed.path.startswith('/rpa-automatic/RPA Automatic/')
    return False


def update(task_key: str, state: str, evidence_url: str, summary: str, apply: bool = False) -> dict[str, object]:
    if not re.fullmatch(r'PF-F\d{2}-T\d{2}', task_key):
        raise WikiError('Chave de Task inválida.')
    if not allowed_evidence(evidence_url):
        raise WikiError('A evidência deve pertencer ao repositório ou ao projeto Azure DevOps configurado.')
    summary = summary.strip()
    if not summary or len(summary) > 500:
        raise WikiError('O resumo deve conter entre 1 e 500 caracteres.')

    cfg = json.loads((ROOT / 'azure-devops/config.json').read_text())
    state_file = json.loads((ROOT / 'azure-devops/backlog-state.json').read_text())
    ids = {item['key']: item['id'] for item in state_file['items']}
    task_id = ids.get(task_key)
    story_key = task_key.rsplit('-T', 1)[0]
    if not task_id or story_key not in ids:
        raise WikiError('Task ou User Story pai não encontrada no estado canônico.')

    auth = authorization()
    base = cfg['organization'] + '/' + quote(cfg['project'], safe='') + '/_apis/wit/workitems/'
    url = base + str(task_id) + '?api-version=7.1&%24expand=relations'
    current = request('GET', url, auth)[1]
    fields = current['fields']
    if (fields.get('System.TeamProject') != cfg['project'] or fields.get('System.WorkItemType') != 'Task'
            or fields.get('System.Parent') != ids[story_key]):
        raise WikiError('Task fora do projeto ou da hierarquia configurada.')

    relations = current.get('relations', [])
    has_evidence = any(link.get('rel') == 'Hyperlink' and link.get('url') == evidence_url for link in relations)
    actions = []
    if fields.get('System.State') != state:
        actions.append({'op': 'add', 'path': '/fields/System.State', 'value': state})
    if not has_evidence:
        actions.append({'op': 'add', 'path': '/relations/-', 'value': {
            'rel': 'Hyperlink', 'url': evidence_url, 'attributes': {'comment': 'Evidência do incremento'}
        }})
    if actions:
        actions.insert(0, {'op': 'test', 'path': '/rev', 'value': current['rev']})
        actions.append({'op': 'add', 'path': '/fields/System.History', 'value':
                        '<p><strong>Atualização do incremento:</strong> ' + html.escape(summary) +
                        '</p><p>Evidência vinculada ao card.</p>'})
    if apply and actions:
        request('PATCH', url, auth, actions, {'Content-Type': 'application/json-patch+json'})
        verified = request('GET', url, auth)[1]
        verified_links = verified.get('relations', [])
        if (verified['fields'].get('System.State') != state or
                not any(link.get('rel') == 'Hyperlink' and link.get('url') == evidence_url for link in verified_links)):
            raise WikiError('Estado ou evidência não conferem após atualização.')
    return {'mode': 'apply' if apply else 'plan', 'key': task_key, 'id': task_id,
            'previous_state': fields.get('System.State'), 'target_state': state,
            'action': 'reuse' if not actions else 'update', 'evidence_present': has_evidence}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--task', required=True)
    parser.add_argument('--state', required=True, choices=('Active', 'Closed'))
    parser.add_argument('--evidence-url', required=True)
    parser.add_argument('--summary', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    try:
        print(json.dumps(update(args.task, args.state, args.evidence_url, args.summary, args.apply), ensure_ascii=False, indent=2))
    except (WikiError, OSError, ValueError) as error:
        parser.exit(1, str(error) + '\n')
