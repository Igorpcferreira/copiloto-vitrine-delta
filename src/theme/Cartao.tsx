import Image from "next/image";
import Link from "next/link";
import { isRenderableImageSrc } from "@/lib/image-src";
import type { Vehicle } from "@/lib/types";
import { carroHref, ficha, foto, posicao, preco, precoAnterior, selo, versao } from "./base/util";

const ASPECTO = 4 / 3;

/**
 * Card de carro do Delta, sem moldura: a foto (pelo ponto focal, canto de cima à esquerda cortado)
 * termina numa diagonal que sobe para a direita, e a placa de informação começa nela, com uma
 * faixa na cor da loja na borda inclinada e o canto de baixo à direita cortado; uma sombra leve
 * separa o card do fundo. A etiqueta de preço em lâmina fica na junção, à esquerda (a faixa
 * diagonal de preço da referência Autogrif do usuário), com o preço anterior riscado quando
 * baixou; selo curto, marca, modelo e ficha curta (ano, km, câmbio, sem dado vazio). O card
 * inteiro leva à página do carro. Sem efeito de foto no hover (já usado no Halo e no Atlas).
 */
export default function Cartao({
  carro,
  base,
  prioridade,
  titulo: Titulo = "h3",
}: {
  carro: Vehicle;
  base: string;
  /** Primeira foto acima da dobra (o maior pedaço da tela no Comprar). */
  prioridade?: boolean;
  titulo?: "h2" | "h3" | "p";
}) {
  const capa = foto(carro, 0);
  const anterior = precoAnterior(carro);
  return (
    <article className="dl-cartao">
      <Link href={carroHref(base, carro)} className="dl-cartao__link">
        <span className="dl-cartao__placa">
          <span className="dl-cartao__topo">
            <span className="dl-cartao__foto">
              {isRenderableImageSrc(capa) && (
                <Image
                  src={capa}
                  alt={carro.title}
                  fill
                  sizes="(min-width: 1200px) 300px, (min-width: 1100px) 380px, (min-width: 640px) 45vw, 100vw"
                  preload={prioridade}
                  fetchPriority={prioridade ? "high" : undefined}
                  style={{
                    objectPosition: posicao(carro, 0, ASPECTO) ?? "50% 55%",
                  }}
                />
              )}
              {selo(carro) && <span className="dl-cartao__selo">{selo(carro)}</span>}
            </span>
            <span className="dl-preco">
              {anterior && (
                <s className="dl-preco__antes">
                  <span className="dl-sr">De </span>
                  {anterior}
                </s>
              )}
              <span className="dl-preco__valor">
                {anterior && <span className="dl-sr">por </span>}
                {preco(carro)}
              </span>
            </span>
          </span>
          <span className="dl-cartao__corpo">
            <span className="dl-cartao__marca">{carro.brand}</span>
            <Titulo className="dl-cartao__titulo">{versao(carro) || carro.title}</Titulo>
            {ficha(carro).length > 0 && <span className="dl-cartao__ficha">{ficha(carro).join(" · ")}</span>}
          </span>
        </span>
      </Link>
    </article>
  );
}
