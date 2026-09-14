# Identidade pública — RPA Automatic

> Status: Aplicada por solicitação do responsável  
> Responsável: @RodrigoFreitas16n91  
> Última revisão: 2026-09-13

A marca pública do portal é **RPA Automatic**. O nome do produto é **Portal de Faturamento**; o painel operacional é o **Farol de Liberação de Embarque**.

A identidade usa o desenho escolhido pelo responsável: robô central com olhos que remetem a código, antena e quatro conexões em órbita. A atualização preserva esse conceito, com azul mais vivo, ciano, maior contraste e fundo branco. O nome permanece legível e separado do símbolo.

![RPA Automatic](https://portal-fiscal-faturamento.netlify.app/brand/rpa-automatic-horizontal.png)

## Recursos oficiais desta versão

Os arquivos estão em `frontend/public/brand/`, servidos pelo próprio portal. [Baixar o kit de marca](https://portal-fiscal-faturamento.netlify.app/brand/rpa-automatic-brand-kit.zip).

| Recurso | Arquivo | Aplicação |
|---|---|---|
| Marca principal | `rpa-automatic-primary.png` | Topo do portal e do login |
| Marca horizontal | `rpa-automatic-horizontal.png` | Rodapé com direitos reservados |
| Ícone compacto | `rpa-automatic-icon.png` | Chat/assistência/monitoramento, favicon e atalhos |

O ícone compacto usa o robô sem o texto e as órbitas, para preservar a leitura em tamanhos pequenos. As versões PNG são imagens raster; não devem ser apresentadas como arquivos vetoriais. Os originais de geração são preservados fora do build; os arquivos aplicados ficam versionados no repositório.

## Cores e aplicação

- Azul principal: `#1264ED`, usado também no botão de entrada.
- Ciano: `#08BFF0`, para detalhes do símbolo.
- Azul de leitura: `#123B82`; links da interface usam `#1254BC`.
- Fundo de suporte dos logos e do formulário: branco `#FFFFFF`.
- Painel de apresentação do login: degradê suave de azul profundo `#081F47`, azul de marca `#123B82` e azul vivo `#1264ED`, com luz difusa em ciano; fundo externo claro `#F0F4FA`.

Usar os arquivos sem distorção, preservar proporções e margens e não aplicar filtros que alterem as cores. Sobre fundos escuros, manter uma área branca de suporte. Verde, amarelo e vermelho continuam reservados aos significados operacionais do Farol.

## Composição da tela de entrada

A apresentação e o acesso formam um único conjunto imersivo: painel azul contínuo com a marca completa sobre branco, mensagem do produto, jornada visual E1–E6 e formulário branco. O contraste separa a narrativa operacional dos campos de acesso. No celular, as áreas se empilham e a apresentação fica compacta, com rolagem natural para cadastro e mensagens.

No desktop, a apresentação recebe ligeiramente mais espaço que o formulário, na proporção aproximada de 1,08 para 0,92. O cartão pode chegar a 1.240 px e ocupa a altura útil de notebooks compactos, preservando respiro nas bordas. O rodapé fica integrado ao fim da coluna de acesso; assim, o azul permanece contínuo até a base e a marca horizontal acompanha os direitos reservados sem dividir o painel. O enquadramento considera as margens internas dos PNGs para manter o peso visual sem recorte.

O enquadramento usa uma área quadrada branca, imagem centralizada com `object-fit: contain` e margem de proteção. Nenhum logo é recortado, esticado ou recolorido. No desktop amplo, a área da marca principal tem 188 px, o título do produto 25 px, a chamada principal chega a 60 px e o texto de apoio usa 18 px. As larguras intermediárias e o celular têm escalas próprias, sem reduzir a leitura aos tamanhos de legenda. O logo horizontal do rodapé usa cerca de 152 px no desktop e 138 px no celular, com os direitos reservados em duas linhas legíveis.

A mensagem de entrada é “Embarques livres de pontos cegos.”, com destaque em ciano na segunda linha. O selo “Farol de liberação” e a sequência E1–E6 apresentam o propósito do produto antes do acesso; E6 recebe destaque como destino da jornada. Os textos de apoio descrevem a visão de operações, documentos e pendências, sem promessas de automações ainda não implementadas. A entrada do cartão usa uma transição curta e respeita a preferência de movimento reduzido do sistema.

Os provedores sociais aparecem lado a lado com o estado “Em configuração” enquanto indisponíveis. O acesso principal por e-mail recebe destaque. O layout não altera autenticação, autorização nem o estado dos provedores. Os estilos de entrada são locais ao componente, incluindo foco de teclado, contraste e adaptação à largura da tela.

## Base visual e evolução dos componentes

O frontend atual usa React 18, TypeScript e Vite. O Tailwind CSS 3.4 é compilado localmente com PostCSS no build e entregue como CSS do próprio portal; o script CDN foi removido. Mantém-se a versão principal compatível com as classes existentes. As versões exatas estão em `frontend/package.json` e `package-lock.json`.

A evolução recomendada é centralizar componentes e tokens da marca com Tailwind e shadcn/ui, escolhendo os componentes acessíveis necessários e padronizando os ícones com Lucide. shadcn/ui, Radix UI e Lucide ainda não estão instalados. A adoção deve incluir revisão de foco, teclado, contraste, responsividade e paridade do comportamento, além de avaliação da versão do Tailwind exigida pelos componentes escolhidos.

Next.js não é requisito para essa evolução visual: shadcn/ui também suporta Vite. Uma migração de framework deve responder a uma necessidade de aplicação, como renderização no servidor, e ser planejada separadamente. Motion pode ser avaliado quando houver interações que justifiquem animação, respeitando movimento reduzido. React Flow destina-se a interfaces de nós e conexões e não faz parte do escopo fiscal atual. Essas bibliotecas não são dependências desta entrega.

Referências oficiais: [Tailwind com Vite](https://v3.tailwindcss.com/docs/guides/vite), [shadcn/ui com Vite](https://ui.shadcn.com/docs/installation/vite), [Next.js e renderização](https://nextjs.org/docs/app/getting-started/server-and-client-components) e [React Flow](https://reactflow.dev/).

## Proteção da identidade

Não publicar nomes, logos, fotografias, domínios, contatos ou dados de empresas clientes e de projetos usados somente como contexto. A regra inclui telas, metadados, favicon, exemplos, mensagens e material promocional. O acervo privado permanece fora do build e das projeções de wiki.

Esta versão substitui a apresentação tipográfica provisória. Propostas anteriores rejeitadas não compõem os recursos publicados.

## Padrão para todos os produtos

A ordem de uso é fixa: marca completa no topo, robô nos recursos de assistência e monitoramento e marca horizontal no rodapé. O rodapé exibe “© ANO RPA Automatic. Todos os direitos reservados.”, com ano corrente. Cada aplicação serve cópias locais dos mesmos arquivos; `brand-manifest.json` registra papéis e hashes. Não criar variações por produto. O ícone não significa que um chat ou uma integração de IA esteja implementado. No portal fiscal, identifica o monitoramento existente do Farol.

## Referências públicas e privacidade

A interface deve apresentar somente a identidade RPA Automatic, sem comparativos ou divulgação de marcas de outras empresas. Use nomes funcionais para os serviços. Identificadores de APIs, dependências e licenças permanecem exatos no código e na documentação técnica; a identificação de operadores/suboperadores não deve ser omitida dos registros de privacidade. Login federado, quando habilitado, precisa identificar corretamente a conta de destino.

Fontes tipográficas são distribuídas pelo próprio portal, sem requisições do navegador a serviços externos de fontes. Isso reduz o compartilhamento desnecessário de IP e metadados de navegação.
