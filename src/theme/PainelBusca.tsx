"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Categoria, Faixa, Marca } from "./base/montar";
import Escolha from "./base/Escolha";
import { ArrowRightIcon } from "./base/icones";
import { useNoun } from "./contexto";
import Regua, { limitesDePreco, passoDePreco, precoCurto } from "./Regua";

const OUTRAS = "__outras";

/**
 * Busca da inicial do Delta, "painel de réguas": uma placa escura, como um painel de
 * instrumentos, atravessando o corte diagonal da abertura. Marca (com logos) e Carroceria em
 * seletores, a faixa de preço numa régua de dois polegares (do menor ao maior preço do estoque) e
 * o ano numa régua de um polegar ("a partir de"), com os valores em bandeiras que andam com os
 * polegares. Leva ao Comprar com os mesmos parâmetros do contrato. Nenhuma contagem (regra da
 * inicial). No celular: a régua de preço inteira e uma linha com Marca, Carroceria e o botão; o
 * ano fica para o Comprar.
 */
export default function PainelBusca({
  base,
  marcas,
  outrasMarcas,
  categorias,
  precos,
  anos,
}: {
  base: string;
  marcas: Marca[];
  outrasMarcas?: string;
  categorias: Categoria[];
  precos: Faixa;
  anos: Faixa;
}) {
  const router = useRouter();
  const noun = useNoun();
  const [lo, hi] = limitesDePreco(precos.min, precos.max);
  const temPreco = hi > lo;
  const temAno = anos.max > anos.min;
  const [marca, setMarca] = useState<string>();
  const [segmento, setSegmento] = useState<string>();
  const [faixa, setFaixa] = useState<[number, number]>([lo, hi]);
  const [ano, setAno] = useState(anos.min);

  const opcoesMarca = [
    ...marcas.map((m) => ({ valor: m.nome, rotulo: m.rotulo, logo: m.logo, estilo: m.estilo })),
    ...(outrasMarcas ? [{ valor: OUTRAS, rotulo: "Outras marcas" }] : []),
  ];

  const destino = () => {
    const sp = new URLSearchParams();
    if (marca === OUTRAS && outrasMarcas) new URLSearchParams(outrasMarcas).forEach((v, k) => sp.append(k, v));
    else if (marca) sp.set("marca", marca);
    if (segmento) sp.set("segmento", segmento);
    if (temPreco && faixa[0] > lo) sp.set("preco_min", String(faixa[0]));
    if (temPreco && faixa[1] < hi) sp.set("preco", String(faixa[1]));
    if (temAno && ano > anos.min) sp.set("ano", String(ano));
    const qs = sp.toString();
    return `${base}/comprar${qs ? `?${qs}` : ""}`;
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    router.push(destino());
  };

  // Sem estoque (nada para escolher), o painel diz isso em vez de mostrar só o botão.
  if (!opcoesMarca.length && !categorias.length && !temPreco && !temAno) {
    return (
      <section className="dl dl-painel" aria-label="Estoque" data-dl-setor="Busca">
        <div className="dl-wrap dl-painel__caixa dl-painel__caixa--aviso">
          <p className="dl-painel__aviso">O estoque está sendo atualizado. Volte daqui a pouco ou fale com a gente pelo WhatsApp.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dl dl-painel" aria-labelledby="dl-painel-titulo" data-dl-setor="Busca">
      <form className="dl-wrap dl-painel__caixa" action={`${base}/comprar`} onSubmit={enviar}>
        <h2 id="dl-painel-titulo" className="dl-sr">
          Encontre {noun.feminine ? "a" : "o"} {noun.singular}
        </h2>
        {opcoesMarca.length > 0 && (
          <Escolha
            prefixo="dl"
            className="dl-painel__marca"
            rotulo="Marca"
            opcoes={opcoesMarca}
            valor={marca}
            vazio="Todas"
            tituloFolha="Escolha a marca"
            aoEscolher={setMarca}
          />
        )}
        {categorias.length > 0 && (
          <Escolha
            prefixo="dl"
            className="dl-painel__carroceria"
            rotulo="Carroceria"
            opcoes={categorias.map((c) => ({ valor: c.nome, rotulo: c.nome }))}
            valor={segmento}
            vazio="Todas"
            tituloFolha="Escolha a carroceria"
            aoEscolher={setSegmento}
          />
        )}
        {temPreco && (
          <Regua
            className="dl-painel__preco"
            rotulo="Preço"
            rotulos={["Preço mínimo", "Preço máximo"]}
            min={lo}
            max={hi}
            passo={passoDePreco(hi)}
            valor={faixa}
            formatar={precoCurto}
            aoMudar={(v) => Array.isArray(v) && setFaixa(v)}
            bandeiras
          />
        )}
        {temAno && (
          <Regua
            className="dl-painel__ano"
            rotulo="Ano"
            rotulos="Ano a partir de"
            min={anos.min}
            max={anos.max}
            passo={1}
            valor={ano}
            formatar={(v) => `Desde ${v}`}
            aoMudar={(v) => typeof v === "number" && setAno(v)}
            bandeiras
          />
        )}
        <button type="submit" className="dl-btn dl-btn--acao dl-painel__ir" aria-label={`Ver ${noun.plural}`}>
          <span className="dl-painel__ir-longo">Ver {noun.plural}</span>
          <span className="dl-painel__ir-curto" aria-hidden="true">
            Ver
          </span>
          <ArrowRightIcon size={18} />
        </button>
      </form>
    </section>
  );
}
