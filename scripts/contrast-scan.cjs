/* eslint-disable @typescript-eslint/no-require-imports -- Local browser verification. */
// Varredura de contraste: todo texto visível contra o fundo composto, em três paletas e duas larguras.
// Limite WCAG AA: 4,5:1 (3:1 para texto grande). Ignora texto sobre foto ou vídeo e controles desativados.
// Uso: node scripts/contrast-scan.cjs  (demo em VITRINE_BASE_URL, padrão http://localhost:3601).
// No Delta, o fundo das lâminas (botões, chips, abas, placas) é o ::before inclinado: entra na conta.
// Sai com erro se algum texto ficar abaixo do limite.
const { chromium } = require('playwright');
const BASE = process.env.VITRINE_BASE_URL || process.env.HALO_BASE_URL || 'http://localhost:3601';
const EXTRA = {
  address: 'Rua Exemplo, 100, Centro, Cidade Exemplo',
  whatsapp: '5531000000000',
  phone: '(31) 0000-0000',
  email: 'contato@example.com',
  hours: { weekdays: 'Segunda a sexta, das 9h às 18h', saturday: 'Sábado, das 9h às 13h' },
  testimonials: [
    { name: 'Pessoa Exemplo', text: 'Texto sintético de avaliação, longo o bastante para medir o contraste do rolo de vozes nas três paletas do teste.', rating: 5 },
    { name: 'Outra Pessoa', text: 'Segunda avaliação sintética para o rolo ter vizinha.', rating: 4 },
  ],
  about: {
    title: 'Uma história sintética para medir o contraste.',
    intro: 'Introdução sintética da loja de exemplo.',
    sections: [{ title: 'Capítulo de exemplo', body: ['Parágrafo sintético para a medida.'] }, { title: 'Outro capítulo', body: ['Mais um parágrafo sintético.'] }],
    stats: [{ value: '01', label: 'Primeiro número' }, { value: '02', label: 'Segundo número' }],
    highlights: [{ title: 'Atendimento', text: 'Texto sintético do destaque.' }],
  },
};
const PALETTES = [
  { name: 'Radial', config: null },
  { name: 'Estação', config: { ...EXTRA, name: 'Estação Automóveis', primaryColor: '#183d54', secondaryColor: '#bb683e', surfaceColor: '#f5f0e8', bannerUrl: '/preview/banner.svg', appearance: { bannerType: 'image' } } },
  { name: 'Norte', config: { ...EXTRA, name: 'Norte Motor', primaryColor: '#e2b583', secondaryColor: '#72abc2', surfaceColor: '#20252b', bannerUrl: '/showcase/banner-poster.webp', appearance: { bannerType: 'video', bannerVideoUrl: '/showcase/banner-video.mp4' } } },
];
const PAGES = [['home', '/'], ['comprar', '/comprar'], ['vender', '/vender'], ['sobre', '/sobre-nos'], ['veiculo', '/veiculo/apex-1']];

async function scan(page) {
  return page.evaluate(() => {
    // Texto sobre vídeo ou foto (abertura, fotos da vitrine e do carro) fica de fora; o preço e o
    // selo das fotos têm fundo próprio e entram.
    const SKIP = '.dl-abertura, .dl-fita__imagem, .dl-chegada__mapa, .dl-veiculo__foto, .dl-sobre__foto, .dl-pole__miniaturas, .dl-sr, [aria-hidden="true"], .dl-zap, .dl-pular';
    const parse = (value) => {
      const n = [...value.matchAll(/-?[\d.]+(?:e-?\d+)?/g)].map((m) => Number(m[0]));
      if (value.startsWith('color(srgb')) return [n[0] * 255, n[1] * 255, n[2] * 255, n[3] ?? 1];
      return [n[0], n[1], n[2], n[3] ?? 1];
    };
    const over = (top, bottom) => top.slice(0, 3).map((c, i) => c * top[3] + bottom[i] * (1 - top[3])).concat(1);
    const lum = (c) => c.slice(0, 3).map((v) => {
      const x = v / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const failures = [];
    let checked = 0;
    for (const el of document.querySelectorAll('.dl-site *')) {
      if (el.closest(SKIP)) continue;
      if (!el.closest('.dl-site')) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
      if (!own) continue;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || el.closest('dialog:not([open])') || el.closest('[hidden]')) continue;
      if (el.closest(':disabled, [aria-disabled="true"]')) continue; // WCAG exempts inactive controls
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Effective opacity and background layers up the tree; skip text over images or gradients.
      let opacity = 1;
      let unknown = false;
      const layers = [];
      let previous = null;
      for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
        const s = getComputedStyle(node);
        opacity *= Number(s.opacity);
        if (s.backgroundImage && s.backgroundImage !== 'none') unknown = true;
        // Decorative pills and marks drawn as absolutely positioned siblings behind the text.
        if (previous) {
          for (const child of node.children) {
            if (child === previous || child.textContent.trim()) continue;
            const cs = getComputedStyle(child);
            if (cs.position !== 'absolute') continue;
            const color = parse(cs.backgroundColor);
            if (!color[3]) continue;
            const r = child.getBoundingClientRect();
            if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) layers.push(color);
          }
        }
        // A lâmina por trás do texto: o ::before que cobre quase toda a caixa (não as marcas finas nem
        // a faixa da borda inclinada do card).
        const antes = getComputedStyle(node, '::before');
        if (antes.content !== 'none' && antes.position === 'absolute') {
          const cor = parse(antes.backgroundColor);
          const caixa = node.getBoundingClientRect();
          if (cor[3] && parseFloat(antes.width) >= caixa.width * 0.5 && parseFloat(antes.height) >= caixa.height * 0.5) layers.push(cor);
        }
        layers.push(parse(s.backgroundColor));
        previous = node;
      }
      if (unknown || opacity < 0.05) continue;
      const bg = layers.reverse().reduce((acc, layer) => over(layer, acc), [255, 255, 255, 1]);
      const fgRaw = parse(style.color);
      const fg = over([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * opacity], bg);
      const size = parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const value = ratio(fg, bg);
      checked += 1;
      if (value < (large ? 3 : 4.5)) {
        failures.push({
          text: own.slice(0, 40),
          el: `${el.tagName.toLowerCase()}.${String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.')}`,
          parent: `${el.parentElement.tagName.toLowerCase()}.${String(el.parentElement.className).split(' ')[0]}`,
          ratio: Number(value.toFixed(2)),
          size,
        });
      }
    }
    return { checked, failures };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const rows = [];
  for (const palette of PALETTES) {
    for (const [name, route] of PAGES) {
      if (palette.config && name === 'veiculo') continue; // the preview has no vehicle page
      for (const width of [1280, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        if (palette.config) {
          await page.addInitScript(() => window.addEventListener('message', (e) => { if (e.data?.type === 'vitrine-preview-ready') window.__ready = true; }));
          await page.goto(BASE + '/preview', { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => window.__ready === true);
          await page.evaluate(([config, target]) => window.postMessage({ type: 'vitrine-preview', config, page: target }, location.origin), [palette.config, name]);
          await page.waitForTimeout(1500);
        } else {
          await page.goto(BASE + route, { waitUntil: 'load' });
          await page.waitForTimeout(900);
          // React reveals the streamed parts on an animation frame, which a fresh headless browser can take
          // seconds to produce; audit the page only once nothing waits to be revealed.
          await page.waitForFunction(() => !document.querySelector('template[id^="B:"]'), null, { timeout: 10000 });
        }
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < height; y += 600) {
          await page.evaluate((top) => scrollTo(0, top), y);
          await page.waitForTimeout(60);
        }
        await page.waitForTimeout(800);
        const result = await scan(page);
        rows.push({ palette: palette.name, page: name, width, ...result });
        await page.close();
      }
    }
  }
  let total = 0;
  for (const row of rows) {
    total += row.failures.length;
    console.log(`${row.palette} ${row.page} ${row.width}: ${row.checked} textos, ${row.failures.length} abaixo do limite`);
    for (const f of row.failures.slice(0, 8)) console.log(`   ${f.ratio}:1 ${f.size}px ${f.el} < ${f.parent} "${f.text}"`);
  }
  console.log(`TOTAL abaixo do limite: ${total}`);
  await browser.close();
  if (total > 0) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
