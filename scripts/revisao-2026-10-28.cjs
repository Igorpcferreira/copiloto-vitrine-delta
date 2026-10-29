/* eslint-disable @typescript-eslint/no-require-imports -- Verificação local de navegador. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const base = process.env.VITRINE_BASE_URL || 'http://localhost:3601';
const out = path.join(__dirname, '../tmp/qa/revisao-2026-10-28');
fs.mkdirSync(out, { recursive: true });

(async () => {
  for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await browserType.launch();
    try {
      for (const width of engine === 'chromium' ? [320, 360, 390, 768, 1024, 1440] : [320, 390, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        await context.addInitScript(() => localStorage.setItem('vitrine-consent', 'denied'));
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(base);
        await page.waitForFunction(() => !document.querySelector('template[id^="B:"]'));
        const search = page.getByRole('button', { name: 'Buscar um carro', exact: true });
        await search.click();
        const input = page.locator('.dl-busca-aba__campo');
        await input.fill('ARGO');
        const bounds = await page.locator('.dl-cab').evaluate(el => {
          const selectors = ['.dl-busca-aba__campo', '.dl-busca-aba__ir', '.dl-busca-aba__fechar'];
          return selectors.map(s => {
            const r = el.querySelector(s).getBoundingClientRect();
            return { selector: s, x: r.x, right: r.right, width: r.width, height: r.height };
          });
        });
        for (const b of bounds) {
          assert(b.x >= 0 && b.right <= width, `${engine} ${width}: ${b.selector} fora da tela`);
          assert(b.width >= 40 && b.height >= 40, `${engine} ${width}: alvo pequeno`);
        }
        assert(bounds[0].right <= bounds[1].x, 'Campo e ação se sobrepõem');
        assert(bounds[1].right <= bounds[2].x, 'Buscar e fechar se sobrepõem');
        await page.locator('.dl-cab').screenshot({ path: path.join(out, `${engine}-${width}-header.png`) });
        await input.press('Escape');
        await search.waitFor({ state: 'visible' });
        await page.waitForFunction(() => document.querySelector('.dl-cab__acao--busca') === document.activeElement, null, { timeout: 1500 });
        await search.click();
        await input.fill('ARGO');
        await page.locator('.dl-cab').getByRole('button', { name: 'Buscar no estoque', exact: true }).click();
        await page.waitForURL('**/comprar?q=ARGO');
        await page.goto(base);
        await page.waitForFunction(() => !document.querySelector('template[id^="B:"]'));
        for (const [name, selector] of [['busca', '.dl-painel'], ['venda', '.dl-venda'], ['avaliacoes', '.dl-vozes']]) {
          await page.locator(selector).evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY - 120));
          await page.waitForTimeout(200);
          if ([390, 1440].includes(width)) await page.locator(selector).screenshot({ path: path.join(out, `${engine}-${width}-${name}.png`) });
        }
        const cards = page.locator('.dl-carroceria');
        for (let i = 0; i < await cards.count(); i++) {
          const card = cards.nth(i);
          await card.getByRole('button', { name: 'O que tem' }).click();
          await page.waitForTimeout(100);
          const prices = await card.locator('.dl-carroceria__modelos strong').evaluateAll(els => els.map(el => {
            const price = el.getBoundingClientRect();
            const face = el.closest('.dl-carroceria__lado').getBoundingClientRect();
            return { text: el.textContent, fits: price.left >= face.left && price.right <= face.right && price.bottom <= face.bottom, scroll: el.scrollWidth <= el.clientWidth + 1 };
          }));
          assert(prices.every(p => p.fits && p.scroll), `${engine} ${width}: preço cortado ${JSON.stringify(prices)}`);
          await card.getByRole('button', { name: 'Voltar', exact: true }).click();
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${engine} ${width}: rolagem lateral`);
        assert.deepEqual(errors, [], `${engine} ${width}: erros de execução`);
        console.log(`PASS ${engine} ${width}: busca, foco, navegação, preços e largura`);
        await context.close();
      }
    } finally { await browser.close(); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
