#!/usr/bin/env python3
"""Diagnóstico público de OAuth. Não acessa secrets nem comprova login completo."""
import json
import re
import sys
import tomllib
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def main():
    config = tomllib.loads((ROOT / 'netlify.toml').read_text())['context']['production']['environment']
    target = json.loads((ROOT / 'supabase/targets.json').read_text())['prod']
    base = config['VITE_SUPABASE_URL'].rstrip('/')
    if base != f'https://{target}.supabase.co':
        raise ValueError('Configuração de produção diverge do alvo fiscal.')
    opener = urllib.request.build_opener(NoRedirect)
    request = urllib.request.Request(base + '/auth/v1/settings', headers={'apikey': config['VITE_SUPABASE_ANON_KEY']})
    with urllib.request.urlopen(request, timeout=20) as response:
        settings = json.load(response)
    print('Projeto fiscal: configuração pública de Auth acessível.')
    print('E-mail habilitado:', bool(settings.get('external', {}).get('email')))
    findings = {}
    for provider in ('azure', 'github', 'google'):
        if not settings.get('external', {}).get(provider):
            findings[provider] = 'desabilitado no Supabase'
            continue
        url = base + '/auth/v1/authorize?' + urllib.parse.urlencode({
            'provider': provider, 'redirect_to': 'https://portal-fiscal-faturamento.netlify.app/',
            'scopes': 'email' if provider == 'azure' else '',
        })
        try:
            response = opener.open(url, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            location = urllib.parse.urlparse(response.headers.get('Location', ''))
            params = urllib.parse.parse_qs(location.query)
            client_id = params.get('client_id', [''])[0]
            callback = params.get('redirect_uri', [''])[0]
            if response.code != 302 or callback != base + '/auth/v1/callback':
                findings[provider] = 'redirecionamento inválido; revisar painel'
                continue
            patterns = {
                'azure': r'[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}',
                'github': r'(?:[a-f0-9]{20}|Ov23[a-zA-Z0-9]{16})',
                'google': r'[a-zA-Z0-9-]+\.apps\.googleusercontent\.com',
            }
            findings[provider] = ('formato de ID e callback compatíveis; login real ainda precisa ser testado'
                                  if re.fullmatch(patterns[provider], client_id)
                                  else 'Client ID incompatível com o formato esperado; revisar cadastro do aplicativo')
    print(json.dumps(findings, ensure_ascii=False, indent=2))
    print('Não foram consultados Client Secrets. Este teste não verifica validade de credenciais, consentimento ou acesso a dados.')
    return 0 if all(value.startswith('formato de ID') for value in findings.values()) else 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        # Avoid logging response bodies/redirect URLs which may contain provider data.
        print('Diagnóstico não concluído:', type(error).__name__, file=sys.stderr)
        sys.exit(2)
