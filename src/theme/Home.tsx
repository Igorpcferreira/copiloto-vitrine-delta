import { Suspense } from "react";
import type { HomeProps } from "@/props";
import Abertura from "./Abertura";
import { montarDados } from "./base/montar";
import EstoqueInicio from "./EstoqueInicio";
import PlacaChegada from "./PlacaChegada";
import RoloVozes from "./RoloVozes";

/**
 * Inicial do Delta (contrato de `src/props.ts`): abertura, as seções do estoque (no site, o
 * `stock` que a rota passa com o `HomeStock`; no preview, montadas aqui com o catálogo de
 * exemplo), avaliações e contato. Não importa nada do servidor. As seções abaixo da dobra ficam
 * em limites `Suspense` próprios: o React as hidrata uma de cada vez.
 */
export default function Home({ config, base, destaques = [], novidades = [], ofertas = [], facets, inventory, stock, noun }: HomeProps) {
  const s = config.sections;
  const itens = inventory?.length ? inventory : [...destaques, ...novidades, ...ofertas];
  return (
    <>
      <Abertura config={config} base={base} noun={noun} />
      {stock ??
        (facets && (
          <EstoqueInicio
            config={config}
            base={base}
            dados={montarDados(config, itens, facets, true, { recentes: novidades, destaques, ofertas })}
          />
        ))}
      {s.depoimentos && (config.testimonials?.length ?? 0) > 0 && (
        <Suspense>
          <RoloVozes config={config} />
        </Suspense>
      )}
      {s.mapa && config.address && (
        <Suspense>
          <PlacaChegada config={config} />
        </Suspense>
      )}
    </>
  );
}
