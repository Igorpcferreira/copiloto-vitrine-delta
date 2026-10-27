import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "./base/icones";
import { cx } from "./base/util";

/**
 * Linha de chegada, a assinatura dos títulos do Delta: o título puxa uma linha fina até a ação
 * da seção, que termina numa pequena lâmina. A linha se desenha uma vez ao entrar na tela, pelo
 * CSS ligado à rolagem (`view()`), sem JavaScript; parada com movimento reduzido.
 */
export default function LinhaChegada({
  id,
  titulo,
  sub,
  acao,
  extra,
  tom = "claro",
  nivel = 2,
}: {
  id: string;
  titulo: ReactNode;
  sub?: ReactNode;
  acao?: { href: string; rotulo: string };
  /** Conteúdo entre a linha e a ação (as abas da vitrine, por exemplo). */
  extra?: ReactNode;
  tom?: "claro" | "escuro";
  nivel?: 2 | 3;
}) {
  const Titulo = nivel === 2 ? "h2" : "h3";
  return (
    <div className={cx("dl-linha", tom === "escuro" && "dl-linha--escura")}>
      <div className="dl-linha__texto">
        <Titulo id={id} className="dl-linha__titulo">
          {titulo}
        </Titulo>
        {sub && <p className="dl-linha__sub">{sub}</p>}
      </div>
      <span className="dl-linha__traco" aria-hidden="true" />
      {extra}
      {acao && (
        <Link href={acao.href} className="dl-linha__acao">
          {acao.rotulo}
          <ArrowRightIcon size={16} />
        </Link>
      )}
    </div>
  );
}
