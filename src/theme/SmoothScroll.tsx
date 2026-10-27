"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";
import { getLenis, setLenis } from "./scroll";

/**
 * Rolagem suave do Lenis para mouse e trackpad. Telas de toque mantêm a rolagem nativa, então
 * a biblioteca só baixa onde é usada, e nunca com movimento reduzido. Saltos programados passam
 * pelo `rolarAte` de scroll.ts, que recebe a instância por `setLenis`.
 *
 * Revisão de 26/10/2026, pelo pedido do usuário de uma rolagem "mais fluida" e mais leve:
 * - o Lenis só trabalha enquanto a página se move: o laço de quadros acorda com a roda (ou um
 *   salto programado) e dorme quando a animação termina; com `autoRaf` ele rodava 60 vezes por
 *   segundo com a página parada;
 * - uma instância só, a sessão inteira (antes era recriada a cada troca de página); clicar num
 *   link para outra página ou trocar de página para a inércia, para o topo da página nova
 *   não ser desfeito pela animação anterior;
 * - gestos mais para o lado do que para baixo ficam com o navegador, então as faixas que
 *   deslizam (fotos, abas, avaliações) rolam sozinhas sem o Lenis olhar a página a cada giro
 *   (`allowNestedScroll` lia o estilo de cada ancestral); listas com rolagem própria levam
 *   `data-lenis-prevent` e os diálogos param o Lenis;
 * - `lerp` 0,1, o padrão do Lenis: a página desliza um pouco mais longe, sem atraso.
 */
export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const fine = matchMedia("(pointer: fine)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;
    let cancelled = false;
    let quadro = 0;
    const locked = () =>
      document.documentElement.style.overflow === "hidden" ||
      document.body.style.overflow === "hidden" ||
      !!document.querySelector("dialog[open]");
    const syncLock = () => {
      if (!lenis) return;
      if (locked()) lenis.stop();
      else lenis.start();
    };
    // Um quadro por vez, só enquanto a animação suave estiver correndo.
    const passo = (tempo: number) => {
      quadro = 0;
      if (!lenis) return;
      lenis.raf(tempo);
      if (lenis.isScrolling === "smooth") quadro = requestAnimationFrame(passo);
    };
    const acordar = () => {
      if (!lenis || quadro) return;
      // Acerta o relógio do Lenis antes do primeiro quadro, senão ele contaria o tempo
      // dormindo e pularia direto para o fim da animação.
      lenis.raf(performance.now());
      quadro = requestAnimationFrame(passo);
    };
    const destroy = () => {
      cancelAnimationFrame(quadro);
      quadro = 0;
      lenis?.destroy();
      lenis = undefined;
      setLenis(undefined);
    };
    const configure = async () => {
      destroy();
      if (reduced.matches || !fine.matches) return;
      const { default: LenisClass } = await import("lenis");
      if (cancelled || reduced.matches) return;
      lenis = new LenisClass({
        lerp: 0.1,
        syncTouch: false,
        anchors: false,
        stopInertiaOnNavigate: true,
        // Para o lado é das faixas; só o movimento mais vertical vira rolagem suave.
        virtualScroll: ({ deltaX, deltaY }) => Math.abs(deltaY) >= Math.abs(deltaX),
        prevent: (node) => node.nodeName === "DIALOG",
      });
      lenis.on("virtual-scroll", acordar);
      setLenis(lenis, acordar);
      syncLock();
    };
    // Só o estilo do html e do body (trava) e diálogos abrindo importam; observar todo
    // estilo da página dispararia a cada quadro de animação.
    const lockObserver = new MutationObserver(syncLock);
    lockObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    lockObserver.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    const dialogObserver = new MutationObserver(syncLock);
    dialogObserver.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["open"] });
    const onChange = () => void configure();
    reduced.addEventListener("change", onChange);
    fine.addEventListener("change", onChange);
    void configure();
    return () => {
      cancelled = true;
      lockObserver.disconnect();
      dialogObserver.disconnect();
      reduced.removeEventListener("change", onChange);
      fine.removeEventListener("change", onChange);
      destroy();
    };
  }, []);

  // Página nova (também pelo voltar do navegador): a inércia da anterior para na hora.
  useEffect(() => {
    const lenis = getLenis();
    if (!lenis || lenis.isStopped || lenis.isScrolling !== "smooth") return;
    lenis.stop();
    lenis.start();
  }, [pathname]);

  return null;
}
