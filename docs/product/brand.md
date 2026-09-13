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
- Painel de apresentação do login: azul profundo `#0D2855` a `#123B82`, com detalhes em ciano; fundo externo claro `#F0F4FA`.

Usar os arquivos sem distorção, preservar proporções e margens e não aplicar filtros que alterem as cores. Sobre fundos escuros, manter uma área branca de suporte. Verde, amarelo e vermelho continuam reservados aos significados operacionais do Farol.

## Composição da tela de entrada

A apresentação e o acesso formam um único conjunto: painel azul com a marca completa sobre branco, formulário branco e rodapé alinhado às duas colunas. O contraste separa a mensagem do produto dos campos de acesso. A marca tem tamanho contido para não empurrar o formulário para fora da área de leitura. No celular, as áreas se empilham e a apresentação fica compacta, com rolagem natural para cadastro e mensagens.

O enquadramento usa uma área quadrada branca, imagem centralizada com `object-fit: contain` e margem de proteção. Nenhum logo é recortado, esticado ou recolorido. No desktop, a área da marca principal tem 176 px, o título do produto 23 px, a chamada principal até 48 px e o texto de apoio 17 px. As larguras intermediárias e o celular têm escalas próprias, sem reduzir a leitura aos tamanhos de legenda. O logo horizontal do rodapé usa 190 px no desktop e 160 px no celular, com os direitos reservados em duas linhas legíveis.

A mensagem de entrada é “Seu embarque. Sob controle.”, com destaque em ciano na segunda linha. Os textos de apoio descrevem o acompanhamento de operações, documentos e pendências, sem promessas de automações ainda não implementadas.

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
