/* Esperas do tema Delta: blocos no lugar do conteúdo, sem texto. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`dl-espera ${className}`} />;
}
export function VehicleCardSkeleton() {
  return (
    <div className="dl-espera-card">
      <Skeleton className="dl-espera-foto" />
      <Skeleton className="dl-espera-linha" />
      <Skeleton className="dl-espera-linha dl-espera-linha--curta" />
    </div>
  );
}
export function VehicleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="dl-espera-grade">
      {Array.from({ length: count }, (_, i) => (
        <VehicleCardSkeleton key={i} />
      ))}
    </div>
  );
}
export function HomeStockSkeleton() {
  return (
    <div className="dl-wrap dl-esperando" role="status" aria-label="Carregando veículos">
      <Skeleton className="dl-espera-painel" />
      <VehicleGridSkeleton count={3} />
    </div>
  );
}
