/* eslint-disable @typescript-eslint/no-require-imports -- Verificação de interfaces locais. */
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.VITRINE_BASE_URL || 'http://localhost:3601';
const out = path.join(__dirname, '../docs/previews/revisao-2026-10-28');
fs.mkdirSync(out, { recursive: true });
const fit = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const section = (page, name) => page.getByRole('heading', { name, exact: true }).locator('xpath=ancestor::section[1]');

(async () => {
  for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await type.launch();
    try {
      for (const width of [320, 390, 1440]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(`${base}/propostas/categorias`);
        assert(await fit(page), `Categorias ${engine} ${width}: largura`);
        assert.match(await page.locator('meta[name=robots]').getAttribute('content'), /noindex/);
        const a = section(page, 'Carta com rota');
        const open = a.getByRole('button', { name: 'Ver opções' }).first();
        await open.click();
        assert.equal(await a.getByRole('link').filter({ hasText: 'R$' }).count(), 1);
        assert(await a.getByRole('button', { name: 'Voltar' }).evaluate(el => el === document.activeElement));
        const first = await a.getByRole('link').filter({ hasText: 'R$' }).textContent();
        await a.getByRole('button', { name: 'Próximo', exact: true }).click();
        assert.notEqual(await a.getByRole('link').filter({ hasText: 'R$' }).textContent(), first);
        await a.getByRole('button', { name: 'Anterior', exact: true }).click();
        assert.equal(await a.getByRole('link').filter({ hasText: 'R$' }).textContent(), first);
        if (width !== 320) await a.screenshot({ path: path.join(out, `${engine}-categoria-a-${width}.png`) });
        await a.getByRole('button', { name: 'Voltar' }).click();
        await page.waitForTimeout(50);
        assert(await open.evaluate(el => el === document.activeElement));
        const b = section(page, 'Painel de boxes');
        assert.equal(await b.getByRole('link').filter({ hasText: 'R$' }).count(), 2);
        const before = await b.getByRole('link').filter({ hasText: 'R$' }).first().textContent();
        await b.getByRole('button', { name: 'Próximo', exact: true }).click();
        assert.notEqual(await b.getByRole('link').filter({ hasText: 'R$' }).first().textContent(), before);
        await b.getByRole('button').filter({ hasText: 'Picapes' }).first().click();
        assert.equal(await b.getByRole('link').filter({ hasText: 'R$' }).count(), 2);
        assert.match(await b.getByRole('link', { name: 'Ver estoque', exact: true }).getAttribute('href'), /segmento=Picapes/);
        if (width !== 320) await b.screenshot({ path: path.join(out, `${engine}-categoria-b-${width}.png`) });
        const c = section(page, 'Gaveta de escolha');
        const trigger = c.getByRole('button').filter({ hasText: 'Hatch' }).first();
        await trigger.click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        assert(await dialog.evaluate(el => el.contains(document.activeElement)), 'Modal sem foco');
        assert.equal(await dialog.getByRole('link').filter({ hasText: 'R$' }).count(), 2);
        await dialog.getByRole('button', { name: 'Próximo', exact: true }).click();
        await page.keyboard.press('Tab');
        // O diálogo nativo pode enviar Tab à barra do navegador; nunca ao site por trás.
        assert(await dialog.evaluate(el => el.matches(':modal') && (el.contains(document.activeElement) || document.activeElement === document.body)), 'Foco chegou ao site por trás do modal');
        if (width !== 320) await dialog.screenshot({ path: path.join(out, `${engine}-categoria-c-${width}.png`) });
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        assert(await trigger.evaluate(el => el === document.activeElement), 'Modal não devolveu foco');
        await page.getByRole('button', { name: 'Ver no celular', exact: true }).click();
        assert(await fit(page), 'Simulador causa rolagem lateral');
        for (const op of ['a', 'b', 'c']) {
          await page.goto(`${base}/propostas/botoes/exemplo?opcao=${op}`);
          await page.getByRole('button', { name: 'Buscar um carro', exact: true }).click();
          await page.waitForTimeout(500);
          assert(await fit(page), `Botões ${op} ${engine} ${width}: largura`);
          const buttons = await page.locator('.dl-busca-aba__ir, .dl-busca-aba__fechar').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, right: r.right, width: r.width, height: r.height, at: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('button') === el }; }));
          assert(buttons.every(b => b.x >= 0 && b.right <= width && b.width >= 40 && b.height >= 40 && b.at), `Botões ${op}: alvos cortados ou cobertos`);
          if (width !== 320) await page.screenshot({ path: path.join(out, `${engine}-botoes-${op}-${width}.png`) });
          await page.getByRole('button', { name: 'Fechar busca', exact: true }).click();
          await page.locator('.dl-painel__marca button').first().click();
          const option = page.getByRole('option', { name: /Fiat/i });
          await option.click();
          await page.locator('.dl-painel__ir').click();
          await page.waitForURL('**/comprar?marca=Fiat');
        }
        await page.goto(`${base}/propostas/botoes`);
        await page.getByRole('button', { name: 'Celular', exact: true }).click();
        assert(await fit(page), 'Botões comparação: largura');
        assert.deepEqual(errors, [], `${engine} ${width}: erros de execução`);
        console.log(`PASS propostas ${engine} ${width}: A/B/C, preços, modal, foco, simulador e filtros`);
        await page.close();
      }
    } finally { await browser.close(); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
