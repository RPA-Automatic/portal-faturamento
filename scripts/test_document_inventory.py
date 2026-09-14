#!/usr/bin/env python3
import importlib.util
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("inventory", root / "scripts/inventory_documents.py")
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)

cases = {
    "Autorização de transferência.pdf": "autorizacao_transferencia",
    "Instrução de Embarque.pdf": "instrucao_embarque",
    "INSTRUÇÃO FISCAL CONTRATO.doc": "instrucao_fiscal_compra",
    "VENDA DENTRO DO ESTADO 5102.pdf": "instrucao_fiscal_venda",
    "NF 123.pdf": "nota_fiscal",
    "LIBERAÇÃO OP 10.docx": "liberacao_embarque",
    "Instrução de Descarga.pdf": "instrucao_descarga",
    "manual_plataforma.pdf": "manual_agendamento",
    "RE_ retorno.msg": "evidencia_email",
}
with tempfile.TemporaryDirectory() as directory:
    for name, expected in cases.items():
        path = Path(directory) / name; path.touch()
        actual = module.classify_document(path)
        assert actual == expected, (name, actual, expected)
        assert module.LEGACY_DOCUMENT_TYPES[actual]
print(f"PASS document taxonomy: {len(cases)} representative names")
