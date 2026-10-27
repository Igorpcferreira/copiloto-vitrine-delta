"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { alturaCabecalho, getLenis, rolarAte } from "./scroll";

/** Folga do polegar nas pontas do trilho e altura mínima dele, em px. */
const FOLGA = 4;
const MINIMO = 44;

interface Setor {
  rotulo: string;
  /** Posição no trilho, de 0 a 1. */
  k: number;
  topo: number;
}

/**
 * Barra de rolagem própria do Delta (regra 19 do usuário, 26/10/2026: nunca a barra padrão).
 * Com mouse ou trackpad, a barra do sistema some pelo CSS desde a primeira pintura e, no lugar,
 * corre um trilho fino com o polegar em lâmina na cor da loja e marcas pequenas na altura de
 * cada seção da página (`data-dl-setor`), como os setores de uma pista: o rótulo aparece com o
 * mouse em cima e o clique leva à seção. Arrastar o polegar move a página; clicar no trilho
 * desliza até o ponto. No toque, a barra do sistema (que já flutua); com cores forçadas, também.
 *
 * O polegar acompanha a rolagem por uma animação ligada à rolagem (`animation-timeline`), fora
 * da linha principal; onde ela não existe, um quadro por rolagem. As medidas só são lidas
 * quando a página ou a janela mudam de tamanho.
 */
export default function Trilho() {
  const trilho = useRef<HTMLDivElement>(null);
  const polegar = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const [setores, setSetores] = useState<Setor[]>([]);

  useEffect(() => {
    const t = trilho.current;
    const p = polegar.current;
    if (!t || !p) return;
    const porCss = CSS.supports("animation-timeline: scroll()");
    const raiz = document.documentElement;
    let altura = 0;
    let curso = 0;
    let max = 0;
    let quadro = 0;
    let sumir = 0;
    let arraste: { id: number; y: number; inicio: number } | null = null;

    const posicionar = () => {
      quadro = 0;
      if (porCss) return;
      const k = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      p.style.transform = `translate3d(0, ${(k * curso).toFixed(1)}px, 0)`;
    };
    const medir = () => {
      const tela = window.innerHeight;
      const total = raiz.scrollHeight;
      max = Math.max(0, total - tela);
      // O trilho ocupa a altura da tela; escondido (antes de saber se a página rola) ele mede 0, e a
      // página que já nasce com a altura certa não pede outra medida depois.
      const util = (t.clientHeight || window.innerHeight) - FOLGA * 2;
      altura = max > 0 ? Math.min(util, Math.max(MINIMO, Math.round((util * tela) / total))) : 0;
      curso = Math.max(0, util - altura);
      t.style.setProperty("--dl-rol-h", `${altura}px`);
      t.style.setProperty("--dl-rol-curso", `${curso}px`);
      if (max > 0) delete t.dataset.vazio;
      else t.dataset.vazio = "";
      const lista: Setor[] = [];
      document.querySelectorAll<HTMLElement>("[data-dl-setor]").forEach((el) => {
        const topo = el.getBoundingClientRect().top + window.scrollY;
        const alvo = Math.max(0, Math.min(max, topo - alturaCabecalho()));
        lista.push({ rotulo: el.dataset.dlSetor ?? "", k: max > 0 ? alvo / max : 0, topo: alvo });
      });
      setSetores((antes) =>
        antes.length === lista.length && antes.every((s, i) => s.rotulo === lista[i].rotulo && Math.abs(s.k - lista[i].k) < 0.002)
          ? antes
          : lista,
      );
      posicionar();
    };
    // Escreve no trilho só quando o estado muda: regravar a cada rolagem refaria o estilo da página.
    const acender = () => {
      if (!("ativo" in t.dataset)) t.dataset.ativo = "";
      window.clearTimeout(sumir);
      sumir = window.setTimeout(() => {
        if (!arraste) delete t.dataset.ativo;
      }, 900);
    };
    const aoRolar = () => {
      if (!porCss && !quadro) quadro = requestAnimationFrame(posicionar);
      acender();
    };
    const irImediato = (destino: number) => {
      const alvo = Math.max(0, Math.min(max, destino));
      const lenis = getLenis();
      if (lenis && !lenis.isStopped) lenis.scrollTo(alvo, { immediate: true, force: true });
      else window.scrollTo({ top: alvo, behavior: "instant" });
    };
    const aoApertar = (e: PointerEvent) => {
      if (e.button !== 0 || max <= 0) return;
      const setor = (e.target as HTMLElement).closest<HTMLElement>("[data-topo]");
      if (setor) {
        e.preventDefault();
        rolarAte(Number(setor.dataset.topo));
        acender();
        return;
      }
      e.preventDefault();
      if (e.target !== p) {
        // Clique no trilho: o polegar desliza até ficar centrado no ponto.
        const caixa = t.getBoundingClientRect();
        const k = curso > 0 ? (e.clientY - caixa.top - FOLGA - altura / 2) / curso : 0;
        rolarAte(Math.round(Math.max(0, Math.min(1, k)) * max));
        acender();
        return;
      }
      arraste = { id: e.pointerId, y: e.clientY, inicio: window.scrollY };
      t.setPointerCapture(e.pointerId);
      t.dataset.arrastando = "";
      t.dataset.ativo = "";
      raiz.classList.add("dl-arrastando");
    };
    const aoMover = (e: PointerEvent) => {
      if (!arraste || e.pointerId !== arraste.id || curso <= 0) return;
      irImediato(arraste.inicio + ((e.clientY - arraste.y) / curso) * max);
    };
    const aoSoltar = (e: PointerEvent) => {
      if (!arraste || e.pointerId !== arraste.id) return;
      arraste = null;
      delete t.dataset.arrastando;
      raiz.classList.remove("dl-arrastando");
      acender();
    };

    medir();
    const vigia = new ResizeObserver(medir);
    vigia.observe(document.body);
    addEventListener("resize", medir);
    addEventListener("scroll", aoRolar, { passive: true });
    t.addEventListener("pointerdown", aoApertar);
    t.addEventListener("pointermove", aoMover);
    t.addEventListener("pointerup", aoSoltar);
    t.addEventListener("pointercancel", aoSoltar);
    return () => {
      vigia.disconnect();
      removeEventListener("resize", medir);
      removeEventListener("scroll", aoRolar);
      t.removeEventListener("pointerdown", aoApertar);
      t.removeEventListener("pointermove", aoMover);
      t.removeEventListener("pointerup", aoSoltar);
      t.removeEventListener("pointercancel", aoSoltar);
      cancelAnimationFrame(quadro);
      window.clearTimeout(sumir);
      raiz.classList.remove("dl-arrastando");
    };
  }, [path]);

  return (
    <div ref={trilho} className="dl-trilho" aria-hidden="true" data-vazio="">
      {setores.map((s) => (
        <span
          key={`${s.rotulo}-${s.k.toFixed(3)}`}
          className="dl-trilho__setor"
          data-rotulo={s.rotulo}
          data-topo={Math.round(s.topo)}
          style={{ "--k": s.k } as React.CSSProperties}
        />
      ))}
      <div ref={polegar} className="dl-trilho__polegar" />
    </div>
  );
}
