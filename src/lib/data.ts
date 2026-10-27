import "server-only";
import { demoConfig, demoPage, demoVehicles } from "@/demo/catalog";
const IS_DEMO = process.env.VITRINE_DEMO === "true";
import { normalizeAppearance } from "./appearance";
import { toSiteSections, toVehicleFocus, type TenantConfig, type Vehicle, type VehicleFilters } from "./types";
import { transmissionLabel, fuelLabel } from "./labels";
import { brandSlug, brandDisplayName } from "./brands";
import { DEFAULT_STOCK_NOUN, focusNoun, stockNoun, type StockNoun } from "./stock-noun";
import siteConfigRaw from "../../site-config.json";

const API_URL = process.env.CLIENT_API_URL;
const API_TOKEN = process.env.CLIENT_API_TOKEN;
const CLIENT_SLUG = process.env.CLIENT_SLUG;
const HAS_TENANT = Boolean(API_URL && CLIENT_SLUG && API_TOKEN);
const REVALIDATE_SECONDS = 300;
const API_TIMEOUT_MS = 10000;
export const DEFAULT_PAGE_SIZE = 24;

const IS_BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";

async function apiGet<T>(pathname: string): Promise<T | null> {
  if (!HAS_TENANT) {
    throw new Error("[vitrine] Modo integrado sem CLIENT_API_URL, CLIENT_API_TOKEN e CLIENT_SLUG. Configure a loja ou use a demo local.");
  }
  try {
    const res = await fetch(`${API_URL}${pathname}`, {
      headers: { "x-public-key": API_TOKEN ?? "" },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      console.error(`[vitrine] API respondeu ${res.status} em ${pathname}`);
      if (IS_BUILD_PHASE) return null;
      throw new Error(`[vitrine] API ${res.status} em ${pathname}`);
    }
    const json = await res.json();
    return (json && typeof json === "object" && "data" in json ? json.data : json) as T;
  } catch (err) {
    console.error(`[vitrine] falha em ${pathname}:`, err instanceof Error ? err.message : err);
    if (IS_BUILD_PHASE) return null;
    throw err;
  }
}

function toNumber(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeApiVehicle(v: Record<string, unknown>): Vehicle {
  return {
    id: String(v.id),
    slug: optionalText(v.slug),
    brand: optionalText(v.brand) ?? "",
    brandLogo: optionalText(v.brandLogo),
    model: optionalText(v.model) ?? "",
    title: optionalText(v.title) || [v.brand, v.model, v.year].filter(Boolean).join(" "),
    year: toNumber(v.year) ?? 0,
    km: toNumber(v.km) ?? 0,
    price: toNumber(v.price) ?? 0,
    previousPrice: toNumber(v.previousPrice),
    transmission: v.transmission ? transmissionLabel(v.transmission as string) : "",
    fuel: v.fuel ? fuelLabel(v.fuel as string) : "",
    color: optionalText(v.color) ?? "",
    doors: toNumber(v.doors),
    vehicleType: optionalText(v.vehicleType),
    motor: optionalText(v.motor),
    power: optionalText(v.power),
    warranty: optionalText(v.warranty),
    steering: optionalText(v.steering),
    licensed: typeof v.licensed === "boolean" ? v.licensed : undefined,
    segment: optionalText(v.segment),
    badges: Array.isArray(v.badges) ? (v.badges as Vehicle["badges"]) : [],
    photos: Array.isArray(v.photos) ? (v.photos as unknown[]).filter((photo): photo is string => typeof photo === "string") : [],
    photoFocalPoints: Array.isArray(v.photoFocalPoints)
      ? (v.photoFocalPoints as Vehicle["photoFocalPoints"])
      : undefined,
    description: optionalText(v.description),
    items: Array.isArray(v.items) ? (v.items as unknown[]).filter((item): item is string => typeof item === "string") : undefined,
  };
}

function safePublicHttpsUrl(value?: string): string | undefined {
  if (!value || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

type WireTenantConfig = Omit<TenantConfig, "sections"> & { sections?: Partial<TenantConfig["sections"]> };

function normalizeTenant(config: WireTenantConfig): TenantConfig {
  return {
    ...config,
    appearance: normalizeAppearance(config.appearance),
    tagline: config.tagline?.trim() || undefined,
    vehicleFocus: toVehicleFocus(config.vehicleFocus),
    sections: toSiteSections(config.sections),
    storePhotos: config.storePhotos ?? [],
    privacyUrl: safePublicHttpsUrl(config.privacyUrl),
    termsUrl: safePublicHttpsUrl(config.termsUrl),
  };
}

const SITE_CONFIG = normalizeTenant(siteConfigRaw as WireTenantConfig);

export async function getTenant(): Promise<TenantConfig> {
  return IS_DEMO ? demoConfig(SITE_CONFIG) : SITE_CONFIG;
}

export interface VehicleFacets {
  brands: string[];
  brandLogos: Record<string, string | undefined>;
  fuels: string[];
  transmissions: string[];
  colors: string[];
  segments: string[];
  vehicleTypes: string[];
  years: number[];
  counts: {
    brand: Record<string, number>;
    fuel: Record<string, number>;
    transmission: Record<string, number>;
    color: Record<string, number>;
    segment: Record<string, number>;
    vehicleType: Record<string, number>;
  };
  priceBounds: [number, number];
  kmBounds: [number, number];
  total: number;
}

export interface VehiclesPage {
  items: Vehicle[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
  facets: VehicleFacets;
}

interface ApiFacetOption {
  name: string;
  count: number;
  logo?: string | null;
}

interface ApiFacets {
  brands?: ApiFacetOption[];
  fuels?: ApiFacetOption[];
  transmissions?: ApiFacetOption[];
  colors?: ApiFacetOption[];
  segments?: ApiFacetOption[];
  vehicleTypes?: ApiFacetOption[];
  years?: number[];
  priceBounds?: [number, number];
  kmBounds?: [number, number];
  total?: number;
}

interface ApiVehiclesPage {
  items?: Record<string, unknown>[];
  page?: number;
  perPage?: number;
  total?: number;
  hasMore?: boolean;
  facets?: ApiFacets;
}

export function emptyFacets(): VehicleFacets {
  return {
    brands: [],
    brandLogos: {},
    fuels: [],
    transmissions: [],
    colors: [],
    segments: [],
    vehicleTypes: [],
    years: [],
    counts: { brand: {}, fuel: {}, transmission: {}, color: {}, segment: {}, vehicleType: {} },
    priceBounds: [0, 0],
    kmBounds: [0, 0],
    total: 0,
  };
}

function dedupeOptions(options?: ApiFacetOption[]): ApiFacetOption[] {
  const byKey = new Map<string, ApiFacetOption>();
  for (const o of options ?? []) {
    const name = o.name?.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase("pt-BR");
    const existing = byKey.get(key);
    if (existing) {
      existing.count += o.count;
      if (!existing.logo && o.logo) existing.logo = o.logo;
    } else {
      byKey.set(key, { ...o, name });
    }
  }
  return [...byKey.values()];
}

function dedupeBrands(options?: ApiFacetOption[]): ApiFacetOption[] {
  const byKey = new Map<string, { count: number; logo?: string | null; variants: Map<string, number> }>();
  for (const o of options ?? []) {
    const name = o.name?.trim();
    if (!name) continue;
    const key = brandSlug(name);
    const entry = byKey.get(key) ?? { count: 0, logo: null, variants: new Map<string, number>() };
    entry.count += o.count;
    if (!entry.logo && o.logo) entry.logo = o.logo;
    entry.variants.set(name, (entry.variants.get(name) ?? 0) + o.count);
    byKey.set(key, entry);
  }
  return [...byKey.values()]
    .map(({ count, logo, variants }) => {
      let variantName = "";
      let best = 0;
      for (const [variant, occurrences] of variants) {
        if (occurrences > best) {
          variantName = variant;
          best = occurrences;
        }
      }
      return { name: brandDisplayName(variantName) ?? variantName, count, logo };
    })
    .sort((a, b) =>
      Number(brandSlug(a.name) === "outros") - Number(brandSlug(b.name) === "outros") ||
      a.name.localeCompare(b.name),
    );
}

function focusFirst(types: string[]): string[] {
  const focus = SITE_CONFIG.vehicleFocus;
  return focus && types.includes(focus) ? [focus, ...types.filter((type) => type !== focus)] : types;
}

function normalizeFacets(facets?: ApiFacets): VehicleFacets {
  if (!facets) return emptyFacets();
  const brands = dedupeBrands(facets.brands);
  const fuels = dedupeOptions(facets.fuels);
  const transmissions = dedupeOptions(facets.transmissions);
  const colors = dedupeOptions(facets.colors);
  const segments = dedupeOptions(facets.segments);
  const vehicleTypes = dedupeOptions(facets.vehicleTypes);
  const names = (options: ApiFacetOption[]) => options.map((o) => o.name);
  const counts = (options: ApiFacetOption[]) =>
    Object.fromEntries(options.map((o) => [o.name, o.count]));
  const brandLogos: Record<string, string | undefined> = {};
  for (const b of brands) {
    if (b.logo) brandLogos[b.name] = b.logo;
  }
  return {
    brands: names(brands),
    brandLogos,
    fuels: names(fuels),
    transmissions: names(transmissions),
    colors: names(colors),
    segments: names(segments),
    vehicleTypes: focusFirst(names(vehicleTypes)),
    years: [...new Set(facets.years ?? [])],
    counts: {
      brand: counts(brands),
      fuel: counts(fuels),
      transmission: counts(transmissions),
      color: counts(colors),
      segment: counts(segments),
      vehicleType: counts(vehicleTypes),
    },
    priceBounds: facets.priceBounds ?? [0, 0],
    kmBounds: facets.kmBounds ?? [0, 0],
    total: facets.total ?? 0,
  };
}

function filtersToParams(filters: VehicleFilters, page: number, perPage: number): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  if (filters.q) params.set("q", filters.q.slice(0, 120));
  if (filters.brands?.length) {
    for (const brand of new Set(filters.brands)) params.append("marcas", brand);
  } else if (filters.brand) {
    params.set("marca", filters.brand.slice(0, 120));
  }
  if (filters.fuel) params.set("combustivel", filters.fuel);
  if (filters.transmission) params.set("cambio", filters.transmission);
  if (filters.color) params.set("cor", filters.color);
  if (filters.segment) params.set("segmento", filters.segment);
  if (filters.vehicleType) params.set("tipo", filters.vehicleType);
  if (filters.yearMin) params.set("ano", String(filters.yearMin));
  if (filters.priceMin) params.set("preco_min", String(filters.priceMin));
  if (filters.priceMax) params.set("preco", String(filters.priceMax));
  if (filters.kmMin) params.set("km_min", String(filters.kmMin));
  if (filters.kmMax) params.set("km", String(filters.kmMax));
  if (filters.sort) params.set("ordem", filters.sort);
  if (filters.badge) params.set("badge", filters.badge);
  return params;
}

export async function getVehiclesPage(
  filters: VehicleFilters = {},
  page = 1,
  perPage = DEFAULT_PAGE_SIZE,
): Promise<VehiclesPage> {
  if (IS_DEMO) return demoPage(filters, page, perPage);
  const empty: VehiclesPage = { items: [], page, perPage, total: 0, hasMore: false, facets: emptyFacets() };
  const params = filtersToParams(filters, page, perPage);
  const data = await apiGet<ApiVehiclesPage>(`/vitrine/public/${CLIENT_SLUG}/veiculos?${params.toString()}`);
  if (!data) return empty;
  const sections = SITE_CONFIG.sections;
  const items = (data.items ?? []).map(normalizeApiVehicle).map((v) => ({
    ...v,
    badges: sections.ofertas ? v.badges : v.badges.filter((b) => b !== "baixou-preco"),
  }));
  return {
    items,
    page: data.page ?? page,
    perPage: data.perPage ?? perPage,
    total: data.total ?? items.length,
    hasMore: data.hasMore ?? false,
    facets: normalizeFacets(data.facets),
  };
}

export async function getVehicle(idOrSlug: string): Promise<Vehicle | null> {
  if (IS_DEMO) return demoVehicles.find(v => v.id === idOrSlug || v.slug === idOrSlug) ?? null;
  const data = await apiGet<Record<string, unknown>>(
    `/vitrine/public/${CLIENT_SLUG}/veiculos/${encodeURIComponent(idOrSlug)}`,
  );
  if (!data || typeof data !== "object" || !("id" in data)) return null;
  return normalizeApiVehicle(data);
}

export async function getStockNoun(): Promise<StockNoun> {
  const configured = focusNoun(SITE_CONFIG.vehicleFocus);
  if (configured) return configured;
  try {
    const { facets } = await getVehiclesPage({}, 1, 1);
    return stockNoun(facets.vehicleTypes);
  } catch {
    return DEFAULT_STOCK_NOUN;
  }
}
