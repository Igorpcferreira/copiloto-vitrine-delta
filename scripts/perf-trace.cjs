/* eslint-disable @typescript-eslint/no-require-imports -- Node performance check. */
// Rastreamento de desempenho: abre uma página como celular médio (CPU 4x, rede de 4G lento),
// grava um trace do Chrome e mostra a primeira pintura, as tarefas longas com o que as compõe,
// os layouts forçados por JavaScript (com a pilha) e os pedidos de terceiros.
// Uso: node scripts/perf-trace.cjs [caminho]  (demo em VITRINE_BASE_URL, padrão http://localhost:3601)
// Variáveis opcionais: PERF_CPU (4), PERF_LATENCY_MS (150), PERF_DOWN_KBPS (1638), PERF_WAIT_MS (9000).
const { chromium } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const base = process.env.VITRINE_BASE_URL || process.env.HALO_BASE_URL || 'http://localhost:3601';
// No Git Bash, um caminho com barra vira caminho do Windows ("C:/Program Files/Git/comprar"): aceitar sem a barra também.
const caminho = (process.argv[2] || '/').replace(/^[A-Za-z]:\/Program Files\/Git/, '');
const url = new URL(caminho.startsWith('/') ? caminho : `/${caminho}`, base).href;
const cpu = Number(process.env.PERF_CPU || 4);
const latency = Number(process.env.PERF_LATENCY_MS || 150);
const downKbps = Number(process.env.PERF_DOWN_KBPS || 1638);
const waitMs = Number(process.env.PERF_WAIT_MS || 9000);
const out = path.join(os.tmpdir(), `delta-trace-${Date.now()}.json`);
const ms = (us) => Math.round(us / 1000);

let browser;
(async () => {
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 1.75,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency,
    downloadThroughput: (downKbps * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  const thirdParty = new Set();
  page.on('request', (request) => {
    const host = new URL(request.url()).host;
    if (host && host !== new URL(base).host) thirdParty.add(host);
  });
  await browser.startTracing(page, {
    path: out,
    categories: [
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',
      'disabled-by-default-devtools.timeline.stack',
      'blink',
      'loading',
      'v8.execute',
      'toplevel',
    ],
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(waitMs);
  await browser.stopTracing();
  const paint = await page.evaluate(() =>
    Object.fromEntries(performance.getEntriesByType('paint').map((entry) => [entry.name, Math.round(entry.startTime)])),
  );
  await browser.close();

  const trace = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.unlinkSync(out);
  const events = trace.traceEvents || trace;
  const parse = events.find((e) => e.name === 'ParseHTML' && (e.args?.beginData?.url || '').startsWith(base));
  if (!parse) throw new Error('Main thread of the page not found in the trace.');
  const own = events
    .filter((e) => e.pid === parse.pid && e.tid === parse.tid && e.ph === 'X' && typeof e.dur === 'number')
    .sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const start = own.reduce((min, e) => (e.ts < min ? e.ts : min), Infinity);

  // Nest events to know what each top-level task spent its time on.
  const stack = [];
  const tops = [];
  for (const e of own) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
    e.self = e.dur;
    e.children = [];
    const parent = stack[stack.length - 1];
    if (parent) {
      parent.self -= e.dur;
      parent.children.push(e);
    } else {
      tops.push(e);
    }
    stack.push(e);
  }
  const collect = (e, bucket) => {
    bucket.set(e.name, (bucket.get(e.name) || 0) + Math.max(0, e.self));
    for (const child of e.children) collect(child, bucket);
  };

  console.log(`${url}  CPU ${cpu}x, ${latency} ms, ${downKbps} kbps`);
  console.log(`first paint ${paint['first-paint'] ?? '?'} ms, first contentful paint ${paint['first-contentful-paint'] ?? '?'} ms`);
  const long = tops.filter((t) => t.dur > 50000).sort((a, b) => b.dur - a.dur).slice(0, 8);
  const blocking = tops.filter((t) => t.dur > 50000).reduce((sum, t) => sum + t.dur - 50000, 0);
  console.log(`long tasks: ${tops.filter((t) => t.dur > 50000).length}, blocking time ${ms(blocking)} ms`);
  for (const task of long) {
    const bucket = new Map();
    collect(task, bucket);
    const parts = [...bucket.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, us]) => `${name} ${ms(us)}`);
    console.log(`  at ${ms(task.ts - start)} ms, ${ms(task.dur)} ms: ${parts.join(', ')}`);
  }
  const forced = own.filter((e) => (e.name === 'Layout' || e.name === 'UpdateLayoutTree') && e.dur > 8000 && e.args?.beginData?.stackTrace);
  console.log(`forced style or layout from JavaScript (over 8 ms): ${forced.length}`);
  for (const e of forced.slice(0, 5)) {
    const frames = e.args.beginData.stackTrace.slice(0, 4).map((f) => `${f.functionName || '(anon)'} ${String(f.url).split('/').pop()}:${f.columnNumber}`);
    console.log(`  at ${ms(e.ts - start)} ms, ${e.name} ${ms(e.dur)} ms: ${frames.join(' < ')}`);
  }
  console.log(`third-party hosts: ${thirdParty.size ? [...thirdParty].join(', ') : 'none'}`);
})().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  // Sem fechar o navegador, o processo ficava parado depois do erro.
  await browser?.close().catch(() => {});
});
