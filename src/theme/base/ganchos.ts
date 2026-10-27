"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/*
 * Ganchos de cliente do Delta. Nenhum lê `matchMedia` nem mede a página durante o render:
 * todos começam num valor neutro e se ajustam no efeito, para o HTML do servidor valer.
 */

/** Verdadeiro enquanto o elemento está na tela (ou perto dela, pela margem). */
export function useNaTela<T extends Element>(
  ref: RefObject<T | null>,
  { margem = "0px", uma = false, limiar = 0 }: { margem?: string; uma?: boolean; limiar?: number } = {},
) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entrada]) => {
        setVisivel(entrada.isIntersecting);
        if (entrada.isIntersecting && uma) obs.disconnect();
      },
      { rootMargin: margem, threshold: limiar },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, margem, uma, limiar]);
  return visivel;
}

/** Uma consulta de mídia, falsa até o primeiro efeito. */
export function useMidia(consulta: string) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = matchMedia(consulta);
    const sync = () => setOk(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [consulta]);
  return ok;
}

export const useMovimentoReduzido = () => useMidia("(prefers-reduced-motion: reduce)");
export const usePonteiroFino = () => useMidia("(hover: hover) and (pointer: fine)");

/**
 * Rolagem da página: posição, sentido do último movimento (com folga de 6 px para tremores)
 * e progresso de 0 a 1. Atualiza no máximo uma vez por quadro.
 */
export function useRolagem() {
  const [estado, setEstado] = useState({ y: 0, descendo: false, progresso: 0 });
  const ultimo = useRef(0);
  useEffect(() => {
    let quadro = 0;
    const ler = () => {
      quadro = 0;
      const y = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setEstado((anterior) => {
        const delta = y - ultimo.current;
        const descendo = Math.abs(delta) < 6 ? anterior.descendo : delta > 0;
        if (Math.abs(delta) >= 6) ultimo.current = y;
        const progresso = Math.min(1, Math.max(0, y / max));
        if (anterior.y === y && anterior.descendo === descendo && anterior.progresso === progresso) return anterior;
        return { y, descendo, progresso };
      });
    };
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(ler);
    };
    ler();
    addEventListener("scroll", agendar, { passive: true });
    addEventListener("resize", agendar);
    return () => {
      removeEventListener("scroll", agendar);
      removeEventListener("resize", agendar);
      cancelAnimationFrame(quadro);
    };
  }, []);
  return estado;
}

/**
 * Pausa de movimento contínuo: fica pausado com o ponteiro em cima, com o foco dentro, por
 * alguns segundos depois de um toque, fora da tela, com a aba oculta e com movimento reduzido.
 */
export function usePausa<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [motivos, setMotivos] = useState({ ponteiro: false, foco: false, toque: false, fora: true, oculta: false, reduzido: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let toque = 0;
    const set = (chave: keyof typeof motivos, valor: boolean) => setMotivos((m) => (m[chave] === valor ? m : { ...m, [chave]: valor }));
    const entra = (e: PointerEvent) => e.pointerType === "mouse" && set("ponteiro", true);
    const sai = (e: PointerEvent) => e.pointerType === "mouse" && set("ponteiro", false);
    const toca = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      set("toque", true);
      window.clearTimeout(toque);
      toque = window.setTimeout(() => set("toque", false), 3500);
    };
    // Só o foco de teclado para o movimento: o foco que um clique (ou um arraste) deixa num link não.
    const focoEntra = (e: FocusEvent) => {
      if ((e.target as Element | null)?.matches?.(":focus-visible")) set("foco", true);
    };
    const focoSai = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) set("foco", false);
    };
    const aba = () => set("oculta", document.hidden);
    const reduzido = matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduzido = () => set("reduzido", reduzido.matches);
    const obs = new IntersectionObserver(([e]) => set("fora", !e.isIntersecting), { rootMargin: "80px 0px" });
    el.addEventListener("pointerenter", entra);
    el.addEventListener("pointerleave", sai);
    el.addEventListener("pointerdown", toca);
    el.addEventListener("focusin", focoEntra);
    el.addEventListener("focusout", focoSai);
    document.addEventListener("visibilitychange", aba);
    reduzido.addEventListener("change", syncReduzido);
    syncReduzido();
    aba();
    obs.observe(el);
    return () => {
      el.removeEventListener("pointerenter", entra);
      el.removeEventListener("pointerleave", sai);
      el.removeEventListener("pointerdown", toca);
      el.removeEventListener("focusin", focoEntra);
      el.removeEventListener("focusout", focoSai);
      document.removeEventListener("visibilitychange", aba);
      reduzido.removeEventListener("change", syncReduzido);
      obs.disconnect();
      window.clearTimeout(toque);
    };
  }, [ref]);
  const pausado = Object.values(motivos).some(Boolean);
  return { pausado, reduzido: motivos.reduzido };
}

/** Arrastar na horizontal (toque ou mouse): chama `aoSoltar` com o sentido, 1 (direita) ou -1. */
export function useArrastar<T extends HTMLElement>(
  ref: RefObject<T | null>,
  aoSoltar: (sentido: 1 | -1) => void,
  { minimo = 40 }: { minimo?: number } = {},
) {
  const callback = useRef(aoSoltar);
  useEffect(() => {
    callback.current = aoSoltar;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inicioX = 0;
    let inicioY = 0;
    let ativo = false;
    const desce = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      ativo = true;
      inicioX = e.clientX;
      inicioY = e.clientY;
    };
    // Depois de um arraste, o clique que o navegador dispara em seguida não abre o link.
    const engoleClique = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    const sobe = (e: PointerEvent) => {
      if (!ativo) return;
      ativo = false;
      const dx = e.clientX - inicioX;
      const dy = e.clientY - inicioY;
      if (Math.abs(dx) >= minimo && Math.abs(dx) > Math.abs(dy) * 1.2) {
        callback.current(dx > 0 ? 1 : -1);
        el.addEventListener("click", engoleClique, { capture: true, once: true });
        window.setTimeout(() => el.removeEventListener("click", engoleClique, { capture: true }), 400);
      }
    };
    const cancela = () => {
      ativo = false;
    };
    el.addEventListener("pointerdown", desce);
    el.addEventListener("pointerup", sobe);
    el.addEventListener("pointercancel", cancela);
    return () => {
      el.removeEventListener("pointerdown", desce);
      el.removeEventListener("pointerup", sobe);
      el.removeEventListener("pointercancel", cancela);
    };
  }, [ref, minimo]);
}
