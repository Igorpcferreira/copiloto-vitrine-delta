import type { StockNoun } from "@/lib/stock-noun";
import type { TenantConfig } from "@/lib/types";
import { carregarEstoque, carregarRecentes, carregarSelos } from "./base/dados";
import { montarDados } from "./base/montar";
import EstoqueInicio from "./EstoqueInicio";

/**
 * Estoque da inicial no site, lido no servidor como no Horizon de 26/10/2026: a primeira página
 * (24), os 6 da ordem "recentes" (as Novidades) e os 6 de cada selo (Destaques e Ofertas) pedidos
 * à API quando a seção está ligada. `noun` vem do contrato; o tema o lê pelo contexto da moldura.
 */
export default async function HomeStock({ config, base }: { config: TenantConfig; base: string; noun?: StockNoun }) {
  const [estoque, recentes, selos] = await Promise.all([carregarEstoque(), carregarRecentes(), carregarSelos(config)]);
  return (
    <EstoqueInicio
      config={config}
      base={base}
      dados={montarDados(config, estoque.items, estoque.facets, !estoque.hasMore, { recentes: recentes.items, ...selos })}
    />
  );
}
