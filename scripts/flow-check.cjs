/* eslint-disable @typescript-eslint/no-require-imports -- Node validation script uses CommonJS. */
// Fluxos do Delta na demo: busca do painel da inicial, ordenação, filtro de marca com o chip de
// remover, zero resultados, visor por mouse e teclado, "Tenho interesse" com validação e o Vender
// com foto (prévia e remoção). Nenhum pedido sai para outro endereço: os envios param nas ações do
// próprio servidor, que na demo não chamam a API.
// Uso: VITRINE_BASE_URL=http://localhost:3601 node scripts/flow-check.cjs
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const base = process.env.VITRINE_BASE_URL || process.env.HALO_BASE_URL || 'http://localhost:3601';
  const origem = new URL(base).origin;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('vitrine-consent', 'denied'));
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const fora = [];
  page.on('request', (request) => {
    const url = request.url();
    if (request.method() !== 'GET' && !url.startsWith(origem)) fora.push(`${request.method()} ${url}`);
  });
  const precos = async () => (await page.locator('.dl-cartao .dl-preco__valor').allTextContents()).map((t) => Number(t.replace(/\D/g, '')));
  const titulos = async () => (await page.locator('.dl-cartao').allTextContents()).map((t) => t.toLowerCase());

  await page.goto(base, { waitUntil: 'networkidle' });
  const painel = page.locator('.dl-painel');
  await painel.getByRole('button', { name: /Marca/ }).click();
  await painel.getByRole('option', { name: /Fiat/ }).click();
  await painel.getByRole('button', { name: /Ver carros/ }).click();
  await page.waitForURL(/marca=Fiat/);
  await page.locator('.dl-cartao').first().waitFor();
  assert((await titulos()).every((t) => t.includes('fiat')), 'o painel leva ao Comprar só com Fiat');
  console.log('painel da inicial (Marca, Ver carros): passed');

  await page.goto(base + '/comprar', { waitUntil: 'networkidle' });
  const barra = page.locator('.dl-barra');
  await barra.getByRole('button', { name: /Ordenar/ }).click();
  await barra.getByRole('option', { name: 'Maior preço' }).click();
  await page.waitForURL(/ordem=maior-preco/);
  await page.waitForFunction(() => !document.querySelector('.dl-comprar[data-pendente]'));
  const lista = await precos();
  assert(lista.every((p, i) => i === 0 || lista[i - 1] >= p), 'maior preço primeiro');
  assert((await page.locator('.dl-comprar__faixa-texto').first().textContent()).startsWith('Acima de'), 'na ordem por maior preço, a primeira faixa é a mais cara');
  console.log('ordenar por maior preço e faixas na ordem: passed');

  await barra.getByRole('button', { name: /^Marca/ }).click();
  await barra.getByRole('option', { name: /Fiat/ }).click();
  await page.waitForURL(/marca=Fiat/);
  await page.waitForFunction(() => !document.querySelector('.dl-comprar[data-pendente]'));
  assert((await titulos()).every((t) => t.includes('fiat')));
  await page.locator('.dl-chip--remover').filter({ hasText: 'Fiat' }).click();
  await page.waitForURL((url) => !url.searchParams.has('marca'));
  console.log('filtro de marca e chip de remover: passed');

  await page.goto(base + '/comprar', { waitUntil: 'networkidle' });
  const faixas = await page.locator('.dl-comprar__faixa-texto').count();
  assert(faixas > 1, 'menor preço agrupa em faixas');
  await page.getByRole('button', { name: 'Só esta faixa' }).first().click();
  await page.waitForURL(/preco=/);
  console.log(`faixas (${faixas}) e "Só esta faixa" (filtro de preço do contrato): passed`);

  await page.goto(base + '/comprar?q=naoexiste123', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.dl-cartao').count(), 0);
  assert(await page.getByText('Nenhum carro com esses filtros').isVisible());
  console.log('zero resultados: passed');

  await page.goto(base + '/veiculo/apex-1', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Ampliar a foto 1 de/ }).click();
  const visor = page.getByRole('dialog', { name: /^Fotos do / });
  assert(await visor.isVisible());
  await page.keyboard.press('ArrowRight');
  assert((await visor.textContent()).includes('Foto 2 de'));
  await page.getByRole('button', { name: 'Próxima foto' }).click();
  assert((await visor.textContent()).includes('Foto 3 de'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog.dl-visor[open]'));
  console.log('visor por mouse e teclado: passed');

  const placa = page.locator('.dl-veiculo__placa');
  await placa.getByRole('button', { name: 'Tenho interesse' }).click();
  await placa.getByRole('button', { name: 'Enviar interesse' }).click();
  assert(await placa.getByText('Informe seu nome.').isVisible());
  assert.equal(await page.evaluate(() => document.activeElement?.id?.endsWith('-nome')), true, 'o foco vai ao primeiro campo com erro');
  await placa.getByRole('textbox', { name: 'Nome' }).fill('Pessoa Teste');
  await placa.getByRole('textbox', { name: 'WhatsApp' }).fill('11900000000');
  await placa.getByRole('button', { name: 'Enviar interesse' }).click();
  await placa.getByText('Esta é uma demonstração: nenhum dado foi enviado.').waitFor();
  console.log('"Tenho interesse": validação e demo: passed');

  await page.goto(base + '/vender', { waitUntil: 'networkidle' });
  await page.locator('#dl-vender-name').fill('Pessoa Teste');
  await page.locator('#dl-vender-phone').fill('11900000000');
  await page.locator('#dl-vender-email').fill('pessoa@example.com');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('heading', { name: 'Negócio' }).waitFor();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.locator('#dl-vender-brand').fill('Marca Teste');
  await page.locator('#dl-vender-model').fill('Modelo Teste');
  await page.locator('#dl-vender-year').fill('2020');
  await page.locator('#dl-vender-km').fill('50000');
  await page.locator('#dl-vender-color').fill('Azul');
  await page.locator('#dl-vender-transmission').selectOption('Automático');
  await page.locator('#dl-vender-fuel').selectOption('Flex');
  await page.locator('#dl-vender-description').fill('Descrição sintética para validar o formulário.');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('heading', { name: 'Fotos' }).waitFor();
  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/YxkAAAAASUVORK5CYII=', 'base64');
  await page.locator('input[type="file"]').setInputFiles({ name: 'teste-sintetico.png', mimeType: 'image/png', buffer: tinyPng });
  await page.getByRole('button', { name: 'Remover a foto 1' }).waitFor();
  assert(await page.getByText('1 de 8 fotos').isVisible());
  await page.getByRole('button', { name: 'Remover a foto 1' }).click();
  assert(await page.getByText('0 de 8 fotos').isVisible());
  await page.getByRole('button', { name: 'Enviar para avaliação' }).click();
  await page.getByRole('heading', { name: 'Dados enviados' }).waitFor();
  assert(await page.getByText('Demonstração: nada foi enviado.').isVisible());
  console.log('Vender: quatro etapas, foto (prévia e remoção) e demo: passed');

  assert.deepEqual(fora, [], 'nenhum envio para outro endereço');
  console.log('nenhum envio para fora da demo: passed');
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
