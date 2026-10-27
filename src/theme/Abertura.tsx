import Link from "next/link";
import { Fragment } from "react";
import HeroMedia from "@/components/HeroMedia";
import { DEFAULT_STOCK_NOUN, capitalize, myPossessive, possessive, type StockNoun } from "@/lib/stock-noun";
import type { TenantConfig } from "@/lib/types";
import { ArrowRightIcon } from "./base/icones";
import { comprar } from "./base/util";

/** Divide o título em duas linhas de tamanho parecido, sem quebrar palavra. */
function emDuasLinhas(titulo: string): string[] {
  const palavras = titulo.split(/\s+/).filter(Boolean);
  if (palavras.length <= 3) return [titulo];
  let melhor = 1;
  let diferenca = Infinity;
  for (let i = 1; i < palavras.length; i++) {
    const a = palavras.slice(0, i).join(" ").length;
    const b = palavras.slice(i).join(" ").length;
    if (Math.abs(a - b) < diferenca) {
      diferenca = Math.abs(a - b);
      melhor = i;
    }
  }
  return [palavras.slice(0, melhor).join(" "), palavras.slice(melhor).join(" ")];
}

/**
 * Abertura do Delta, "corte diagonal": o vídeo da loja de ponta a ponta (94svh no computador,
 * 88svh no celular), com a base cortada na diagonal. O título vem em duas placas inclinadas, a
 * segunda deslocada para a direita no ângulo do corte, com a loja e a cidade numa etiqueta
 * acima e as ações abaixo. Na chegada as placas entram pela diagonal; ao rolar, saem por ela
 * (CSS ligado à rolagem, fora da linha principal). Sem botão de pausa: o vídeo pausa sozinho
 * fora da tela, com a aba oculta e com movimento reduzido (`HeroMedia`).
 */
export default function Abertura({ config, base, noun = DEFAULT_STOCK_NOUN }: { config: TenantConfig; base: string; noun?: StockNoun }) {
  const padrao = `${capitalize(possessive(noun))} ${noun.feminine ? "próxima" : "próximo"} ${noun.singular} está aqui.`;
  const linhas = emDuasLinhas(config.tagline?.trim() || padrao);
  return (
    <section id="dl-abertura" className="dl dl-abertura" aria-labelledby="dl-abertura-titulo" data-dl-setor="Abertura">
      <div className="dl-abertura__midia">
        <HeroMedia imageUrl={config.bannerUrl} appearance={config.appearance} />
      </div>
      <div className="dl-abertura__veu" aria-hidden="true" />
      <div className="dl-wrap dl-abertura__conteudo">
        <div className="dl-abertura__sai">
          <p className="dl-etiqueta dl-abertura__local">
            {config.name}
            {config.city ? <span> · {config.city}</span> : null}
          </p>
          <h1 id="dl-abertura-titulo" className="dl-abertura__titulo">
            {linhas.map((linha, i) => (
              // O espaço entre as placas não ocupa lugar na grade, mas mantém as palavras separadas no nome do título.
              <Fragment key={i}>
                {i > 0 && " "}
                <span className="dl-abertura__placa" style={{ "--i": i } as React.CSSProperties}>
                  {linha}
                </span>
              </Fragment>
            ))}
          </h1>
          <div className="dl-abertura__acoes">
            <Link className="dl-btn dl-btn--acao dl-btn--grande" href={comprar(base)}>
              Ver o estoque
              <ArrowRightIcon size={18} />
            </Link>
            {config.sections.paginaVender && (
              <Link className="dl-btn dl-btn--vidro dl-btn--grande" href={`${base}/vender`}>
                Vender {myPossessive(noun)} {noun.singular}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
