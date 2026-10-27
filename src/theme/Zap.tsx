"use client";

import { WhatsAppIcon } from "./base/icones";
import { externo } from "./base/util";
import { useZapDoCarro } from "./base/zap-contexto";

/**
 * WhatsApp flutuante do Delta: uma lâmina verde no canto de baixo à direita, em todas as
 * páginas. Com o mouse ou o foco do teclado ela estica para a esquerda e mostra o rótulo. Na
 * página do carro a mensagem já cita o carro (a do contrato) e o rótulo vira "Perguntar sobre
 * este carro"; no celular, lá, ela fica lado a lado com a barra "Tenho interesse" (CSS).
 */
export default function Zap({ href }: { href: string }) {
  const doCarro = useZapDoCarro();
  const rotulo = doCarro?.rotulo ?? "Conversar no WhatsApp";
  return (
    <a className="dl dl-zap" href={doCarro?.href ?? href} {...externo} aria-label={rotulo} data-carro={doCarro ? "" : undefined}>
      <span className="dl-zap__rotulo" aria-hidden="true">
        {rotulo}
      </span>
      <span className="dl-zap__lamina">
        <WhatsAppIcon size={24} />
      </span>
    </a>
  );
}
