import Image from "next/image";
import Link from "next/link";
import { isRenderableImageSrc } from "@/lib/image-src";
import type { TenantConfig } from "@/lib/types";
import { ArrowRightIcon } from "./base/icones";
import { botaoBanner } from "./base/util";

const IMAGEM_PADRAO = "/defaults/cta-cars.webp";

/**
 * Banner final do Delta, "fita de chegada": a imagem do CTA inteira na largura, sem edição, e
 * uma fita em lâmina atravessando o céu da imagem, com o título à esquerda e "Ver o estoque
 * completo" à direita, numa linha. Ao chegar à tela, a fita se desenrola da esquerda (CSS
 * ligado à rolagem, fora da linha principal; parada com movimento reduzido). No celular o título
 * fica em cima e o botão embaixo, com outro estilo do "Fale com a gente" do rodapé.
 */
export default function Fita({ config, base }: { config: TenantConfig; base: string }) {
  const imagem = isRenderableImageSrc(config.ctaImageUrl) ? config.ctaImageUrl : IMAGEM_PADRAO;
  const titulo = config.ctaTitle?.trim() || "Sua próxima reta começa aqui.";
  return (
    <section className="dl dl-fita" aria-labelledby="dl-fita-titulo" data-dl-setor="Chegada">
      <div className="dl-fita__imagem">
        <Image src={imagem} alt="" fill sizes="100vw" className="dl-fita__foto" />
      </div>
      <div className="dl-fita__faixa">
        <div className="dl-fita__conteudo">
          <h2 id="dl-fita-titulo" className="dl-fita__titulo">
            {titulo}
          </h2>
          <Link href={`${base}/comprar`} className="dl-btn dl-btn--acao dl-fita__botao">
            {botaoBanner(config)}
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
