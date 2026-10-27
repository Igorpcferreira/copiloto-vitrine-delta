"use client";

import Image from "next/image";
import { useState } from "react";
import { isRenderableImageSrc } from "@/lib/image-src";

/**
 * Logo da loja, ou o nome dela quando não há logo (ou ele falha). Sem carregamento
 * preguiçoso: aparece no header, na primeira tela. A cor e o tamanho vêm do CSS de quem usa.
 */
export default function LogoLoja({
  nome,
  logoUrl,
  className,
  altura = 34,
}: {
  nome: string;
  logoUrl?: string;
  className?: string;
  /** Altura de referência para o `sizes`, em px. */
  altura?: number;
}) {
  const [falhou, setFalhou] = useState(false);
  if (!isRenderableImageSrc(logoUrl) || falhou) {
    return <span className={className} data-logo-texto="">{nome}</span>;
  }
  return (
    <span className={className} data-logo-imagem="">
      <Image
        src={logoUrl}
        alt={nome}
        width={Math.round(altura * 3.2)}
        height={altura}
        sizes={`${Math.round(altura * 3.2 * 2)}px`}
        onError={() => setFalhou(true)}
        style={{ width: "auto", height: "100%" }}
      />
    </span>
  );
}
