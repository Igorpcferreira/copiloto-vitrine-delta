import type { Metadata } from "next";
import { getStockNoun, getTenant, getVehiclesPage } from "@/lib/data";
import { pageMetadata } from "@/lib/page-metadata";
import Comprar from "@/theme/Comprar";
import type { VehicleFilters } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const [config, noun] = await Promise.all([getTenant(), getStockNoun()]);
  return pageMetadata(config, {
    title: "Nosso estoque",
    description: `Confira o estoque completo de ${noun.plural} da ${config.name}. Encontre ${noun.feminine ? "a" : "o"} ${noun.singular} ideal para você.`,
    path: "/comprar",
  });
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function num(v: string | string[] | undefined): number | undefined {
  const s = str(v);
  const n = s ? Number(s) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

const SORTS = ["menor-preco", "maior-preco", "mais-novo", "recentes"] as const;

function sort(v: string | string[] | undefined): VehicleFilters["sort"] {
  const s = str(v);
  return s && (SORTS as readonly string[]).includes(s) ? (s as VehicleFilters["sort"]) : "menor-preco";
}

export default async function ComprarPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [config, noun] = await Promise.all([getTenant(), getStockNoun()]);

  const groupedBrands = [...new Set(
    (Array.isArray(sp.marcas) ? sp.marcas : [sp.marcas])
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      .map((value) => value.trim()),
  )];
  const filters: VehicleFilters = {
    q: str(sp.q),
    brand: groupedBrands.length ? "Outros" : str(sp.marca),
    brands: groupedBrands.length ? groupedBrands : undefined,
    fuel: str(sp.combustivel),
    transmission: str(sp.cambio),
    color: str(sp.cor),
    segment: str(sp.segmento),
    vehicleType: str(sp.tipo),
    yearMin: num(sp.ano),
    priceMin: num(sp.preco_min),
    priceMax: num(sp.preco),
    kmMin: num(sp.km_min),
    kmMax: num(sp.km),
    sort: sort(sp.ordem),
  };

  const result = await getVehiclesPage(filters, 1);
  return (
    <Comprar
      config={config}
      base=""
      vehicles={result.items}
      facets={result.facets}
      filters={filters}
      total={result.total}
      hasMore={result.hasMore}
      noun={noun}
    />
  );
}
