/* eslint-disable @typescript-eslint/no-require-imports -- Node smoke check. */
const assert = require('node:assert/strict');

(async () => {
  const base = process.env.VITRINE_BASE_URL || process.env.HALO_BASE_URL || 'http://localhost:3601';
  const expectedCount = Number(process.env.STOCK_EXPECTED_COUNT || 12);
  const expectedTitle = process.env.STOCK_EXPECTED_TITLE || 'Fiat ARGO 2020';
  const vehicleId = process.env.STOCK_EXPECTED_ID || 'apex-1';
  const get = async (pathname) => {
    const response = await fetch(new URL(pathname, base));
    assert.equal(response.status, 200, `${pathname}: HTTP ${response.status}`);
    return response.text();
  };
  const catalog = await get('/comprar');
  const rows = [...catalog.matchAll(/class="dl-cartao"/g)].length;
  assert.equal(rows, expectedCount, `Comprar should have ${expectedCount} vehicles, found ${rows}`);
  assert(catalog.includes(expectedTitle), 'Expected vehicle missing from Comprar');
  assert(!catalog.includes('dl-comprar__vazio'), 'Comprar rendered an empty state');
  let detail = await get(`/veiculo/${vehicleId}`);
  // A non canonical address answers with a redirect to the canonical slug; follow it.
  const refresh = detail.match(/http-equiv="refresh" content="0;url=([^"]+)"/);
  if (refresh) detail = await get(refresh[1]);
  // The title must be the page heading; in the unavailable state it only shows up in the cards below.
  assert(new RegExp(`<h1[^>]*>${expectedTitle}</h1>`).test(detail), 'Detail did not render the expected vehicle');
  const home = await get('/');
  assert(home.includes(expectedTitle), 'Expected vehicle missing from Home');
  console.log(`stock smoke passed: ${expectedCount} vehicle(s), catalog/detail/home, ${expectedTitle}`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
