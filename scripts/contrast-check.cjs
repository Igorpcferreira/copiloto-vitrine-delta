/* eslint-disable @typescript-eslint/no-require-imports -- Node validation script uses CommonJS. */
// Contraste por pares no Delta: tokens da paleta e o texto de cada componente medido no navegador
// contra o fundo composto (o ::before inclinado das lâminas incluído), em três paletas: Radial,
// Estação (clara) e Norte (escura). Abre também o que só aparece aberto (painel de filtros do
// Comprar, formulário "Tenho interesse"). Limite 4,5:1 (3:1 para texto grande).
// Uso: VITRINE_BASE_URL=http://localhost:3601 node scripts/contrast-check.cjs
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.env.VITRINE_BASE_URL || process.env.HALO_BASE_URL || 'http://localhost:3601';
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
const PALETAS = [
  { name: 'Radial', config: null },
  { name: 'Estação', config: { ...EXTRA, name: 'Estação Automóveis', primaryColor: '#183d54', secondaryColor: '#bb683e', surfaceColor: '#f5f0e8', bannerUrl: '/preview/banner.svg', appearance: { bannerType: 'image' } } },
  { name: 'Norte', config: { ...EXTRA, name: 'Norte Motor', primaryColor: '#e2b583', secondaryColor: '#72abc2', surfaceColor: '#20252b', bannerUrl: '/showcase/banner-poster.webp', appearance: { bannerType: 'video', bannerVideoUrl: '/showcase/banner-video.mp4' } } },
];
const PARES = {
  home: [
    '.dl-painel .dl-escolha__valor', '.dl-painel .dl-escolha__rotulo', '.dl-painel .dl-regua__rotulo', '.dl-painel .dl-regua__bandeira', '.dl-painel__ir',
    '.dl-marca__nome', '.dl-marca--chegada .dl-marca__nome', '.dl-carroceria__nome', '.dl-carroceria__virar', '.dl-chave__item--atual', '.dl-chave__item:not(.dl-chave__item--atual)', '.dl-linha__acao',
    '.dl-pole__marca', '.dl-pole__ficha', '.dl-vez__ficha', '.dl-vez__preco', '.dl-venda__titulo', '.dl-venda__etapas li', '.dl-venda__financiar', '.dl-venda__financiar a',
    '.dl-opcao strong', '.dl-opcao span', '.dl-voz__texto', '.dl-vozes__fonte', '.dl-vozes__botoes .dl-btn', '.dl-chegada__pergunta', '.dl-chegada__modos .dl-chip',
    '.dl-chegada__dados a', '.dl-chegada__ruas .dl-btn', '.dl-rod__frase', '.dl-rod__rotulo', '.dl-rod__col a', '.dl-rod__base p', '.dl-rod__fale', '.dl-fita__titulo',
  ],
  comprar: [
    '.dl-comprar__total', '.dl-barra__rotulo', '.dl-barra .dl-escolha__rotulo', '.dl-barra__valor', '.dl-barra__faixas-rotulo', '.dl-barra__faixas-lista a',
    '.dl-comprar__faixa-texto', '.dl-comprar__faixa-conta', '.dl-comprar__faixa-so', '.dl-cartao__marca', '.dl-cartao__titulo', '.dl-cartao__ficha', '.dl-preco__valor',
    '.dl-cartao__selo', '.dl-filtros__titulo', '.dl-chip', '.dl-chip small',
  ],
  vender: ['.dl-vender__intro', '.dl-vender__etapa[data-estado="proxima"] .dl-vender__nome', '.dl-vender__etapa[data-estado="proxima"] .dl-vender__numero', '.dl-campo__rotulo', '.dl-vender__form .dl-btn--acao'],
  sobre: [
    '.dl-sobre__etiqueta', '.dl-sobre__intro', '.dl-sobre__numeros strong', '.dl-sobre__numeros span', '.dl-sobre__indice a', '.dl-sobre__indice-num', '.dl-sobre__num',
    '.dl-sobre__texto', '.dl-sobre__destaques strong', '.dl-sobre__destaque-texto',
  ],
};

function medir(seletores) {
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
  const fundo = (el) => {
    const camadas = [];
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const antes = getComputedStyle(node, '::before');
      // A lâmina por trás do texto cobre quase toda a caixa; uma faixa fina (a da borda do card) não é fundo.
      const caixa = node.getBoundingClientRect();
      if (antes.content !== 'none' && antes.position === 'absolute' && parseFloat(antes.width) >= caixa.width * 0.5 && parseFloat(antes.height) >= caixa.height * 0.5) {
        const cor = parse(antes.backgroundColor);
        if (cor[3]) camadas.push(cor);
      }
      camadas.push(parse(getComputedStyle(node).backgroundColor));
    }
    return camadas.reverse().reduce((acc, layer) => over(layer, acc), [255, 255, 255, 1]);
  };
  const resultado = {};
  for (const sel of seletores) {
    const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden');
    if (!el) {
      resultado[sel] = null;
      continue;
    }
    const s = getComputedStyle(el);
    const bg = fundo(el);
    const fgRaw = parse(s.color);
    const fg = over(fgRaw, bg);
    const size = parseFloat(s.fontSize);
    const grande = size >= 24 || (Number(s.fontWeight) >= 700 && size >= 18.66);
    resultado[sel] = { razao: Number(ratio(fg, bg).toFixed(2)), limite: grande ? 3 : 4.5 };
  }
  return resultado;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const falhas = [];
  for (const paleta of PALETAS) {
    for (const [pagina, seletores] of Object.entries(PARES)) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
      await context.addInitScript(() => localStorage.setItem('vitrine-consent', 'denied'));
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      if (paleta.config) {
        await page.addInitScript(() => window.addEventListener('message', (e) => { if (e.data?.type === 'vitrine-preview-ready') window.__ready = true; }));
        await page.goto(base + '/preview', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.__ready === true);
        await page.evaluate(([config, target]) => window.postMessage({ type: 'vitrine-preview', config, page: target }, location.origin), [paleta.config, pagina]);
        await page.waitForTimeout(1500);
      } else {
        await page.goto(base + { home: '/', comprar: '/comprar', vender: '/vender', sobre: '/sobre-nos' }[pagina], { waitUntil: 'load' });
        await page.waitForFunction(() => !document.querySelector('template[id^="B:"]'), null, { timeout: 10000 });
      }
      // Rola a página toda para montar as seções que entram sob demanda.
      const altura = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < altura; y += 700) {
        await page.evaluate((top) => scrollTo(0, top), y);
        await page.waitForTimeout(60);
      }
      await page.evaluate(() => scrollTo(0, 0));
      if (pagina === 'comprar') {
        await page.locator('.dl-barra').getByRole('button', { name: /^Filtros/ }).click();
        await page.locator('#dl-comprar-filtros').waitFor();
      }
      await page.waitForTimeout(600);
      const resultado = await page.evaluate(medir, seletores);
      for (const [sel, r] of Object.entries(resultado)) {
        if (r && r.razao < r.limite) falhas.push(`${paleta.name} ${pagina} ${sel}: ${r.razao}:1`);
      }
      const faltando = Object.entries(resultado).filter(([, r]) => !r).map(([sel]) => sel);
      console.log(`${paleta.name} ${pagina}: ${Object.values(resultado).filter(Boolean).length} pares medidos${faltando.length ? `, sem elemento: ${faltando.join(' ')}` : ''}`);
      if (pagina === 'home') {
        const tokens = await page.evaluate(() => {
          const s = getComputedStyle(document.querySelector('.dl-site'));
          return ['--dl-ink', '--dl-bg', '--dl-primary', '--dl-on-primary', '--dl-action', '--dl-accent-ink', '--dl-muted'].map((k) => `${k}=${s.getPropertyValue(k).trim()}`).join(' ');
        });
        console.log(`   tokens: ${tokens}`);
      }
      await context.close();
    }
  }
  await browser.close();
  for (const f of falhas) console.log(`FALHA ${f}`);
  assert.deepEqual(falhas, [], 'pares abaixo do limite');
  console.log('contraste por pares: todos acima do limite nas três paletas');
})().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
