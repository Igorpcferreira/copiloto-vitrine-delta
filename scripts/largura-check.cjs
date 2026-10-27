/* eslint-disable @typescript-eslint/no-require-imports -- Verificação local no navegador. */
// Acha o que passa da largura da tela (rolagem lateral), por página e largura.
// Uso: node scripts/largura-check.cjs [url=http://localhost:3600/] [larguras=390,360,320]
const { chromium } = require("playwright");

(async () => {
  const url = process.argv[2] || process.env.VITRINE_BASE_URL || "http://localhost:3600/";
  const larguras = (process.argv[3] || "390,360,320").split(",").map(Number);
  const browser = await chromium.launch({ headless: true });
  for (const largura of larguras) {
    const page = await browser.newPage({ viewport: { width: largura, height: 800 } });
    await page.goto(url, { waitUntil: "load", timeout: 90000 });
    await page.waitForTimeout(800);
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += 600) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(60);
    }
    const achados = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const lista = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > vw + 1 || r.left < -1) {
          // Ignora o que está dentro de quem corta o que transborda (overflow diferente de visible).
          let pai = el.parentElement;
          let cortado = false;
          while (pai && pai !== document.body) {
            const s = getComputedStyle(pai);
            if (s.overflowX !== "visible") {
              const pr = pai.getBoundingClientRect();
              if (pr.right <= vw + 1 && pr.left >= -1) {
                cortado = true;
                break;
              }
            }
            pai = pai.parentElement;
          }
          if (!cortado) lista.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 2).join(".")} ${Math.round(r.left)}..${Math.round(r.right)}`);
        }
      }
      return { scroll: document.documentElement.scrollWidth, vw, lista: lista.slice(0, 15) };
    });
    console.log(JSON.stringify({ largura, ...achados }));
    await page.close();
  }
  await browser.close();
})();
