// Synthetic contract checks. No network access or real tenant credentials.
// Contrato do Horizon remoto: 22/10/2026 (d9350b8), 26/10/2026 (8d8f0c5), 27/10/2026 (5d29b26 e 5467a1d)
// e 28/10/2026 (d8915e0 e f50dcd4).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const root = path.resolve(import.meta.dirname, '..');
// Values built inside the sandbox come from another realm; compare them as plain data.
const plain = (value) => JSON.parse(JSON.stringify(value));
function loader(context, { siteConfig } = {}) {
  const cache = new Map();
  function load(file) {
    if (!path.extname(file)) file += '.ts';
    if (file.endsWith('.json')) {
      if (siteConfig && path.basename(file) === 'site-config.json') return siteConfig;
      return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
    }
    if (cache.has(file)) return cache.get(file).exports;
    const evaluatedModule = { exports: {} }; cache.set(file, evaluatedModule);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const requireLocal = (id) => {
      if (id === 'server-only') return {};
      if (id === 'next/headers') return { headers: async () => new Headers() };
      // The cookie store only needs useSyncExternalStore: here it reads the snapshot at once.
      if (id === 'react') return { useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot() };
      return load(id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : path.resolve(path.dirname(file), id));
    };
    vm.runInNewContext(code, { module: evaluatedModule, exports: evaluatedModule.exports, require: requireLocal, ...context }, { filename: file });
    return evaluatedModule.exports;
  }
  return (relative) => load(path.join(root, relative));
}
function sandbox(env, fetch, options) {
  const load = loader({ process: { env }, fetch, URL, URLSearchParams, AbortSignal, AbortController, FormData, Blob, Headers, console: { error() {} } }, options);
  return { data: load('src/lib/data.ts'), actions: load('src/lib/actions.ts'), vehicleActions: load('src/lib/vehicle-actions.ts') };
}
/** Browser stand-ins for the cookie consent store: a cookie jar that honours Max-Age=0. */
function consentSandbox(cookies = {}) {
  const jar = new Map(Object.entries(cookies));
  const writes = [];
  const events = [];
  const document = {
    get cookie() { return [...jar].map(([name, value]) => `${name}=${value}`).join('; '); },
    set cookie(line) {
      writes.push(line);
      const [pair, ...attributes] = line.split('; ');
      const name = pair.slice(0, pair.indexOf('='));
      if (attributes.includes('Max-Age=0')) jar.delete(name);
      else jar.set(name, pair.slice(pair.indexOf('=') + 1));
    },
    visibilityState: 'visible', addEventListener() {}, removeEventListener() {},
  };
  const window = {
    location: { protocol: 'https:', hostname: 'loja.example.com.br' },
    localStorage: { removeItem() {} },
    dispatchEvent: (event) => events.push(event.type), addEventListener() {}, removeEventListener() {},
  };
  const load = loader({ window, document, Event: class { constructor(type) { this.type = type; } } });
  return { consent: load('src/lib/consent.ts'), jar, writes, events };
}
(async () => {
  const env = { CLIENT_API_URL: 'https://api.example.test', CLIENT_SLUG: 'synthetic-store', CLIENT_API_TOKEN: 'synthetic-key', VITRINE_DEMO: 'false' };
  const calls = [];
  let status = 200, payload;
  const fetcher = async (url, options) => { calls.push({ url, options }); return { ok: status === 200, status, json: async () => payload }; };
  const api = sandbox(env, fetcher);
  const car = { id: 'synthetic-1', brand: 'Fiat', model: 'Teste', year: '2024', price: '80000', km: '10000', photos: [], badges: [] };
  payload = { data: { items: [car], total: 25, page: 2, perPage: 24, hasMore: false, facets: { brands: [{ name: 'Fiat', count: 25 }] } } };
  const result = await api.data.getVehiclesPage({ brands: ['Fiat', 'Toyota'], priceMin: 50000, sort: 'maior-preco' }, 2);
  assert.equal(result.items[0].price, 80000); assert.equal(result.total, 25);
  const url = new URL(calls.at(-1).url);
  assert.equal(url.pathname, '/vitrine/public/synthetic-store/veiculos');
  assert.deepEqual(url.searchParams.getAll('marcas'), ['Fiat', 'Toyota']);
  assert.equal(url.searchParams.get('page'), '2'); assert.equal(url.searchParams.get('preco_min'), '50000');
  assert.equal(calls.at(-1).options.headers['x-public-key'], 'synthetic-key');
  // 26/10: tempo limite nos pedidos e o filtro por selo (`badge`), com que a inicial busca Destaques e Ofertas.
  assert(calls.at(-1).options.signal instanceof AbortSignal, 'GET com tempo limite');
  await api.data.getVehiclesPage({ badge: 'destaque' }, 1, 6);
  assert.equal(new URL(calls.at(-1).url).searchParams.get('badge'), 'destaque');
  assert.equal(new URL(calls.at(-1).url).searchParams.get('perPage'), '6');
  // 22/10: tipo do veículo e a ordem "recentes" (Novidades).
  await api.data.getVehiclesPage({ vehicleType: 'motorcycle', sort: 'recentes' }, 1, 6);
  assert.equal(new URL(calls.at(-1).url).searchParams.get('tipo'), 'motorcycle');
  assert.equal(new URL(calls.at(-1).url).searchParams.get('ordem'), 'recentes');
  // Facetas de tipo com contagem.
  payload = { data: { items: [], total: 3, page: 1, perPage: 24, hasMore: false,
    facets: { vehicleTypes: [{ name: 'car', count: 2 }, { name: 'motorcycle', count: 1 }, { name: 'car', count: 2 }] } } };
  const typed = await api.data.getVehiclesPage();
  assert.deepEqual(plain(typed.facets.vehicleTypes), ['car', 'motorcycle']);
  assert.equal(typed.facets.counts.vehicleType.motorcycle, 1);
  // 26/10: campos do veículo lidos um a um; garantia e direção em texto (22/10); `owners` saiu.
  payload = { data: { id: 7, brand: 'Fiat', model: 'Argo', year: '2020', km: '1000', price: '50000', warranty: '3 meses',
    steering: 'Hidráulica', doors: '4', licensed: true, owners: 2, vehicleType: 'car', motor: '1.3', power: ' ',
    photos: ['https://images.example.test/a.webp', 5, null], items: ['Ar', 3], badges: 'destaque', segment: 'Hatch' } };
  const detail = await api.data.getVehicle('7');
  assert.equal(detail.id, '7'); assert.equal(detail.title, 'Fiat Argo 2020');
  assert.equal(detail.warranty, '3 meses'); assert.equal(detail.steering, 'Hidráulica');
  assert.equal(detail.doors, 4); assert.equal(detail.licensed, true); assert.equal(detail.power, undefined);
  assert.equal('owners' in detail, false);
  assert.deepEqual(plain(detail.photos), ['https://images.example.test/a.webp']);
  assert.deepEqual(plain(detail.items), ['Ar']); assert.deepEqual(plain(detail.badges), []);
  payload = car; assert.equal((await api.data.getVehicle('id/with space')).id, car.id);
  assert(calls.at(-1).url.endsWith('/veiculos/id%2Fwith%20space'));
  status = 404; assert.equal(await api.data.getVehicle('missing'), null);
  status = 500; await assert.rejects(api.data.getVehiclesPage()); status = 200;
  // Rolagem infinita (26/10): filtros saneados e página limitada antes de chegar à API.
  payload = { data: { items: [], total: 0, page: 1, perPage: 24, hasMore: false, facets: {} } };
  await api.vehicleActions.loadVehiclesPage({ q: `  ${'a'.repeat(200)}  `, sort: 'qualquer', vehicleType: 'truck', priceMax: -5, brands: ['Fiat', 3] }, 9999);
  const sanitized = new URL(calls.at(-1).url).searchParams;
  assert.equal(sanitized.get('page'), '1'); assert.equal(sanitized.get('q').length, 120);
  assert.equal(sanitized.get('ordem'), null); assert.equal(sanitized.get('preco'), null);
  assert.equal(sanitized.get('tipo'), 'truck'); assert.deepEqual(sanitized.getAll('marcas'), ['Fiat']);
  assert.equal((await api.actions.submitLead({ name: 'Teste', phone: '00000000000' })).ok, true);
  assert(calls.at(-1).url.endsWith('/leads')); assert.equal(calls.at(-1).options.method, 'POST');
  assert.equal(JSON.parse(calls.at(-1).options.body).slug, 'synthetic-store');
  assert(calls.at(-1).options.signal instanceof AbortSignal, 'POST com tempo limite');
  // 26/10: o lead leva só os campos do contrato, com nome e e-mail aparados e mensagem de até 2000 caracteres.
  await api.actions.submitLead({ name: ' Teste ', phone: '(62) 99999-0000', email: '  ', message: 'x'.repeat(2600),
    source: 'vitrine-veiculo', vehicleId: 'synthetic-1', extra: 'fora do contrato' });
  const lead = JSON.parse(calls.at(-1).options.body);
  assert.deepEqual(Object.keys(lead).sort(), ['message', 'name', 'phone', 'slug', 'source', 'vehicleId']);
  assert.equal(lead.name, 'Teste'); assert.equal(lead.message.length, 2000);
  // Validação antes de enviar (26/10): telefone de 10 a 13 dígitos e e-mail válido.
  const antes = calls.length;
  assert.equal((await api.actions.submitLead({ name: 'Teste', phone: '123' })).ok, false);
  assert.equal((await api.actions.submitLead({ name: 'Teste', phone: '00000000000', email: 'nao-e-email' })).ok, false);
  assert.equal((await api.actions.submitLead({ name: 'Teste', phone: '1'.repeat(14) })).ok, false);
  assert.equal((await api.actions.submitSellRequest({ name: 'Teste', phone: '00000000000' })).ok, false);
  assert.equal(calls.length, antes, 'nada sai com dados inválidos');
  assert.equal((await api.actions.submitSellRequest({ name: 'Teste', phone: '00000000000', brand: 'Fiat', vehicleType: 'motorcycle' })).ok, true);
  assert(calls.at(-1).url.endsWith('/avaliacoes'));
  assert.equal(JSON.parse(calls.at(-1).options.body).vehicleType, 'motorcycle');
  // 26/10: fotos da venda uma a uma, resposta `{ ok, urls }` e tempo limite.
  payload = { data: { urls: ['https://images.example.test/test.webp', 42] } };
  const form = new FormData(); form.append('photos', new Blob(['synthetic']), 'test.txt');
  const upload = await api.actions.uploadSellPhotos(form);
  assert.equal(upload.ok, true); assert.deepEqual(plain(upload.urls), ['https://images.example.test/test.webp']);
  assert(calls.at(-1).url.endsWith('/avaliacoes/fotos')); assert.equal(calls.at(-1).options.body, form);
  assert(calls.at(-1).options.signal instanceof AbortSignal, 'envio de fotos com tempo limite');
  payload = { data: { urls: [] } };
  assert.equal((await api.actions.uploadSellPhotos(form)).ok, false, 'sem endereço de volta, a foto não foi aceita');
  status = 500; assert.equal((await api.actions.submitLead({ name: 'Teste', phone: '00000000000' })).ok, false);
  assert.equal((await api.actions.uploadSellPhotos(form)).ok, false); status = 200;
  for (const disabled of [{}, { ...env, CLIENT_API_TOKEN: '' }, { ...env, VITRINE_DEMO: 'true' }]) {
    const isolated = sandbox(disabled, () => { throw new Error('Unexpected request'); });
    assert.equal((await isolated.actions.submitLead({ name: 'Teste', phone: '00000000000' })).ok, false);
    const vazio = await isolated.actions.uploadSellPhotos(form);
    assert.equal(vazio.ok, false); assert.equal(vazio.urls.length, 0);
  }

  // 26/10: `vehicleFocus` da loja: nome do estoque sem pedido à API e o tipo dela primeiro nas facetas.
  const siteConfig = JSON.parse(fs.readFileSync(path.join(root, 'site-config.json'), 'utf8'));
  const focused = sandbox(env, fetcher, { siteConfig: { ...siteConfig, vehicleFocus: 'motorcycle' } });
  const before = calls.length;
  assert.equal((await focused.data.getStockNoun()).singular, 'moto');
  assert.equal(calls.length, before, 'o foco configurado dispensa a API');
  assert.equal((await focused.data.getTenant()).vehicleFocus, 'motorcycle');
  payload = { data: { items: [], total: 3, page: 1, perPage: 24, hasMore: false,
    facets: { vehicleTypes: [{ name: 'car', count: 2 }, { name: 'motorcycle', count: 1 }] } } };
  assert.deepEqual(plain((await focused.data.getVehiclesPage()).facets.vehicleTypes), ['motorcycle', 'car']);
  const invalid = sandbox(env, fetcher, { siteConfig: { ...siteConfig, vehicleFocus: 'barco' } });
  assert.equal((await invalid.data.getTenant()).vehicleFocus, undefined);
  payload = { data: { items: [], total: 1, page: 1, perPage: 1, hasMore: false, facets: { vehicleTypes: [{ name: 'truck', count: 1 }] } } };
  assert.equal((await invalid.data.getStockNoun()).plural, 'caminhões', 'sem foco, o nome vem dos tipos do estoque');

  // WhatsApp e telefone com o DDI do Brasil (26/10).
  const format = loader({ URL, URLSearchParams })('src/lib/format.ts');
  assert.equal(format.whatsappLink('(62) 99513-6720', 'Olá'), 'https://wa.me/5562995136720?text=Ol%C3%A1');
  assert.equal(format.whatsappLink('5562995136720', 'Olá'), 'https://wa.me/5562995136720?text=Ol%C3%A1');
  assert.equal(format.telHref('(11) 0000-0000'), 'tel:+551100000000'); assert.equal(format.telHref(''), undefined);

  // 27/10: categorias do aviso de cookies a partir do rastreamento configurado e do mapa.
  const tracking = loader({})('src/lib/tracking.ts');
  const store = (tracking_, mapa) => ({ tracking: tracking_, sections: { mapa } });
  assert.deepEqual(plain(tracking.resolveTracking(store({}, true)).consentCategories), ['map']);
  assert.deepEqual(plain(tracking.resolveTracking(store({}, false)).consentCategories), []);
  const tagged = tracking.resolveTracking(store({ googleAnalyticsId: ' g-abc123 ', metaPixelId: '123456789' }, true));
  assert.equal(tagged.googleTagId, 'G-ABC123'); assert.equal(tagged.metaPixelId, '123456789');
  assert.deepEqual(plain(tagged.consentCategories), ['analytics', 'marketing', 'map']);
  assert.deepEqual(plain(tracking.resolveTracking(store({ googleAnalyticsId: 'AW-1', metaPixelId: 'abc' }, false)).consentCategories), ['marketing']);

  // 27/10: a escolha fica num cookie de primeira parte por 180 dias, versionado; recusar apaga os de medição.
  const fresh = consentSandbox({ _ga: 'GA1', _ga_X1: 'GS1', _fbp: 'fb.1', _gcl_au: '1' });
  assert.equal(fresh.consent.useConsent(), null, 'sem escolha, nada liberado');
  fresh.consent.saveConsent({ analytics: false, marketing: true, map: true });
  const written = fresh.writes.find((line) => line.startsWith('vitrine_consent='));
  assert.match(written, /; Path=\/; Max-Age=15552000; SameSite=Lax; Secure$/);
  assert.deepEqual(plain(fresh.consent.useConsent()), { analytics: false, marketing: true, map: true });
  assert.equal(fresh.jar.has('_ga'), false); assert.equal(fresh.jar.has('_ga_X1'), false);
  assert.equal(fresh.jar.has('_fbp'), true, 'marketing aceito mantém o cookie de anúncios');
  assert.deepEqual(fresh.events, ['vitrine-consent-change']);
  fresh.consent.saveConsent({ analytics: false, marketing: false, map: false });
  assert.equal(fresh.jar.has('_fbp'), false); assert.equal(fresh.jar.has('_gcl_au'), false);
  const stored = (fields) => encodeURIComponent(JSON.stringify({ version: 1, analytics: true, marketing: true, map: true, ...fields }));
  assert.deepEqual(plain(consentSandbox({ vitrine_consent: stored({ updatedAt: new Date().toISOString() }) }).consent.useConsent()),
    { analytics: true, marketing: true, map: true });
  const old = new Date(Date.now() - 181 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(consentSandbox({ vitrine_consent: stored({ updatedAt: old }) }).consent.useConsent(), null, 'escolha vencida pergunta de novo');
  assert.equal(consentSandbox({ vitrine_consent: stored({ version: 2, updatedAt: new Date().toISOString() }) }).consent.useConsent(), null);
  const opened = consentSandbox();
  opened.consent.openConsentSettings();
  assert.deepEqual(opened.events, ['vitrine-consent-open']);

  // 28/10 (d8915e0 e f50dcd4): aparência com a paleta, cores validadas e contraste garantido.
  const { buildAppearanceVars } = loader({})('src/lib/appearance.ts');
  const { buildBrandVars, hasContrast } = loader({})('src/lib/brand-vars.ts');
  const look = (appearance, palette) => plain(buildAppearanceVars(appearance, palette));
  // Cor do texto da página só com 4,5:1 sobre o branco.
  assert.equal(look({ textColor: '#d0d0d0' })['--site-text'], undefined, 'texto claro demais fica de fora');
  assert.equal(look({ textColor: '#d0d0d0' })['--color-on-surface'], undefined);
  assert.equal(look({ textColor: '#333333' })['--site-text'], '#333333');
  // Header sólido: a cor do texto só fica se puder ser lida no fundo dele.
  const solidLow = look({ headerStyle: 'solid', headerBackgroundColor: '#1a1a1a', headerTextColor: '#222222' });
  assert.equal(solidLow['--header-text'], undefined); assert.equal(solidLow['--drawer-bg'], undefined);
  assert.equal(solidLow['--header-default-text'], '#ffffff');
  const solidOk = look({ headerStyle: 'solid', headerBackgroundColor: '#1a1a1a', headerTextColor: '#f5f5f5' });
  assert.equal(solidOk['--header-text'], '#f5f5f5'); assert.equal(solidOk['--drawer-bg'], '#1a1a1a');
  // Vidro com texto claro (pensado para o vídeo): fica, com um tom legível para os fundos claros.
  const glassLight = look({ headerStyle: 'glass', headerTextColor: '#ffffff' });
  assert.equal(glassLight['--header-text'], '#ffffff'); assert.equal(glassLight['--header-light-text'], '#000000');
  assert.equal(look({ headerStyle: 'glass', headerTextColor: '#0f1522' })['--header-light-text'], undefined);
  // Texto de contraste: sobre a cor principal só com 4,5:1; sobre a secundária, sempre.
  const onDark = look({ contrastTextColor: '#ffffff' }, { primaryColor: '#0f1522' });
  assert.equal(onDark['--color-on-navy'], '#ffffff'); assert.equal(onDark['--color-on-brand'], '#ffffff');
  const onLight = look({ contrastTextColor: '#ffffff' }, { primaryColor: '#e2b583' });
  assert.equal(onLight['--color-on-navy'], undefined); assert.equal(onLight['--color-on-brand'], '#ffffff');
  // Hexadecimal inválido: na paleta vale a cor padrão (#0f1522); na aparência, a cor fica de fora.
  assert.equal(look({ contrastTextColor: '#ffffff' }, { primaryColor: 'azul' })['--color-on-navy'], '#ffffff');
  assert.deepEqual(look({ textColor: '#fff', headerTextColor: 'red' }), {});
  // Cores derivadas: superfície escura ganha tons claros de painel e de linha; texto da loja
  // que não se lê sobre a superfície cede ao tom legível.
  const dark = plain(buildBrandVars('#e2b583', '#72abc2', '#20252b'));
  assert(dark['--surface-soft'] && dark['--surface-line'], 'tons de painel na superfície escura');
  assert.equal(plain(buildBrandVars('#0f1522', '#528fb8', '#fafafa'))['--surface-soft'], undefined);
  assert.equal(plain(buildBrandVars('#e2b583', '#72abc2', '#20252b', '#333333'))['--surface-text'], '#ffffff');
  assert.equal(plain(buildBrandVars('#0f1522', '#528fb8', '#fafafa', '#333333'))['--surface-text'], undefined);
  // Delta (como o Halo): a página é a superfície. A tinta da marca e a tinta do texto seguem legíveis sobre ela,
  // também na escura, sem trocar a tinta do tema pelo branco puro.
  assert(hasContrast(dark['--color-brand-ink'], '#20252b'), 'tinta da marca legível na superfície escura');
  assert.equal(plain(buildBrandVars('#1c2230', '#72abc2', '#20252b'))['--surface-text'], undefined);

  console.log('PASS API contract: list, filters, badge, type, recentes, pagination, timeout, detail fields, sanitized paging, errors, validation, leads, evaluation, upload one by one and disabled submissions; vehicleFocus, WhatsApp and phone, cookie categories and consent store; appearance palette, colour validation and contrast.');
})().catch(error => { console.error(error); process.exitCode = 1; });
