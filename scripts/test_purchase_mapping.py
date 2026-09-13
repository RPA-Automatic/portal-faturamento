import unittest
import tempfile
import zipfile
from pathlib import Path
from unittest.mock import patch
from import_xlsx_to_supabase import REPORTS, build_staging_rows, coerce, read_rows


class PurchaseMappingTests(unittest.TestCase):
    def test_missing_required_header_rejected_even_without_data(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'synthetic.xlsx'
            with zipfile.ZipFile(path, 'w') as z:
                z.writestr('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="GG4164" sheetId="1" r:id="rId1"/></sheets></workbook>')
                z.writestr('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>')
                z.writestr('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="2"><c r="A2" t="inlineStr"><is><t>Safra</t></is></c></row></sheetData></worksheet>')
            with self.assertRaisesRegex(ValueError, 'Frete'):
                read_rows(path, 'GG4164', 2, {'Frete': 'frete'})

    def test_purchase_columns_keep_their_business_meaning(self):
        cfg = REPORTS['GG4164(40).xlsx']
        # Synthetic values distinct from each other expose shifted positional mappings.
        raw = {h: '' for h in cfg['header_targets']}
        raw.update({'Modalidade': 'Fixo', 'Safra': '2026/2027', 'Região': 'Região teste',
                    'Frete': 'FOB', 'UF': 'SP', 'Situação': 'Aberto', 'Status': 'Normal',
                    'Tipo Status': 'Liberado', 'Contrato Assinado?': 'Sim', 'Fim Exportação?': 'Não',
                    'Contrato': '0000001-999', 'Qtd Contrato': '1.234,50'})
        for data in (raw, dict(reversed(list(raw.items())))):
            with patch('import_xlsx_to_supabase.read_rows', return_value=[(3, data, list(data.values()))]):
                row = build_staging_rows(Path('synthetic.xlsx'), cfg, 'batch-test')[0]
            for header, target in cfg['header_targets'].items():
                self.assertEqual(row[target], coerce(target, raw[header]))
            self.assertEqual(row['frete'], 'FOB')
            self.assertEqual(row['safra'], '2026/2027')
            self.assertEqual(row['qtd_contrato'], 1234.5)
            self.assertEqual(row['contrato'], '0000001-999')


if __name__ == '__main__':
    unittest.main()
