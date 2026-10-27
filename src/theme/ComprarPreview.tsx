"use client";

import type { ComprarProps } from "@/props";
import ComprarDelta from "./ComprarDelta";

/** Comprar no preview do painel: o catálogo de exemplo inteiro, com os filtros valendo ali mesmo. */
export default function ComprarPreview({ base, vehicles, facets, filters }: ComprarProps) {
  return (
    <ComprarDelta
      base={base}
      facets={facets}
      filtros={filters}
      carros={vehicles}
      total={vehicles.length}
      temMais={false}
      estoque={vehicles}
      completo
      local
    />
  );
}
