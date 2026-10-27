export interface StockNoun {
  type?: string;
  singular: string;
  plural: string;
  feminine: boolean;
}

const NOUNS: Record<string, StockNoun> = {
  car: { type: "car", singular: "carro", plural: "carros", feminine: false },
  motorcycle: { type: "motorcycle", singular: "moto", plural: "motos", feminine: true },
  truck: { type: "truck", singular: "caminhão", plural: "caminhões", feminine: false },
};

const GENERIC_NOUN: StockNoun = { singular: "veículo", plural: "veículos", feminine: false };

export const DEFAULT_STOCK_NOUN = NOUNS.car;

export function focusNoun(focus?: string): StockNoun | undefined {
  return focus ? NOUNS[focus] : undefined;
}

export function stockNoun(vehicleTypes: string[]): StockNoun {
  if (vehicleTypes.length === 0) return DEFAULT_STOCK_NOUN;
  if (vehicleTypes.length === 1) return NOUNS[vehicleTypes[0]] ?? GENERIC_NOUN;
  return GENERIC_NOUN;
}

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1);
}

export function possessive(noun: StockNoun): string {
  return noun.feminine ? "sua" : "seu";
}

export function myPossessive(noun: StockNoun): string {
  return noun.feminine ? "minha" : "meu";
}

export function article(noun: StockNoun): string {
  return noun.feminine ? "a" : "o";
}

export function indefiniteArticle(noun: StockNoun): string {
  return noun.feminine ? "uma" : "um";
}

export function newAdjective(noun: StockNoun): string {
  return noun.feminine ? "nova" : "novo";
}

export function countLabel(noun: StockNoun, count: number): string {
  const ending = `${noun.feminine ? "a" : "o"}${count === 1 ? "" : "s"}`;
  return `${count} ${count === 1 ? noun.singular : noun.plural} encontrad${ending}`;
}

export function noneFoundLabel(noun: StockNoun): string {
  return `${noun.feminine ? "Nenhuma" : "Nenhum"} ${noun.singular} encontrad${noun.feminine ? "a" : "o"}`;
}

export function findNewLabel(noun: StockNoun): string {
  return `Pronto para encontrar ${article(noun)} ${possessive(noun)} ${newAdjective(noun)} ${noun.singular}?`;
}
