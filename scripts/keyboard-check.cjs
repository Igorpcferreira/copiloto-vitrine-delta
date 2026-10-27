/* eslint-disable @typescript-eslint/no-require-imports -- Node validation script uses CommonJS. */
// Teclado no Delta: link de pular, busca na aba do header (abre, Esc fecha e devolve o foco),
// navegação, destinos de contato, menu do celular e folha de filtros do Comprar (Esc e retorno do
// foco). Uso: VITRINE_BASE_URL=http://localhost:3601 node scripts/keyboard-check.cjs
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const base = process.env.VITRINE_BASE_URL || process.env.HALO_BASE_URL || 'http://localhost:3601';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('vitrine-consent', 'denied'));
  const desktop = await context.newPage();
  await desktop.goto(base, { waitUntil: 'networkidle' });
  await desktop.keyboard.press('Tab');
  assert.equal(await desktop.evaluate(() => document.activeElement?.textContent?.trim()), 'Pular para o conteúdo');
  await desktop.keyboard.press('Enter');
  assert.equal(await desktop.evaluate(() => document.activeElement?.id), 'dl-conteudo');

  const buscar = desktop.getByRole('button', { name: 'Buscar um carro' });
  await buscar.focus();
  await desktop.keyboard.press('Enter');
  const campo = desktop.getByRole('searchbox', { name: 'Marca, modelo ou ano' });
  await campo.waitFor();
  assert(await campo.evaluate((input) => document.activeElement === input), 'o campo da busca na aba recebe o foco');
  await desktop.keyboard.press('Escape');
  await desktop.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Buscar um carro');
  assert(!(await campo.isVisible()));

  await buscar.click();
  await campo.fill('Fiat');
  await desktop.keyboard.press('Enter');
  await desktop.waitForURL(/\/comprar\?q=Fiat/);
  await desktop.locator('.dl-cartao').first().waitFor();
  console.log('desktop: link de pular, busca na aba (abre, Esc, foco de volta e Enter leva ao Comprar): passed');

  const nav = desktop.getByRole('navigation', { name: 'Navegação principal' });
  await nav.getByRole('link', { name: 'Comprar' }).click();
  await desktop.waitForURL(/\/comprar$/);
  assert.equal(await nav.getByRole('link', { name: 'Comprar' }).getAttribute('aria-current'), 'page');
  await nav.getByRole('link', { name: 'Sobre nós' }).click();
  await desktop.waitForURL('**/sobre-nos');
  assert(await desktop.locator('a[href^="mailto:"]').count() > 0);
  assert(await desktop.locator('a[href^="tel:"]').count() > 0);
  console.log('desktop: navegação, página atual e destinos de contato: passed');

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobileContext.addInitScript(() => localStorage.setItem('vitrine-consent', 'denied'));
  const mobile = await mobileContext.newPage();
  await mobile.goto(base + '/comprar', { waitUntil: 'networkidle' });
  const menu = mobile.getByRole('button', { name: 'Abrir menu' });
  await menu.click();
  assert(await mobile.getByRole('dialog', { name: 'Menu', exact: true }).isVisible());
  await mobile.keyboard.press('Escape');
  // O menu fecha com uma animação curta e depois devolve o foco ao botão.
  await mobile.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Abrir menu');
  console.log('celular: menu abre, Esc fecha e o foco volta: passed');

  const filtrar = mobile.getByRole('button', { name: /^Filtrar/ });
  await filtrar.click();
  const folha = mobile.getByRole('dialog', { name: 'Filtros' });
  assert(await folha.isVisible());
  const dentro = await mobile.evaluate(() => !!document.activeElement?.closest('dialog[open]'));
  assert(dentro, 'o foco entra na folha de filtros');
  await mobile.keyboard.press('Escape');
  await mobile.waitForFunction(() => !document.querySelector('dialog.dl-folha[open]'));
  await mobile.waitForFunction(() => document.activeElement?.textContent?.trim().startsWith('Filtrar'));
  console.log('celular: folha de filtros com o foco dentro, Esc fecha e o foco volta a "Filtrar": passed');

  // Página do veículo: o visor abre pela foto, as setas andam e Esc devolve o foco à foto.
  await mobile.goto(base + '/veiculo/apex-1', { waitUntil: 'networkidle' });
  const foto = mobile.getByRole('button', { name: /^Ampliar a foto 1 de/ });
  await foto.focus();
  await mobile.keyboard.press('Enter');
  const visor = mobile.getByRole('dialog', { name: /^Fotos do / });
  assert(await visor.isVisible());
  await mobile.keyboard.press('ArrowRight');
  await mobile.waitForFunction(() => /Foto 2 de/.test(document.querySelector('.dl-visor__conta')?.textContent || ''));
  await mobile.keyboard.press('Escape');
  await mobile.waitForFunction(() => /^Ampliar a foto 1 de/.test(document.activeElement?.getAttribute('aria-label') || ''));
  console.log('celular: visor pela foto, seta para a seguinte, Esc e foco de volta: passed');
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
