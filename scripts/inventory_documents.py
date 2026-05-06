from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import re
from pathlib import Path
from typing import Any


DOCUMENT_TYPE_RULES: list[tuple[str, str]] = [
    ("instrucao_compra", r"instr[uú]c[aã]o fiscal|instru[cç][oõ]es fiscais|orienta[cç][aã]o para a emiss[aã]o"),
    ("instrucao_venda", r"venda|5102|cfop"),
    ("liberacao_embarque", r"libera[cç][aã]o|autoriza[cç][aã]o|embarque"),
    ("liberacao_fiscal", r"fiscal|faturamento|nota|nf\s"),
    ("nota_fiscal", r"^nf\s|nota fiscal"),
    ("ordem_logistica", r"agendamento|manual|plataforma|descarga|terminal|rota"),
]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def detect_operation(folder_name: str) -> str | None:
    match = re.search(r"\bOP\.?\s*(\d+)", folder_name, flags=re.IGNORECASE)
    return match.group(1) if match else None


def detect_contracts(text: str) -> list[str]:
    return sorted(set(re.findall(r"\b\d{7}-\d{3}\b", text)))


def classify_document(path: Path) -> str:
    normalized = path.name.lower()
    for document_type, pattern in DOCUMENT_TYPE_RULES:
        if re.search(pattern, normalized, flags=re.IGNORECASE):
            return document_type
    return "outro"


def inventory_file(path: Path, source_root: Path) -> dict[str, Any]:
    relative = path.relative_to(source_root)
    operation_folder = relative.parts[0] if len(relative.parts) > 1 else ""
    mime_type, _ = mimetypes.guess_type(path.name)
    contracts = detect_contracts(path.name)

    return {
        "relative_path": str(relative),
        "file_name": path.name,
        "operation_folder": operation_folder,
        "operation_number": detect_operation(operation_folder),
        "contracts_from_name": contracts,
        "document_type": classify_document(path),
        "extension": path.suffix.lower(),
        "mime_type": mime_type or "application/octet-stream",
        "size_bytes": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Inventory private operation documents with hashes.")
    parser.add_argument("source", type=Path, help="Directory containing OP folders")
    parser.add_argument("--output", type=Path, required=True, help="JSON output file")
    args = parser.parse_args()

    files = sorted(path for path in args.source.rglob("*") if path.is_file())
    inventory = [inventory_file(path, args.source) for path in files]

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Inventariados {len(inventory)} documentos em {args.output}")


if __name__ == "__main__":
    main()