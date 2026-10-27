"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_STOCK_NOUN, type StockNoun } from "@/lib/stock-noun";
import { fotosSemMedida, type FotoLoja } from "./fotos";

/*
 * O que a moldura do tema passa para todas as páginas sem atravessar cada componente: o nome
 * do estoque (`noun` do contrato do Horizon: carro, moto, caminhão ou veículo, conforme os tipos
 * que a loja tem) e as fotos da loja já medidas no servidor. Fora do site (preview do painel),
 * vale carro e as fotos seguem sem medida.
 */
interface Tema {
  noun: StockNoun;
  fotosLoja?: FotoLoja[];
}

const Contexto = createContext<Tema>({ noun: DEFAULT_STOCK_NOUN });

export function ProvedorTema({ noun, fotosLoja, children }: { noun?: StockNoun; fotosLoja?: FotoLoja[]; children: ReactNode }) {
  return <Contexto.Provider value={{ noun: noun ?? DEFAULT_STOCK_NOUN, fotosLoja }}>{children}</Contexto.Provider>;
}

export const useNoun = () => useContext(Contexto).noun;

/** As fotos da loja medidas pelo Shell; sem elas, as do painel, ainda sem medida. */
export function useFotosLoja(fotos?: string[]): FotoLoja[] {
  return useContext(Contexto).fotosLoja ?? fotosSemMedida(fotos);
}
