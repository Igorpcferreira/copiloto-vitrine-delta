// Synthetic contract checks. No network access or real tenant credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const root = path.resolve(import.meta.dirname, '..');
function sandbox(env, fetch) {
  const cache = new Map();
  function load(file) {
    if (!path.extname(file)) file += '.ts';
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    if (cache.has(file)) return cache.get(file).exports;
    const evaluatedModule = { exports: {} }; cache.set(file, evaluatedModule);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const requireLocal = (id) => {
      if (id === 'server-only') return {};
      if (id === 'next/headers') return { headers: async () => new Headers() };
      return load(id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : path.resolve(path.dirname(file), id));
    };
    vm.runInNewContext(code, { module: evaluatedModule, exports: evaluatedModule.exports, require: requireLocal,
      process: { env }, fetch, URL, URLSearchParams, AbortSignal, AbortController, FormData, Blob, Headers, console: { error() {} } }, { filename: file });
    return evaluatedModule.exports;
  }
  return { data: load(path.join(root, 'src/lib/data.ts')), actions: load(path.join(root, 'src/lib/actions.ts')) };
}
(async () => {
  const env = { CLIENT_API_URL: 'https://api.example.test', CLIENT_SLUG: 'synthetic-store', CLIENT_API_TOKEN: 'synthetic-key', VITRINE_DEMO: 'false' };
  const calls = [];
  let status = 200, payload;
  const api = sandbox(env, async (url, options) => { calls.push({ url, options }); return { ok: status === 200, status, json: async () => payload }; });
  const car = { id: 'synthetic-1', brand: 'Fiat', model: 'Teste', year: '2024', price: '80000', km: '10000', photos: [], badges: [] };
  payload = { data: { items: [car], total: 25, page: 2, perPage: 24, hasMore: false, facets: { brands: [{ name: 'Fiat', count: 25 }] } } };
  const result = await api.data.getVehiclesPage({ brands: ['Fiat', 'Toyota'], priceMin: 50000, sort: 'maior-preco' }, 2);
  assert.equal(result.items[0].price, 80000); assert.equal(result.total, 25);
  const url = new URL(calls.at(-1).url);
  assert.equal(url.pathname, '/vitrine/public/synthetic-store/veiculos');
  assert.deepEqual(url.searchParams.getAll('marcas'), ['Fiat', 'Toyota']);
  assert.equal(url.searchParams.get('page'), '2'); assert.equal(url.searchParams.get('preco_min'), '50000');
  assert.equal(calls.at(-1).options.headers['x-public-key'], 'synthetic-key');
  // Contrato do Horizon de 26/10/2026: tempo limite nos pedidos e o filtro por selo (`badge`).
  assert(calls.at(-1).options.signal instanceof AbortSignal, 'GET com tempo limite');
  await api.data.getVehiclesPage({ badge: 'destaque' }, 1, 6);
  assert.equal(new URL(calls.at(-1).url).searchParams.get('badge'), 'destaque');
  assert.equal(new URL(calls.at(-1).url).searchParams.get('perPage'), '6');
  payload = car; assert.equal((await api.data.getVehicle('id/with space')).id, car.id);
  assert(calls.at(-1).url.endsWith('/veiculos/id%2Fwith%20space'));
  status = 404; assert.equal(await api.data.getVehicle('missing'), null);
  status = 500; await assert.rejects(api.data.getVehiclesPage()); status = 200;
  assert.equal((await api.actions.submitLead({ name: 'Teste', phone: '00000000000' })).ok, true);
  assert(calls.at(-1).url.endsWith('/leads')); assert.equal(calls.at(-1).options.method, 'POST');
  assert.equal(JSON.parse(calls.at(-1).options.body).slug, 'synthetic-store');
  // Validação antes de enviar (Horizon 26/10): telefone de 10 a 13 dígitos e e-mail válido.
  const antes = calls.length;
  assert.equal((await api.actions.submitLead({ name: 'Teste', phone: '123' })).ok, false);
  assert.equal((await api.actions.submitLead({ name: 'Teste', phone: '00000000000', email: 'nao-e-email' })).ok, false);
  assert.equal((await api.actions.submitSellRequest({ name: 'Teste', phone: '00000000000' })).ok, false);
  assert.equal(calls.length, antes, 'nada sai com dados inválidos');
  assert.equal((await api.actions.submitSellRequest({ name: 'Teste', phone: '00000000000', brand: 'Fiat' })).ok, true);
  assert(calls.at(-1).url.endsWith('/avaliacoes'));
  payload = { data: { urls: ['https://images.example.test/test.webp'] } };
  const form = new FormData(); form.append('photos', new Blob(['synthetic']), 'test.txt');
  const upload = await api.actions.uploadSellPhotos(form);
  assert.equal(upload.ok, true); assert.equal(upload.urls.length, 1);
  assert(calls.at(-1).url.endsWith('/avaliacoes/fotos')); assert.equal(calls.at(-1).options.body, form);
  status = 500; assert.equal((await api.actions.submitLead({ name: 'Teste', phone: '00000000000' })).ok, false);
  for (const disabled of [{}, { ...env, CLIENT_API_TOKEN: '' }, { ...env, VITRINE_DEMO: 'true' }]) {
    const isolated = sandbox(disabled, () => { throw new Error('Unexpected request'); });
    assert.equal((await isolated.actions.submitLead({ name: 'Teste', phone: '00000000000' })).ok, false);
    const vazio = await isolated.actions.uploadSellPhotos(form);
    assert.equal(vazio.ok, false); assert.equal(vazio.urls.length, 0);
  }
  console.log('PASS API contract: list, filters, badge, pagination, timeout, detail, errors, validation, leads, evaluation, upload and disabled submissions.');
})().catch(error => { console.error(error); process.exitCode = 1; });
