import { notFound } from "next/navigation";
import Link from "next/link";
import { getTenant, getVehiclesPage } from "@/lib/data";
import { montarDados } from "@/theme/base/montar";
import { ArrowRightIcon } from "@/theme/base/icones";
import Cabecalho from "@/theme/Cabecalho";
import PainelBusca from "@/theme/PainelBusca";
import MotionProvider from "@/theme/MotionProvider";
import styles from "@/theme/propostas/botoes-propostas.module.css";

export const metadata = { title: "Prévia de botões", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ opcao?: string }> }) {
  if (process.env.VITRINE_DEMO !== "true") notFound();
  const query = await searchParams;
  const opcao = ["atual", "a", "b", "c", "d", "e", "f"].includes(query.opcao ?? "") ? query.opcao : "e";
  const [config, stock] = await Promise.all([getTenant(), getVehiclesPage({}, 1, 24)]);
  const dados = montarDados(config, stock.items, stock.facets, !stock.hasMore);
  return (
    <MotionProvider>
      <div className={`dl dl-site ${styles.exemplo}`} data-formato={opcao}>
        <Cabecalho config={config} base="" />
        <main className={styles.conteudo}>
          <div className={styles.abertura}>
            <p>Header, busca e filtros</p>
            <h1>O mesmo Delta.<br />Um ajuste nos cantos.</h1>
            <span>Abra a busca no topo e experimente os campos abaixo.</span>
          </div>
          <PainelBusca base="" marcas={dados.marcas} outrasMarcas={dados.outrasMarcas} categorias={dados.categorias} precos={dados.precos} anos={dados.anos} />
          <div className={styles.amostra}>
            <div><p>Ação principal</p><Link className="dl-btn dl-btn--acao" href="/comprar">Ver estoque <ArrowRightIcon size={18} /></Link></div>
            <div><p>Ação de apoio</p><Link className="dl-btn dl-btn--linha" href="/vender">Vender meu carro <ArrowRightIcon size={18} /></Link></div>
            <div><p>Filtro selecionado</p><Link className="dl-chip dl-chip--ativo" href="/comprar?segmento=SUV">SUV <ArrowRightIcon size={16} /></Link></div>
          </div>
        </main>
      </div>
    </MotionProvider>
  );
}
