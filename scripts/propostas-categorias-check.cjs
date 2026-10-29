/* eslint-disable @typescript-eslint/no-require-imports -- Verificação local. */
/* Capturas isoladas das opções de categorias para revisão visual. */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const base = process.env.VITRINE_BASE_URL || "http://localhost:3600";
const out = path.join(process.cwd(), "docs", "previews", "categorias-2026-10-28");

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(`${base}/propostas/categorias`, { waitUntil: "networkidle" });
    for (const [name, title] of [["a", "Carta com rota"], ["b", "Painel de boxes"], ["c", "Gaveta de escolha"]]) {
      const section = page.getByRole("heading", { name: title }).locator("xpath=ancestor::section");
      const card = section.locator("article, button").first();
      await card.scrollIntoViewIfNeeded();
      if (name === "a") await section.getByRole("button", { name: "Ver opções" }).first().click();
      else await card.click();
      if (name === "c") {
        await page.getByRole("dialog").waitFor();
        await page.keyboard.press("Escape");
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        await card.click();
      }
      await page.screenshot({ path: path.join(out, `${name}-${width}.png`) });
    }
    await page.goto(base, { waitUntil: "networkidle" });
    const atual = page.locator(".dl-carrocerias");
    await atual.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `atual-${width}.png`) });
    await page.close();
  }
  await browser.close();
  console.log(`capturas em ${out}`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
