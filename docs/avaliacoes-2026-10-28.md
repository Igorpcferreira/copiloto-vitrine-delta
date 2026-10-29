# Avaliações da demonstração Delta, 28/10/2026

## Origem e limite

As cinco avaliações da demonstração são avaliações públicas atribuídas ao Google pela própria Radial Automóveis na seção de avaliações de seu site. A página oficial exibe os mesmos nomes, textos e cinco estrelas. Ela informa nota 4,8 e 794 avaliações no momento da consulta, mas a demo não usa a contagem na página inicial.

| Autor público | Origem verificada | Uso na demo |
| --- | --- | --- |
| Suelen Nuss | Página inicial oficial da Radial, seção Avaliações | Já constava no fixture herdado. |
| Graci M Santos | Página inicial oficial da Radial, seção Avaliações | Já constava no fixture herdado. |
| Michael Almeida | Página inicial oficial da Radial, seção Avaliações | Já constava no fixture herdado. |
| Nabi Junior | Página inicial oficial da Radial, seção Avaliações | Já constava no fixture herdado. |
| luiz carlos correa de castilho luizao | Página inicial oficial da Radial, seção Avaliações | Incluída em 28/10; sem foto copiada, usa as iniciais no componente. |

Fonte: <https://radialautomoveis.com/>. Consulta em 28/10/2026. Os quatro avatares já presentes são cópias públicas autorizadas para a demo e preservam a origem registrada em `public/showcase/README.md` no Apex.

Não foram inventados textos, autores, notas ou fotos. O modo integrado continua exibindo apenas as avaliações recebidas pelo painel.

## Tentativa de ampliar a amostra

Foi consultada a ficha pública do Google Maps indicada pela própria Radial, para Avenida Brasil Sul, 780, em Anápolis. A página sem sessão carregou os dados do estabelecimento, mas não expôs textos adicionais de avaliações para coleta verificável. A busca pública também retornou somente os cinco depoimentos que a própria Radial republica e atribui ao Google.

Por isso a demonstração permanece com cinco registros, em vez de completar artificialmente oito ou doze. A ficha do Google informa 4,8 e 794 avaliações na consulta, mas o componente não exibe essa contagem na Home.

## Navegação do rolo

O Rolo de vozes agora se move em ciclo: Próxima, Anterior, setas para cima e para baixo, e o toque ou clique em uma avaliação vizinha. A lista renderiza três voltas internas e volta à cópia central somente após a transição, por isso a passagem da última para a primeira, e da primeira para a última, permanece no sentido pedido.

Com zero avaliações a seção não aparece. Com uma, não há controles nem cópias vizinhas. Com duas ou mais, ambos os controles permanecem ativos. Uma atualização recebida do painel reinicia o mecanismo na primeira avaliação da lista nova, para nunca associar o índice antigo ao autor errado.

O roteiro dirigido `scripts/rolo-vozes-check.cjs` confirma o ciclo, a leitura integral, o fechamento do diálogo e os cenários com zero, uma e duas avaliações.
