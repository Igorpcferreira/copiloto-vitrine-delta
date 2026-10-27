import "server-only";
import { cache } from "react";
import { getTenant, getVehiclesPage } from "@/lib/data";
import type { TenantConfig, VehicleBadge } from "@/lib/types";
import { montarDados, type DadosLoja } from "./montar";

export type { Categoria, DadosLoja, Grupo, Marca } from "./montar";

/*
 * Leitura no servidor, uma vez por pedido (`cache`), igual à inicial do Horizon de 26/10/2026:
 * a primeira página do estoque (24), os 6 da ordem "recentes" (as Novidades) e, para Destaques
 * e Ofertas, os 6 com o selo pedido direto da API (`badge`), quando a seção está ligada. O que
 * cada seção deriva disso está em `montar.ts`, que serve também ao preview do painel.
 */
const POR_SECAO = 6;

export const carregarEstoque = cache(() => getVehiclesPage({}, 1, 24));
export const carregarRecentes = cache(() => getVehiclesPage({ sort: "recentes" }, 1, POR_SECAO));
const carregarSelo = cache((badge: VehicleBadge) => getVehiclesPage({ badge }, 1, POR_SECAO));

export async function carregarSelos(config: TenantConfig) {
  const [destaques, ofertas] = await Promise.all([
    config.sections.destaques ? carregarSelo("destaque").catch(() => null) : null,
    config.sections.ofertas ? carregarSelo("baixou-preco").catch(() => null) : null,
  ]);
  return { destaques: destaques?.items ?? [], ofertas: ofertas?.items ?? [] };
}

export const carregarLoja = cache(async (): Promise<DadosLoja> => {
  const config = await getTenant();
  const [estoque, recentes, selos] = await Promise.all([carregarEstoque(), carregarRecentes(), carregarSelos(config)]);
  return montarDados(config, estoque.items, estoque.facets, !estoque.hasMore, { recentes: recentes.items, ...selos });
});
