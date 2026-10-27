# Delta

Repositório `copiloto-vitrine-delta` (https://github.com/Igorpcferreira/copiloto-vitrine-delta), criado pelo usuário em 26/10/2026; primeiro commit e push em `main` em 27/10/2026, com autorização dele. Sem publicação na Vercel por enquanto.

Template de vitrine do Copiloto, feito do zero em 26/10/2026 sobre a base técnica do Halo e com o contrato do Horizon remoto de 26/10 (`8d8f0c5`). Conceito **"Pista"**: a vitrine anda em diagonal, como uma reta de corrida. A estrutura de conteúdo é a aprovada nos outros templates (hero grande com o vídeo da loja, busca, marcas, carrocerias, vitrine, venda, avaliações, contato, banner e rodapé), cada seção com componente e comportamento próprios:

- header em placas de vidro presas à borda de cima, que se fundem numa aba ao rolar e, no Comprar, saem para a barra de filtros (o comportamento do Halo que o usuário pediu);
- abertura com a base cortada em diagonal e o título em duas placas;
- painel escuro de réguas (preço com dois polegares e ano), com os valores em bandeiras;
- marcas no centro, numa fileira curta em que as placas se ultrapassam devagar, terminando na placa de chegada com todas as marcas;
- cartas de carroceria que viram e mostram os modelos;
- vitrine "pole", com um carro grande na frente e quatro atrás;
- venda em três toques, numa placa partida pela diagonal;
- rolo de avaliações, placa de chegada com rota por modo, fita no banner final e rodapé com busca.

As páginas internas também têm desenho próprio: Comprar com resultados em faixas de preço, listadas na segunda linha da barra presa, que marca a da vez; Veículo com fotos empilhadas (em 4:3 pelo ponto focal, inteiras no visor) e uma placa presa ao lado; Vender numa pista vertical com um carro que desce até a etapa da vez; Sobre com capítulos, índice preso e galeria justificada.

Projeto independente; Horizon, Apex, Halo e Atlas são referências preservadas.

## Execução local

```bash
npm ci
npm run dev -- --port 3600
```

Abra `http://localhost:3600`. `dev` e `dev:demo` abrem a amostra estática Radial (12 veículos e as mídias do Apex). Envios reais ficam bloqueados por `VITRINE_DEMO=true`. Portas do Delta: 3600 (dev), 3601 (`start:demo`) e 3602 (ensaio integrado).

Para conferir a entrega (com `npm run build:demo` e `npm run start:demo -- --port 3601` rodando):

```bash
npm run lint
npx tsc --noEmit
npm run build:demo
npm run check:stock
node scripts/redesign-check.cjs
node scripts/flow-check.cjs
node scripts/keyboard-check.cjs
node scripts/mobile-audit.cjs
node scripts/contrast-check.cjs
node scripts/contrast-scan.cjs
node scripts/variant-check.cjs
node scripts/check-api-contract.mjs
```

Os roteiros de navegador exigem Playwright no ambiente de validação e usam `VITRINE_BASE_URL` (padrão `http://localhost:3601`).

- `redesign-check` confere 5 páginas em 4 larguras (rolagem lateral, imagem quebrada, erro de hidratação, travessão, WhatsApp, HTML do servidor aproveitado e os textos do rodapé) e as interações de cada componente; gera as capturas em `docs/previews/redesign-2026-10-26/`.
- `mobile-audit` confere 5 páginas em 7 larguras: rolagem lateral, alvos de toque, texto miúdo, WhatsApp e nada fixo cobrindo o crédito do rodapé.
- `contrast-check` mede pares de cada componente e `contrast-scan`, todo texto visível, em três paletas; os dois contam o fundo das lâminas (o `::before` inclinado).

## Modo integrado

Configure `CLIENT_API_URL`, `CLIENT_API_TOKEN` e `CLIENT_SLUG` no ambiente do servidor e use `npm run dev:integrated -- --port 3602`. Sem as três variáveis, o modo integrado mostra um erro explícito; zero veículos não deve ser lido como estoque real.

- **Sem API:** rode `node scripts/mock-stock-api.cjs` e use URL `http://127.0.0.1:3499`, token `synthetic-token` e slug `synthetic-store`, só no processo local.
- **Smoke com mock:** o `check:stock` aceita `STOCK_EXPECTED_COUNT=1`, `STOCK_EXPECTED_TITLE=Marca Teste Modelo Teste 2024` e `STOCK_EXPECTED_ID=synthetic-1`; segue o redirecionamento para o endereço canônico do veículo e exige o título no `h1`.
- **Build integrado:** o `npm run build` executa `scripts/prepare-site.mjs`, que altera a configuração e os assets da loja integrada; não é um comando de validação neutra. Para validar, use `build:demo` e, depois de um build integrado, rode `build:demo` de novo.

## Documentação

- [Relatório de 26/10/2026](docs/redesign-2026-10-26.md): pedido, conceito, seções, páginas internas, revisão independente, verificação e limites.
- [Direção de design](docs/direcao-2026-10-26.md), com as rodadas da crítica independente.
- [Fontes e licenças dos componentes](docs/component-sources.md).

## Ainda falta

Aceite visual do usuário e do Thiago, publicação na Vercel (só com autorização), cadastro/ID do tema no painel e homologação de API, estoque e leads reais.
