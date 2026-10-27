/* eslint-disable @typescript-eslint/no-require-imports -- Local browser verification. */
// Auditoria de responsividade em 7 larguras (320 a 1024): rolagem lateral, elementos fora da tela
// fora de carrosséis, alvos de toque abaixo de 40px, texto abaixo de 12px, WhatsApp visível e, no fim
// da página, nada fixo cobrindo o copyright ou o crédito Copiloto.
// Uso: node scripts/mobile-audit.cjs  (demo em VITRINE_BASE_URL, padrão http://localhost:3601).
// Sai com erro se alguma combinação falhar.
const { chromium } = require('playwright');
const BASE = process.env.VITRINE_BASE_URL || process.env.HALO_BASE_URL || 'http://localhost:3601';
const ROUTES = [['home', '/'], ['comprar', '/comprar'], ['veiculo', '/veiculo/apex-1'], ['vender', '/vender'], ['sobre', '/sobre-nos']];
const WIDTHS = [[320, 640], [360, 740], [390, 844], [414, 896], [768, 1024], [900, 800], [1024, 768]];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  for (const [name, route] of ROUTES) {
    for (const [width, height] of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 700, hasTouch: true, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(BASE + route, { waitUntil: 'load' });
      await page.waitForTimeout(900);
      // React reveals the streamed parts on an animation frame, which a fresh headless browser can take
      // seconds to produce; audit the page only once nothing waits to be revealed.
      await page.waitForFunction(() => !document.querySelector('template[id^="B:"]'), null, { timeout: 10000 });
      const max = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < max; y += Math.round(height * 0.8)) {
        await page.evaluate((top) => scrollTo(0, top), y);
        await page.waitForTimeout(60);
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(400);
      // A largura pedida, não innerWidth: no celular emulado a página que passa da tela alarga a
      // janela de layout (innerWidth cresce junto com scrollWidth) e o excesso não apareceria.
      const result = await page.evaluate((largura) => {
        const vw = largura;
        const label = (el) => {
          const text = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
          return `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${text}"`;
        };
        const inScroller = (el) => {
          for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
            const style = getComputedStyle(node);
            if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) return true;
          }
          return false;
        };
        const visible = (el) => {
          const style = getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };
        const offenders = [...document.querySelectorAll('body *')]
          .filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 1 && !inScroller(el) && getComputedStyle(el).position !== 'fixed')
          .slice(0, 6)
          .map(label);
        const targets = [...document.querySelectorAll('a[href], button, [role="tab"], input, select, textarea, summary')]
          // Hidden copies (brand ribbon loop, cards behind the top review) are not targets.
          .filter((el) => visible(el) && !el.closest('p, li p, .dl-rod__base') && !el.closest('dialog:not([open])') && !el.closest('[aria-hidden="true"]'))
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width < 40 || rect.height < 40;
          })
          .filter((el) => !(el.tagName === 'INPUT' && ['range', 'file', 'hidden'].includes(el.type)))
          // Stretched links cover the whole card; inputs inside a label take the label's area.
          .filter((el) => !el.classList.contains('dl-cartao__link') && !(el.tagName === 'INPUT' && el.closest('label')))
          .map((el) => {
            const rect = el.getBoundingClientRect();
            return `${label(el)} ${Math.round(rect.width)}x${Math.round(rect.height)}`;
          });
        const tiny = [...document.querySelectorAll('body *')]
          .filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12)
          .slice(0, 6)
          .map((el) => `${label(el)} ${getComputedStyle(el).fontSize}`);
        const wa = document.querySelector('.dl-zap__lamina')?.getBoundingClientRect();
        // No Delta o WhatsApp fica ao lado do conteúdo da barra do veículo (no espaço reservado à
        // direita dela): confere-se que ele não cobre o texto nem o botão da barra.
        const bar = document.querySelector('.dl-veiculo__barra');
        const barOn = bar && getComputedStyle(bar).display !== 'none';
        const partes = barOn ? [...bar.querySelectorAll('.dl-veiculo__barra-texto, .dl-veiculo__barra-quero')].map((el) => el.getBoundingClientRect()) : [];
        const waOverBar = !!(wa && partes.some((r) => !(wa.bottom <= r.top || wa.top >= r.bottom || wa.right <= r.left || wa.left >= r.right)));
        return {
          overflowX: document.documentElement.scrollWidth > vw || innerWidth > vw,
          offenders,
          smallTargets: [...new Set(targets)].slice(0, 12),
          smallTargetCount: targets.length,
          tiny,
          waOverBar,
          waVisible: !!wa && wa.bottom <= innerHeight && wa.right <= vw,
          // Primeira tela: o WhatsApp não tapa um controle (o centro dele ou mais de 30% da área): a
          // régua de preço, um botão, um campo. Passar sobre a ponta de um card grande que rola é normal.
          waOverTop: wa
            ? [...document.querySelectorAll('a[href], button, input:not([type="range"]), select, textarea, .dl-regua__polegar, .dl-regua__bandeira')]
                .filter((el) => visible(el) && !el.closest('.dl-zap, .dl-cab, .dl-veiculo__barra, dialog:not([open]), [aria-hidden="true"]'))
                .filter((el) => getComputedStyle(el).position !== 'fixed')
                .filter((el) => {
                  const r = el.getBoundingClientRect();
                  if (r.bottom <= 0 || r.top >= innerHeight) return false;
                  const w = Math.max(0, Math.min(wa.right, r.right) - Math.max(wa.left, r.left));
                  const h = Math.max(0, Math.min(wa.bottom, r.bottom) - Math.max(wa.top, r.top));
                  const cx = r.left + r.width / 2;
                  const cy = r.top + r.height / 2;
                  const centro = cx >= wa.left && cx <= wa.right && cy >= wa.top && cy <= wa.bottom;
                  return centro || (w * h) / (r.width * r.height) > 0.3;
                })
                .map(label)
                .slice(0, 4)
            : [],
        };
      }, width);
      // End of the page: nothing fixed may cover the copyright or the Copiloto credit.
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(900);
      result.footerCovered = await page.evaluate(() => {
        const hit = (a, b) => !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right);
        const covers = [...document.querySelectorAll('.dl-zap__lamina, .dl-veiculo__barra')]
          .filter((el) => getComputedStyle(el).display !== 'none' && getComputedStyle(el).opacity !== '0')
          .map((el) => el.getBoundingClientRect());
        const rows = [...document.querySelectorAll('.dl-rod__base > p, .dl-rod__credito')].map((el) => el.getBoundingClientRect());
        return rows.some((row) => covers.some((cover) => hit(cover, row)));
      });
      result.creditBroken = await page.evaluate(() => {
        const credit = document.querySelector('.dl-rod__credito');
        return !!credit && credit.getBoundingClientRect().height > 48;
      });
      report.push({ name, width, ...result, errors });
      await page.close();
    }
  }
  let failed = 0;
  for (const row of report) {
    const flags = [];
    if (row.overflowX) flags.push('OVERFLOW');
    if (row.offenders.length) flags.push(`offscreen:${row.offenders.length}`);
    if (row.smallTargetCount) flags.push(`small:${row.smallTargetCount}`);
    if (row.tiny.length) flags.push(`tiny:${row.tiny.length}`);
    if (row.waOverBar) flags.push('WA-OVER-BAR');
    if (row.footerCovered) flags.push('FOOTER-COVERED');
    if (row.creditBroken) flags.push('CREDIT-BROKEN');
    if (!row.waVisible) flags.push('WA-HIDDEN');
    if (row.waOverTop.length) flags.push(`WA-OVER-TOP:${row.waOverTop.join(', ')}`);
    if (row.errors.length) flags.push(`errors:${row.errors.length}`);
    if (flags.length) failed += 1;
    console.log(`${row.name} ${row.width}: ${flags.join(' ') || 'ok'}`);
    for (const item of [...row.offenders, ...row.smallTargets, ...row.tiny].slice(0, process.env.AUDIT_VERBOSE ? 40 : 6)) console.log(`   ${item}`);
  }
  await browser.close();
  if (failed) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
