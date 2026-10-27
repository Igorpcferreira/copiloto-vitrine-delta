"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { isRenderableImageSrc } from "@/lib/image-src";
import { vehiclePhotoPosition } from "@/lib/placeholders";
import type { Vehicle } from "@/lib/types";
import type { Categoria } from "./base/montar";
import { ArrowLeftIcon, ArrowRightIcon, VirarIcon, VoltarIcon } from "./base/icones";
import { carroHref, comprar, cx, preco, versao } from "./base/util";
import LinhaChegada from "./LinhaChegada";

/** Proporção da foto na frente da carta (largura / altura), para o ponto focal achar o carro inteiro. */
const ASPECTO = 1.25;
const NO_VERSO = 4;

function Carta({ categoria, carros, base, indice }: { categoria: Categoria; carros: Vehicle[]; base: string; indice: number }) {
  const id = useId();
  const [virada, setVirada] = useState(false);
  const frente = useRef<HTMLButtonElement>(null);
  const verso = useRef<HTMLButtonElement>(null);

  const virar = (para: boolean) => {
    setVirada(para);
    // O lado que sai da vista leva o foco junto para o lado que entra.
    requestAnimationFrame(() => (para ? verso.current : frente.current)?.focus({ preventScroll: true }));
  };

  return (
    <li className={cx("dl-carroceria", virada && "dl-carroceria--virada")} style={{ "--i": indice } as React.CSSProperties}>
      <div className="dl-carroceria__giro">
        <div className="dl-carroceria__lado dl-carroceria__lado--frente" aria-hidden={virada || undefined}>
          <div className="dl-carroceria__dentro">
            <Link href={comprar(base, categoria.params)} className="dl-carroceria__foto" tabIndex={virada ? -1 : undefined}>
              {isRenderableImageSrc(categoria.foto) && (
                <Image
                  src={categoria.foto}
                  alt={categoria.carro ? `${categoria.nome}: ${categoria.carro}` : categoria.nome}
                  fill
                  sizes="(min-width: 1100px) 300px, 260px"
                  style={{
                    objectPosition: vehiclePhotoPosition(categoria.foco, 0, ASPECTO) ?? "50% 55%",
                  }}
                />
              )}
              <span className="dl-sr">Ver {categoria.nome} no estoque</span>
            </Link>
            <div className="dl-carroceria__pe">
              <span className="dl-carroceria__nome">{categoria.nome}</span>
              <button
                ref={frente}
                type="button"
                className="dl-chip dl-carroceria__virar"
                aria-expanded={virada}
                aria-controls={`${id}-verso`}
                tabIndex={virada ? -1 : undefined}
                onClick={() => virar(true)}
              >
                O que tem
                <VirarIcon size={14} />
              </button>
            </div>
          </div>
        </div>
        <div id={`${id}-verso`} className="dl-carroceria__lado dl-carroceria__lado--verso" aria-hidden={!virada || undefined}>
          <p className="dl-carroceria__nome">{categoria.nome}</p>
          {carros.length > 0 ? (
            <ul className="dl-carroceria__modelos">
              {carros.map((carro) => (
                <li key={carro.id}>
                  <Link href={carroHref(base, carro)} tabIndex={virada ? undefined : -1}>
                    <span>{versao(carro) || carro.title}</span>
                    <strong>{preco(carro)}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dl-carroceria__vazio">Os carros desta carroceria estão no estoque.</p>
          )}
          <div className="dl-carroceria__acoes">
            <Link href={comprar(base, categoria.params)} className="dl-carroceria__todos" tabIndex={virada ? undefined : -1}>
              Ver todos
              <ArrowRightIcon size={15} />
            </Link>
            <button ref={verso} type="button" className="dl-chip dl-carroceria__virar" tabIndex={virada ? undefined : -1} onClick={() => virar(false)}>
              <VoltarIcon size={14} />
              Voltar
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Carrocerias do Delta, "cartas que viram": uma fileira de cartas com a foto grande (carro
 * inteiro pelo ponto focal) e o nome. "O que tem" vira a carta: o verso lista, em texto, os
 * modelos dessa carroceria que a página já tem (nome e preço, cada um levando ao carro) e "Ver
 * todos" leva ao Comprar filtrado; "Voltar" desvira. A foto da frente também leva ao Comprar.
 * Sem contagem. A fileira desliza (roda para o lado, dedo ou setas). Com movimento reduzido, a
 * carta troca de lado sem girar.
 */
export default function CartasCarroceria({ base, categorias, carros }: { base: string; categorias: Categoria[]; carros: Vehicle[] }) {
  const fileira = useRef<HTMLUListElement>(null);
  const [pontas, setPontas] = useState({ inicio: true, fim: true });
  const porCategoria = useMemo(
    () => new Map(categorias.map((c) => [c.nome, carros.filter((v) => v.segment === c.nome).slice(0, NO_VERSO)])),
    [categorias, carros],
  );

  useEffect(() => {
    const el = fileira.current;
    if (!el) return;
    const ler = () => {
      const inicio = el.scrollLeft <= 4;
      const fim = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setPontas((p) => (p.inicio === inicio && p.fim === fim ? p : { inicio, fim }));
    };
    ler();
    el.addEventListener("scroll", ler, { passive: true });
    const obs = new ResizeObserver(ler);
    obs.observe(el);
    return () => {
      el.removeEventListener("scroll", ler);
      obs.disconnect();
    };
  }, []);

  const andar = (sentido: 1 | -1) => {
    const el = fileira.current;
    if (!el) return;
    el.scrollBy({
      left: sentido * el.clientWidth * 0.8,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  return (
    <section className="dl dl-carrocerias" aria-labelledby="dl-carrocerias-titulo" data-dl-setor="Carrocerias">
      <div className="dl-wrap">
        <LinhaChegada
          id="dl-carrocerias-titulo"
          titulo="Escolha pela carroceria"
          extra={
            !(pontas.inicio && pontas.fim) ? (
              <div className="dl-setas">
                <button type="button" className="dl-seta" aria-label="Carrocerias anteriores" disabled={pontas.inicio} onClick={() => andar(-1)}>
                  <ArrowLeftIcon size={18} />
                </button>
                <button type="button" className="dl-seta" aria-label="Próximas carrocerias" disabled={pontas.fim} onClick={() => andar(1)}>
                  <ArrowRightIcon size={18} />
                </button>
              </div>
            ) : undefined
          }
        />
        <ul ref={fileira} className="dl-carrocerias__fileira">
          {categorias.map((c, i) => (
            <Carta key={c.nome} categoria={c} carros={porCategoria.get(c.nome) ?? []} base={base} indice={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}
