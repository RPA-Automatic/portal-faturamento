# Revisão do acervo privado

> Status: Em revisão  
> Responsável: @RodrigoFreitas16n91  
> Versão: 1.0  
> Última revisão: 2026-09-13  
> Próxima revisão: 2026-10-13  
> Documentos relacionados: [Contexto fiscal](../product/fiscal-context.md), [Ingestão](../data/xlsx-ingestion-plan.md)

## Escopo e cobertura

O inventário de `docs/docs_antigos/`, excluindo diretórios Git e os resultados desta análise, encontrou 540 arquivos e 226 conteúdos distintos por SHA-256. Entre os conteúdos distintos há 17 XLSX, 20 DOCX, 21 PDF, 7 DOC, 9 ZIP, 2 EML e 1 MSG; o restante é composto principalmente por código e documentação histórica.

Foi feita extração textual de 20 DOCX e 21 PDFs e leitura estrutural das 17 planilhas. A inspeção dos nove ZIPs distintos não encontrou documentos suportados exclusivos ausentes das cópias extraídas (entradas de até 30 MB). Isso não equivale a revisão visual integral nem homologação de todos os documentos. Arquivos Word binários e mensagens foram inventariados; sua interpretação detalhada permanece pendente. PDFs com conteúdo em imagem também exigem leitura visual/OCR adicional.

A leitura aprofundada concentrou-se nas duas versões do PDD, nas reuniões de checklist e automação, e nos cabeçalhos e dados estruturais dos relatórios/checklists. Transcrições Comercial, Logística e Fiscal apresentam trechos severamente corrompidos; não foram usadas para estabelecer novas regras autônomas. O PDF de histórico de prompts é referência de ideias, não decisão aprovada.

O PDD-01 foi renderizado em 22 páginas; as páginas 2, 12 e 18 foram inspecionadas visualmente para conferir o fluxo, o mapeamento de instruções e as telas fiscais. O diagrama posiciona a criação da OL antes do envio da liberação, enquanto o texto descreve a liberação como entrada para criar a OL. Essa divergência de precedência deve ser resolvida antes de automatizar transições. Não houve revisão visual de todas as páginas do acervo.

## Rastreabilidade sem publicação dos originais

O manifesto com nomes originais, hashes e caminhos fica exclusivamente em `docs/docs_antigos/_analise_privada_2026-09-13/`, ignorado pelo Git. Os identificadores abaixo permitem revisão local sem publicar nomes de empresas, pessoas, documentos ou números de contratos.

| Referência neutra | Identificador privado | Papel |
|---|---|---|
| PDD-01 | SRC-564eba7c502b | PDD com fluxo e mapeamentos |
| PDD-02 | SRC-be7533e4bc83 | Outra versão do PDD; não presumir precedência por nome |
| ENT-01 | SRC-b4be2c70c79d | Reunião de checklist |
| ENT-02 | SRC-90a952becd2c | Reunião de automação |
| XLS-01 | SRC-9c141be6ba87 | Operações e contratos |
| XLS-02 | SRC-540e6b124832 | Compras |
| XLS-03 | SRC-85c70480f7cc | Vendas |
| XLS-04 | SRC-baf997c94edd | Logística |
| XLS-05 | SRC-3e7e53d9f52f | Documentos fiscais |
| XLS-06 | SRC-31288529a350 | Checklist geral |
| XLS-07 | SRC-d62c947496f2 | Checklist regional A |
| XLS-08 | SRC-63eb865aa426 | Checklist regional B |
| XLS-09 | SRC-6c7aac84e8c4 | Parceiros e inscrições |

## Achados de qualidade

- O checklist geral declara 1.048.557 linhas, mas tem somente 35 linhas não vazias, incluindo cabeçalhos. Dimensionamento de importação deve usar conteúdo real.
- Os três checklists têm 31, 33 e 34 colunas nas abas principais, com cabeçalhos na linha 3. Não podem compartilhar um mapeamento posicional único.
- Os cinco relatórios principais têm duas linhas de título/cabeçalho e resultam em 231, 93, 110, 2.370 e 155 registros, respectivamente.
- Alguns identificadores fiscais estão em fórmulas literais de texto. Preservar zeros e valores textuais; não avaliar fórmulas arbitrárias recebidas.
- O importador GG4164 tinha deslocamento de colunas a partir de Modalidade. A análise do remoto confirmou 93/93 registros com Safra e Frete divergentes de `raw_data`. O mapeamento local foi substituído por cabeçalhos explícitos; os registros remotos ainda precisam ser reprocessados.
- Há rótulos repetidos e campos com significados diferentes: Operação comercial não é necessariamente OP, e natureza de operação não é CFOP. Esses mapeamentos exigem contrato de dados explícito.
- Existem credenciais de agendamento em documentos operacionais. Não publicar os originais, carregar segredos no frontend ou copiar essas credenciais para o novo produto; revisar/rotacionar os acessos legados aplicáveis.

## Validação desta entrega

- Seis testes sintéticos passaram, cobrindo mapeamento de compra, layout incompleto e bloqueios de destino incorreto. Foram feitas também 930 comparações de dez campos nas 93 linhas reais de compra contra o conteúdo bruto, sem publicar os valores.
- O dry-run dos cinco relatórios confirmou as contagens esperadas e validou o novo mapeamento de compra sem transmitir linhas.
- Os arquivos originais foram preservados. Nenhuma planilha ou documento foi regravado.
- Não houve upload dos originais para APIs de extração externas ou Supabase Storage. A análise utilizou leitura local e os recursos desta sessão. Somente requisitos generalizados foram registrados na documentação canônica.
- O seletor PowerShell foi revisado, mas não executado: `pwsh` não está instalado no ambiente desta revisão.
