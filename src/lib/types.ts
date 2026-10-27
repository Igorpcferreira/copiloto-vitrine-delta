import type { SiteAppearance } from "./appearance";
export type ThemeId = "premiere" | "horizon" | "minimal" | "apex" | "halo" | "atlas" | "delta";

export type VehicleBadge = "destaque" | "novo" | "baixou-preco";

export type VehicleFocus = "car" | "motorcycle" | "truck";

export const VEHICLE_FOCUSES: readonly VehicleFocus[] = ["car", "motorcycle", "truck"];

export function toVehicleFocus(value: unknown): VehicleFocus | undefined {
  return VEHICLE_FOCUSES.find((focus) => focus === value);
}

export interface VitrineSections {
  marcas: boolean;
  categorias: boolean;
  destaques: boolean;
  novidades: boolean;
  ofertas: boolean;
  vendaFinancie: boolean;
  depoimentos: boolean;
  mapa: boolean;
  ctaBanner: boolean;
  paginaVender: boolean;
  paginaSobre: boolean;
  modalidadeVendaNaHora: boolean;
  modalidadeTroca: boolean;
  modalidadeConsignacao: boolean;
}

export const DEFAULT_SECTIONS: VitrineSections = {
  marcas: true,
  categorias: true,
  destaques: true,
  novidades: true,
  ofertas: true,
  vendaFinancie: true,
  depoimentos: true,
  mapa: true,
  ctaBanner: true,
  paginaVender: true,
  paginaSobre: true,
  modalidadeVendaNaHora: true,
  modalidadeTroca: true,
  modalidadeConsignacao: true,
};

export function toSiteSections(sections?: Partial<VitrineSections>): VitrineSections {
  const result = { ...DEFAULT_SECTIONS };
  for (const key of Object.keys(DEFAULT_SECTIONS) as (keyof VitrineSections)[]) {
    const value = sections?.[key];
    if (typeof value === "boolean") result[key] = value;
  }
  return result;
}

export interface TenantConfig {
  appearance?: SiteAppearance;
  slug: string;
  name: string;
  theme: ThemeId;
  vehicleFocus?: VehicleFocus;
  tagline?: string;
  logoUrl?: string;
  bannerUrl?: string;
  ogImageUrl?: string;
  bannerLink?: string;
  faviconUrl?: string;
  primaryColor?: string;
  fontFamily?: string;
  secondaryColor?: string;
  surfaceColor?: string;
  ctaImageUrl?: string;
  ctaTitle?: string;
  ctaButtonLabel?: string;
  customDomain?: string;
  tracking?: { googleAnalyticsId?: string; metaPixelId?: string };
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  hours: { weekdays: string; saturday?: string };
  social: { facebook?: string; instagram?: string; youtube?: string };
  about: {
    title: string;
    intro: string;
    sections: { title: string; body: string[] }[];
    stats?: { value: string; label: string }[];
    highlights?: { title: string; text: string }[];
  };
  testimonials?: { name: string; text: string; rating?: number; avatarUrl?: string; source?: string }[];
  googleRating?: number;
  googleReviewCount?: number;
  sections: VitrineSections;
  storePhotos?: string[];
  privacyUrl?: string;
  termsUrl?: string;
  mapQuery?: string;
}

export interface Vehicle {
  id: string;
  slug?: string;
  brand: string;
  brandLogo?: string;
  model: string;
  title: string;
  year: number;
  km: number;
  price: number;
  previousPrice?: number;
  transmission: string;
  fuel: string;
  color: string;
  doors?: number;
  vehicleType?: string;
  motor?: string;
  power?: string;
  warranty?: string;
  steering?: string;
  licensed?: boolean;
  segment?: string;
  badges: VehicleBadge[];
  photos: string[];
  photoFocalPoints?: (PhotoFocalPoint | null)[];
  description?: string;
  items?: string[];
}

export interface PhotoFocalPoint {
  x: number;
  y: number;
  aspectRatio?: number | null;
}

export interface VehicleFilters {
  q?: string;
  brand?: string;
  brands?: string[];
  fuel?: string;
  transmission?: string;
  color?: string;
  yearMin?: number;
  priceMin?: number;
  priceMax?: number;
  kmMin?: number;
  kmMax?: number;
  segment?: string;
  vehicleType?: string;
  sort?: "menor-preco" | "maior-preco" | "mais-novo" | "recentes";
  badge?: VehicleBadge;
}

export interface LeadInput {
  vehicleId?: string;
  name: string;
  email?: string;
  phone: string;
  message?: string;
  source: "vitrine-veiculo" | "vitrine-vender" | "vitrine-contato";
}

export interface SellRequestInput {
  mode?: string;
  vehicleType?: string;
  brand: string;
  model: string;
  year: string;
  transmission: string;
  fuel: string;
  km: string;
  color: string;
  desiredPrice?: string;
  description: string;
  name: string;
  phone: string;
  email: string;
  photoUrls?: string[];
}
