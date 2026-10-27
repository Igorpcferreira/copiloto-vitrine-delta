"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { isRenderableImageSrc } from "@/lib/image-src";
import type { Vehicle } from "@/lib/types";
import type { Grupo } from "./base/montar";
import { ArrowRightIcon } from "./base/icones";
import { carroHref, combustivel, comprar, cx, ficha, foto, posicao, preco, precoAnterior, selo, versao } from "./base/util";
import LinhaChegada from "./LinhaChegada";

/** O pole e quatro atrás dele. */
const NA_VITRINE = 5;
const DIAGONAL = 0.21;
const ASPECTO_POLE = 1.5;

/**
 * O carro da frente: foto grande, que cresce até a base da grade ao lado, com o preço em lâmina,
 * o selo e as miniaturas por cima (trocam a foto); embaixo, numa linha, marca, nome, ficha e
 * "Ver o carro".
 */
function Pole({ carro, base }: { carro: Vehicle; base: string }) {
  const [fotoAtual, setFotoAtual] = useState(0);
  const fotos = carro.photos.slice(0, 4);
  const anterior = precoAnterior(carro);
  const src = foto(carro, fotoAtual);
  return (
    <article className="dl-pole">
      <div className="dl-pole__dentro">
        <div className="dl-pole__foto">
          {isRenderableImageSrc(src) && (
            <Image
              key={src}
              src={src}
              alt={carro.title}
              fill
              sizes="(min-width: 1100px) 700px, (min-width: 900px) 56vw, 100vw"
              style={{
                objectPosition: posicao(carro, fotoAtual, ASPECTO_POLE) ?? "50% 55%",
              }}
            />
          )}
          {selo(carro) && <span className="dl-pole__selo">{selo(carro)}</span>}
          <span className="dl-preco">
            {anterior && (
              <s className="dl-preco__antes">
                <span className="dl-sr">De </span>
                {anterior}
              </s>
            )}
            <span className="dl-preco__valor">
              {anterior && <span className="dl-sr">por </span>}
              {preco(carro)}
            </span>
          </span>
          {fotos.length > 1 && (
            <div className="dl-pole__miniaturas" role="group" aria-label="Fotos do carro">
              {fotos.map((f, i) => (
                <button
                  key={f + i}
                  type="button"
                  className="dl-pole__mini"
                  aria-label={`Foto ${i + 1}`}
                  aria-pressed={i === fotoAtual}
                  onClick={() => setFotoAtual(i)}
                >
                  {isRenderableImageSrc(f) && (
                    <Image
                      src={f}
                      alt=""
                      fill
                      sizes="72px"
                      style={{
                        objectPosition: posicao(carro, i, 4 / 3) ?? "50% 55%",
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="dl-pole__corpo">
          <div className="dl-pole__texto">
            <span className="dl-pole__marca">{carro.brand}</span>
            <h3 className="dl-pole__titulo">{versao(carro) || carro.title}</h3>
            <p className="dl-pole__ficha">{[...ficha(carro), combustivel(carro)].filter(Boolean).join(" · ")}</p>
          </div>
          <Link href={carroHref(base, carro)} className="dl-btn dl-btn--acao dl-pole__ver">
            Ver o carro
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Vitrine do Delta, "pole": Destaques, Novidades e Ofertas numa chave em lâmina na linha de
 * chegada; um carro grande na frente e quatro atrás. Escolher um carro de trás o traz para a
 * frente (os de trás trocam de lugar com animação de posição) e o da frente mostra miniaturas
 * para trocar a foto, a ficha e "Ver o carro". Trocar de grupo faz os carros entrarem na
 * diagonal, no sentido do grupo escolhido. Teclado: setas, Home e End na chave. Cada carro de
 * trás tem a foto (botão que o traz para a frente) e o nome (link de verdade para a página dele).
 * Sem contagem. No celular, o da frente em cima e os outros numa fileira que desliza.
 */
export default function GridLargada({ base, grupos }: { base: string; grupos: Grupo[] }) {
  const id = useId();
  const [atual, setAtual] = useState(0);
  const [sentido, setSentido] = useState<1 | -1>(1);
  const [frente, setFrente] = useState<Record<string, string>>({});
  const abas = useRef<(HTMLButtonElement | null)[]>([]);
  const poleRef = useRef<HTMLDivElement>(null);
  const grupo = grupos[Math.min(atual, grupos.length - 1)];
  if (!grupo) return null;

  const carros = grupo.carros.slice(0, NA_VITRINE);
  const poleId = frente[grupo.id] && carros.some((c) => c.id === frente[grupo.id]) ? frente[grupo.id] : carros[0]?.id;
  const pole = carros.find((c) => c.id === poleId) ?? carros[0];
  const atras = carros.filter((c) => c.id !== pole?.id);

  const escolherGrupo = (i: number, focar = false) => {
    if (i !== atual) {
      setSentido(i > atual ? 1 : -1);
      setAtual(i);
    }
    if (focar) abas.current[i]?.focus();
  };

  const teclas = (e: KeyboardEvent) => {
    const ultimo = grupos.length - 1;
    if (e.key === "ArrowRight") escolherGrupo(atual === ultimo ? 0 : atual + 1, true);
    else if (e.key === "ArrowLeft") escolherGrupo(atual === 0 ? ultimo : atual - 1, true);
    else if (e.key === "Home") escolherGrupo(0, true);
    else if (e.key === "End") escolherGrupo(ultimo, true);
    else return;
    e.preventDefault();
  };

  const porNaFrente = (carro: Vehicle) => {
    setFrente((f) => ({ ...f, [grupo.id]: carro.id }));
    // No celular o da frente fica acima da fileira: ele volta à vista.
    const caixa = poleRef.current?.getBoundingClientRect();
    if (caixa && caixa.top < 0)
      poleRef.current?.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
  };

  return (
    <section className="dl dl-grid" aria-labelledby="dl-grid-titulo" data-dl-setor="Vitrine">
      <div className="dl-wrap">
        <LinhaChegada
          id="dl-grid-titulo"
          titulo="Prontos para rodar"
          acao={{ href: comprar(base, grupo.params), rotulo: "Ver todos" }}
          extra={
            grupos.length > 1 ? (
              <div className="dl-chave dl-chave--linha" role="tablist" aria-label="Vitrine" onKeyDown={teclas}>
                {grupos.map((g, i) => (
                  <button
                    key={g.id}
                    ref={(el) => {
                      abas.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`${id}-aba-${g.id}`}
                    aria-selected={i === atual}
                    aria-controls={`${id}-painel`}
                    tabIndex={i === atual ? 0 : -1}
                    className={cx("dl-chave__item", i === atual && "dl-chave__item--atual")}
                    onClick={() => escolherGrupo(i)}
                  >
                    {g.titulo}
                  </button>
                ))}
              </div>
            ) : (
              <span className="dl-grid__unico">{grupo.titulo}</span>
            )
          }
        />

        <div
          id={`${id}-painel`}
          role={grupos.length > 1 ? "tabpanel" : undefined}
          aria-labelledby={grupos.length > 1 ? `${id}-aba-${grupo.id}` : undefined}
          className="dl-grid__painel"
        >
          <AnimatePresence mode="popLayout" initial={false} custom={sentido}>
            <m.div
              key={grupo.id}
              className={cx("dl-grid__pista", atras.length === 0 && "dl-grid__pista--so")}
              custom={sentido}
              variants={{
                entra: (s: number) => ({
                  opacity: 0,
                  x: s * 56,
                  y: s * 56 * DIAGONAL,
                }),
                fica: { opacity: 1, x: 0, y: 0 },
                sai: (s: number) => ({
                  opacity: 0,
                  x: -s * 56,
                  y: -s * 56 * DIAGONAL,
                }),
              }}
              initial="entra"
              animate="fica"
              exit="sai"
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              <div ref={poleRef} className="dl-grid__frente" aria-live="polite">
                <AnimatePresence mode="popLayout" initial={false}>
                  {pole && (
                    <m.div
                      key={pole.id}
                      initial={{ opacity: 0, x: -24, y: -24 * DIAGONAL }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      exit={{ opacity: 0, x: 24, y: 24 * DIAGONAL }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Pole carro={pole} base={base} />
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
              {atras.length > 0 && (
                <ul className="dl-grid__atras" aria-label="Escolha outro carro para ver na frente">
                  {atras.map((carro) => {
                    const capa = foto(carro, 0);
                    return (
                      <m.li
                        key={carro.id}
                        layout="position"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 38,
                        }}
                        className="dl-grid__vez"
                      >
                        <div className="dl-vez">
                          <div className="dl-vez__dentro">
                            <button type="button" className="dl-vez__frente" onClick={() => porNaFrente(carro)} aria-label={`Pôr ${carro.title} na frente`}>
                              <span className="dl-vez__foto">
                                {isRenderableImageSrc(capa) && (
                                  <Image
                                    src={capa}
                                    alt=""
                                    fill
                                    sizes="(min-width: 1100px) 300px, (min-width: 768px) 30vw, 240px"
                                    style={{
                                      objectPosition: posicao(carro, 0, 4 / 3) ?? "50% 55%",
                                    }}
                                  />
                                )}
                              </span>
                            </button>
                            <span className="dl-vez__corpo">
                              <Link href={carroHref(base, carro)} className="dl-vez__titulo">
                                {versao(carro) || carro.title}
                              </Link>
                              <span className="dl-vez__ficha">{ficha(carro).slice(0, 2).join(" · ")}</span>
                              <span className="dl-vez__preco">{preco(carro)}</span>
                            </span>
                          </div>
                        </div>
                      </m.li>
                    );
                  })}
                </ul>
              )}
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
