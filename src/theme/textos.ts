import type { StockNoun } from "@/lib/stock-noun";

/*
 * Textos que dependem do tipo de estoque da loja (`noun` do contrato do Horizon), usados no
 * servidor e no navegador.
 */

/** "um carro", "uma moto", "um caminhão", "um veículo". */
export const umNoun = (noun: StockNoun) => `${noun.feminine ? "uma" : "um"} ${noun.singular}`;

/** "1 carro", "4 motos". */
export const contagemNoun = (n: number, noun: StockNoun) => `${n} ${n === 1 ? noun.singular : noun.plural}`;
