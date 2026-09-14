#!/usr/bin/env python3
"""Gera, valida e compara/publica a wiki do incremento atual no escopo do produto."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def execute(arguments: list[str]) -> str:
    result = subprocess.run(
        [sys.executable, *arguments], cwd=ROOT, env=os.environ.copy(),
        check=False, capture_output=True, text=True,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or f"Falha ao executar {arguments[0]}")
    return result.stdout.strip()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Publica páginas alteradas após preflight remoto')
    parser.add_argument('--local-only', action='store_true', help='Gera e valida sem consultar o Azure DevOps')
    args = parser.parse_args()
    if args.apply and args.local_only:
        parser.error('--apply e --local-only são mutuamente exclusivos')

    execute(['scripts/build_devops_wiki.py'])
    execute(['scripts/test_devops_wiki.py'])
    payload: dict[str, object] = {'wiki_generated': True, 'tests': 'passed'}
    if not args.local_only:
        command = ['scripts/publish_devops_wiki.py']
        if args.apply:
            command.append('--apply')
        payload['remote'] = json.loads(execute(command))
    else:
        payload['remote'] = 'not_checked'
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (OSError, RuntimeError, ValueError, json.JSONDecodeError) as error:
        raise SystemExit(str(error)) from None
