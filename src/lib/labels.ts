export const TRANSMISSION_LABELS: Record<string, string> = {
  manual: "Manual",
  automatic: "Automático",
  automated: "Automatizado",
  cvt: "CVT",
};

export const FUEL_LABELS: Record<string, string> = {
  gasoline: "Gasolina",
  ethanol: "Etanol",
  flex: "Flex",
  diesel: "Diesel",
  gnv: "GNV",
  electric: "Elétrico",
  hybrid: "Híbrido",
};

export function transmissionLabel(value: string): string {
  return TRANSMISSION_LABELS[value?.toLowerCase()] ?? value;
}

export function fuelLabel(value: string): string {
  return FUEL_LABELS[value?.toLowerCase()] ?? value;
}

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: "Carro",
  motorcycle: "Moto",
  truck: "Caminhão",
};

export function vehicleTypeLabel(value: string): string {
  return VEHICLE_TYPE_LABELS[value] ?? value;
}
