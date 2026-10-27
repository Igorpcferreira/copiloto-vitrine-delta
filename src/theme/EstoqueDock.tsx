"use client";

import { useEffect, useRef } from "react";

/**
 * Comprar, uma barra flutuante por vez (pedido do usuário no Halo, 21/10/2026, e o
 * comportamento que ele quis de novo no Delta): uma marca logo acima da barra de filtros diz
 * quando ela chegou ao topo. Daí em diante, descer deixa a barra no lugar do header e a aba do
 * header sobe; subir traz a aba de volta e a barra sai. No topo, as duas voltam ao lugar. Os
 * estados ficam no <html>, para o CSS; só o foco de teclado (`:focus-visible`) segura uma delas.
 */
export default function EstoqueDock() {
  const marca = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const raiz = document.documentElement;
    const el = marca.current;
    if (!el) return;
    let ultimo = window.scrollY;
    let quadro = 0;
    raiz.dataset.dlRolagem = "desce";
    // A barra gruda a 0 px do topo; a marca fica logo acima dela.
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting && e.boundingClientRect.top < 1) raiz.dataset.dlEstoque = "presa";
        else delete raiz.dataset.dlEstoque;
      },
      { rootMargin: "-1px 0px 0px 0px" },
    );
    obs.observe(el);
    const aoRolar = () => {
      if (quadro) return;
      quadro = requestAnimationFrame(() => {
        quadro = 0;
        const y = window.scrollY;
        if (Math.abs(y - ultimo) < 6) return;
        const sentido = y > ultimo ? "desce" : "sobe";
        if (raiz.dataset.dlRolagem !== sentido) raiz.dataset.dlRolagem = sentido;
        ultimo = y;
      });
    };
    addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      obs.disconnect();
      removeEventListener("scroll", aoRolar);
      cancelAnimationFrame(quadro);
      delete raiz.dataset.dlEstoque;
      delete raiz.dataset.dlRolagem;
    };
  }, []);

  return <span ref={marca} className="dl-estoque-marca" aria-hidden="true" />;
}
