"use client";

import { useId } from "react";
import { cx } from "./base/util";

type Faixa = [number, number];

/**
 * Régua do Delta: escolher um valor ou uma faixa arrastando polegares em lâmina sobre uma
 * régua com marcas. Por baixo ficam controles nativos de faixa (`input type="range"`), que dão
 * teclado (setas, Page Up/Down, Home, End), toque e leitor de tela; os polegares visíveis só
 * acompanham. `histograma` (contagens por faixa, no Comprar) desenha barras atrás da régua.
 * `bandeiras` (painel da inicial) põe o valor numa bandeira em lâmina sobre cada polegar, que
 * anda com ele; perto um do outro, as duas viram uma só ("R$ 70 mil a R$ 90 mil").
 */
export default function Regua({
  rotulo,
  min,
  max,
  passo,
  valor,
  formatar,
  aoMudar,
  aoSoltar,
  rotulos,
  histograma,
  className,
  resumo,
  bandeiras,
}: {
  rotulo: string;
  min: number;
  max: number;
  passo: number;
  /** Uma faixa (dois polegares) ou um valor só ("a partir de"). */
  valor: Faixa | number;
  formatar: (v: number) => string;
  aoMudar: (valor: Faixa | number) => void;
  /** Quando a pessoa solta o polegar ou termina pelo teclado. */
  aoSoltar?: (valor: Faixa | number) => void;
  /** Nomes acessíveis de cada polegar. */
  rotulos?: [string, string] | string;
  histograma?: number[];
  className?: string;
  /** Texto à vista com a escolha; sem ele, os valores formatados. */
  resumo?: string;
  /** Valores em bandeiras sobre os polegares, no lugar do texto do cabeçalho e das pontas. */
  bandeiras?: boolean;
}) {
  const id = useId();
  const dupla = Array.isArray(valor);
  const [a, b] = dupla ? valor : [valor, max];
  const vao = Math.max(max - min, 1);
  const pct = (v: number) => ((Math.min(max, Math.max(min, v)) - min) / vao) * 100;
  const maiorBarra = histograma ? Math.max(1, ...histograma) : 1;
  const nomes = Array.isArray(rotulos) ? rotulos : [rotulos ?? `${rotulo} mínimo`, `${rotulo} máximo`];

  const mudarA = (v: number) => (dupla ? aoMudar([Math.min(v, b - passo), b]) : aoMudar(v));
  const mudarB = (v: number) => aoMudar([a, Math.max(v, a + passo)]);
  const soltar = () => aoSoltar?.(dupla ? [a, b] : a);
  // Bandeiras: a âncora acompanha o polegar e a bandeira se desloca para dentro da régua nas pontas.
  const juntas = dupla && pct(b) - pct(a) < 34;
  const bandeira = (p: number, texto: string, chave: string) => (
    <span key={chave} className="dl-regua__bandeira" style={{ left: `${p}%`, "--p": p } as React.CSSProperties}>
      {texto}
    </span>
  );

  return (
    <div className={cx("dl-regua", dupla && "dl-regua--dupla", histograma && "dl-regua--histograma", bandeiras && "dl-regua--bandeiras", className)}>
      <div className="dl-regua__cabeca">
        <span className="dl-regua__rotulo" id={`${id}-rotulo`}>
          {rotulo}
        </span>
        {!bandeiras && (
          <span className="dl-regua__valor" aria-hidden="true">
            {resumo ?? (dupla ? `${formatar(a)} a ${formatar(b)}` : formatar(a))}
          </span>
        )}
      </div>
      <div className="dl-regua__pista" style={{ "--a": `${pct(a)}%`, "--b": `${dupla ? pct(b) : 100}%` } as React.CSSProperties}>
        {histograma && (
          <div className="dl-regua__barras" aria-hidden="true">
            {histograma.map((n, i) => {
              const inicio = (i / histograma.length) * 100;
              const fim = ((i + 1) / histograma.length) * 100;
              const dentro = fim > pct(a) && inicio < (dupla ? pct(b) : 100);
              return <span key={i} data-dentro={dentro || undefined} style={{ height: `${Math.max(8, (n / maiorBarra) * 100)}%` }} />;
            })}
          </div>
        )}
        {bandeiras && (
          <span className="dl-regua__bandeiras" aria-hidden="true">
            {juntas
              ? bandeira((pct(a) + pct(b)) / 2, `${formatar(a)} a ${formatar(b)}`, "juntas")
              : [bandeira(pct(a), formatar(a), "a"), ...(dupla ? [bandeira(pct(b), formatar(b), "b")] : [])]}
          </span>
        )}
        <span className="dl-regua__trilho" aria-hidden="true" />
        <span className="dl-regua__escolha" aria-hidden="true" />
        <span className="dl-regua__polegar" aria-hidden="true" style={{ left: `${pct(a)}%` }} />
        {dupla && <span className="dl-regua__polegar" aria-hidden="true" style={{ left: `${pct(b)}%` }} />}
        <input
          type="range"
          className="dl-regua__entrada"
          min={min}
          max={max}
          step={passo}
          value={a}
          aria-label={nomes[0]}
          aria-valuetext={formatar(a)}
          onChange={(e) => mudarA(Number(e.target.value))}
          onPointerUp={soltar}
          onKeyUp={soltar}
        />
        {dupla && (
          <input
            type="range"
            className="dl-regua__entrada"
            min={min}
            max={max}
            step={passo}
            value={b}
            aria-label={nomes[1]}
            aria-valuetext={formatar(b)}
            onChange={(e) => mudarB(Number(e.target.value))}
            onPointerUp={soltar}
            onKeyUp={soltar}
          />
        )}
      </div>
      {!bandeiras && (
        <div className="dl-regua__pontas" aria-hidden="true">
          <span>{formatar(min)}</span>
          <span>{formatar(max)}</span>
        </div>
      )}
    </div>
  );
}

/** "R$ 80 mil", "R$ 1,2 mi": valor curto para a régua de preço. */
export function precoCurto(valor: number) {
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (valor >= 1000) return `R$ ${Math.round(valor / 1000).toLocaleString("pt-BR")} mil`;
  return `R$ ${valor.toLocaleString("pt-BR")}`;
}

/** Passo da régua de preço: 1 mil abaixo de 50 mil, 5 mil até 300 mil e 10 mil acima. */
export function passoDePreco(max: number) {
  return max <= 50_000 ? 1_000 : max <= 300_000 ? 5_000 : 10_000;
}

/** Limites da régua de preço arredondados para o passo, para os polegares caírem em valores redondos. */
export function limitesDePreco(min: number, max: number): Faixa {
  const passo = passoDePreco(max);
  return [Math.floor(min / passo) * passo, Math.ceil(max / passo) * passo];
}
