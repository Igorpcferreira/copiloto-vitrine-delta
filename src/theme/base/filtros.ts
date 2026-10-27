import { formatPrice } from "@/lib/format";
import { fuelLabel, transmissionLabel, vehicleTypeLabel } from "@/lib/labels";
import type { Vehicle, VehicleFilters } from "@/lib/types";

/*
 * Filtros do Comprar no Delta: a leitura é a mesma da rota do site
 * (`app/(site)/comprar/page.tsx`) e a escrita usa os mesmos parâmetros do contrato, então um
 * link de qualquer parte do tema abre o mesmo resultado no site.
 */

export type Busca = Record<string, string | string[] | undefined>;

function texto(v: string | string[] | undefined) {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function numero(v: string | string[] | undefined) {
  const s = texto(v);
  const n = s ? Number(s) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export const ORDENS = [
  { id: "menor-preco", rotulo: "Menor preço" },
  { id: "maior-preco", rotulo: "Maior preço" },
  { id: "mais-novo", rotulo: "Mais novos" },
  { id: "recentes", rotulo: "Mais recentes" },
] as const;

export type Ordem = (typeof ORDENS)[number]["id"];

export function lerFiltros(sp: Busca): VehicleFilters {
  const grupo = [
    ...new Set(
      (Array.isArray(sp.marcas) ? sp.marcas : [sp.marcas])
        .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
        .map((v) => v.trim()),
    ),
  ];
  const ordem = texto(sp.ordem);
  return {
    q: texto(sp.q),
    brand: grupo.length ? "Outros" : texto(sp.marca),
    brands: grupo.length ? grupo : undefined,
    fuel: texto(sp.combustivel),
    transmission: texto(sp.cambio),
    color: texto(sp.cor),
    segment: texto(sp.segmento),
    vehicleType: texto(sp.tipo),
    yearMin: numero(sp.ano),
    priceMin: numero(sp.preco_min),
    priceMax: numero(sp.preco),
    kmMin: numero(sp.km_min),
    kmMax: numero(sp.km),
    sort: ORDENS.some((o) => o.id === ordem) ? (ordem as Ordem) : "menor-preco",
  };
}

/** Parâmetros da URL do Comprar para estes filtros (a ordem padrão não entra). */
export function paramsDe(f: VehicleFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.vehicleType) sp.set("tipo", f.vehicleType);
  if (f.segment) sp.set("segmento", f.segment);
  if (f.brand) sp.set("marca", f.brand);
  for (const m of f.brands ?? []) sp.append("marcas", m);
  if (f.priceMin) sp.set("preco_min", String(f.priceMin));
  if (f.priceMax) sp.set("preco", String(f.priceMax));
  if (f.yearMin) sp.set("ano", String(f.yearMin));
  if (f.kmMin) sp.set("km_min", String(f.kmMin));
  if (f.kmMax) sp.set("km", String(f.kmMax));
  if (f.transmission) sp.set("cambio", f.transmission);
  if (f.fuel) sp.set("combustivel", f.fuel);
  if (f.color) sp.set("cor", f.color);
  if (f.sort && f.sort !== "menor-preco") sp.set("ordem", f.sort);
  return sp;
}

export function urlComprar(base: string, f: VehicleFilters) {
  const qs = paramsDe(f).toString();
  return `${base}/comprar${qs ? `?${qs}` : ""}`;
}

export type ChaveFiltro =
  | "q" | "vehicleType" | "segment" | "brand" | "priceMin" | "priceMax" | "yearMin" | "kmMin" | "kmMax" | "transmission" | "fuel" | "color";

/** Filtros ligados, com o rótulo que aparece no chip de remover. */
export function ativos(f: VehicleFilters): { chave: ChaveFiltro; rotulo: string }[] {
  const lista: { chave: ChaveFiltro; rotulo: string }[] = [];
  if (f.q) lista.push({ chave: "q", rotulo: `"${f.q}"` });
  if (f.vehicleType) lista.push({ chave: "vehicleType", rotulo: vehicleTypeLabel(f.vehicleType) });
  if (f.segment) lista.push({ chave: "segment", rotulo: f.segment });
  if (f.brand) lista.push({ chave: "brand", rotulo: f.brand === "Outros" ? "Outras marcas" : f.brand });
  if (f.priceMin) lista.push({ chave: "priceMin", rotulo: `a partir de ${formatPrice(f.priceMin)}` });
  if (f.priceMax) lista.push({ chave: "priceMax", rotulo: `até ${formatPrice(f.priceMax)}` });
  if (f.yearMin) lista.push({ chave: "yearMin", rotulo: `${f.yearMin} ou mais novo` });
  if (f.kmMin) lista.push({ chave: "kmMin", rotulo: `a partir de ${f.kmMin.toLocaleString("pt-BR")} km` });
  if (f.kmMax) lista.push({ chave: "kmMax", rotulo: `até ${f.kmMax.toLocaleString("pt-BR")} km` });
  if (f.transmission) lista.push({ chave: "transmission", rotulo: transmissionLabel(f.transmission) });
  if (f.fuel) lista.push({ chave: "fuel", rotulo: fuelLabel(f.fuel) });
  if (f.color) lista.push({ chave: "color", rotulo: f.color });
  return lista;
}

export function sem(f: VehicleFilters, chave: ChaveFiltro): VehicleFilters {
  const novo = { ...f, [chave]: undefined };
  if (chave === "brand") novo.brands = undefined;
  return novo;
}

/** Os filtros só de busca, sem a ordem: serve para saber se há algo ligado. */
export const temFiltro = (f: VehicleFilters) => ativos(f).length > 0;

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Os carros de uma lista que passam nos filtros, com a mesma regra da busca da demo
 * (`src/demo/catalog.ts`). Só dá a contagem exata quando a lista é o estoque inteiro.
 */
export function filtrarLocal(itens: Vehicle[], f: VehicleFilters): Vehicle[] {
  const q = f.q ? normalizar(f.q) : "";
  return itens.filter(
    (v) =>
      (!q || normalizar([v.title, v.brand, v.model, v.color].join(" ")).includes(q)) &&
      (f.brands?.length ? f.brands.includes(v.brand) : !f.brand || v.brand === f.brand) &&
      (!f.fuel || v.fuel === f.fuel) &&
      (!f.transmission || v.transmission === f.transmission) &&
      (!f.color || v.color === f.color) &&
      (!f.segment || v.segment === f.segment) &&
      (!f.vehicleType || (v.vehicleType ?? "car") === f.vehicleType) &&
      (f.yearMin === undefined || v.year >= f.yearMin) &&
      (f.priceMin === undefined || v.price >= f.priceMin) &&
      (f.priceMax === undefined || v.price <= f.priceMax) &&
      (f.kmMin === undefined || v.km >= f.kmMin) &&
      (f.kmMax === undefined || v.km <= f.kmMax),
  );
}

/**
 * A ordem do Comprar aplicada a uma lista no navegador (preview do painel). "recentes" usa os
 * marcados como novos primeiro, como a demo, porque a lista não traz a data de entrada.
 */
export function ordenarLocal(itens: Vehicle[], ordem: VehicleFilters["sort"]): Vehicle[] {
  const novo = (v: Vehicle) => (v.badges.includes("novo") ? 0 : 1);
  return itens.toSorted((a, b) =>
    ordem === "recentes"
      ? novo(a) - novo(b)
      : ordem === "mais-novo"
        ? b.year - a.year
        : ordem === "maior-preco"
          ? b.price - a.price
          : a.price - b.price,
  );
}
