"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { soltarPagina, travarPagina } from "@/theme/scroll";

/*
 * Diálogo nativo (`showModal`) do Delta: fica na camada de cima do navegador, então
 * nenhum `backdrop-filter` ou `transform` de quem abriu o prende. Esc e clique fora fecham,
 * a página de trás trava (e o Lenis para) e o foco volta para quem abriu. A aparência é de
 * cada componente, pela `className` e pelo atributo `data-saindo` durante a saída.
 */
export default function Dialogo({
  aberto,
  aoFechar,
  rotulo,
  className,
  children,
  saida = 220,
}: {
  aberto: boolean;
  aoFechar: () => void;
  /** Nome acessível do diálogo. */
  rotulo: string;
  className?: string;
  children: ReactNode;
  /** Duração da animação de saída, em ms (0 com movimento reduzido). */
  saida?: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const origem = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) {
      origem.current = document.activeElement as HTMLElement | null;
      d.removeAttribute("data-saindo");
      d.showModal();
      travarPagina();
      return;
    }
    if (!aberto && d.open) {
      const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
      d.setAttribute("data-saindo", "");
      const t = window.setTimeout(() => {
        d.close();
        d.removeAttribute("data-saindo");
        soltarPagina();
        origem.current?.focus?.({ preventScroll: true });
      }, reduzido ? 0 : saida);
      return () => window.clearTimeout(t);
    }
  }, [aberto, saida]);

  useEffect(
    () => () => {
      if (ref.current?.open) soltarPagina();
    },
    [],
  );

  return (
    <dialog
      ref={ref}
      aria-label={rotulo}
      className={className}
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      {children}
    </dialog>
  );
}
