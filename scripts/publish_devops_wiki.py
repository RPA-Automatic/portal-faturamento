#!/usr/bin/env python3
"""Publica somente a árvore de wiki explicitamente configurada; padrão: plano."""
import argparse
import base64
import json
import os
import re
import subprocess
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler


class WikiError(RuntimeError):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def authorization():
    if token := os.getenv('AZURE_DEVOPS_BEARER_TOKEN'):
        return 'Bearer ' + token
    if token := os.getenv('AZURE_DEVOPS_PAT'):
        return 'Basic ' + base64.b64encode((':' + token).encode()).decode()
    cli = os.getenv('AZURE_CLI_WRAPPER')
    command = ['bash', cli] if cli else ['az']
    try:
        token = subprocess.check_output(command + ['account', 'get-access-token',
            '--resource', '499b84ac-1321-427f-aa17-267ca6975798',
            '--query', 'accessToken', '-o', 'tsv'], stderr=subprocess.DEVNULL, text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        raise WikiError('Autentique o Azure CLI ou configure credencial fora do chat.') from None
    if not token:
        raise WikiError('Azure CLI retornou credencial vazia.')
    return 'Bearer ' + token


def request(method, url, auth, body=None, headers=None):
    req = Request(url, method=method, data=None if body is None else json.dumps(body).encode(),
                  headers={'Authorization': auth, 'Content-Type': 'application/json',
                           'Accept': 'application/json', **(headers or {})})
    try:
        with build_opener(NoRedirect()).open(req, timeout=40) as response:
            return response.status, json.load(response), dict(response.headers)
    except HTTPError as exc:
        if method == 'GET' and exc.code == 404:
            return 404, {}, {}
        raise WikiError(f'HTTP {exc.code}: interrompido; releia o destino antes de repetir.') from None
    except (URLError, TimeoutError):
        raise WikiError('Falha de transporte; consulte o destino antes de repetir escrita.') from None


def load_pages(config_file):
    config_file = Path(config_file).resolve()
    cfg = json.loads(config_file.read_text())
    if not re.fullmatch(r'https://dev\.azure\.com/[A-Za-z0-9-]+', cfg['organization']):
        raise WikiError('Organização inválida.')
    if not re.fullmatch(r'/[a-z0-9-]+', cfg['page_root']):
        raise WikiError('A raiz deve identificar um único produto.')
    folder = config_file.parent / 'wiki'
    root = cfg['page_root']
    paths = [folder / (root[1:] + '.md'), *sorted((folder / root[1:]).rglob('*.md'))]
    pages = []
    for path in paths:
        if path.is_symlink() or not path.resolve().is_relative_to(folder.resolve()):
            raise WikiError('Arquivo fora da árvore permitida.')
        target = '/' + path.relative_to(folder).with_suffix('').as_posix()
        if target != root and not target.startswith(root + '/'):
            raise WikiError('Página fora do produto configurado.')
        content = path.read_text()
        if not content.strip():
            raise WikiError('Página vazia: ' + target)
        pages.append((target, content))
    return cfg, pages


def publish(config_file, apply=False, transport=request, auth=None):
    cfg, pages = load_pages(config_file)
    auth = auth or authorization()
    base = cfg['organization'] + '/' + quote(cfg['project'], safe='') + '/_apis/wiki/wikis/' + quote(cfg['wiki_id'], safe='')
    status, wiki, _ = transport('GET', base + '?api-version=7.1', auth)
    if status != 200 or wiki.get('id') != cfg['wiki_id'] or wiki.get('projectId') != cfg['project_id']:
        raise WikiError('Wiki ou projeto não correspondem ao destino configurado.')
    actions = []
    # Preflight de todas as páginas antes da primeira escrita.
    for target, content in pages:
        url = base + '/pages?' + urlencode({'api-version': '7.1', 'path': target, 'includeContent': 'true'})
        status, current, headers = transport('GET', url, auth)
        etag = next((v for k, v in headers.items() if k.lower() == 'etag'), None)
        if status == 200 and not etag:
            raise WikiError('Página existente sem ETag: ' + target)
        action = 'unchanged' if status == 200 and current.get('content') == content else ('create' if status == 404 else 'update')
        actions.append({'path': target, 'action': action, 'etag': etag, 'url': url, 'content': content})
    for action in actions:
        if not apply or action['action'] == 'unchanged':
            continue
        headers = {'If-Match': action['etag']} if action['etag'] else {'If-None-Match': '*'}
        transport('PUT', action['url'], auth, {'content': action['content']}, headers)
        status, verified, _ = transport('GET', action['url'], auth)
        if status != 200 or verified.get('content') != action['content']:
            raise WikiError('Conteúdo remoto não confere: ' + action['path'])
    return {'mode': 'apply' if apply else 'plan', 'project': cfg['project'],
            'page_root': cfg['page_root'], 'pages': [{k: a[k] for k in ('path', 'action')} for a in actions]}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', default=str(Path(__file__).resolve().parents[1] / 'azure-devops/config.json'))
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    try:
        print(json.dumps(publish(args.config, args.apply), ensure_ascii=False, indent=2))
    except (WikiError, ValueError, OSError) as exc:
        parser.exit(1, str(exc) + '\n')
