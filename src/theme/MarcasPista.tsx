"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Marca } from "./base/montar";
import { usePausa } from "./base/ganchos";
import { ArrowRightIcon } from "./base/icones";
import { comprar } from "./base/util";

/** Uma ultrapassagem a cada intervalo, com esta duração, em ms. */
const INTERVALO = 2400;
const DURACAO = 760;

/**
 * Marcas do Delta, "grade de largada": o título no centro e as marcas (logo na cor original e
 * nome, sem moldura, cada uma sobre a marca da posição no asfalto) em duas filas escalonadas, como
 * numa largada, até a placa de chegada, quadriculada, com todas as marcas. De tempos em tempos a
 * de trás ultrapassa a da frente, cruzando de fila num arco curto, da esquerda para a direita, até
 * a última chegar à frente; aí a nova última começa. Para com o ponteiro em cima, com o foco do
 * teclado, com o toque, fora da tela, com a aba oculta e com movimento reduzido. A troca muda a
 * ordem de verdade (leitor de tela e Tab seguem a vista) e a animação é Web Animations de
 * `transform`, no compositor, medida só na hora da troca. No celular ficam só os logos, com o nome
 * para o leitor de tela. Sem contagem.
 */
export default function MarcasPista({ base, marcas, outras }: { base: string; marcas: Marca[]; outras?: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const placas = useRef(new Map<string, HTMLLIElement>());
  const { pausado, reduzido } = usePausa(caixa);
  const [ordem, setOrdem] = useState(() => marcas.map((m) => m.nome));
  const atual = useRef(ordem);
  const vez = useRef(0);
  const antes = useRef<{ posicoes: Map<string, { x: number; y: number }>; passa: string } | null>(null);
  const porNome = new Map(marcas.map((m) => [m.nome, m]));

  useEffect(() => {
    atual.current = ordem;
  }, [ordem]);

  // A de trás passa a da frente: pares da esquerda para a direita.
  useEffect(() => {
    const n = marcas.length;
    if (pausado || reduzido || n < 2) return;
    const id = window.setInterval(() => {
      const k = vez.current % (n - 1);
      vez.current = k + 1;
      const posicoes = new Map<string, { x: number; y: number }>();
      placas.current.forEach((el, chave) => {
        const r = el.getBoundingClientRect();
        posicoes.set(chave, { x: r.left, y: r.top });
      });
      const novo = [...atual.current];
      [novo[k], novo[k + 1]] = [novo[k + 1], novo[k]];
      antes.current = { posicoes, passa: novo[k + 1] };
      setOrdem(novo);
    }, INTERVALO);
    return () => window.clearInterval(id);
  }, [pausado, reduzido, marcas.length]);

  // Cada placa sai de onde estava e cruza de fila: a que ultrapassa passa por cima, num arco, e a
  // outra cede um pouco.
  useLayoutEffect(() => {
    const troca = antes.current;
    antes.current = null;
    if (!troca) return;
    placas.current.forEach((el, chave) => {
      const de = troca.posicoes.get(chave);
      if (de === undefined) return;
      const r = el.getBoundingClientRect();
      const dx = de.x - r.left;
      const dy = de.y - r.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const passa = chave === troca.passa;
      const meio = passa ? `translate(${dx / 2}px, ${dy / 2 - 12}px) scale(1.06)` : `translate(${dx / 2}px, ${dy / 2 + 6}px) scale(0.96)`;
      if (passa) el.dataset.passando = "";
      const anim = el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: meio, offset: 0.5 }, { transform: "none" }], {
        duration: DURACAO,
        easing: "cubic-bezier(0.45, 0, 0.25, 1)",
      });
      anim.onfinish = anim.oncancel = () => delete el.dataset.passando;
    });
  }, [ordem]);

  return (
    <section className="dl dl-marcas" aria-labelledby="dl-marcas-titulo" data-dl-setor="Marcas">
      <div ref={caixa} className="dl-wrap dl-marcas__corpo">
        <h2 id="dl-marcas-titulo" className="dl-marcas__titulo">
          Marcas
        </h2>
        <ul className="dl-marcas__fileira">
          {ordem.map((chave) => {
            const m = porNome.get(chave);
            if (!m) return null;
            return (
              <li
                key={chave}
                ref={(el) => {
                  if (el) placas.current.set(chave, el);
                  else placas.current.delete(chave);
                }}
                className="dl-marcas__item"
              >
                <Link href={comprar(base, m.params)} className="dl-marca">
                  <span className="dl-marca__logo">
                    <Image src={m.logo} alt="" width={64} height={40} sizes="64px" style={m.estilo} />
                  </span>
                  <span className="dl-marca__nome">{m.rotulo}</span>
                </Link>
              </li>
            );
          })}
          <li className="dl-marcas__item dl-marcas__item--chegada">
            <Link href={comprar(base)} className="dl-marca dl-marca--chegada" aria-label="Todas as marcas">
              <span className="dl-marca__xadrez" aria-hidden="true" />
              <span className="dl-marca__nome">
                Todas<span className="dl-marca__resto"> as marcas</span>
              </span>
              <ArrowRightIcon size={16} />
            </Link>
          </li>
        </ul>
        {outras && (
          <Link href={comprar(base, outras)} className="dl-marcas__outras">
            Outras marcas
          </Link>
        )}
      </div>
    </section>
  );
}
