import Link from "next/link";
import SiteChrome from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <SiteChrome>
      <div className="dl-wrap dl-aviso">
        <p className="dl-aviso__rotulo">Erro 404</p>
        <h1 className="dl-aviso__titulo">Página não encontrada</h1>
        <p className="dl-aviso__texto">O endereço pode ter mudado ou não existe mais. Veja nosso estoque atualizado.</p>
        <div className="dl-aviso__acoes">
          <Link href="/comprar" className="dl-btn dl-btn--acao">
            Ver estoque
          </Link>
          <Link href="/" className="dl-btn dl-btn--linha">
            Ir para o início
          </Link>
        </div>
      </div>
    </SiteChrome>
  );
}
