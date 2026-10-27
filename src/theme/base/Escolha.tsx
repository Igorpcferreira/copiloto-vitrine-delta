"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Dialogo from "./Dialogo";
import { useMidia } from "./ganchos";
import { CheckIcon, ChevronDownIcon, XIcon } from "./icones";

export interface Opcao {
  valor: string;
  rotulo: string;
  logo?: string;
  estilo?: CSSProperties;
  detalhe?: string;
}

/**
 * Seletor de uma opção, com a escolha à vista no botão: no computador abre uma lista logo
 * abaixo (setas, Home, End, Enter, Esc, Tab fecha); no celular, uma folha que sobe de baixo
 * com opções grandes. Sem visual próprio: o CSS do Delta estiliza `.<prefixo>-escolha*`.
 */
export default function Escolha({
  prefixo,
  rotulo,
  opcoes,
  valor,
  vazio,
  aoEscolher,
  icone,
  tituloFolha,
  className,
}: {
  prefixo: string;
  rotulo: string;
  opcoes: Opcao[];
  valor?: string;
  /** Rótulo da opção "todas", que limpa a escolha. */
  vazio: string;
  aoEscolher: (valor: string | undefined) => void;
  icone?: ReactNode;
  tituloFolha?: string;
  className?: string;
}) {
  const id = useId();
  const largo = useMidia("(min-width: 768px)");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const todas: Opcao[] = [{ valor: "", rotulo: vazio }, ...opcoes];
  const atual = opcoes.find((o) => o.valor === valor);
  const p = (s: string) => `${prefixo}-escolha${s}`;

  const fechar = (devolver = true) => {
    setAberto(false);
    if (devolver) botao.current?.focus({ preventScroll: true });
  };

  const escolher = (o: Opcao) => {
    aoEscolher(o.valor || undefined);
    fechar();
  };

  const abrir = (abre: boolean) => {
    if (abre) setAtivo(Math.max(0, todas.findIndex((o) => o.valor === (valor ?? ""))));
    setAberto(abre);
  };

  useEffect(() => {
    if (!aberto || !largo) return;
    requestAnimationFrame(() => lista.current?.focus({ preventScroll: true }));
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto, largo]);

  useEffect(() => {
    if (!aberto || !largo) return;
    // Só a lista rola: `scrollIntoView` rolava também a página, e na barra presa (sticky) do
    // Comprar o Chrome levava a página até o lugar original da barra (25/10/2026).
    const caixa = lista.current;
    const opcao = caixa?.querySelector<HTMLElement>(`[data-indice="${ativo}"]`);
    if (!caixa || !opcao) return;
    const topo = opcao.getBoundingClientRect().top - caixa.getBoundingClientRect().top + caixa.scrollTop;
    const fim = topo + opcao.offsetHeight;
    if (topo < caixa.scrollTop) caixa.scrollTop = topo;
    else if (fim > caixa.scrollTop + caixa.clientHeight) caixa.scrollTop = fim - caixa.clientHeight;
  }, [ativo, aberto, largo]);

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((i) => Math.min(todas.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setAtivo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setAtivo(todas.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      escolher(todas[ativo]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      fechar();
    } else if (e.key === "Tab") {
      setAberto(false);
    }
  };

  const item = (o: Opcao, i: number, folha: boolean) => {
    const marcado = (valor ?? "") === o.valor;
    return (
      <div
        key={o.valor || "todas"}
        id={`${id}-${i}`}
        role="option"
        aria-selected={marcado}
        data-indice={i}
        data-ativo={!folha && i === ativo ? "" : undefined}
        className={p("__opcao")}
        onClick={() => escolher(o)}
        onPointerMove={() => !folha && setAtivo(i)}
        tabIndex={folha ? 0 : -1}
        onKeyDown={
          folha
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  escolher(o);
                }
              }
            : undefined
        }
      >
        {o.logo ? (
          <span className={p("__logo")} aria-hidden="true">
            <Image src={o.logo} alt="" width={40} height={40} style={o.estilo} />
          </span>
        ) : null}
        <span className={p("__texto")}>
          {o.rotulo}
          {o.detalhe && <small>{o.detalhe}</small>}
        </span>
        {marcado && <CheckIcon className={p("__marca")} />}
      </div>
    );
  };

  return (
    <div ref={raiz} className={`${p("")} ${className ?? ""}`} data-aberto={aberto || undefined}>
      <button
        ref={botao}
        type="button"
        className={p("__botao")}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={largo ? `${id}-lista` : undefined}
        onClick={() => abrir(!aberto)}
        onKeyDown={(e) => {
          if (largo && (e.key === "ArrowDown" || e.key === "ArrowUp") && !aberto) {
            e.preventDefault();
            abrir(true);
          }
        }}
      >
        {icone}
        <span className={p("__rotulo")}>{rotulo}</span>
        <span className={p("__valor")} data-vazio={!atual || undefined}>
          {atual?.logo && (
            <span className={p("__logo-mini")} aria-hidden="true">
              <Image src={atual.logo} alt="" width={24} height={24} style={atual.estilo} />
            </span>
          )}
          {atual?.rotulo ?? vazio}
        </span>
        <ChevronDownIcon className={p("__seta")} />
      </button>

      {largo && aberto && (
        <div
          ref={lista}
          id={`${id}-lista`}
          role="listbox"
          aria-label={rotulo}
          aria-activedescendant={`${id}-${ativo}`}
          tabIndex={-1}
          className={p("__lista")}
          // A lista rola por conta própria, fora da rolagem suave da página.
          data-lenis-prevent=""
          onKeyDown={teclas}
          onBlur={(e) => {
            if (!raiz.current?.contains(e.relatedTarget as Node | null)) setAberto(false);
          }}
        >
          {todas.map((o, i) => item(o, i, false))}
        </div>
      )}

      {!largo && (
        <Dialogo aberto={aberto} aoFechar={() => fechar()} rotulo={tituloFolha ?? rotulo} className={p("__folha")}>
          <div className={p("__folha-corpo")}>
            <div className={p("__folha-topo")}>
              <p>{tituloFolha ?? rotulo}</p>
              <button type="button" className={p("__fechar")} onClick={() => fechar()} aria-label="Fechar">
                <XIcon />
              </button>
            </div>
            <div role="listbox" aria-label={rotulo} className={p("__folha-lista")}>
              {todas.map((o, i) => item(o, i, true))}
            </div>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
