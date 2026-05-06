from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


class SupabaseRest:
    def __init__(self, url: str, key: str):
        self.base_url = url.rstrip("/")
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def request(self, method: str, path: str, payload: Any | None = None, prefer: str | None = None) -> Any:
        headers = dict(self.headers)
        if prefer:
            headers["Prefer"] = prefer
        body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        request = urllib.request.Request(f"{self.base_url}/rest/v1/{path}", data=body, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request) as response:
                content = response.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8")
            raise RuntimeError(f"Supabase {method} {path} falhou: {error.code} {detail}") from error
        return json.loads(content) if content else None

    def get_by_signature(self, signature: str) -> list[dict[str, Any]]:
        query = urllib.parse.urlencode({"file_signature": f"eq.{signature}", "select": "id,file_signature"})
        return self.request("GET", f"documents?{query}") or []

    def insert_documents(self, rows: list[dict[str, Any]]) -> None:
        self.request("POST", "documents", rows, prefer="return=minimal")


def build_document_row(item: dict[str, Any]) -> dict[str, Any]:
    storage_path = f"operations/{item['operation_folder']}/{item['file_name']}".replace("\\", "/")
    return {
        "type": item["document_type"],
        "title": item["file_name"],
        "storage_path": storage_path,
        "file_signature": item["sha256"],
        "status": "pendente",
        "metadata": {
            "source": "op_private_inventory",
            "local_relative_path": item["relative_path"],
            "operation_folder": item["operation_folder"],
            "operation_number": item["operation_number"],
            "contracts_from_name": item["contracts_from_name"],
            "extension": item["extension"],
            "mime_type": item["mime_type"],
            "size_bytes": item["size_bytes"],
            "registered_at": dt.datetime.now(dt.UTC).isoformat(),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Register OP document hashes into Supabase documents table.")
    parser.add_argument("inventory", type=Path, help="documents-inventory.json path")
    parser.add_argument("--dry-run", action="store_true", help="Show rows without sending data")
    args = parser.parse_args()

    inventory = json.loads(args.inventory.read_text(encoding="utf-8"))
    rows = [build_document_row(item) for item in inventory]

    if args.dry_run:
        print(json.dumps({"documents_total": len(rows), "sample": rows[:5]}, ensure_ascii=False, indent=2))
        return

    supabase_url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        raise SystemExit("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente local para registrar documentos.")

    client = SupabaseRest(supabase_url, service_role_key)
    new_rows = [row for row in rows if not client.get_by_signature(row["file_signature"])]
    if new_rows:
        client.insert_documents(new_rows)
    print(json.dumps({"documents_total": len(rows), "inserted": len(new_rows), "skipped_existing": len(rows) - len(new_rows)}, indent=2))


if __name__ == "__main__":
    main()