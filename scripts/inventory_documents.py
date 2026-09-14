from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import re
from pathlib import Path
from typing import Any


DOCUMENT_TYPE_RULES: list[tuple[str, str]] = [
    ("autorizacao_transferencia", r"autoriza[cç][aã]o"),
    ("instrucao_embarque", r"instr[uú][cç][aã]o de embarque"),
    ("instrucao_descarga", r"instr[uú][cç][aã]o de descarga|terminal"),
    ("manual_agendamento", r"manual|plataforma|agendamento"),
    ("orientacao_emissao_nf", r"orienta[cç][aã]o para a emiss[aã]o"),
    ("instrucao_fiscal_compra", r"instr[uú][cç][aã]o fiscal contrato|instru[cç][oõ]es fiscais"),
    ("instrucao_fiscal_venda", r"venda dentro do estado|5102|5502"),
    ("nota_fiscal", r"^nf\s|nota fiscal"),
    ("confirmacao_comercial", r"^enc_|^res_|confirma[cç][aã]o|\bcn\b"),
    ("liberacao_embarque", r"libera[cç][aã]o.*embarque|libera[cç][aã]o op"),
    ("evidencia_email", r"\.eml$|\.msg$|^re_"),
    ("procedimento_fiscal", r"cfop|natureza de opera[cç][aã]o|dados adicionais"),
    ("ordem_logistica", r"rota|ordem log[ií]stica"),
]

LEGACY_DOCUMENT_TYPES = {
    "instrucao_fiscal_compra": "instrucao_compra",
    "instrucao_fiscal_venda": "instrucao_venda",
    "orientacao_emissao_nf": "instrucao_venda",
    "procedimento_fiscal": "instrucao_venda",
    "liberacao_embarque": "liberacao_embarque",
    "autorizacao_transferencia": "liberacao_embarque",
    "liberacao_fiscal": "liberacao_fiscal",
    "nota_fiscal": "nota_fiscal",
    "instrucao_embarque": "ordem_logistica",
    "instrucao_descarga": "ordem_logistica",
    "manual_agendamento": "ordem_logistica",
    "ordem_logistica": "ordem_logistica",
    "confirmacao_comercial": "outro",
    "evidencia_email": "outro",
    "outro": "outro",
}


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
    if path.suffix.lower() in {".eml", ".msg"}:
        return "evidencia_email"
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

    document_type = classify_document(path)
    return {
        "relative_path": str(relative),
        "file_name": path.name,
        "operation_folder": operation_folder,
        "operation_number": detect_operation(operation_folder),
        "contracts_from_name": contracts,
        "document_type": document_type,
        "legacy_document_type": LEGACY_DOCUMENT_TYPES[document_type],
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
