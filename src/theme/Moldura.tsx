import { Suspense } from "react";
import type { ShellProps } from "@/props";
import { zap } from "./base/util";
import Cabecalho from "./Cabecalho";
import { ProvedorTema } from "./contexto";
import Fita from "./Fita";
import type { FotoLoja } from "./fotos";
import MotionProvider from "./MotionProvider";
import Rodape from "./Rodape";
import SmoothScroll from "./SmoothScroll";
import Trilho from "./Trilho";
import Zap from "./Zap";

/**
 * Moldura do Delta: pular para o conteúdo, header em placas, conteúdo, fita de chegada (banner
 * final), rodapé, WhatsApp em lâmina e a barra de rolagem própria (trilho com setores). O
 * `Shell` do site passa as fotos da loja medidas no servidor; o preview do painel usa a
 * moldura sem elas. Não importa nada do servidor. Fita e rodapé,
 * longe da abertura, têm limites `Suspense` próprios, para hidratar depois do resto.
 */
export default function Moldura({
  config,
  base,
  children,
  noun,
  fotosLoja,
}: ShellProps & { fotosLoja?: FotoLoja[] }) {
  const zapHref = zap(config);
  return (
    <ProvedorTema noun={noun} fotosLoja={fotosLoja}>
      <MotionProvider>
        <div className="dl dl-site" id="dl-topo">
          <SmoothScroll />
          <Trilho />
          <a className="dl-pular" href="#dl-conteudo">
            Pular para o conteúdo
          </a>
          <Cabecalho config={config} base={base} />
          <main id="dl-conteudo" className="dl-main" tabIndex={-1}>
            {children}
          </main>
          {config.sections.ctaBanner && (
            <Suspense>
              <Fita config={config} base={base} />
            </Suspense>
          )}
          <Suspense>
            <Rodape config={config} base={base} noun={noun} />
          </Suspense>
          {zapHref && <Zap href={zapHref} />}
        </div>
      </MotionProvider>
    </ProvedorTema>
  );
}
