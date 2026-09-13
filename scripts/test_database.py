#!/usr/bin/env python3
"""Valida toda a cadeia em um database PostgreSQL LOCAL novo; nunca aceita host remoto."""
import os
import subprocess
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
pgbin = os.environ.get('PG_BIN', '')
psql = str(Path(pgbin) / 'psql') if pgbin else 'psql'
port = os.environ.get('PF_TEST_PG_PORT', '55482')
name = 'pf_test_' + uuid.uuid4().hex[:12]
base = [psql, '-X', '-h', '127.0.0.1', '-p', port, '-v', 'ON_ERROR_STOP=1']

def run(database, *args):
    result = subprocess.run([*base, '-d', database, *args], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-3000:])
    return result.stdout

def main():
    try:
        run('postgres', '-c', 'create database ' + name)
        # Roles são globais ao cluster. O bootstrap suporta um cluster de testes já inicializado.
        bootstrap = (ROOT / 'supabase/tests/bootstrap_local.sql').read_text()
        for role in ['anon','authenticated','service_role']:
            statement = 'create role ' + role + (' nologin bypassrls;' if role == 'service_role' else ' nologin;')
            bootstrap = bootstrap.replace(statement, "do $$begin " + statement + " exception when duplicate_object then null; end$$;")
        run(name, '-c', bootstrap)
        for migration in sorted((ROOT / 'supabase/migrations').glob('*.sql')):
            run(name, '--single-transaction', '-f', str(migration))
            print('PASS migration', migration.name)
        run(name, '-f', str(ROOT / 'supabase/tests/fiscal_model.sql'))
        print('PASS fiscal schema, constraints, workflow, RLS and audit assertions')
    finally:
        run('postgres', '-c', 'drop database if exists ' + name)

if __name__ == '__main__':
    main()
