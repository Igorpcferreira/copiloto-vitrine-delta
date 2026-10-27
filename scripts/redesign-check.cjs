/* eslint-disable @typescript-eslint/no-require-imports -- Local browser verification. */
// Delta (26/10/2026): matriz de páginas x larguras e as interações de cada componente.
// Uso: VITRINE_BASE_URL=http://localhost:3601 node scripts/redesign-check.cjs [--interactions-only]
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.VITRINE_BASE_URL || process.env.HALO_BASE_URL || 'http://localhost:3601';
const out = path.join(__dirname, '..', 'docs', 'previews', 'redesign-2026-10-26');
fs.mkdirSync(out, { recursive: true });
const report = { matrix: [], interactions: [] };
const pass = (name) => { report.interactions.push(name); console.log(`PASS ${name}`); };
const sem = () => localStorage.setItem('vitrine-consent', 'denied');

async function settle(page, height) {
  const max = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < max; y += Math.round(height * 0.75)) {
    await page.evaluate((top) => scrollTo(0, top), y);
    await page.waitForTimeout(70);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(500);
}

async function pronto(page) {
  await page.waitForTimeout(500);
  // O React revela as partes transmitidas num quadro de animação; só depois a página está inteira.
  await page.waitForFunction(() => !document.querySelector('template[id^="B:"]'), null, { timeout: 10000 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const routes = [['home', '/'], ['comprar', '/comprar'], ['veiculo', '/veiculo/apex-1'], ['vender', '/vender'], ['sobre', '/sobre-nos']];
    if (!process.argv.includes('--interactions-only')) {
      for (const [name, route] of routes) {
        for (const [width, height] of [[1440, 900], [900, 800], [390, 844], [320, 700]]) {
          const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
          await context.addInitScript(sem);
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (e) => errors.push(e.message));
          // React de produção só imprime códigos ("Minified React error #418"): as duas formas contam.
          page.on('console', (event) => { if (event.type() === 'error' && /hydrat|Minified React error/i.test(event.text())) errors.push(event.text()); });
          const response = await page.goto(base + route, { waitUntil: 'load' });
          assert.equal(response.status(), 200);
          await pronto(page);
          await settle(page, height);
          const state = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth,
            broken: [...document.images].filter((img) => img.complete && !img.naturalWidth).map((img) => img.getAttribute('src')),
            // Travessão e meia-risca, escritos como código para este arquivo não ter nenhum.
            dashes: new RegExp(`[${String.fromCharCode(8211, 8212)}]`).test(document.body.innerText),
            whatsapp: !!document.querySelector('.dl-zap[href*="wa.me"]'),
            // Uma parte transmitida escondida, ou a abertura refeita no navegador, quer dizer que o
            // React jogou fora o HTML do servidor. O React põe `muted` como propriedade nos vídeos
            // que ele cria: só o vídeo do servidor tem o atributo.
            orphans: document.querySelectorAll('div[hidden][id^="S:"]').length,
            heroFromServer: [...document.querySelectorAll('.hero-media video')].map((video) => video.hasAttribute('muted')),
            footer: (() => {
              const rod = document.querySelector('.dl-rod');
              const texto = rod?.innerText.replace(/\s+/g, ' ') ?? '';
              const credito = rod?.querySelector('a.dl-rod__credito');
              return {
                frase: texto.includes('A próxima direção é sua.'),
                conversar: texto.includes('Vamos conversar?'),
                fale: texto.includes('Fale com a gente'),
                explore: texto.includes('Explore'),
                contato: texto.includes('Contato'),
                copyright: texto.includes(`© Copyright ${new Date().getFullYear()}. Copiloto Inova Simples (I.s.)`),
                credito: !!credito && credito.getAttribute('href') === 'https://ocopiloto.com.br/' && credito.innerText.includes('Desenvolvida com'),
              };
            })(),
          }));
          assert.equal(state.overflow, false, `${name}/${width} rolagem lateral`);
          assert.deepEqual(state.broken, [], `${name}/${width} imagem quebrada`);
          assert.equal(state.dashes, false, `${name}/${width} travessão no texto`);
          assert.equal(state.whatsapp, true, `${name}/${width} WhatsApp flutuante`);
          assert.equal(state.orphans, 0, `${name}/${width} parte transmitida escondida`);
          assert.deepEqual(state.heroFromServer, name === 'home' ? [true] : [], `${name}/${width} abertura vinda do servidor`);
          assert.deepEqual(Object.entries(state.footer).filter(([, ok]) => !ok).map(([k]) => k), [], `${name}/${width} textos do rodapé (regra 12)`);
          assert.deepEqual(errors, [], `${name}/${width} erros na página`);
          const video = page.locator('.hero-media video');
          if (await video.count()) await video.evaluate((v) => { v.pause(); v.currentTime = 1; });
          await page.screenshot({ path: path.join(out, `${name}-${width}-top.png`) });
          if (width === 1440 || width === 390) await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true });
          report.matrix.push({ name, width, status: response.status(), ...state });
          console.log(`PASS ${name} ${width}px`);
          await context.close();
        }
      }
    }

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(sem);
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(base, { waitUntil: 'load' });
    await pronto(page);

    // Header: no topo, sobre o vídeo, as três placas presas à borda; ao rolar, uma aba só.
    assert.equal(await page.getAttribute('.dl-cab', 'data-estado'), 'aberto');
    assert.equal(await page.getAttribute('.dl-cab', 'data-tom'), 'video');
    await page.screenshot({ path: path.join(out, 'header-aberto.png'), clip: { x: 0, y: 0, width: 1440, height: 80 } });
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 500);
    await page.waitForFunction(() => document.querySelector('.dl-cab')?.dataset.estado === 'recolhido', null, { timeout: 5000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(out, 'header-recolhido.png'), clip: { x: 300, y: 0, width: 840, height: 80 } });
    pass('header: placas no topo sobre o vídeo e aba única ao rolar');

    assert.equal(await page.getByRole('button', { name: /paus|vídeo/i }).count(), 0);
    pass('abertura sem botão de pausa (preferência do usuário)');

    // Regra de 11/10: nenhuma contagem na inicial. Preço, ano, nomes de carro, ordinais e endereço não contam.
    const contagens = await page.evaluate(() =>
      ['.dl-painel', '.dl-marcas', '.dl-carroceria__lado--frente', '.dl-grid .dl-linha', '.dl-venda', '.dl-vozes__texto', '.dl-vozes__botoes']
        .flatMap((selector) => [...document.querySelectorAll(selector)])
        .map((element) => {
          const clone = element.cloneNode(true);
          clone.querySelectorAll('.dl-regua__bandeira, .dl-regua__pontas, .dl-venda__marca, .dl-vozes__nota, .dl-sr, input, textarea').forEach((node) => node.remove());
          return clone.textContent.replace(/\s+/g, ' ').trim();
        })
        .filter((text) => /\d/.test(text)),
    );
    assert.deepEqual(contagens, [], 'contagem na inicial');
    pass('nenhuma contagem na inicial');

    // Painel de réguas: bandeiras andam com o polegar (teclado) e o seletor de marca abre pela seta.
    await page.locator('.dl-painel').scrollIntoViewIfNeeded();
    const minimo = page.getByRole('slider', { name: 'Preço mínimo' });
    const antes = await page.locator('.dl-painel__preco .dl-regua__bandeira').first().innerText();
    await minimo.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    const depois = await page.locator('.dl-painel__preco .dl-regua__bandeira').first().innerText();
    assert.notEqual(antes, depois, 'a bandeira do preço mínimo acompanha o teclado');
    const marca = page.locator('.dl-painel').getByRole('button', { name: /^Marca/ });
    await marca.focus();
    await page.keyboard.press('ArrowDown');
    assert(await page.getByRole('listbox', { name: 'Marca' }).isVisible());
    await page.screenshot({ path: path.join(out, 'painel-marca.png'), clip: { x: 0, y: 0, width: 1440, height: 600 } });
    await page.keyboard.press('Escape');
    pass('painel de réguas: bandeira acompanha o polegar e a marca abre pelo teclado');

    // Marcas: título e fileira no centro, seção baixa; de tempos em tempos a placa de trás passa a da
    // frente (da esquerda para a direita); o mouse em cima para tudo e, ao sair, volta; a última placa
    // leva a todas as marcas.
    await page.locator('.dl-marcas').scrollIntoViewIfNeeded();
    await page.mouse.move(10, 10);
    await page.waitForTimeout(400);
    const ordem = () => page.locator('.dl-marcas__item:not(.dl-marcas__item--chegada) .dl-marca__nome').allInnerTexts();
    const centro = await page.evaluate(() => {
      const t = document.querySelector('.dl-marcas__titulo').getBoundingClientRect();
      const f = document.querySelector('.dl-marcas__fileira').getBoundingClientRect();
      const s = document.querySelector('.dl-marcas').getBoundingClientRect();
      return { titulo: t.left + t.width / 2 - innerWidth / 2, fileira: f.left + f.width / 2 - innerWidth / 2, altura: s.height };
    });
    assert(Math.abs(centro.titulo) <= 2 && Math.abs(centro.fileira) <= 12, 'título e fileira no centro');
    assert(centro.altura <= 200, `marcas baixas (${Math.round(centro.altura)} px)`);
    // A primeira troca que aparecer (as trocas ficam a 2,8 s uma da outra; o ciclo já pode estar no meio).
    const o0 = await ordem();
    let o1 = o0;
    for (let i = 0; i < 45 && o1.join() === o0.join(); i++) {
      await page.waitForTimeout(100);
      o1 = await ordem();
    }
    const trocadas = o0.map((nome, i) => (nome !== o1[i] ? i : -1)).filter((i) => i >= 0);
    assert(trocadas.length === 2 && trocadas[1] === trocadas[0] + 1, `duas vizinhas trocam de lugar (${o0.join(', ')} / ${o1.join(', ')})`);
    assert.equal(o1[trocadas[1]], o0[trocadas[0]], 'a de trás passa a da frente: vai para a direita');
    const fileira = await page.locator('.dl-marcas__fileira').boundingBox();
    await page.mouse.move(fileira.x + fileira.width / 2, fileira.y + fileira.height / 2);
    await page.waitForTimeout(300);
    const paradaMarcas = await ordem();
    await page.waitForTimeout(3800);
    assert.deepEqual(await ordem(), paradaMarcas, 'para com o mouse em cima');
    await page.mouse.move(10, 10);
    await page.waitForTimeout(3800);
    assert.notDeepEqual(await ordem(), paradaMarcas, 'volta a andar ao sair');
    assert.match(await page.locator('.dl-marca--chegada').getAttribute('href'), /\/comprar$/, 'a chegada leva a todas as marcas');
    await page.screenshot({ path: path.join(out, 'marcas.png'), clip: { x: 0, y: Math.max(0, fileira.y - 120), width: 1440, height: 260 } });
    pass('marcas: no centro e baixas, ultrapassagem da esquerda para a direita, param com o mouse e voltam');

    // Cartas de carroceria: "O que tem" vira a carta e o foco vai para o verso; "Voltar" desvira.
    const carta = page.locator('.dl-carroceria').first();
    await carta.scrollIntoViewIfNeeded();
    await carta.getByRole('button', { name: /O que tem/ }).click();
    await page.waitForFunction(() => document.querySelector('.dl-carroceria')?.classList.contains('dl-carroceria--virada'));
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Voltar');
    assert((await carta.locator('.dl-carroceria__modelos a').count()) > 0, 'o verso lista modelos com link');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(out, 'carroceria-virada.png'), clip: { x: 0, y: Math.max(0, (await carta.boundingBox()).y - 60), width: 1440, height: 420 } });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.querySelector('.dl-carroceria')?.classList.contains('dl-carroceria--virada'));
    await page.waitForFunction(() => /O que tem/.test(document.activeElement?.textContent || ''));
    pass('cartas de carroceria: viram, foco no verso, desviram pelo teclado');

    // Vitrine (pole): abas por clique e setas; um carro de trás vem para a frente; miniaturas trocam a foto.
    const grid = page.locator('.dl-grid');
    await grid.scrollIntoViewIfNeeded();
    const tituloPole = () => grid.locator('.dl-pole__titulo').innerText();
    const primeiro = await tituloPole();
    const atras = grid.locator('.dl-vez').first();
    const nomeAtras = (await atras.locator('.dl-vez__titulo').innerText()).trim();
    assert.match(await atras.locator('.dl-vez__titulo').getAttribute('href'), /\/veiculo\//, 'o carro de trás guarda o link de verdade');
    await atras.locator('.dl-vez__frente').click();
    await page.waitForFunction((nome) => document.querySelector('.dl-pole__titulo')?.textContent?.trim() === nome, nomeAtras);
    assert.notEqual(await tituloPole(), primeiro);
    const foto = () => grid.locator('.dl-pole__foto img').first().getAttribute('src');
    const fotoAntes = await foto();
    await grid.locator('.dl-pole__mini').nth(1).click();
    await page.waitForFunction((src) => document.querySelector('.dl-pole__foto img')?.getAttribute('src') !== src, fotoAntes);
    const abas = grid.getByRole('tab');
    if ((await abas.count()) > 1) {
      await abas.nth(0).focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelectorAll('.dl-grid [role="tab"]')[1]?.getAttribute('aria-selected') === 'true');
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, 'vitrine-pole.png'), clip: { x: 0, y: Math.max(0, (await grid.boundingBox()).y - 20), width: 1440, height: 760 } });
    pass('vitrine: carro de trás vem para a frente, miniaturas trocam a foto, abas pelo teclado');

    // Venda em três toques: a forma escolhida e o carro vão para o Vender pela URL.
    const venda = page.locator('.dl-venda');
    await venda.scrollIntoViewIfNeeded();
    await venda.getByRole('radio', { name: /Trocar/ }).click();
    await venda.getByRole('textbox', { name: 'Marca' }).fill('Fiat');
    await venda.getByRole('textbox', { name: 'Modelo' }).fill('Argo');
    await venda.getByRole('textbox', { name: 'Ano' }).fill('2020');
    await page.screenshot({ path: path.join(out, 'venda-passo-2.png'), clip: { x: 0, y: Math.max(0, (await venda.boundingBox()).y - 30), width: 1440, height: 300 } });
    await venda.getByRole('button', { name: /Continuar no formulário/ }).click();
    await page.waitForURL(/\/vender\?modo=troca&marca=Fiat&modelo=Argo&ano=2020/);
    pass('venda em três toques: modo, marca, modelo e ano seguem para o Vender');

    // Avaliações: "Próxima" sobe o rolo, "Anterior" desce; setas do teclado; texto inteiro no diálogo.
    await page.goto(base, { waitUntil: 'load' });
    await pronto(page);
    const vozes = page.locator('.dl-vozes');
    await vozes.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const y = () => page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.dl-vozes__lista')).transform).m42);
    const y0 = await y();
    await vozes.getByRole('button', { name: 'Próxima' }).click();
    await page.waitForTimeout(700);
    const y1 = await y();
    assert(y1 < y0, '"Próxima" sobe o rolo');
    await vozes.locator('.dl-vozes__janela').focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(700);
    assert((await y()) > y1, 'seta para baixo desce o rolo');
    const ler = vozes.getByRole('button', { name: 'Ler tudo' }).first();
    if (await ler.count()) {
      await ler.click();
      assert(await page.getByRole('dialog', { name: 'Avaliação completa' }).isVisible());
      await page.keyboard.press('Escape');
    }
    pass('avaliações: rolo nos dois sentidos, teclado e texto inteiro');

    // Contato: copiar endereço avisa e as rotas abrem no modo escolhido.
    const chegada = page.locator('.dl-chegada');
    await chegada.scrollIntoViewIfNeeded();
    await chegada.getByRole('button', { name: 'Copiar endereço' }).click();
    await chegada.getByText('Endereço copiado', { exact: true }).waitFor();
    const modos = await chegada.locator('.dl-chegada__modos a').evaluateAll((links) => links.map((a) => new URL(a.href).searchParams.get('travelmode')));
    assert.deepEqual(modos, ['driving', 'walking', 'transit']);
    pass('contato: copiar endereço com aviso e rotas por modo');

    // Fita e rodapé: as duas chamadas não ficam uma em cima da outra.
    const fita = page.locator('.dl-fita__botao');
    const fale = page.locator('.dl-rod__fale');
    await fita.scrollIntoViewIfNeeded();
    const [bFita, bFale] = [await fita.boundingBox(), await fale.boundingBox()];
    assert(Math.abs(bFita.x - bFale.x) > 200, 'chamadas do fim em lados opostos');
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(out, 'fita-rodape.png') });
    pass('fita e rodapé: chamadas em lados opostos');

    // Comprar, chegando pelo link do header: uma barra flutuante por vez.
    await page.goto(base, { waitUntil: 'load' });
    await pronto(page);
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Comprar' }).click();
    await page.waitForURL(/\/comprar$/);
    await page.locator('.dl-cartao').first().waitFor();
    await page.mouse.move(720, 500);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 260); await page.waitForTimeout(120); }
    await page.waitForFunction(() => document.documentElement.dataset.dlEstoque === 'presa' && document.documentElement.dataset.dlRolagem === 'desce');
    await page.waitForTimeout(600);
    const presa = await page.evaluate(() => ({ cab: document.querySelector('.dl-cab').getBoundingClientRect().bottom, barra: document.querySelector('.dl-barra').getBoundingClientRect().top }));
    assert(presa.cab <= 0, 'descendo com a barra presa, o header sai');
    assert(Math.abs(presa.barra) <= 1, 'a barra fica no topo');
    const daVez = await page.evaluate(() => {
      const linha = innerHeight * 0.3;
      const titulos = [...document.querySelectorAll('[data-dl-faixa]')];
      const acima = titulos.filter((el) => el.getBoundingClientRect().top < linha);
      return {
        esperada: '#' + (acima.length ? acima[acima.length - 1] : titulos[0]).id,
        marcada: document.querySelector('.dl-barra__faixas [aria-current="true"]')?.getAttribute('href'),
      };
    });
    assert.equal(daVez.marcada, daVez.esperada, 'a barra marca a faixa da vez');
    await page.screenshot({ path: path.join(out, 'comprar-barra-presa.png'), clip: { x: 0, y: 0, width: 1440, height: 200 } });
    await page.mouse.wheel(0, -200);
    await page.waitForFunction(() => document.documentElement.dataset.dlRolagem === 'sobe');
    await page.waitForTimeout(700);
    const subindo = await page.evaluate(() => ({ cab: document.querySelector('.dl-cab').getBoundingClientRect().top, barra: document.querySelector('.dl-barra').getBoundingClientRect().bottom }));
    assert(subindo.cab >= 0, 'subindo, o header volta');
    assert(subindo.barra <= 0, 'subindo, a barra sai');
    pass('Comprar pelo link do header: uma barra flutuante por vez nos dois sentidos');

    // Faixas na barra: no topo a primeira é a da vez; cada uma leva à faixa (descendo, o título fica logo
    // abaixo da barra; subindo, logo abaixo do header) e vira a da vez.
    await page.goto(base + '/comprar', { waitUntil: 'load' });
    await pronto(page);
    const faixas = page.getByRole('navigation', { name: 'Faixas da lista' }).getByRole('link');
    assert((await faixas.count()) > 1);
    assert.equal(await faixas.nth(0).getAttribute('aria-current'), 'true', 'no topo, a primeira faixa é a da vez');
    const logoAbaixo = (sel) =>
      page.evaluate((s) => {
        const t = document.querySelector(s).getBoundingClientRect().top;
        const barra = document.querySelector('.dl-barra').getBoundingClientRect();
        const cab = document.querySelector('.dl-cab').getBoundingClientRect();
        const cobre = Math.max(barra.top <= 5 && barra.bottom > 0 ? barra.bottom : 0, cab.bottom > 0 ? cab.bottom : 0);
        return { t, cobre };
      }, sel);
    // Espera a rolagem assentar (mesma posição por 400 ms, até 5 s): com a máquina ocupada o salto demora mais.
    const assentar = async () => {
      let antes = -1;
      for (let i = 0; i < 25; i++) {
        await page.waitForTimeout(200);
        const y = await page.evaluate(() => Math.round(scrollY));
        if (y === antes && i > 2) return;
        antes = y;
      }
    };
    const ultima = faixas.nth((await faixas.count()) - 1);
    const hrefUltima = await ultima.getAttribute('href');
    await ultima.click();
    await assentar();
    let pos = await logoAbaixo(hrefUltima);
    assert(pos.t >= pos.cobre && pos.t < pos.cobre + 120, `descendo, a faixa fica logo abaixo da barra (${Math.round(pos.t)} e ${Math.round(pos.cobre)})`);
    assert.equal(await page.locator('.dl-barra__faixas [aria-current="true"]').getAttribute('href'), hrefUltima, 'a faixa do salto vira a da vez');
    const hrefPrimeira = await faixas.nth(0).getAttribute('href');
    await faixas.nth(0).click();
    await assentar();
    await page.waitForTimeout(500);
    pos = await logoAbaixo(hrefPrimeira);
    assert(pos.t >= pos.cobre && pos.t < pos.cobre + 120, `subindo, a faixa fica logo abaixo do header (${Math.round(pos.t)} e ${Math.round(pos.cobre)})`);
    pass('faixas na barra: a da vez marcada, saltos nos dois sentidos');

    // Painel de filtros do computador: abre da barra, chips com contagem, Esc fecha e devolve o foco.
    await page.evaluate(() => scrollTo(0, 0));
    const toggle = page.locator('.dl-barra').getByRole('button', { name: /^Filtros/ });
    await toggle.click();
    const painel = page.locator('#dl-comprar-filtros');
    assert(await painel.isVisible());
    assert(/\d/.test(await painel.locator('.dl-chip small').first().innerText()), 'chips com contagem nas páginas internas');
    await page.screenshot({ path: path.join(out, 'comprar-filtros.png'), clip: { x: 0, y: 0, width: 1440, height: 640 } });
    await painel.locator('.dl-chip').first().focus();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.textContent?.trim().startsWith('Filtros'));
    await page.locator('.dl-barra').getByRole('button', { name: /^Preço/ }).click();
    assert(await page.locator('.dl-pop__painel .dl-regua--histograma').isVisible(), 'régua de preço sobre o histograma');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, 'comprar-preco.png'), clip: { x: 0, y: 0, width: 1440, height: 520 } });
    await page.keyboard.press('Escape');
    // Um painel por vez: com os filtros abertos, abrir o Preço fecha os filtros; Esc fecha o Preço.
    await toggle.click();
    assert(await painel.isVisible());
    await page.locator('.dl-barra').getByRole('button', { name: /^Preço/ }).click();
    await page.waitForTimeout(250);
    assert(!(await painel.isVisible()), 'abrir o Preço fecha o painel de filtros');
    assert(await page.locator('.dl-pop__painel').isVisible(), 'o Preço fica aberto sozinho');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.dl-pop__painel').count(), 0, 'Esc fecha o Preço');
    pass('Comprar: painel de filtros com contagem, Esc e foco de volta, régua com histograma, um painel por vez');

    // Veículo: o índice de miniaturas acompanha a foto da vez e leva a cada foto.
    await page.goto(base + '/veiculo/apex-1', { waitUntil: 'load' });
    await pronto(page);
    const atual = () => page.evaluate(() => document.querySelector('.dl-veiculo__mini[aria-current="true"]')?.getAttribute('aria-label'));
    assert.equal(await atual(), 'Foto 1');
    await page.locator('.dl-veiculo__mini').nth(2).click();
    await page.waitForFunction(() => document.querySelector('.dl-veiculo__mini[aria-current="true"]')?.getAttribute('aria-label') === 'Foto 3', null, { timeout: 5000 });
    const placa = await page.locator('.dl-veiculo__painel').boundingBox();
    assert(placa.y >= 0 && placa.y < 120, 'a placa da direita fica presa na tela');
    await page.screenshot({ path: path.join(out, 'veiculo-indice.png') });
    pass('veículo: índice de miniaturas acompanha a foto da vez e leva a ela');

    // Vender: o carro desce até a etapa da vez.
    await page.goto(base + '/vender', { waitUntil: 'load' });
    await pronto(page);
    const carro = () => page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.dl-vender__carro')).transform).m42);
    const c0 = await carro();
    await page.locator('#dl-vender-name').fill('Pessoa Teste');
    await page.locator('#dl-vender-phone').fill('11900000000');
    await page.locator('#dl-vender-email').fill('pessoa@example.com');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForTimeout(800);
    assert((await carro()) > c0, 'o carro desce para a etapa 2');
    assert(await page.getByRole('button', { name: 'Editar Contato' }).isVisible(), 'a etapa feita vira resumo com "Editar"');
    await page.screenshot({ path: path.join(out, 'vender-etapa-2.png') });
    pass('Vender: pista vertical com o carro na etapa da vez e "Editar" nas feitas');

    // Sobre: o índice marca o capítulo em leitura; a foto cresce com o mouse e abre o visor.
    await page.goto(base + '/sobre-nos', { waitUntil: 'load' });
    await pronto(page);
    const indiceSobre = page.getByRole('navigation', { name: 'Capítulos' }).getByRole('link');
    await indiceSobre.nth(1).click();
    await page.waitForTimeout(1300);
    assert.equal(await indiceSobre.nth(1).getAttribute('aria-current'), 'true', 'o índice marca o capítulo levado');
    const fotoLoja = page.locator('.dl-sobre__foto').first();
    await fotoLoja.scrollIntoViewIfNeeded();
    await fotoLoja.hover();
    await page.waitForTimeout(500);
    const escala = await fotoLoja.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a);
    assert(escala > 1.05, 'a foto cresce com o mouse em cima');
    await page.screenshot({ path: path.join(out, 'sobre-foto-hover.png') });
    await fotoLoja.click();
    assert(await page.getByRole('dialog', { name: /^Fotos da loja/ }).isVisible());
    await page.keyboard.press('Escape');
    pass('Sobre: índice dos capítulos, foto que cresce e visor');

    // Celular: menu em cortina e Esc; barra "Tenho interesse" lado a lado com o WhatsApp.
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mobileContext.addInitScript(sem);
    const mobile = await mobileContext.newPage();
    mobile.setDefaultTimeout(15000);
    await mobile.goto(base + '/veiculo/apex-1', { waitUntil: 'load' });
    await pronto(mobile);
    const barra = await mobile.locator('.dl-veiculo__barra').boundingBox();
    const zap = await mobile.locator('.dl-zap__lamina').boundingBox();
    const quero = await mobile.locator('.dl-veiculo__barra-quero').boundingBox();
    assert(zap.y >= barra.y - 4 && zap.y + zap.height <= barra.y + barra.height + 4, 'WhatsApp na altura da barra');
    assert(zap.x >= quero.x + quero.width, 'WhatsApp ao lado do botão, sem cobrir');
    await mobile.getByRole('button', { name: 'Tenho interesse' }).click();
    assert(await mobile.getByRole('dialog', { name: 'Tenho interesse' }).isVisible());
    await mobile.screenshot({ path: path.join(out, 'veiculo-390-interesse.png') });
    await mobile.keyboard.press('Escape');
    await mobile.getByRole('button', { name: 'Abrir menu' }).click();
    assert(await mobile.getByRole('dialog', { name: 'Menu', exact: true }).isVisible());
    await mobile.waitForTimeout(500);
    await mobile.screenshot({ path: path.join(out, 'menu-390.png') });
    await mobile.keyboard.press('Escape');
    pass('celular: barra de interesse ao lado do WhatsApp, folha do formulário e menu');

    // Movimento reduzido: vídeo parado, nada ligado à rolagem e as marcas paradas.
    const calmo = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await calmo.addInitScript(sem);
    const parada = await calmo.newPage();
    await parada.goto(base, { waitUntil: 'load' });
    await pronto(parada);
    await parada.evaluate(() => scrollTo(0, 600));
    await parada.waitForTimeout(800);
    const marcasAntes = await parada.locator('.dl-marcas__item .dl-marca__nome').allInnerTexts();
    await parada.waitForTimeout(3600);
    const estado = await parada.evaluate(() => ({
      tocando: [...document.querySelectorAll('.hero-media video')].some((v) => !v.paused),
      rolagem: [...document.querySelectorAll('.dl-abertura__sai, .dl-abertura__midia, .dl-linha__traco, .dl-fita__conteudo')].some((el) => el.getAnimations().length > 0),
    }));
    assert.deepEqual(estado, { tocando: false, rolagem: false });
    assert.deepEqual(await parada.locator('.dl-marcas__item .dl-marca__nome').allInnerTexts(), marcasAntes, 'as marcas não trocam de lugar');
    pass('movimento reduzido: vídeo parado, nada ligado à rolagem, marcas paradas');
  } finally {
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
