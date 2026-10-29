/* eslint-disable @typescript-eslint/no-require-imports -- Local synthetic contract check. */
const http = require('node:http');

// Fields of the Horizon contract of 22 and 26/10/2026: type, warranty and steering as text.
const vehicle = {
  id: 'synthetic-1', brand: 'Marca Teste', model: 'Modelo Teste', title: 'Marca Teste Modelo Teste 2024',
  year: 2024, km: 12000, price: 75000, transmission: 'Automático', fuel: 'Flex', color: 'Azul',
  segment: 'Sedã', vehicleType: 'car', doors: 4, warranty: '3 meses de garantia', steering: 'Elétrica',
  badges: ['destaque'], photos: ['/preview/banner.svg'],
};
const facets = {
  brands: [{ name: vehicle.brand, count: 1 }], fuels: [{ name: vehicle.fuel, count: 1 }],
  transmissions: [{ name: vehicle.transmission, count: 1 }], colors: [{ name: vehicle.color, count: 1 }],
  segments: [{ name: vehicle.segment, count: 1 }], vehicleTypes: [{ name: vehicle.vehicleType, count: 1 }],
  years: [vehicle.year], priceBounds: [vehicle.price, vehicle.price], kmBounds: [vehicle.km, vehicle.km], total: 1,
};
http.createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.headers['x-public-key'] !== 'synthetic-token') { response.statusCode = 401; response.end('{}'); return; }
  const url = new URL(request.url, 'http://localhost');
  const path = url.pathname;
  if (path === '/vitrine/public/synthetic-store/veiculos') {
    // The home page asks Destaques and Ofertas by badge (26/10/2026); answer only what matches.
    const badge = url.searchParams.get('badge');
    const type = url.searchParams.get('tipo');
    const items = (!badge || vehicle.badges.includes(badge)) && (!type || type === vehicle.vehicleType) ? [vehicle] : [];
    response.end(JSON.stringify({ data: { items, page: 1, perPage: 24, total: items.length, hasMore: false, facets } }));
  } else if (
    path === `/vitrine/public/synthetic-store/veiculos/${vehicle.id}` ||
    // The page redirects to the canonical "title-idprefix" slug and asks the detail again by
    // that slug, as the contract's /veiculos/{idOrSlug} allows.
    path === `/vitrine/public/synthetic-store/veiculos/marca-teste-modelo-teste-2024-${vehicle.id.slice(0, 8)}`
  ) {
    response.end(JSON.stringify({ data: vehicle }));
  } else { response.statusCode = 404; response.end('{}'); }
}).listen(3499, '127.0.0.1', () => console.log('Synthetic stock API listening on 127.0.0.1:3499'));
