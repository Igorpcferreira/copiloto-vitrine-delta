/* eslint-disable @typescript-eslint/no-require-imports -- roteiro Node de validação. */
/* Verifica o ciclo, a leitura integral e listas de 0, 1 e 2 avaliações na demo em execução. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const base = process.env.VITRINE_BASE_URL || "http://localhost:3600";
const curto = { name: "B Pessoa", text: "Avaliação curta.", rating: 5, source: "google" };
const longo = { name: "A Pessoa", text: "Texto longo. ".repeat(30), rating: 5, source: "google" };

async function enviarPreview(page, testimonials) {
  await page.evaluate((itens) => {
    window.postMessage(
      {
        type: "vitrine-preview",
        config: {
          name: "Teste",
          primaryColor: "#0f1522",
          secondaryColor: "#528fb8",
          surfaceColor: "#fafafa",
          sections: { depoimentos: true },
          testimonials: itens,
        },
      },
      window.location.origin,
    );
  }, testimonials);
  await page.waitForTimeout(300);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const rolo = page.locator(".dl-vozes");
  await rolo.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  const ativa = () => rolo.locator(".dl-voz--foco .dl-voz__nome").textContent();
  const primeira = await ativa();
  await rolo.locator(".dl-vozes__janela").focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(620);
  assert.notEqual(await ativa(), primeira, "ArrowDown na primeira avaliação deve ir para a última");
  await rolo.getByRole("button", { name: "Próxima" }).click();
  await page.waitForTimeout(620);
  assert.equal(await ativa(), primeira, "Próxima deve voltar da última para a primeira avaliação");
  for (let i = 0; i < 5; i += 1) {
    await rolo.getByRole("button", { name: "Próxima" }).click();
    await page.waitForTimeout(620);
  }
  assert.equal(await ativa(), primeira, "Próxima deve voltar ao primeiro autor depois da última avaliação");
  await rolo.getByRole("button", { name: "Ler tudo" }).click();
  const dialogo = page.getByRole("dialog");
  await assert.doesNotReject(() => dialogo.getByText("Suelen Nuss").waitFor());
  await assert.doesNotReject(() => dialogo.getByText("Sou de Santa Catarina", { exact: false }).waitFor());
  await dialogo.getByRole("button", { name: "Fechar" }).click();
  await page.locator(".dl-leitura").waitFor({ state: "hidden" });

  await page.goto(`${base}/preview`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await enviarPreview(page, []);
  assert.equal(await page.locator(".dl-vozes").count(), 0, "0 avaliações não mostram o rolo");
  await enviarPreview(page, [longo]);
  assert.equal(await page.locator(".dl-voz").count(), 1, "1 avaliação não cria clones");
  assert.equal(await page.locator(".dl-vozes__botoes").count(), 0, "1 avaliação não mostra controles");
  await page.getByRole("button", { name: "Ler tudo" }).click();
  await assert.doesNotReject(() => page.getByRole("dialog").getByText(longo.text, { exact: true }).waitFor());
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
  await enviarPreview(page, [longo, curto]);
  assert.equal(await page.locator(".dl-vozes__botoes button").count(), 2, "2 avaliações mantêm ambos os controles");
  assert.equal(await page.locator(".dl-voz--foco .dl-voz__nome").textContent(), longo.name, "lista alterada inicia no primeiro autor");

  } finally { await browser.close(); }
  console.log("rolo-vozes-check passed: loop, leitura, 0/1/2 e lista alterada");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
