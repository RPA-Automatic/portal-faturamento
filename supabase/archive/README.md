# Migrations de protótipos descontinuados

`prototype-main-202605/20260501223500_create_portal_tables.sql` veio da antiga main `604c5c0`. Modelava portal_profiles/customers/carriers/shipment_releases/release_documents. A consulta ao banco fiscal confirmou que ela não estava aplicada.

Foi preservada como referência histórica e retirada da cadeia ativa para não criar um segundo domínio concorrente ao modelo OP/TOTVS. Não aplicar estes arquivos. A cadeia vigente fica em `supabase/migrations/`; seu histórico remoto e hashes estão em `supabase/deployment-manifest.json`. O frontend anterior continua recuperável pelo Git no commit acima.
