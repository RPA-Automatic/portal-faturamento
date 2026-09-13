"""Validate the fiscal project's remote destination before sending credentials/data."""
import json
from pathlib import Path
from urllib.parse import urlsplit


def validate_target(url: str, environment: str = "dev", confirm_production: bool = False) -> str:
    targets = json.loads((Path(__file__).resolve().parents[1] / "supabase/targets.json").read_text())
    if environment not in targets:
        raise ValueError("Ambiente fiscal desconhecido.")
    ref = targets[environment]
    if not ref:
        raise ValueError("DEV fiscal ainda não provisionado. Configure supabase/targets.json antes de enviar dados.")
    if environment == "prod" and not confirm_production:
        raise ValueError("Carga em produção exige --confirm-production após validação em DEV.")
    parsed = urlsplit(url)
    expected = f"{ref}.supabase.co"
    if (parsed.scheme != "https" or parsed.netloc != expected or parsed.path not in ("", "/")
            or parsed.query or parsed.fragment):
        raise ValueError("SUPABASE_URL não corresponde ao projeto fiscal registrado para o ambiente.")
    return f"https://{expected}"
