import type { CSSProperties } from "react";
import type { VehicleFacets } from "@/lib/data";
import { groupBrands, otherBrandsParams } from "@/lib/brand-groups";
import { brandLogoStyle } from "@/lib/brand-logo-layout";
import type { PhotoFocalPoint, TenantConfig, Vehicle, VehicleBadge } from "@/lib/types";

/*
 * O que as seções do Delta derivam do estoque, sem ler nada: serve ao site (o servidor passa o
 * que leu da API) e ao preview do painel (o navegador passa o catálogo de exemplo). Nada aqui
 * inventa dado: grupos pelos selos e pela ordem "recentes" da API, marcas e carrocerias pelas
 * facetas, foto da carroceria pelo primeiro carro dela, réguas pelos limites reais do estoque.
 */

export interface Marca {
  nome: string;
  rotulo: string;
  logo: string;
  /** Enquadramento do logo pelo `box` que a API manda no endereço dele. */
  estilo?: CSSProperties;
  /** Parâmetros do Comprar (`marca=...`). */
  params: string;
}

export interface Categoria {
  nome: string;
  params: string;
  foto?: string;
  foco?: (PhotoFocalPoint | null)[];
  /** Título do carro da foto, para o texto alternativo. */
  carro?: string;
}

export interface Grupo {
  id: "destaques" | "novidades" | "ofertas";
  titulo: string;
  carros: Vehicle[];
  params: string;
}

export interface Faixa {
  min: number;
  max: number;
}

export interface DadosLoja {
  config: TenantConfig;
  /** Primeira página do estoque (até 24). */
  itens: Vehicle[];
  /** A primeira página cobre o estoque inteiro (contagens e distribuições exatas). */
  completo: boolean;
  facets: VehicleFacets;
  grupos: Grupo[];
  marcas: Marca[];
  /** Parâmetros do Comprar para as marcas sem logo ("Outras marcas"). */
  outrasMarcas?: string;
  categorias: Categoria[];
  /** Limites das réguas: preço e ano do estoque inteiro (facetas da API). */
  precos: Faixa;
  anos: Faixa;
}

/** Listas extras da API: os da ordem "recentes" e os pedidos por selo (Horizon, 26/10/2026). */
export interface Extras {
  recentes?: Vehicle[];
  destaques?: Vehicle[];
  ofertas?: Vehicle[];
}

const POR_SECAO = 6;

function unicos(lista: Vehicle[]) {
  const vistos = new Set<string>();
  return lista.filter((v) => {
    if (vistos.has(v.id)) return false;
    vistos.add(v.id);
    return true;
  });
}

/** Os carros com o selo: primeiro os que a API mandou pelo selo, depois os da primeira página. */
function comSelo(listas: Vehicle[][], selo: VehicleBadge) {
  return unicos(listas.flat().filter((v) => v.badges.includes(selo))).slice(0, POR_SECAO);
}

export function montarDados(
  config: TenantConfig,
  itens: Vehicle[],
  facets: VehicleFacets,
  completo: boolean,
  extras: Extras = {},
): DadosLoja {
  const secoes = config.sections;
  const todos = unicos([...itens, ...(extras.recentes ?? [])]);

  const grupos: Grupo[] = (
    [
      {
        id: "destaques",
        titulo: "Destaques",
        ligado: secoes.destaques,
        params: "",
        carros: comSelo([extras.destaques ?? [], todos], "destaque"),
      },
      {
        id: "novidades",
        titulo: "Novidades",
        ligado: secoes.novidades,
        params: "ordem=recentes",
        carros: extras.recentes?.length ? extras.recentes.slice(0, POR_SECAO) : comSelo([todos], "novo"),
      },
      {
        id: "ofertas",
        titulo: "Ofertas",
        ligado: secoes.ofertas,
        params: "",
        carros: comSelo([extras.ofertas ?? [], todos], "baixou-preco"),
      },
    ] as const
  )
    .filter((g) => g.ligado && g.carros.length > 0)
    .map(({ id, titulo, params, carros }) => ({ id, titulo, params, carros: [...carros] }));

  const { withLogo, others } = secoes.marcas ? groupBrands(facets.brands, facets.brandLogos) : { withLogo: [], others: [] };
  const marcas: Marca[] = withLogo.map((m) => ({
    nome: m.brand,
    rotulo: m.label,
    logo: m.logo,
    estilo: brandLogoStyle(m.logo),
    params: new URLSearchParams({ marca: m.brand }).toString(),
  }));

  const categorias: Categoria[] = secoes.categorias
    ? facets.segments.map((nome) => {
        const carro = todos.find((v) => v.segment === nome);
        return {
          nome,
          params: new URLSearchParams({ segmento: nome }).toString(),
          foto: carro?.photos[0],
          foco: carro?.photoFocalPoints,
          carro: carro?.title,
        };
      })
    : [];

  const { precos, anos } = limites(facets, todos);

  return {
    config,
    itens,
    completo,
    facets,
    grupos,
    marcas,
    outrasMarcas: others.length ? otherBrandsParams(others).toString() : undefined,
    categorias,
    precos,
    anos,
  };
}

/**
 * Limites das réguas: preço e ano do estoque inteiro (`priceBounds` e `years` das facetas da
 * API); sem eles, os dos carros que a página tem.
 */
export function limites(facets: VehicleFacets, itens: Vehicle[]): { precos: Faixa; anos: Faixa } {
  const precosReais = itens.map((v) => v.price).filter((p) => p > 0);
  const [pMin, pMax] = facets.priceBounds;
  const precos = {
    min: pMin > 0 ? pMin : precosReais.length ? Math.min(...precosReais) : 0,
    max: pMax > 0 ? pMax : precosReais.length ? Math.max(...precosReais) : 0,
  };
  const listaAnos = (facets.years.length ? facets.years : itens.map((v) => v.year)).filter((a) => a > 1900);
  const anos = listaAnos.length ? { min: Math.min(...listaAnos), max: Math.max(...listaAnos) } : { min: 0, max: 0 };
  return { precos, anos };
}
