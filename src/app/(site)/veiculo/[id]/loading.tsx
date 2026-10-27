import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="dl-wrap dl-esperando dl-esperando--carro" role="status" aria-label="Carregando o carro">
      <Skeleton className="dl-espera-foto-grande" />
      <div className="dl-esperando__lado">
        <Skeleton className="dl-espera-titulo" />
        <Skeleton className="dl-espera-linha" />
        <Skeleton className="dl-espera-linha dl-espera-linha--curta" />
      </div>
    </div>
  );
}
