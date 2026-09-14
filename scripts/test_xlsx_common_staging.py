import tempfile
import unittest
import zipfile
from pathlib import Path

from import_xlsx_to_supabase import build_source_rows, read_source_rows


WORKBOOK = '''<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
 <sheets><sheet name="Principal" sheetId="1" r:id="rId1"/><sheet name="Apoio" sheetId="2" r:id="rId2"/></sheets>
</workbook>'''
RELS = '''<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="worksheet"/>
 <Relationship Id="rId2" Target="worksheets/sheet2.xml" Type="worksheet"/>
</Relationships>'''
SHEET_ONE = '''<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
 <row r="1"><c r="A1" t="inlineStr"><is><t>Contrato</t></is></c><c r="B1" t="inlineStr"><is><t>Quantidade</t></is></c></row>
 <row r="2"><c r="A2" t="inlineStr"><is><t>0001</t></is></c><c r="B2"><v>10</v></c></row>
</sheetData></worksheet>'''
SHEET_TWO = '''<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
 <row r="3"><c r="C3" t="inlineStr"><is><t>Revisar</t></is></c></row>
</sheetData></worksheet>'''


class CommonStagingTests(unittest.TestCase):
    def test_every_non_empty_row_from_every_sheet_is_preserved_and_hashed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fonte.xlsx"
            with zipfile.ZipFile(path, "w") as workbook:
                workbook.writestr("xl/workbook.xml", WORKBOOK)
                workbook.writestr("xl/_rels/workbook.xml.rels", RELS)
                workbook.writestr("xl/worksheets/sheet1.xml", SHEET_ONE)
                workbook.writestr("xl/worksheets/sheet2.xml", SHEET_TWO)

            parsed = read_source_rows(path)
            self.assertEqual(3, len(parsed))
            self.assertEqual(("Principal", 2, {"A": "0001", "B": "10"}), parsed[1])
            self.assertEqual(("Apoio", 3, {"C": "Revisar"}), parsed[2])

            records = build_source_rows(path, "TESTE", "00000000-0000-0000-0000-000000000001")
            self.assertTrue(all(len(row["row_sha256"]) == 64 for row in records))
            self.assertEqual({"Principal", "Apoio"}, {row["sheet_name"] for row in records})


if __name__ == "__main__":
    unittest.main()
