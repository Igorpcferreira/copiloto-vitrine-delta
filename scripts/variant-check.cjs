/* eslint-disable @typescript-eslint/no-require-imports -- Node validation script uses CommonJS. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const base = process.env.VITRINE_BASE_URL || process.env.HALO_BASE_URL || 'http://localhost:3601';
  const out = path.join(__dirname, '..', 'docs', 'previews', 'variants');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const cases = [
    { key: 'estacao-one-image', fixture: 'one', width: 390, config: {
      name: 'Estação Automóveis', tagline: 'Um carro para cada caminho.',
      primaryColor: '#183d54', secondaryColor: '#bb683e', surfaceColor: '#f5f0e8', fontFamily: 'DM Sans',
      logoUrl: '/preview/estacao-logo.svg', bannerUrl: '/preview/banner.svg', appearance: { bannerType: 'image', headerStyle: 'solid' },
      sections: { destaques: true, novidades: true, ofertas: true, mapa: false, depoimentos: false },
    }, expectedRows: 1, expectedMedia: true },
    { key: 'norte-empty-no-media', fixture: 'empty', width: 320, config: {
      name: 'Norte Motor', tagline: 'Encontre aqui o veículo que combina com seus próximos caminhos e com o jeito como você usa a cidade todos os dias.',
      primaryColor: '#e2b583', secondaryColor: '#72abc2', surfaceColor: '#20252b', fontFamily: 'Barlow',
      logoUrl: '/preview/norte-logo.svg', bannerUrl: '', appearance: { bannerType: 'image', headerStyle: 'glass' },
      sections: { destaques: false, novidades: false, ofertas: false, marcas: false, categorias: false, mapa: false, ctaBanner: false, vendaFinancie: false, paginaVender: false, paginaSobre: false },
    }, expectedRows: 0, expectedMedia: false },
    { key: 'norte-video', fixture: 'one', width: 900, config: {
      name: 'Norte Motor', tagline: 'Seleção de veículos para caminhos diferentes.',
      primaryColor: '#e2b583', secondaryColor: '#72abc2', surfaceColor: '#20252b', fontFamily: 'Barlow',
      logoUrl: '/preview/norte-logo.svg', bannerUrl: '/showcase/banner-poster.webp', appearance: { bannerType: 'video', bannerVideoUrl: '/showcase/banner-video.mp4', headerStyle: 'solid' },
      sections: { destaques: true, novidades: false, ofertas: false, marcas: false, categorias: false, mapa: false, ctaBanner: false },
    }, expectedRows: 1, expectedMedia: true },
  ];
  for (const item of cases) {
    const page = await browser.newPage({ viewport: { width: item.width, height: 800 } });
    await page.addInitScript(() => window.addEventListener('message', (event) => { if (event.data?.type === 'vitrine-preview-ready') window.__previewReady = true; }));
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/preview?fixture=${item.fixture}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__previewReady === true);
    await page.evaluate((config) => window.postMessage({ type: 'vitrine-preview', page: 'home', config }, window.location.origin), item.config);
    await page.getByRole('heading', { name: item.config.tagline }).waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `${item.key}.png`), fullPage: true });
    const state = await page.evaluate(() => ({
      // Na inicial do Delta os carros ficam no pole e atrás dele.
      rows: document.querySelectorAll('.dl-pole, .dl-vez').length,
      media: !!document.querySelector('.hero-media img, .hero-media video'),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      font: getComputedStyle(document.body).fontFamily,
      ink: getComputedStyle(document.querySelector('.dl-site')).color,
      primary: getComputedStyle(document.documentElement).getPropertyValue('--color-navy-950').trim(),
      secondary: getComputedStyle(document.documentElement).getPropertyValue('--color-brand-red').trim(),
      heading: document.querySelector('h1')?.getAttribute('aria-label') ?? document.querySelector('h1')?.textContent,
      emptyMessage: !!document.querySelector('.dl-painel__aviso'),
      hasVender: [...document.querySelectorAll('.dl-site nav a')].some((a) => a.textContent.trim() === 'Vender'),
    }));
    assert.equal(state.rows, item.expectedRows);
    assert.equal(state.media, item.expectedMedia);
    assert.equal(state.overflow, false);
    assert.deepEqual(errors, []);
    if (item.fixture === 'empty') {
      assert(state.emptyMessage);
      assert.equal(state.hasVender, false);
    }
    console.log(JSON.stringify({ case: item.key, ...state, errors }));
    await page.close();
  }
  const dark = {
    name: 'Norte Motor', primaryColor: '#e2b583', secondaryColor: '#72abc2', surfaceColor: '#20252b', fontFamily: 'Barlow',
    logoUrl: '/preview/norte-logo.svg', bannerUrl: '', appearance: { bannerType: 'image' },
    about: { title: 'Nossa história em uma frase breve.', intro: 'Uma apresentação sintética para verificar leitura.', sections: [
      { title: 'Uma seção com título extenso que precisa quebrar naturalmente em telas estreitas', body: [
        'Texto sintético longo. '.repeat(30), 'Outro parágrafo sintético para conferir a continuidade e o ritmo da leitura. '.repeat(12),
      ] },
    ] },
  };
  for (const [pageName, width] of [['comprar', 390], ['vender', 320], ['sobre', 320]]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.addInitScript(() => window.addEventListener('message', (event) => { if (event.data?.type === 'vitrine-preview-ready') window.__previewReady = true; }));
    await page.goto(`${base}/preview`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__previewReady === true);
    await page.evaluate(({ config, pageName }) => window.postMessage({ type: 'vitrine-preview', config, page: pageName }, window.location.origin), { config: dark, pageName });
    await page.waitForFunction((expected) => document.querySelector('h1')?.textContent?.includes(expected), pageName === 'sobre' ? dark.about.title : pageName === 'comprar' ? 'Nosso estoque' : 'Venda seu carro');
    await page.screenshot({ path: path.join(out, `norte-${pageName}.png`), fullPage: true });
    const state = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, overflow: document.documentElement.scrollWidth > window.innerWidth, font: getComputedStyle(document.body).fontFamily }));
    assert.equal(state.overflow, false);
    console.log(JSON.stringify({ case: `norte-${pageName}`, ...state }));
    await page.close();
  }
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
