import { normalizeAppearance } from "./appearance";
import { toSiteSections, toVehicleFocus, type TenantConfig, type Vehicle, type VehicleFilters, type VehicleFocus } from "./types";
import type { VehicleFacets } from "./data";
import { demoVehicles } from "@/demo/catalog";
import { demoBrandLogos } from "@/demo/brand-logos";

const PLACEHOLDER = "/preview/car.svg";

type DemoVehicle = Omit<Vehicle, "badges" | "photos">;

const DEMO_MOTORCYCLES: DemoVehicle[] = [
  { id: "m1", brand: "Honda", model: "CB 500X", title: "Honda CB 500X", year: 2023, km: 8000, price: 39900, transmission: "Manual", fuel: "Gasolina", color: "Vermelho", segment: "Trail", vehicleType: "motorcycle", motor: "471 cc", previousPrice: 42900 },
  { id: "m2", brand: "Yamaha", model: "MT-03", title: "Yamaha MT-03", year: 2024, km: 3500, price: 32900, transmission: "Manual", fuel: "Gasolina", color: "Preto", segment: "Naked", vehicleType: "motorcycle", motor: "321 cc" },
  { id: "m3", brand: "Honda", model: "CG 160 Titan", title: "Honda CG 160 Titan", year: 2022, km: 15000, price: 15900, transmission: "Manual", fuel: "Flex", color: "Prata", segment: "Street", vehicleType: "motorcycle", motor: "162 cc" },
  { id: "m4", brand: "BMW", model: "G 310 GS", title: "BMW G 310 GS", year: 2023, km: 6000, price: 34900, transmission: "Manual", fuel: "Gasolina", color: "Branco", segment: "Trail", vehicleType: "motorcycle", motor: "313 cc" },
  { id: "m5", brand: "Kawasaki", model: "Ninja 400", title: "Kawasaki Ninja 400", year: 2022, km: 11000, price: 33900, transmission: "Manual", fuel: "Gasolina", color: "Verde", segment: "Esportiva", vehicleType: "motorcycle", motor: "399 cc", previousPrice: 35900 },
  { id: "m6", brand: "Triumph", model: "Tiger 900", title: "Triumph Tiger 900 GT", year: 2024, km: 4000, price: 79900, transmission: "Manual", fuel: "Gasolina", color: "Cinza", segment: "Trail", vehicleType: "motorcycle", motor: "888 cc" },
];

const DEMO_TRUCKS: DemoVehicle[] = [
  { id: "t1", brand: "Volvo", model: "FH 540", title: "Volvo FH 540 6x4", year: 2022, km: 210000, price: 689900, transmission: "Automatizado", fuel: "Diesel", color: "Branco", segment: "Cavalo mecânico", vehicleType: "truck", previousPrice: 719900 },
  { id: "t2", brand: "Scania", model: "R 450", title: "Scania R 450 6x2", year: 2021, km: 320000, price: 559900, transmission: "Automatizado", fuel: "Diesel", color: "Prata", segment: "Cavalo mecânico", vehicleType: "truck" },
  { id: "t3", brand: "Volkswagen", model: "Constellation 24.280", title: "Volkswagen Constellation 24.280", year: 2023, km: 90000, price: 429900, transmission: "Manual", fuel: "Diesel", color: "Branco", segment: "Truck", vehicleType: "truck" },
  { id: "t4", brand: "Mercedes-Benz", model: "Actros 2651", title: "Mercedes-Benz Actros 2651", year: 2022, km: 250000, price: 649900, transmission: "Automatizado", fuel: "Diesel", color: "Azul", segment: "Cavalo mecânico", vehicleType: "truck" },
  { id: "t5", brand: "Iveco", model: "Tector 240E28", title: "Iveco Tector 240E28", year: 2021, km: 180000, price: 319900, transmission: "Manual", fuel: "Diesel", color: "Branco", segment: "Truck", vehicleType: "truck", previousPrice: 339900 },
  { id: "t6", brand: "DAF", model: "XF 530", title: "DAF XF 530 FTS", year: 2024, km: 60000, price: 799900, transmission: "Automatizado", fuel: "Diesel", color: "Vermelho", segment: "Cavalo mecânico", vehicleType: "truck" },
];

const DEMO_BY_FOCUS: Record<Exclude<VehicleFocus, "car">, DemoVehicle[]> = {
  motorcycle: DEMO_MOTORCYCLES,
  truck: DEMO_TRUCKS,
};

function baseVehicles(config: TenantConfig, focus: Exclude<VehicleFocus, "car">, photos: string[]): Vehicle[] {
  const sections = config.sections;
  return DEMO_BY_FOCUS[focus].map((v, i) => {
    const badges: Vehicle["badges"] = [];
    if (i < 3) badges.push("destaque");
    if (i % 2 === 0) badges.push("novo");
    if (v.previousPrice && sections.ofertas) badges.push("baixou-preco");
    return {
      ...v,
      photos: [photos[i % photos.length] ?? PLACEHOLDER],
      badges,
    };
  });
}

/**
 * Lojas de carro veem os 12 carros da demo, com as fotos reais (divergência do Halo; o Horizon
 * usa as fotos da loja no lugar das dos carros). Lojas de moto ou caminhão veem os exemplos do
 * Horizon para o próprio tipo. `override` serve aos cenários `?fixture=` da demo.
 */
function previewVehicles(config: TenantConfig): Vehicle[] {
  const focus = config.vehicleFocus ?? "car";
  if (focus === "car") return demoVehicles;
  const photos = config.storePhotos?.length ? config.storePhotos : [PLACEHOLDER];
  return baseVehicles(config, focus, photos);
}

export function buildPreviewData(config: TenantConfig, override?: Vehicle[]): { vehicles: Vehicle[]; facets: VehicleFacets } {
  const vehicles = override ?? previewVehicles(config);
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();
  const count = (key: (v: Vehicle) => string | undefined) => {
    const acc: Record<string, number> = {};
    for (const v of vehicles) {
      const k = key(v);
      if (k) acc[k] = (acc[k] ?? 0) + 1;
    }
    return acc;
  };
  const facets: VehicleFacets = {
    brands: uniq(vehicles.map((v) => v.brand)),
    brandLogos: demoBrandLogos(uniq(vehicles.map((v) => v.brand))),
    fuels: uniq(vehicles.map((v) => v.fuel)),
    transmissions: uniq(vehicles.map((v) => v.transmission)),
    colors: uniq(vehicles.map((v) => v.color)),
    segments: uniq(vehicles.map((v) => v.segment)),
    vehicleTypes: uniq(vehicles.map((v) => v.vehicleType ?? "car")),
    years: [...new Set(vehicles.map((v) => v.year))].sort((a, b) => b - a),
    counts: {
      brand: count((v) => v.brand),
      fuel: count((v) => v.fuel),
      transmission: count((v) => v.transmission),
      color: count((v) => v.color),
      segment: count((v) => v.segment),
      vehicleType: count((v) => v.vehicleType ?? "car"),
    },
    priceBounds: [
      vehicles.length ? Math.min(...vehicles.map((v) => v.price)) : 0,
      vehicles.length ? Math.max(...vehicles.map((v) => v.price)) : 0,
    ],
    kmBounds: [vehicles.length ? Math.min(...vehicles.map((v) => v.km)) : 0, vehicles.length ? Math.max(...vehicles.map((v) => v.km)) : 0],
    total: vehicles.length,
  };
  return { vehicles, facets };
}

export function filterPreview(vehicles: Vehicle[], filters: VehicleFilters): Vehicle[] {
  const r = vehicles.filter((v) => {
    if (filters.brands?.length) {
      if (!filters.brands.includes(v.brand)) return false;
    } else if (filters.brand && v.brand !== filters.brand) return false;
    if (filters.segment && v.segment !== filters.segment) return false;
    if (filters.vehicleType && (v.vehicleType ?? "car") !== filters.vehicleType) return false;
    return true;
  });
  if (filters.sort === "maior-preco") return r.toSorted((a, b) => b.price - a.price);
  if (filters.sort === "mais-novo") return r.toSorted((a, b) => b.year - a.year);
  return r.toSorted((a, b) => a.price - b.price);
}

export function sanitizePreviewConfig(theme: TenantConfig["theme"], incoming: Partial<TenantConfig>): TenantConfig {
  const appearance = normalizeAppearance(incoming.appearance);
  const banner = incoming.bannerUrl === "" ? undefined : incoming.bannerUrl || (appearance.bannerType === "video" ? undefined : "/preview/banner.svg");
  const wireSections = incoming.sections as unknown as { vehicleFocus?: unknown } | undefined;
  return {
    appearance,
    vehicleFocus: toVehicleFocus(incoming.vehicleFocus ?? wireSections?.vehicleFocus),
    googleRating: incoming.googleRating,
    googleReviewCount: incoming.googleReviewCount,
    slug: incoming.slug ?? "preview",
    name: incoming.name ?? "Sua Loja",
    theme,
    tagline: incoming.tagline ?? "",
    logoUrl: incoming.logoUrl ?? undefined,
    bannerUrl: banner,
    bannerLink: appearance.bannerType === "video" ? undefined : incoming.bannerLink,
    faviconUrl: incoming.faviconUrl,
    primaryColor: incoming.primaryColor ?? undefined,
    fontFamily: incoming.fontFamily,
    secondaryColor: incoming.secondaryColor ?? undefined,
    surfaceColor: incoming.surfaceColor ?? undefined,
    ctaImageUrl: incoming.ctaImageUrl ?? undefined,
    ctaTitle: incoming.ctaTitle ?? undefined,
    ctaButtonLabel: incoming.ctaButtonLabel ?? undefined,
    customDomain: incoming.customDomain,
    tracking: {},
    phone: incoming.phone ?? "",
    whatsapp: incoming.whatsapp ?? "",
    email: incoming.email ?? "",
    address: incoming.address ?? "",
    city: incoming.city ?? "",
    hours: incoming.hours ?? { weekdays: "", saturday: "" },
    social: incoming.social ?? {},
    about: incoming.about ?? { title: incoming.name ?? "Sua Loja", intro: incoming.tagline ?? "", sections: [] },
    testimonials: incoming.testimonials ?? [],
    sections: toSiteSections(incoming.sections),
    storePhotos: incoming.storePhotos ?? [],
    privacyUrl: incoming.privacyUrl,
    termsUrl: incoming.termsUrl,
    mapQuery: incoming.mapQuery,
  };
}
