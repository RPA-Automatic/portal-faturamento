#!/usr/bin/env python3
"""Gera cobertura privada e neutra de cada fonte histórica, sem copiar valores reais."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import unicodedata
from collections import Counter
from pathlib import Path

SUPPORTED = {".xlsx", ".docx", ".pdf", ".doc", ".eml", ".msg"}
FIELD_PATTERNS = {
    "operation": r"\bop\b|oper(?:acao| b2b)", "purchase_contract": r"contrato.*compra|compra.*contrato",
    "sales_contract": r"contrato.*venda|venda.*contrato", "partner_tax_id": r"cnpj|cpf",
    "state_registration": r"inscri(?:cao|c\.) estad", "product": r"produto|grao|soja|item",
    "crop": r"safra", "quantity": r"quantidade|qtd|peso|\bkg\b|tonelada",
    "origin": r"origem", "delivery_location": r"local de entrega|destino",
    "final_destination": r"destino final", "transshipment": r"transbordo",
    "freight": r"frete|cif|fob", "scheduling": r"agendamento|plataforma",
    "invoice": r"nota fiscal|\bnf\b|doc fisc", "cfop": r"cfop",
    "operation_nature": r"natureza.*opera|nat oper", "ncm": r"\bncm\b",
    "additional_invoice_data": r"dados adicionais|observa(?:cao|coes).*nf",
    "shipment_period": r"inicio.*embarque|fim.*embarque|prazo.*entrega",
    "financial_clearance": r"credito|contas? a (?:pagar|receber)|adiantamento|pagamento|saldo",
    "inventory": r"estoque|deposito|armaz", "logistics_order": r"\bol\b|ol/rota|ordem logistica",
    "release_or_authorization": r"liberacao|autorizacao", "communication": r"e-mail|email|assunto|mensagem",
}


def norm(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.lower())
    return "".join(char for char in value if not unicodedata.combining(char))


def binary_strings(path: Path) -> str:
    chunks = []
    for args in (["strings", "-el", str(path)], ["strings", str(path)]):
        result = subprocess.run(args, capture_output=True, text=True, check=False)
        chunks.append(result.stdout)
    return "\n".join(chunks)


def source_role(path: str, extension: str) -> str:
    name = norm(Path(path).name)
    if extension == ".xlsx":
        if "checklist" in name: return "checklist_template"
        if "documentosfiscais" in name: return "fiscal_report"
        if "es4004" in name: return "operation_report"
        if "gg4164" in name or "gg2037" in name: return "contract_report"
        if "gplp40180" in name: return "logistics_report"
        if "gg4084" in name: return "partner_registry"
        if "gg4028" in name: return "inventory_report"
        return "financial_report"
    if "pdd" in name or "processo" in name or "projeto" in name or "entendimento" in name or "duvidas" in name:
        return "process_reference"
    if "autorizacao" in name: return "shipment_authorization"
    if "instrucao de embarque" in name: return "shipment_instruction"
    if "instrucao de descarga" in name: return "unloading_instruction"
    if "manual" in name or "plataforma" in name: return "scheduling_manual"
    if "orientacao para a emissao" in name: return "invoice_issuance_guidance"
    if extension in {".eml", ".msg"}: return "communication_evidence"
    if "instrucao fiscal" in name or "instrucoes fiscais" in name or extension == ".doc": return "fiscal_instruction"
    if re.search(r"^nf\s", name): return "invoice"
    if "venda dentro do estado" in name: return "fiscal_procedure"
    if "liberacao" in name and extension in {".docx", ".pdf"}: return "shipment_release"
    if name.startswith(("enc_", "res_")): return "commercial_confirmation"
    return "supporting_document"


def targets(role: str) -> list[str]:
    if role.endswith("_report") or role in {"partner_registry", "checklist_template"}:
        return ["source_datasets", "source_records", "operation_source_links"]
    if role == "process_reference": return ["requirements_documentation"]
    return ["documents", "document_versions", "document_type_catalog", "document_extractions", "document_extracted_fields"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_root", type=Path)
    parser.add_argument("--analysis", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads((args.analysis / "manifest.json").read_text())
    docs = {row["id"]: row for row in json.loads((args.analysis / "documents.json").read_text())}
    sheets = {row["id"]: row for row in json.loads((args.analysis / "spreadsheets.json").read_text())}
    selected, seen = [], set()
    for row in manifest:
        path, extension = row["path"], row["extension"]
        if extension not in SUPPORTED or row["sha256"] in seen: continue
        if path.startswith("_analise_privada_") or path.startswith("portal-faturamento"): continue
        seen.add(row["sha256"]); selected.append(row)
    coverage = []
    for row in selected:
        source_id, path, extension = row["id"], row["path"], row["extension"]
        if source_id in docs:
            text = (args.analysis / f"{source_id}.txt").read_text(errors="replace")
            extraction = "text_extracted"
        elif source_id in sheets:
            text = json.dumps(sheets[source_id].get("sheets", []), ensure_ascii=False)
            extraction = "structure_extracted"
        else:
            text = binary_strings(args.source_root / path)
            extraction = "binary_or_message_scanned"
        normalized = norm(text)
        role = source_role(path, extension)
        coverage.append({
            "source_id": source_id, "extension": extension, "source_role": role,
            "extraction_status": extraction,
            "detected_fields": sorted(key for key, pattern in FIELD_PATTERNS.items() if re.search(pattern, normalized)),
            "database_targets": targets(role),
        })
    payload = {
        "summary": {"distinct_sources": len(coverage), "by_extension": dict(Counter(x["extension"] for x in coverage)),
                    "by_role": dict(Counter(x["source_role"] for x in coverage))},
        "sources": coverage,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(payload["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
