from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


REPORTS: dict[str, dict[str, Any]] = {
    "ES4004(56).xlsx": {
        "source_name": "ES4004",
        "sheet": "es4004",
        "header_row": 2,
        "table": "stg_es4004_contracts",
        "targets": [
            "oper_b2b", "descricao", "contrato", "tipo_contr", "tipo_preco", "moeda", "finalidade",
            "item", "item_descricao", "status", "volume_alocado", "volume_realizado", "volume_disponivel",
            "volume_pendente", "filial", "cliente_fornec", "nome",
        ],
    },
    "GG4164(40).xlsx": {
        "source_name": "GG4164",
        "sheet": "GG4164",
        "header_row": 2,
        "table": "stg_gg4164_purchase_contracts",
        "targets": [
            "codigo", "fornecedor", "cpf_cnpj", "inscr_estad", "endereco", "cidade", "est", "comprador",
            "contrato", "descricao", "porto", None, "item", "desc_item", "dt_inclusao", "pz_ini_entr",
            "pz_fim_ent", "dt_ult_ent", "pendencia_juridica", "tipo", None, "moeda", "preco_fixado",
            None, None, None, "qtd_orig_contrato", None, "qtd_cancelada", "qtd_contrato", "un", None,
            "qtd_recebida", None, None, None, "qtd_a_entregar", None, None, None, None, None, None, None,
            None, None, None, "modalidade", "safra", "regiao", None, None, "frete", "uf", None,
            "referencia", "operacao", "tipo_de_compra", None, "situacao", None, None, None, "status",
            "tipo_status", None, None, "contrato_assinado", "fim_exportacao",
        ],
    },
    "gg2037-03660.xlsx": {
        "source_name": "GG2037",
        "sheet": "GG2037",
        "header_row": 2,
        "table": "stg_gg2037_sales_contracts",
        "targets": [
            "codigo", "cliente", "vendedor", "contrato", "situacao", "cod_item", "descricao_item", None,
            None, "natureza_op", "mes_ano_embarque", "nr_trade_slip", "versao", "pedido", "pz_ini_entr",
            "pz_fim_ent", "dt_ult_ent", "tipo", "moeda", "preco_fixado", None, "preco_fat", "forma_pagto",
            "vol_orig_contr", "vol_contr", "um", "vol_entregue", "vol_a_entregar", None, "vol_cancel",
            None, "vl_total", "uf", "cidade", "safra", "cultura", "regiao", "cliente_faturamento", None,
            None, None, "frete", "frete_proprio", "fornecedor", "contrato_compra", None, "referencia",
            "operacao", "status_contrato", "descricao_status", "situacao_credito", "status_pedido",
            "cliente_embarque", "cod_inscricao", "nome_inscricao", "email_inscricao", None, "dt_inclusao_contrato",
        ],
    },
    "GPLP40180(43).xlsx": {
        "source_name": "GPLP40180",
        "sheet": "GPLP40180",
        "header_row": 2,
        "table": "stg_gplp40180_logistics_orders",
        "targets": [
            "emissor", "nome", "contrato", "produtor_contrato", "ol_rota", "tipo", "safra", "dt_emis_nf",
            "estab", "nota_fiscal", "serie", "romaneio", "peso_fiscal", None, "vl_nota_fiscal", "usuario_reg",
            "item", "descricao", "status_transito", "placa", "data_carregamento", "peso_origem", "data_descarga",
            "peso_destino", "peso_quebra", None, None, "origem", "nome_origem", "cidade_origem", "uf_origem",
            "destino", "nome_destino", "cidade_destino", "uf_destino", None, "destino_final_ol", "nome_dest_final",
            "cidade_dest_final", "modalidade", "transp", "nome_transportadora", None, None, None, None, None,
            None, "status_frete", "data_pagamento", "vl_frete_pago", "vl_frete_a_pagar",
        ],
    },
    "DocumentosFiscais-20260220091958.xlsx": {
        "source_name": "DOCUMENTOS_FISCAIS",
        "sheet": "Doc Fisc",
        "header_row": 2,
        "table": "stg_fiscal_documents",
        "targets": [
            "est", "cliente_fornec", "emitente", "doc_fisc", "ser", "nat_oper", "uf", "pais", "emissao",
            "icms_ret", "cfop", "uf_orig_dest", "dt_docto", "esp", "tp_nat_op", "direcao", "vl_contabil",
            "base_icms", "base_ipi", None, None, None, "vl_icms_trib", "vl_icms_nao_trib", "vl_icms_outras",
            None, "vl_ipi", None, None, None, None, "vl_pis", None, "vl_cofins",
        ],
    },
}

DATE_COLUMNS = {
    "dt_inclusao", "pz_ini_entr", "pz_fim_ent", "dt_ult_ent", "dt_inclusao_contrato", "dt_emis_nf",
    "data_carregamento", "data_descarga", "data_pagamento", "emissao", "dt_docto",
}

NUMERIC_PREFIXES = ("qtd_", "vol_", "vl_", "preco_", "peso_", "base_")
NUMERIC_COLUMNS = {"volume_alocado", "volume_realizado", "volume_disponivel", "volume_pendente"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def excel_date(value: str) -> str | None:
    try:
        serial = float(value)
    except ValueError:
        return None
    if serial <= 0:
        return None
    date = dt.datetime(1899, 12, 30) + dt.timedelta(days=serial)
    return date.date().isoformat()


def parse_date(value: str) -> str | None:
    value = value.strip()
    if not value:
        return None
    if re.fullmatch(r"\d+(\.\d+)?", value):
        return excel_date(value)
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d"):
        try:
            return dt.datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            pass
    return None


def parse_numeric(value: str) -> float | None:
    value = value.strip()
    if not value:
        return None
    clean = value.replace("R$", "").replace(" ", "")
    if "," in clean and "." in clean:
        clean = clean.replace(".", "").replace(",", ".")
    else:
        clean = clean.replace(",", ".")
    try:
        return float(clean)
    except ValueError:
        return None


def coerce(target: str, value: str) -> str | float | None:
    if not value:
        return None
    if target in DATE_COLUMNS:
        return parse_date(value)
    if target in NUMERIC_COLUMNS or target.startswith(NUMERIC_PREFIXES):
        return parse_numeric(value)
    return value.strip()


def column_index(cell_ref: str) -> int:
    letters = re.sub(r"[^A-Z]", "", cell_ref.upper())
    value = 0
    for letter in letters:
        value = value * 26 + ord(letter) - ord("A") + 1
    return value


def load_shared_strings(workbook: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in workbook.namelist():
        return []
    root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
    return ["".join(node.text or "" for node in item.findall(".//main:t", NS)) for item in root.findall("main:si", NS)]


def cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    value = cell.find("main:v", NS)
    inline = cell.find("main:is/main:t", NS)
    if inline is not None and inline.text:
        return inline.text.strip()
    if value is None or value.text is None:
        return ""
    if cell_type == "s":
        try:
            return shared_strings[int(value.text)].strip()
        except (ValueError, IndexError):
            return ""
    return value.text.strip()


def sheet_paths(workbook: zipfile.ZipFile) -> dict[str, str]:
    workbook_root = ET.fromstring(workbook.read("xl/workbook.xml"))
    rels_root = ET.fromstring(workbook.read("xl/_rels/workbook.xml.rels"))
    rel_targets = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels_root.findall("pkgrel:Relationship", NS)}
    result: dict[str, str] = {}
    for sheet in workbook_root.findall("main:sheets/main:sheet", NS):
        rel_id = sheet.attrib.get(f"{{{NS['rel']}}}id", "")
        target = rel_targets.get(rel_id, "")
        result[sheet.attrib.get("name", "")] = f"xl/{target}" if not target.startswith("/") else target.lstrip("/")
    return result


def unique_headers(values: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    headers = []
    for index, value in enumerate(values, start=1):
        base = value or f"column_{index}"
        seen[base] = seen.get(base, 0) + 1
        headers.append(base if seen[base] == 1 else f"{base}_{seen[base]}")
    return headers


def read_rows(path: Path, sheet_name: str, header_row: int) -> list[tuple[int, dict[str, str], list[str]]]:
    with zipfile.ZipFile(path) as workbook:
        shared_strings = load_shared_strings(workbook)
        paths = sheet_paths(workbook)
        if sheet_name not in paths:
            raise ValueError(f"Aba '{sheet_name}' nao encontrada em {path.name}")
        root = ET.fromstring(workbook.read(paths[sheet_name]))

        raw_rows: dict[int, dict[int, str]] = {}
        for row in root.findall("main:sheetData/main:row", NS):
            row_number = int(float(row.attrib.get("r", "0") or 0))
            values = {column_index(cell.attrib.get("r", "")): cell_value(cell, shared_strings) for cell in row.findall("main:c", NS)}
            raw_rows[row_number] = values

        header_values = raw_rows.get(header_row, {})
        max_column = max(header_values.keys(), default=0)
        headers = unique_headers([header_values.get(index, "") for index in range(1, max_column + 1)])

        rows: list[tuple[int, dict[str, str], list[str]]] = []
        for row_number in sorted(raw_rows):
            if row_number <= header_row:
                continue
            values_by_index = raw_rows[row_number]
            row_values = [values_by_index.get(index, "") for index in range(1, max_column + 1)]
            if not any(value.strip() for value in row_values):
                continue
            raw_data = {headers[index - 1]: row_values[index - 1] for index in range(1, max_column + 1)}
            rows.append((row_number, raw_data, row_values))
        return rows


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

    def insert(self, table: str, rows: list[dict[str, Any]], returning: bool = False) -> Any:
        prefer = "return=representation" if returning else "return=minimal"
        return self.request("POST", table, rows, prefer=prefer)

    def patch(self, table: str, filters: dict[str, str], data: dict[str, Any]) -> None:
        query = urllib.parse.urlencode({key: f"eq.{value}" for key, value in filters.items()})
        self.request("PATCH", f"{table}?{query}", data, prefer="return=minimal")

    def succeeded_import_exists(self, source_file_name: str) -> bool:
        query = urllib.parse.urlencode(
            {
                "source_file_name": f"eq.{source_file_name}",
                "status": "eq.succeeded",
                "select": "id",
                "limit": "1",
            }
        )
        return bool(self.request("GET", f"import_runs?{query}") or [])


def build_staging_rows(file_path: Path, config: dict[str, Any], import_run_id: str) -> list[dict[str, Any]]:
    target_columns = [target for target in config["targets"] if target]
    rows = []
    for row_number, raw_data, row_values in read_rows(file_path, config["sheet"], config["header_row"]):
        record: dict[str, Any] = {
            "import_run_id": import_run_id,
            "row_number": row_number,
            "raw_data": raw_data,
            **{target: None for target in target_columns},
        }
        for index, target in enumerate(config["targets"]):
            if not target or index >= len(row_values):
                continue
            record[target] = coerce(target, row_values[index])
        rows.append(record)
    return rows


def chunks(rows: list[dict[str, Any]], size: int) -> list[list[dict[str, Any]]]:
    return [rows[index : index + size] for index in range(0, len(rows), size)]


def import_file(client: SupabaseRest | None, file_path: Path, config: dict[str, Any], dry_run: bool, force: bool) -> dict[str, Any]:
    file_hash = sha256_file(file_path)
    preview_rows = read_rows(file_path, config["sheet"], config["header_row"])
    rows_total = len(preview_rows)

    if dry_run:
        return {"file": file_path.name, "table": config["table"], "rows_total": rows_total, "sha256": file_hash}

    assert client is not None
    if not force and client.succeeded_import_exists(file_path.name):
        return {"file": file_path.name, "table": config["table"], "rows_total": rows_total, "skipped": "import_run succeeded already", "sha256": file_hash}

    import_run = client.insert(
        "import_runs?select=id",
        [
            {
                "source_name": config["source_name"],
                "source_file_name": file_path.name,
                "status": "running",
                "rows_total": rows_total,
                "started_at": dt.datetime.now(dt.UTC).isoformat(),
                "metadata": {"sha256": file_hash, "sheet": config["sheet"], "header_row": config["header_row"]},
            }
        ],
        returning=True,
    )[0]

    import_run_id = import_run["id"]
    staging_rows = build_staging_rows(file_path, config, import_run_id)
    processed = 0
    try:
        for batch in chunks(staging_rows, 500):
            client.insert(config["table"], batch)
            processed += len(batch)
        client.patch(
            "import_runs",
            {"id": import_run_id},
            {"status": "succeeded", "rows_processed": processed, "finished_at": dt.datetime.now(dt.UTC).isoformat()},
        )
    except Exception as exc:
        client.patch(
            "import_runs",
            {"id": import_run_id},
            {
                "status": "failed",
                "rows_processed": processed,
                "rows_failed": max(rows_total - processed, 0),
                "error_message": str(exc),
                "finished_at": dt.datetime.now(dt.UTC).isoformat(),
            },
        )
        raise

    return {"file": file_path.name, "table": config["table"], "rows_total": rows_total, "rows_processed": processed, "sha256": file_hash}


def main() -> None:
    parser = argparse.ArgumentParser(description="Import primary XLSX reports into Supabase staging tables.")
    parser.add_argument("source", type=Path, help="Directory containing XLSX reports")
    parser.add_argument("--only", nargs="*", choices=sorted(REPORTS), help="Specific report files to import")
    parser.add_argument("--dry-run", action="store_true", help="Parse files without sending data to Supabase")
    parser.add_argument("--force", action="store_true", help="Import even if a previous succeeded import_run exists")
    args = parser.parse_args()

    selected_files = args.only or list(REPORTS)
    client = None
    if not args.dry_run:
        supabase_url = os.environ.get("SUPABASE_URL")
        service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not service_role_key:
            raise SystemExit("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente local para importar.")
        client = SupabaseRest(supabase_url, service_role_key)

    results = []
    for file_name in selected_files:
        file_path = args.source / file_name
        if not file_path.exists():
            raise FileNotFoundError(file_path)
        results.append(import_file(client, file_path, REPORTS[file_name], args.dry_run, args.force))

    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()