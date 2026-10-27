import type { ShellProps } from "@/props";
import { medirFotosDaLoja } from "./fotos-loja";
import Moldura from "./Moldura";

/**
 * Shell do site (contrato de `src/props.ts`). Lê no servidor só as medidas das fotos da loja,
 * para o contato e o Sobre nunca as cortarem; o header não recebe o estoque.
 */
export default async function Shell({ config, base, children, noun }: ShellProps) {
  const fotosLoja = await medirFotosDaLoja(config.storePhotos);
  return (
    <Moldura config={config} base={base} noun={noun} fotosLoja={fotosLoja}>
      {children}
    </Moldura>
  );
}
