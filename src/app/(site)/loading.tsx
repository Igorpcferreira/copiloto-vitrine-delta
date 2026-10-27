import { Skeleton, VehicleGridSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="dl-wrap dl-esperando" role="status" aria-label="Carregando página">
      <Skeleton className="dl-espera-titulo" />
      <VehicleGridSkeleton />
    </div>
  );
}
