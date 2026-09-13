from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def column_index(cell_ref: str) -> int:
    letters = re.sub(r"[^A-Z]", "", cell_ref.upper())
    value = 0
    for letter in letters:
        value = value * 26 + ord(letter) - ord("A") + 1
    return value


def cell_text(cell: ET.Element, shared_strings: list[str]) -> str:
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


def load_shared_strings(workbook: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in workbook.namelist():
        return []
    root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
    values: list[str] = []
    for item in root.findall("main:si", NS):
        text_parts = [node.text or "" for node in item.findall(".//main:t", NS)]
        values.append("".join(text_parts))
    return values


def workbook_sheets(workbook: zipfile.ZipFile) -> list[dict[str, str]]:
    workbook_root = ET.fromstring(workbook.read("xl/workbook.xml"))
    rels_root = ET.fromstring(workbook.read("xl/_rels/workbook.xml.rels"))

    rel_targets = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels_root.findall("pkgrel:Relationship", NS)
    }

    sheets = []
    for sheet in workbook_root.findall("main:sheets/main:sheet", NS):
        relationship_id = sheet.attrib.get(f"{{{NS['rel']}}}id", "")
        target = rel_targets.get(relationship_id, "")
        sheets.append(
            {
                "name": sheet.attrib.get("name", ""),
                "path": f"xl/{target}" if not target.startswith("/") else target.lstrip("/"),
            }
        )
    return sheets


def read_first_rows(
    workbook: zipfile.ZipFile,
    sheet_path: str,
    shared_strings: list[str],
    max_rows: int,
) -> tuple[int, list[dict[str, Any]]]:
    root = ET.fromstring(workbook.read(sheet_path))
    dimension = root.find("main:dimension", NS)
    row_count = 0

    if dimension is not None:
        ref = dimension.attrib.get("ref", "")
        match = re.search(r":[A-Z]+(\d+)$", ref)
        if match:
            row_count = int(match.group(1))

    rows: list[dict[str, Any]] = []
    for row in root.findall("main:sheetData/main:row", NS):
        row_number = int(float(row.attrib.get("r", "0") or 0))
        values: dict[int, str] = {}
        for cell in row.findall("main:c", NS):
            ref = cell.attrib.get("r", "")
            text = cell_text(cell, shared_strings)
            if text:
                values[column_index(ref)] = text

        rows.append({"row_number": row_number, "values": values})
        if len(rows) >= max_rows:
            break

    return row_count, rows


def detect_header(rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        return {"row_number": None, "columns": []}

    best_row = max(rows, key=lambda row: len(row["values"]))
    columns = [value for _, value in sorted(best_row["values"].items())]
    return {"row_number": best_row["row_number"], "columns": columns}


def inspect_xlsx(path: Path, max_rows: int) -> dict[str, Any]:
    with zipfile.ZipFile(path) as workbook:
        shared_strings = load_shared_strings(workbook)
        sheets = []
        for sheet in workbook_sheets(workbook):
            row_count, rows = read_first_rows(workbook, sheet["path"], shared_strings, max_rows)
            header = detect_header(rows)
            sheets.append(
                {
                    "name": sheet["name"],
                    "estimated_rows": row_count,
                    "header_row": header["row_number"],
                    "columns": header["columns"],
                }
            )

    return {
        "file": str(path),
        "size_bytes": path.stat().st_size,
        "sha256": sha256_file(path),
        "sheets": sheets,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Inventory XLSX files without exporting row data.")
    parser.add_argument("source", type=Path, help="Directory containing XLSX files")
    parser.add_argument("--output", type=Path, required=True, help="JSON output file")
    parser.add_argument("--max-rows", type=int, default=10, help="Rows inspected per sheet")
    args = parser.parse_args()

    files = sorted(args.source.glob("*.xlsx"))
    inventory = [inspect_xlsx(path, args.max_rows) for path in files]

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Inventariados {len(inventory)} arquivos XLSX em {args.output}")


if __name__ == "__main__":
    main()