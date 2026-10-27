"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { SobreNosProps } from "@/props";
import { CheckIcon, StarFilledIcon } from "./base/icones";
import { cx } from "./base/util";
import { useFotosLoja } from "./contexto";
import PlacaChegada from "./PlacaChegada";
import { irPara } from "./scroll";
import Visor from "./Visor";

interface Capitulo {
  id: string;
  titulo: string;
}

/**
 * Fileiras da galeria justificada: as fotos entram na ordem até a fileira passar da largura na
 * altura-alvo, e a fileira encolhe até caber exatamente. A última, se ficar curta, se junta à de
 * cima quando a altura não cai demais; senão fica na altura-alvo, sem esticar a foto. No celular
 * (`estreito`) a última sozinha ocupa a largura toda: foto pequena ali não serve.
 */
function fileiras(razoes: number[], largura: number, alvo: number, vao: number, estreito: boolean) {
  const linhas: { itens: number[]; altura: number }[] = [];
  const altura = (itens: number[]) => (largura - vao * (itens.length - 1)) / itens.reduce((t, k) => t + razoes[k], 0);
  let atual: number[] = [];
  razoes.forEach((_, i) => {
    atual.push(i);
    if (altura(atual) <= alvo) {
      linhas.push({ itens: atual, altura: altura(atual) });
      atual = [];
    }
  });
  if (atual.length) {
    const anterior = linhas[linhas.length - 1];
    const juntos = anterior ? [...anterior.itens, ...atual] : [];
    if (anterior && altura(juntos) >= alvo * (estreito ? 0.8 : 0.62)) linhas[linhas.length - 1] = { itens: juntos, altura: altura(juntos) };
    else linhas.push({ itens: atual, altura: estreito ? altura(atual) : Math.min(altura(atual), alvo * 1.2) });
  }
  return linhas;
}

/** Galeria justificada das fotos da loja: medida pela largura da caixa (sem ela, o CSS faz uma aproximação). */
function Galeria({ fotos, aoAbrir }: { fotos: { src: string; largura: number; altura: number }[]; aoAbrir: (i: number) => void }) {
  const caixa = useRef<HTMLUListElement>(null);
  const [largura, setLargura] = useState(0);
  const [alvo, setAlvo] = useState(220);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => {
      setLargura(el.clientWidth);
      setAlvo(el.clientWidth < 600 ? 150 : 220);
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const vao = largura && largura < 600 ? 6 : 8;
  const razoes = fotos.map((f) => f.largura / f.altura);
  const tamanhos = new Map<number, { w: number; h: number }>();
  if (largura) {
    for (const linha of fileiras(razoes, largura, alvo, vao, largura < 600)) {
      for (const i of linha.itens) tamanhos.set(i, { w: Math.floor(razoes[i] * linha.altura * 100) / 100, h: Math.floor(linha.altura) });
    }
  }
  return (
    <ul ref={caixa} className="dl-sobre__galeria" data-medida={largura ? "" : undefined}>
      {fotos.map((f, i) => {
        const t = tamanhos.get(i);
        return (
          <li key={f.src} style={(t ? { width: t.w, height: t.h } : { "--r": razoes[i].toFixed(4) }) as CSSProperties}>
            <button type="button" className="dl-sobre__foto" onClick={() => aoAbrir(i)} aria-label={`Ampliar a foto ${i + 1} de ${fotos.length} da loja`}>
              <Image src={f.src} alt="" fill sizes="(min-width: 1100px) 480px, 70vw" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Sobre nós do Delta. A abertura não tem foto grande: título, introdução, a nota do Google (só
 * quando o painel a tem) e, ao lado (embaixo, no celular), os números em placas inclinadas lado a
 * lado. Depois, os capítulos (os
 * textos do painel, "Por que comprar com a gente" e as fotos da loja) com um índice preso ao lado
 * que marca o capítulo em leitura e leva a cada um. As fotos ficam numa galeria justificada:
 * fileiras da mesma altura, cada foto na proporção dela, sem corte; com o mouse em cima a foto
 * cresce por cima das vizinhas e o clique abre o visor; no celular, as fotos ficam à vista e o
 * toque abre o visor. No fim, o contato da inicial (com o mapa só se a seção estiver ligada).
 */
export default function SobreNos({ config }: SobreNosProps) {
  const sobre = config.about;
  const fotos = useFotosLoja(config.storePhotos);
  const numeros = (sobre.stats ?? []).slice(0, 4);
  const destaques = sobre.highlights ?? [];
  const [visor, setVisor] = useState<number | null>(null);
  const [daVez, setDaVez] = useState(0);
  const corpo = useRef<HTMLDivElement>(null);

  const capitulos: Capitulo[] = [
    ...sobre.sections.map((s, i) => ({ id: `cap-${i + 1}`, titulo: s.title })),
    ...(destaques.length ? [{ id: "cap-porque", titulo: "Por que comprar com a gente" }] : []),
    ...(fotos.length ? [{ id: "cap-loja", titulo: "A loja por dentro" }] : []),
  ];

  // O índice marca o capítulo que chegou ao alto da tela (linha a 20% da altura); no fim da página,
  // o último. Recalcula a cada rolagem (um quadro por vez): um salto direto ao topo não cruza
  // nenhuma faixa observada e deixaria o índice no capítulo de antes.
  useEffect(() => {
    const caixa = corpo.current;
    if (!caixa) return;
    const secoes = [...caixa.querySelectorAll<HTMLElement>("[data-capitulo]")];
    if (!secoes.length) return;
    let quadro = 0;
    const calcular = () => {
      quadro = 0;
      const linha = Math.max(120, window.innerHeight * 0.2);
      const noFim = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      const acima = secoes.filter((s) => s.getBoundingClientRect().top < linha);
      const ultimo = secoes[secoes.length - 1];
      setDaVez(
        noFim && ultimo.getBoundingClientRect().top < window.innerHeight
          ? Number(ultimo.dataset.capitulo)
          : acima.length
            ? Number(acima[acima.length - 1].dataset.capitulo)
            : 0,
      );
    };
    const aoRolar = () => {
      if (!quadro) quadro = requestAnimationFrame(calcular);
    };
    calcular();
    addEventListener("scroll", aoRolar, { passive: true });
    addEventListener("resize", aoRolar);
    return () => {
      removeEventListener("scroll", aoRolar);
      removeEventListener("resize", aoRolar);
      cancelAnimationFrame(quadro);
    };
  }, [capitulos.length]);

  const numero = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <div className="dl-sobre">
      <header className="dl-wrap dl-sobre__abertura">
        <div className="dl-sobre__abertura-texto">
          <p className="dl-etiqueta dl-sobre__etiqueta">Sobre nós</p>
          <h1 className="dl-sobre__titulo">{sobre.title}</h1>
          {sobre.intro && <p className="dl-sobre__intro">{sobre.intro}</p>}
          {config.googleRating ? (
            <p className="dl-sobre__nota">
              <StarFilledIcon size={16} />
              <strong>{config.googleRating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
              no Google
              {config.googleReviewCount ? <span>({config.googleReviewCount} avaliações)</span> : null}
            </p>
          ) : null}
        </div>
        {numeros.length > 0 && (
          <ul className="dl-sobre__numeros">
            {numeros.map((n, i) => (
              <li key={n.label} style={{ "--i": i } as CSSProperties}>
                <strong>{n.value}</strong>
                <span>{n.label}</span>
              </li>
            ))}
          </ul>
        )}
      </header>

      {capitulos.length > 0 && (
        <div ref={corpo} className="dl-wrap dl-sobre__corpo">
          <nav className="dl-sobre__indice" aria-label="Capítulos">
            <ol>
              {capitulos.map((c, i) => (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    aria-current={i === daVez ? "true" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      irPara(`#${c.id}`, { foco: `#${c.id}-titulo` });
                    }}
                  >
                    <span className="dl-sobre__indice-num" aria-hidden="true">
                      {numero(i)}
                    </span>
                    {c.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="dl-sobre__capitulos">
            {sobre.sections.map((s, i) => (
              <section
                key={s.title}
                id={`cap-${i + 1}`}
                className="dl-sobre__capitulo"
                data-capitulo={i}
                data-dl-setor={s.title}
                aria-labelledby={`cap-${i + 1}-titulo`}
              >
                <p className="dl-sobre__num" aria-hidden="true">
                  {numero(i)}
                </p>
                <h2 id={`cap-${i + 1}-titulo`} className="dl-sobre__h2" tabIndex={-1}>
                  {s.title}
                </h2>
                {s.body.map((paragrafo, k) => (
                  <p key={k} className="dl-sobre__texto">
                    {paragrafo}
                  </p>
                ))}
              </section>
            ))}

            {destaques.length > 0 && (
              <section
                id="cap-porque"
                className="dl-sobre__capitulo"
                data-capitulo={sobre.sections.length}
                data-dl-setor="Por que comprar"
                aria-labelledby="cap-porque-titulo"
              >
                <p className="dl-sobre__num" aria-hidden="true">
                  {numero(sobre.sections.length)}
                </p>
                <h2 id="cap-porque-titulo" className="dl-sobre__h2" tabIndex={-1}>
                  Por que comprar com a gente
                </h2>
                <ul className="dl-sobre__destaques">
                  {destaques.map((d) => (
                    <li key={d.title}>
                      <span className="dl-sobre__destaque-marca" aria-hidden="true">
                        <CheckIcon size={16} />
                      </span>
                      <strong>{d.title}</strong>
                      <span className="dl-sobre__destaque-texto">{d.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {fotos.length > 0 && (
              <section
                id="cap-loja"
                className="dl-sobre__capitulo dl-sobre__capitulo--fotos"
                data-capitulo={capitulos.length - 1}
                data-dl-setor="A loja"
                aria-labelledby="cap-loja-titulo"
              >
                <p className="dl-sobre__num" aria-hidden="true">
                  {numero(capitulos.length - 1)}
                </p>
                <h2 id="cap-loja-titulo" className="dl-sobre__h2" tabIndex={-1}>
                  A loja por dentro
                </h2>
                <Galeria fotos={fotos} aoAbrir={setVisor} />
              </section>
            )}
          </div>
        </div>
      )}

      {config.address && (
        <div className={cx("dl-sobre__contato", !capitulos.length && "dl-sobre__contato--sozinho")}>
          <PlacaChegada config={config} mapa={config.sections.mapa} />
        </div>
      )}

      <Visor fotos={fotos.map((f) => f.src)} titulo={config.name} rotulo={`Fotos da loja ${config.name}`} inicial={visor} aoFechar={() => setVisor(null)} />
    </div>
  );
}
