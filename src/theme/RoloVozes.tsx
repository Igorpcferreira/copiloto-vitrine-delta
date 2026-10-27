"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { isRenderableImageSrc } from "@/lib/image-src";
import type { TenantConfig } from "@/lib/types";
import Dialogo from "./base/Dialogo";
import { ArrowDownIcon, ArrowUpIcon, GoogleIcon, StarFilledIcon, XIcon } from "./base/icones";
import { cx } from "./base/util";

type Avaliacao = NonNullable<TenantConfig["testimonials"]>[number];

/** Acima disso o texto não cabe na janela e a avaliação ganha "Ler tudo". */
const LIMITE = 260;

function Estrelas({ nota = 5 }: { nota?: number }) {
  const cheias = Math.round(Math.min(5, Math.max(0, nota)));
  return (
    <span className="dl-estrelas" role="img" aria-label={`Nota ${cheias} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarFilledIcon key={i} size={14} data-vazia={i >= cheias || undefined} />
      ))}
    </span>
  );
}

function Rosto({ avaliacao }: { avaliacao: Avaliacao }) {
  const iniciais = avaliacao.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span className="dl-voz__rosto" aria-hidden="true">
      {isRenderableImageSrc(avaliacao.avatarUrl) ? <Image src={avaliacao.avatarUrl} alt="" width={40} height={40} /> : iniciais}
    </span>
  );
}

/**
 * Avaliações do Delta, "rolo de vozes": à esquerda, o título, "Publicadas no Google" e a nota do
 * Google só quando o painel a tem; à direita, uma janela baixa com as avaliações empilhadas e uma
 * no centro, inteira e nítida; as vizinhas ficam menores e apagadas. A janela não rola por dentro
 * (a roda continua rolando a página, regra 19): o rolo anda pelos botões, pelas setas do teclado e
 * tocando numa vizinha. "Próxima" (seta para cima) sobe o rolo e traz a de baixo; "Anterior" (seta
 * para baixo) desce e traz a de cima. "Ler tudo" abre o texto longo. Sem rotação automática e sem
 * total na inicial.
 */
export default function RoloVozes({ config }: { config: TenantConfig }) {
  const avaliacoes = config.testimonials ?? [];
  const janela = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const itens = useRef<(HTMLLIElement | null)[]>([]);
  const [foco, setFoco] = useState(0);
  const [lendo, setLendo] = useState<number | null>(null);

  // Centraliza a avaliação da vez (um `transform` no rolo, medido só quando ela muda ou a janela
  // muda de tamanho), sem deixar vão nas pontas: a primeira encosta em cima e a última embaixo.
  // O esmaecido só aparece do lado em que há mais avaliações.
  useEffect(() => {
    const raiz = janela.current;
    const rolo = lista.current;
    if (!raiz || !rolo) return;
    const centrar = () => {
      const el = itens.current[foco];
      if (!el) return;
      const minimo = Math.min(0, raiz.clientHeight - rolo.scrollHeight);
      const y = Math.round(Math.max(minimo, Math.min(0, raiz.clientHeight / 2 - (el.offsetTop + el.offsetHeight / 2))));
      rolo.style.transform = `translate3d(0, ${y}px, 0)`;
      raiz.toggleAttribute("data-acima", y < 0);
      raiz.toggleAttribute("data-abaixo", y > minimo);
    };
    centrar();
    const obs = new ResizeObserver(centrar);
    obs.observe(raiz);
    return () => obs.disconnect();
  }, [foco, avaliacoes.length]);

  if (!avaliacoes.length) return null;
  const nota = config.googleRating;
  const ir = (i: number) => setFoco(Math.max(0, Math.min(avaliacoes.length - 1, i)));
  const teclas = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp") ir(foco + 1);
    else if (e.key === "ArrowDown") ir(foco - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(avaliacoes.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <section className="dl dl-vozes" aria-labelledby="dl-vozes-titulo" data-dl-setor="Avaliações">
      <div className="dl-wrap dl-vozes__caixa">
        <div className="dl-vozes__texto">
          <h2 id="dl-vozes-titulo" className="dl-vozes__titulo">
            Quem comprou, conta
          </h2>
          <p className="dl-vozes__fonte">
            <GoogleIcon size={18} />
            Publicadas no Google
          </p>
          {nota ? (
            <p className="dl-vozes__nota">
              <strong>{nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
              <Estrelas nota={nota} />
            </p>
          ) : null}
        </div>

        <div className="dl-vozes__palco">
          <div
            ref={janela}
            className="dl-vozes__janela"
            tabIndex={0}
            role="region"
            aria-roledescription="rolo"
            aria-label={`Avaliações. Avaliação ${foco + 1} de ${avaliacoes.length}; setas para cima e para baixo trocam.`}
            onKeyDown={teclas}
          >
            <ul ref={lista} className="dl-vozes__lista">
              {avaliacoes.map((a, i) => {
                const longa = a.text.length > LIMITE;
                const daVez = i === foco;
                return (
                  <li
                    key={`${a.name}-${i}`}
                    ref={(el) => {
                      itens.current[i] = el;
                    }}
                    className={cx("dl-voz", daVez && "dl-voz--foco")}
                    aria-hidden={!daVez || undefined}
                    onClick={() => !daVez && ir(i)}
                  >
                    <div className="dl-voz__dentro">
                      <div className="dl-voz__topo">
                        <Rosto avaliacao={a} />
                        <span className="dl-voz__nome">{a.name}</span>
                        <Estrelas nota={a.rating} />
                      </div>
                      <p className={cx("dl-voz__texto", longa && "dl-voz__texto--corta")}>{a.text}</p>
                      {longa && (
                        <button type="button" className="dl-voz__ler" onClick={() => setLendo(i)} tabIndex={daVez ? 0 : -1}>
                          Ler tudo
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          {avaliacoes.length > 1 && (
            <div className="dl-vozes__botoes">
              <button type="button" className="dl-btn dl-btn--linha dl-btn--pequeno" disabled={foco === 0} onClick={() => ir(foco - 1)}>
                <ArrowDownIcon size={16} />
                Anterior
              </button>
              <span className="dl-vozes__trilho" aria-hidden="true">
                <span style={{ transform: `scaleX(${(foco + 1) / avaliacoes.length})` }} />
              </span>
              <button type="button" className="dl-btn dl-btn--linha dl-btn--pequeno" disabled={foco === avaliacoes.length - 1} onClick={() => ir(foco + 1)}>
                <ArrowUpIcon size={16} />
                Próxima
              </button>
            </div>
          )}
        </div>
      </div>

      <Dialogo aberto={lendo !== null} aoFechar={() => setLendo(null)} rotulo="Avaliação completa" className="dl dl-leitura">
        {lendo !== null && avaliacoes[lendo] && (
          <div className="dl-leitura__corpo">
            <button type="button" className="dl-leitura__fechar" aria-label="Fechar" onClick={() => setLendo(null)}>
              <XIcon size={20} />
            </button>
            <div className="dl-voz__topo">
              <Rosto avaliacao={avaliacoes[lendo]} />
              <span className="dl-voz__nome">{avaliacoes[lendo].name}</span>
              <Estrelas nota={avaliacoes[lendo].rating} />
            </div>
            <p className="dl-leitura__texto" data-lenis-prevent="">
              {avaliacoes[lendo].text}
            </p>
            <p className="dl-vozes__fonte">
              <GoogleIcon size={16} />
              Publicada no Google
            </p>
          </div>
        )}
      </Dialogo>
    </section>
  );
}
