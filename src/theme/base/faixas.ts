import type { Vehicle, VehicleFilters } from "@/lib/types";

/*
 * Faixas do Comprar do Delta: na ordem por preço, os resultados vêm em faixas de preço; na
 * ordem "mais novos", em faixas de ano; em "mais recentes", sem faixas. Os cortes saem dos
 * limites reais do estoque inteiro (`priceBounds` e `years` das facetas), arredondados.
 */

export interface Faixa {
  id: string;
  rotulo: string;
  /** Diz se o carro está nesta faixa. */
  tem: (v: Vehicle) => boolean;
  /** Filtro de preço do contrato que mostra só esta faixa ("Só esta faixa"); só nas de preço. */
  filtro?: Pick<VehicleFilters, "priceMin" | "priceMax">;
}

const PASSOS = [5_000, 10_000, 20_000, 25_000, 50_000, 100_000, 200_000, 250_000, 500_000];

function mil(valor: number) {
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  return `R$ ${Math.round(valor / 1000).toLocaleString("pt-BR")} mil`;
}

/** Até quatro faixas de preço com cortes redondos entre o menor e o maior preço do estoque. */
export function faixasDePreco(min: number, max: number, decrescente: boolean): Faixa[] {
  if (!(max > min) || max <= 0) return [];
  const passo = PASSOS.find((p) => (max - min) / p <= 4) ?? PASSOS[PASSOS.length - 1];
  const cortes: number[] = [];
  for (let c = Math.ceil((min + 1) / passo) * passo; c < max; c += passo) cortes.push(c);
  if (!cortes.length) return [];
  const faixas: Faixa[] = [];
  faixas.push({
    id: `ate-${cortes[0]}`,
    rotulo: `Até ${mil(cortes[0])}`,
    tem: (v) => v.price > 0 && v.price <= cortes[0],
    filtro: { priceMax: cortes[0] },
  });
  for (let i = 1; i < cortes.length; i++) {
    const de = cortes[i - 1];
    const ate = cortes[i];
    faixas.push({ id: `${de}-${ate}`, rotulo: `${mil(de)} a ${mil(ate)}`, tem: (v) => v.price > de && v.price <= ate, filtro: { priceMin: de, priceMax: ate } });
  }
  const ultimo = cortes[cortes.length - 1];
  faixas.push({ id: `acima-${ultimo}`, rotulo: `Acima de ${mil(ultimo)}`, tem: (v) => v.price > ultimo, filtro: { priceMin: ultimo } });
  // "Sob consulta" (preço 0) fica numa faixa própria, no fim.
  faixas.push({ id: "consulta", rotulo: "Sob consulta", tem: (v) => !(v.price > 0) });
  return decrescente ? [...faixas.slice(0, -1).reverse(), faixas[faixas.length - 1]] : faixas;
}

/** Faixas de três anos, do mais novo para o mais antigo. */
export function faixasDeAno(anos: number[]): Faixa[] {
  const validos = anos.filter((a) => a > 1900);
  if (validos.length < 2) return [];
  const max = Math.max(...validos);
  const min = Math.min(...validos);
  const faixas: Faixa[] = [];
  for (let topo = max; topo >= min; topo -= 3) {
    const base = topo - 2;
    if (base <= min) {
      faixas.push({ id: `ate-${topo}`, rotulo: topo === min ? String(min) : `Até ${topo}`, tem: (v) => v.year > 0 && v.year <= topo });
      break;
    }
    faixas.push({ id: `${base}-${topo}`, rotulo: `${base} a ${topo}`, tem: (v) => v.year >= base && v.year <= topo });
  }
  faixas.push({ id: "sem-ano", rotulo: "Ano não informado", tem: (v) => !(v.year > 0) });
  return faixas;
}

export function faixasDaOrdem(ordem: VehicleFilters["sort"], precos: { min: number; max: number }, anos: number[]): Faixa[] {
  if (ordem === "recentes") return [];
  if (ordem === "mais-novo") return faixasDeAno(anos);
  return faixasDePreco(precos.min, precos.max, ordem === "maior-preco");
}

/** Os carros em faixas, na ordem da lista (que já vem ordenada), só com as faixas que têm carro. */
export function agrupar(carros: Vehicle[], faixas: Faixa[]): { faixa: Faixa | null; carros: Vehicle[] }[] {
  if (!faixas.length) return [{ faixa: null, carros }];
  const grupos: { faixa: Faixa | null; carros: Vehicle[] }[] = [];
  for (const carro of carros) {
    const faixa = faixas.find((f) => f.tem(carro)) ?? null;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.faixa?.id === faixa?.id) ultimo.carros.push(carro);
    else grupos.push({ faixa, carros: [carro] });
  }
  return grupos;
}
