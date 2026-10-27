/* eslint-disable @typescript-eslint/no-require-imports -- Local browser verification. */
// Rolagem própria (regra 19 da skill, 26/10/2026), nas cinco páginas com ponteiro fino:
// barra do sistema escondida sem mudar a largura, barra própria visível, nenhum quadro de animação
// com a página parada (trace de 3 s), o polegar acompanha a rolagem, arrastar e clicar no trilho
// movem a página e "Voltar ao topo" desliza em vez de saltar. No toque, a barra do celular fica.
// Vem do Atlas (26/10/2026), com os seletores do Delta (`dl-trilho`).
// Uso: VITRINE_BASE_URL=http://localhost:3601 node scripts/rolagem-check.cjs
const { chromium } = require('playwright');

const BASE = process.env.VITRINE_BASE_URL || 'http://localhost:3601';
const PAGINAS = ['/', '/comprar', '/vender', '/sobre-nos', '/veiculo/apex-1'];
const falhas = [];
const ok = (cond, msg) => { if (!cond) falhas.push(msg); };

async function quadrosParado(page) {
  const cdp = await page.context().newCDPSession(page);
  const ev = [];
  cdp.on('Tracing.dataCollected', (d) => ev.push(...d.value));
  const fim = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReportEvents' });
  await page.waitForTimeout(3000);
  await cdp.send('Tracing.end');
  await fim;
  const meta = ev.find((e) => e.name === 'thread_name' && e.args && e.args.name === 'CrRendererMain' && ev.some((x) => x.pid === e.pid && x.tid === e.tid && x.name === 'RunTask'));
  return ev.filter((e) => e.name === 'FireAnimationFrame' && (!meta || (e.pid === meta.pid && e.tid === meta.tid))).length;
}

(async () => {
  const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  for (const caminho of PAGINAS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => localStorage.setItem('vitrine-consent', 'denied'));
    await page.goto(BASE + caminho, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(3500);
    await page.mouse.move(2, 2);
    const r = await page.evaluate(() => {
      const t = document.querySelector('.dl-trilho');
      const p = t && t.querySelector('.dl-trilho__polegar');
      return { nativa: innerWidth - document.documentElement.clientWidth, trilho: !!t && getComputedStyle(t).display !== 'none', altura: p ? p.getBoundingClientRect().height : 0, rolavel: document.documentElement.scrollHeight > innerHeight + 4 };
    });
    ok(r.nativa === 0, `${caminho}: barra do sistema com ${r.nativa}px`);
    if (r.rolavel) ok(r.trilho && r.altura >= 40, `${caminho}: barra própria ausente ou sem polegar`);
    const parados = await quadrosParado(page);
    ok(parados === 0, `${caminho}: ${parados} quadros de animação com a página parada`);
    if (r.rolavel) {
      const p0 = await page.evaluate(() => document.querySelector('.dl-trilho__polegar').getBoundingClientRect().top);
      await page.mouse.move(720, 450);
      for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(60); }
      await page.waitForTimeout(1400);
      const p1 = await page.evaluate(() => document.querySelector('.dl-trilho__polegar').getBoundingClientRect().top);
      ok(p1 > p0 + 2, `${caminho}: o polegar não acompanhou a rolagem (${p0} -> ${p1})`);
      const b = await page.evaluate(() => { const e = document.querySelector('.dl-trilho__polegar').getBoundingClientRect(); return { x: e.x + e.width / 2, y: e.y + e.height / 2 }; });
      const y0 = await page.evaluate(() => scrollY);
      await page.mouse.move(b.x, b.y);
      await page.mouse.down();
      await page.mouse.move(b.x, b.y + 80, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(300);
      const y1 = await page.evaluate(() => scrollY);
      ok(y1 > y0 + 40, `${caminho}: arrastar o polegar não moveu a página (${y0} -> ${y1})`);
      // Fim da página, já parada (a inércia anterior terminou), e o trajeto quadro a quadro.
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await page.waitForTimeout(900);
      const topo = page.locator('footer a[href="#dl-topo"]').first();
      if (await topo.count()) {
        const de = await page.evaluate(() => scrollY);
        await page.evaluate(() => { window.__ys = []; const f = () => { window.__ys.push(scrollY); if (window.__ys.length < 120) requestAnimationFrame(f); }; requestAnimationFrame(f); });
        await topo.click();
        await page.waitForTimeout(2400);
        const ys = await page.evaluate(() => window.__ys);
        const meio = ys.filter((y) => y > de * 0.1 && y < de * 0.9).length;
        const fim = await page.evaluate(() => scrollY);
        ok(de > 200 && meio >= 3 && fim < 5, `${caminho}: Voltar ao topo não deslizou (de ${Math.round(de)}, ${meio} quadros no caminho, fim ${Math.round(fim)})`);
      }
    }
    await page.close();
  }
  // No toque, a barra do celular continua e a própria não aparece.
  const toque = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await toque.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await toque.waitForTimeout(1500);
  ok(await toque.evaluate(() => { const t = document.querySelector('.dl-trilho'); return !t || getComputedStyle(t).display === 'none'; }), 'toque: a barra própria apareceu no celular');
  await browser.close();
  console.log(falhas.length ? `${falhas.length} falhas` : 'rolagem: tudo certo nas 5 páginas e no toque');
  for (const f of falhas) console.log('FALHA', f);
  process.exit(falhas.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
