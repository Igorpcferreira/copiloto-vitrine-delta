import "server-only";
import path from "node:path";
import { cache } from "react";
import sharp from "sharp";

import type { FotoLoja } from "./fotos";

/*
 * Fotos da loja com a medida de cada uma, lidas no servidor. O tema usa as fotos grandes
 * (abertura do Sobre, quadro grande do contato) e deixa as pequenas só em quadros pequenos: na
 * demo, a `loja-3` tem 602 x 401 e borraria em tamanho grande. As fotos da loja são locais (o
 * prebuild as grava em `public/<loja>`); a que não dá para medir (endereço externo ou arquivo
 * ausente) segue sem medida, na ordem do painel, e o contato acerta o quadro quando ela carrega.
 */

export type { FotoLoja };

const PUBLICO = path.join(process.cwd(), "public");

const medir = cache(async (src: string): Promise<FotoLoja> => {
  if (/^\/(?!\/)/.test(src)) {
    const arquivo = path.normalize(path.join(PUBLICO, decodeURIComponent(src.split(/[?#]/)[0])));
    if (arquivo.startsWith(PUBLICO + path.sep)) {
      try {
        const { width, height } = await sharp(arquivo).metadata();
        if (width && height) return { src, largura: width, altura: height, grande: width >= 1000, medida: true };
      } catch {
        // Sem a medida: segue como grande.
      }
    }
  }
  return { src, largura: 1600, altura: 1066, grande: true, medida: false };
});

/** As fotos da loja medidas, as grandes primeiro e, entre iguais, na ordem do painel. */
export const fotosDaLoja = cache(async (chave: string): Promise<FotoLoja[]> => {
  const fotos = chave ? chave.split("\n") : [];
  const medidas = await Promise.all(fotos.map((src) => medir(src)));
  return medidas
    .map((foto, i) => ({ foto, i }))
    .sort((a, b) => Number(b.foto.grande) - Number(a.foto.grande) || b.foto.largura - a.foto.largura || a.i - b.i)
    .map(({ foto }) => foto);
});

/** Atalho: as fotos da loja de uma configuração (a chave em texto deixa o `cache` valer). */
export const medirFotosDaLoja = (fotos?: string[]) => fotosDaLoja((fotos ?? []).filter(Boolean).join("\n"));
