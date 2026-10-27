"use client";

import type { ReactNode } from "react";
import { rolarAte } from "./scroll";

/**
 * "Voltar ao topo": um link para `#dl-topo` (funciona sem JavaScript) que, com ele, desliza até
 * o topo pela mesma rolagem da página e põe o foco no começo dela. Clique com Ctrl, Shift ou o
 * botão do meio fica com o navegador.
 */
export default function Topo({ className, children, rotulo }: { className?: string; children: ReactNode; rotulo?: string }) {
  return (
    <a
      className={className}
      href="#dl-topo"
      aria-label={rotulo}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        rolarAte(0, () => document.querySelector<HTMLElement>(".dl-pular")?.focus({ preventScroll: true }));
      }}
    >
      {children}
    </a>
  );
}
