import type { Vehicle } from "@/lib/types";
import Cartao from "./Cartao";

/** Card de carro do contrato (usado pela página de anúncio encerrado): o card do Delta. */
export default function VehicleCard({ vehicle, base }: { vehicle: Vehicle; base: string }) {
  return <Cartao carro={vehicle} base={base} />;
}
