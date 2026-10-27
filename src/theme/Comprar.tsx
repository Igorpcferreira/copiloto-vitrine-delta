import type { ComprarProps } from "@/props";
import { carregarEstoque } from "./base/dados";
import ComprarDelta from "./ComprarDelta";

/**
 * Comprar do Delta no site: a rota lê os filtros da URL e a primeira página do resultado; aqui
 * vem também a primeira página do estoque sem filtro (a mesma da inicial, em cache), que dá o
 * histograma dos preços na régua quando cobre o estoque inteiro.
 */
export default async function Comprar({ base, vehicles, facets, filters, total, hasMore }: ComprarProps) {
  const estoque = await carregarEstoque().catch(() => null);
  return (
    <ComprarDelta
      base={base}
      facets={facets}
      filtros={filters}
      carros={vehicles}
      total={total ?? vehicles.length}
      temMais={Boolean(hasMore)}
      estoque={estoque?.items ?? []}
      completo={Boolean(estoque && !estoque.hasMore)}
    />
  );
}
