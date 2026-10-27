"use client";

import { useEffect, useSyncExternalStore } from "react";

/*
 * O WhatsApp flutuante mora na moldura, que não sabe em que carro a pessoa está. A página do
 * veículo avisa aqui o link com a mensagem do carro (a mesma do contrato: "Tenho interesse no
 * {título}") e o rótulo; ao sair da página, o botão volta à mensagem da loja.
 */
interface ZapDoCarro {
  href: string;
  rotulo: string;
}

let atual: ZapDoCarro | null = null;
const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((ouvir) => ouvir());
}

function assinar(ouvir: () => void) {
  ouvintes.add(ouvir);
  return () => {
    ouvintes.delete(ouvir);
  };
}

export function useZapDoCarro() {
  return useSyncExternalStore(assinar, () => atual, () => null);
}

/** Usado pela página do veículo: enquanto ela estiver aberta, o botão fala do carro. */
export function useDefinirZapDoCarro(href: string | undefined, rotulo: string) {
  useEffect(() => {
    if (!href) return;
    atual = { href, rotulo };
    avisar();
    return () => {
      atual = null;
      avisar();
    };
  }, [href, rotulo]);
}
