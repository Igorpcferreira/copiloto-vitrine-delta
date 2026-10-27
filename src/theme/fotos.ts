/*
 * Fotos da loja com a medida de cada uma. No site, o Shell mede as fotos locais no servidor
 * (`fotos-loja.ts`); no preview do painel e nas fotos de endereço externo a medida ainda não é
 * conhecida, e o contato acerta o quadro quando a foto carrega.
 */

export interface FotoLoja {
  src: string;
  largura: number;
  altura: number;
  /** Larga o bastante para um quadro grande (1000 px ou mais). */
  grande: boolean;
  /** A medida veio do arquivo; sem ela, largura e altura são a proporção 3:2 provisória. */
  medida: boolean;
}

/** As fotos na ordem do painel, ainda sem medida (grandes até prova em contrário). */
export function fotosSemMedida(fotos?: string[]): FotoLoja[] {
  return (fotos ?? []).filter(Boolean).map((src) => ({ src, largura: 1600, altura: 1066, grande: true, medida: false }));
}
