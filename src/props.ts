import type { ComponentType, ReactNode } from "react";
import type { TenantConfig, Vehicle, VehicleFilters } from "@/lib/types";
import type { VehicleFacets } from "@/lib/data";
import type { StockNoun } from "@/lib/stock-noun";

export interface ShellProps {
  config: TenantConfig;
  base: string;
  children: ReactNode;
  /** Closing banner of a prototype option, only on /prototipos; the site renders Finale. */
  closing?: { Banner: ComponentType<{ config: TenantConfig; base: string }>; carriesLead: boolean };
  noun?: StockNoun;
}

export interface HomeProps {
  config: TenantConfig;
  base: string;
  destaques?: Vehicle[];
  novidades?: Vehicle[];
  ofertas?: Vehicle[];
  facets?: VehicleFacets;
  /** First page of the stock, used for exact live counts when it covers the whole stock. */
  inventory?: Vehicle[];
  stock?: ReactNode;
  noun?: StockNoun;
}

export interface ComprarProps {
  config: TenantConfig;
  base: string;
  vehicles: Vehicle[];
  facets: VehicleFacets;
  filters: VehicleFilters;
  total?: number;
  hasMore?: boolean;
  noun?: StockNoun;
}

export interface VenderProps {
  config: TenantConfig;
  base: string;
  noun?: StockNoun;
}

export interface SobreNosProps {
  config: TenantConfig;
  base: string;
}

export interface VeiculoProps {
  config: TenantConfig;
  base: string;
  vehicle: Vehicle;
  others: Vehicle[];
}
