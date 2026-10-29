# Delta: opções de categorias, 28/10/2026

O usuário aprovou o princípio das cartas de carroceria, mas apontou dois problemas concretos: o preço ficava cortado e uma categoria com muitos carros concentraria informação demais na própria carta. As três opções preservam a foto ampla na frente e colocam preço em uma linha inteira, sem sobreposição.

## Opções

- **A, Carta com rota:** mantém a troca entre frente e verso, porém mostra um veículo por vez. As setas percorrem somente os veículos da carroceria e o valor tem uma linha própria. É a opção mais próxima do desenho atual.
- **B, Painel de boxes:** a foto escolhe a carroceria e os veículos aparecem em painel compartilhado abaixo. É a leitura mais direta no computador e mantém as cartas baixas.
- **C, Gaveta de escolha:** a carta abre uma gaveta clara e confortável. Ela apresenta dois veículos de cada vez e navega pelas páginas; a carta nunca aumenta com a lista.

As três usam os tokens de cor da loja, superfície clara e detalhes na cor secundária, sem fundo preto. Nenhuma mostra contagem na Home. A rota de revisão é `/propostas/categorias` e só existe na demo local.

Depois desta rodada, o usuário recusou o bisel diagonal dos botões e campos por parecer genérico. Essa escolha será comparada separadamente em `/propostas/botoes`; os controles destes protótipos representam somente o comportamento das categorias e não antecipam a família visual final dos botões.

## Crítica antes da implementação

O limite de carros precisa estar no componente que revela a seleção, não em um corte silencioso do catálogo. A evita excesso mantendo a descoberta na mesma carta, mas exige mais cliques. B dá a melhor leitura comparativa para quem navega pelo computador. C funciona melhor quando o estoque daquela carroceria cresce e, por isso, é a recomendação inicial: a foto segue grande, a lista não aperta o card e a seleção é confortável em celular.

## Validação final

O roteiro `scripts/propostas-check.cjs` verifica as três opções e os botões em Chromium e WebKit, nas larguras 320, 390 e 1440: limite da lista, navegação, preço, modal nativo, Escape, retorno de foco, simulador e destinos de filtro. B teve o seletor de estilo do CTA restringido para não atingir os links dos veículos; os preços ficam em linha própria. No WebKit, o acionador de C recebe foco explícito antes de abrir, pois o clique do Safari não o faz por padrão. O componente atual corrigido permanece no fim da comparação. As capturas finais estão em `docs/previews/revisao-2026-10-28/` e na comparação HTML da mesma pasta.
