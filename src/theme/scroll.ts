import type Lenis from "lenis";

/*
 * Rolagem do Delta num lugar só (saltos, trava das camadas e o header preso durante um salto).
 * O SmoothScroll registra aqui a instância do Lenis quando ela existe (ponteiro fino e sem
 * movimento reduzido); sem ela, tudo usa a rolagem nativa.
 */

let lenis: Lenis | undefined;
/* O laço de quadros do Lenis dorme com a página parada; um salto programado o acorda. */
let acordarLenis: (() => void) | undefined;

export function setLenis(instance: Lenis | undefined, acordar?: () => void) {
  lenis = instance;
  acordarLenis = instance ? acordar : undefined;
  if (instance && travas > 0) instance.stop();
}

export function getLenis() {
  return lenis;
}

function reduzido() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* Trava da página de trás enquanto uma camada está aberta: overflow no html e Lenis parado. */
let travas = 0;

export function travarPagina() {
  travas += 1;
  if (travas > 1) return;
  document.documentElement.style.overflow = "hidden";
  lenis?.stop();
}

export function soltarPagina() {
  if (travas === 0) return;
  travas -= 1;
  if (travas > 0) return;
  document.documentElement.style.removeProperty("overflow");
  lenis?.start();
}

/*
 * Header preso: durante um salto programado o header fica visível, até o salto terminar e a
 * pessoa rolar mais de 8 px a partir do ponto em que ele parou (1.9).
 */
let preso = false;
let paradaFinal: number | null = null;
const ouvintes = new Set<() => void>();

function definirPreso(valor: boolean) {
  if (preso === valor) return;
  preso = valor;
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function cabecalhoPreso() {
  return preso;
}

export function aoMudarPreso(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function vigiarSoltura() {
  const aoRolar = () => {
    if (paradaFinal === null) return;
    if (Math.abs(window.scrollY - paradaFinal) > 8) {
      paradaFinal = null;
      removeEventListener("scroll", aoRolar);
      definirPreso(false);
    }
  };
  addEventListener("scroll", aoRolar, { passive: true });
}

/* Altura total do header (H), com a área segura de cima. */
export function alturaCabecalho() {
  const cab = document.querySelector<HTMLElement>(".dl-cab");
  return cab ? cab.offsetHeight : 56;
}

/* Espera a rolagem nativa suave parar: mesma posição por 3 quadros, ou 1,5 s no máximo. */
function esperarParada(destino: number, pronto: () => void) {
  const inicio = performance.now();
  let ultimo = -1;
  let iguais = 0;
  const olhar = () => {
    const y = window.scrollY;
    iguais = Math.abs(y - ultimo) < 0.5 ? iguais + 1 : 0;
    ultimo = y;
    if ((Math.abs(y - destino) < 1 && iguais >= 1) || iguais >= 3 || performance.now() - inicio > 1500) pronto();
    else requestAnimationFrame(olhar);
  };
  requestAnimationFrame(olhar);
}

type Foco = HTMLElement | string | null | undefined;

function resolverFoco(foco: Foco) {
  if (!foco) return null;
  return typeof foco === "string" ? document.querySelector<HTMLElement>(foco) : foco;
}

/** Rola até uma posição; imediato com movimento reduzido. */
export function rolarAte(destino: number, aoTerminar?: () => void) {
  const imediato = reduzido();
  if (lenis && !lenis.isStopped) {
    // Acorda o laço antes de pedir o salto: acordar acerta o relógio do Lenis, e um salto já
    // armado andaria todo o tempo em que ele dormiu num quadro só.
    if (!imediato) acordarLenis?.();
    lenis.scrollTo(destino, { lock: true, immediate: imediato, force: true, onComplete: () => aoTerminar?.() });
    if (imediato) requestAnimationFrame(() => aoTerminar?.());
    return;
  }
  window.scrollTo({ top: destino, behavior: imediato ? "instant" : "smooth" });
  if (imediato) requestAnimationFrame(() => aoTerminar?.());
  else esperarParada(destino, () => aoTerminar?.());
}

/**
 * Salto programado (1.10): topo do alvo menos H e 8 de folga (sem a folga no alvo com
 * data-at-encostar). O header fica preso visível; no fim, o foco vai para `foco` sem rolar.
 * `topo` é o topo do alvo na página quando a medida da tela ainda está no meio de uma animação.
 */
export function irPara(alvo: Element | string, opcoes: { foco?: Foco; topo?: number } = {}) {
  const elemento = typeof alvo === "string" ? document.querySelector(alvo) : alvo;
  if (!elemento) return false;
  const encostar = elemento.hasAttribute("data-at-encostar");
  const topo = opcoes.topo ?? elemento.getBoundingClientRect().top + window.scrollY;
  const maximo = document.documentElement.scrollHeight - window.innerHeight;
  const destino = Math.max(0, Math.min(maximo, Math.round(topo - alturaCabecalho() - (encostar ? 0 : 8))));
  paradaFinal = null;
  definirPreso(true);
  let feito = false;
  rolarAte(destino, () => {
    if (feito) return;
    feito = true;
    paradaFinal = window.scrollY;
    vigiarSoltura();
    resolverFoco(opcoes.foco)?.focus({ preventScroll: true });
  });
  return true;
}

/**
 * "Voltar ao topo" do rodapé: desliza até o topo (na hora com movimento reduzido) e põe o foco
 * no começo da página, como o link para `#dl-topo` faria, sem o salto seco do navegador.
 */
export function subirAoTopo() {
  rolarAte(0, () => document.querySelector<HTMLElement>(".dl-pular")?.focus({ preventScroll: true }));
}

/** Regra C-4 da hero (2.2): volta ao topo na hora, com ou sem Lenis. */
export function voltarAoTopo() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo({ top: 0, behavior: "instant" });
}
