import Link from "next/link";
import { getStockNoun, getVehiclesPage } from "@/lib/data";
import { capitalize } from "@/lib/stock-noun";
import VehicleCard from "@/theme/VehicleCard";

/* Anúncio que saiu do estoque: o aviso e, quando há, outros anúncios no card do tema. */
export default async function VehicleNotFound() {
  const noun = await getStockNoun();
  const others = await getVehiclesPage({ vehicleType: noun.type }, 1, 3)
    .then((r) => r.items)
    .catch(() => []);
  return (
    <div className="dl-wrap dl-aviso dl-aviso--carro">
      <p className="dl-aviso__rotulo">Anúncio encerrado</p>
      <h1 className="dl-aviso__titulo">
        {noun.feminine ? "Esta" : "Este"} {noun.singular} não está mais disponível
      </h1>
      <p className="dl-aviso__texto">
        Pode ter sido vendido ou saído do estoque.{others.length > 0 && " Confira outras opções abaixo."}
      </p>
      <Link className="dl-btn dl-btn--acao" href="/comprar">
        Ver todo o estoque
      </Link>
      {others.length > 0 && (
        <section className="dl-aviso__outros" aria-labelledby="dl-outros-titulo">
          <h2 id="dl-outros-titulo" className="dl-aviso__subtitulo">
            {capitalize(noun.plural)} disponíveis
          </h2>
          <div className="dl-grade">
            {others.map((v) => (
              <VehicleCard key={v.id} vehicle={v} base="" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
