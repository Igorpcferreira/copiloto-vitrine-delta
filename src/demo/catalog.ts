import radialReviews from "./radial-reviews.json";
import vehiclesRaw from "./vehicles.json";
import type { TenantConfig, Vehicle, VehicleFilters } from "@/lib/types";
import type { VehicleFacets, VehiclesPage } from "@/lib/data";
import { demoBrandLogos } from "./brand-logos";
export const demoVehicles = vehiclesRaw as Vehicle[];
export function demoConfig(original: TenantConfig): TenantConfig {
  return {
    ...original,
    theme: "delta",
    slug: "delta-demo",
    name: "Radial Automóveis",
    logoUrl: "/showcase/radial-logo.webp",
    faviconUrl: undefined,
    customDomain: undefined,
    tracking: {},
    sections: { ...original.sections, depoimentos: true },
    primaryColor: "#0f1522",
    secondaryColor: "#528fb8",
    surfaceColor: "#fafafa",
    fontFamily: "Manrope",
    tagline: "",
    bannerUrl: "/showcase/banner-poster.webp",
    appearance: {
      bannerType: "video",
      bannerVideoUrl: "/showcase/banner-video.mp4",
      headerStyle: "glass",
    },
    phone: "(11) 0000-0000",
    // Mesmo contato comercial autorizado para o botão flutuante da demo Apex.
    whatsapp: "5562995136720",
    email: "contato@example.com",
    // Endereço real da Radial (cadastro da loja no Google Maps), pedido do usuário em 10/10/2026.
    address: "Av. Brasil Sul, 780, Vila Jussara, Anápolis, GO",
    city: "Anápolis",
    hours: {
      weekdays: "Segunda a sexta, das 9h às 18h",
      saturday: "Sábado, das 9h às 13h",
    },
    social: {},
    mapQuery: "RADIAL AUTOMOVEIS, Av. Brasil Sul, 780, Vila Jussara, Anápolis, GO, 75123-020",
    googleRating: undefined,
    googleReviewCount: undefined,
    privacyUrl: undefined,
    termsUrl: undefined,
    ctaImageUrl: "/defaults/cta-cars.webp",
    storePhotos: [
      "/demo/loja-3.webp",
      "/demo/loja-2.webp",
      "/demo/loja-1.webp",
    ],
    about: {
      title: "Mais que carros. Novas possibilidades.",
      intro:
        "Uma experiência pensada para você, do primeiro encontro à próxima conquista.",
      sections: [
        {
          title: "Paixão por conectar pessoas e carros",
          body: [
            "Encontrar um veículo é escolher o que vai acompanhar você nos próximos caminhos. Por isso, cada conversa importa.",
            "Nossa equipe está aqui para ouvir, apresentar possibilidades e ajudar você a decidir com tranquilidade.",
          ],
        },
        {
          title: "Seu próximo capítulo começa aqui",
          body: [
            "Conheça os veículos, visite nossa loja e descubra uma nova forma de escolher seu próximo carro.",
          ],
        },
      ],
      stats: [
        { value: "01", label: "Você no centro" },
        { value: "02", label: "Atendimento próximo" },
        { value: "03", label: "Novos caminhos" },
      ],
      highlights: [
        {
          title: "Atendimento próximo",
          text: "Uma conversa para entender o que faz sentido para você.",
        },
        {
          title: "Escolha com calma",
          text: "Conheça cada detalhe antes de dar o próximo passo.",
        },
        {
          title: "Do seu jeito",
          text: "Encontre possibilidades para comprar, vender ou trocar.",
        },
      ],
    },
    testimonials: radialReviews as TenantConfig["testimonials"],
  };
}
export function demoPage(
  filters: VehicleFilters = {},
  page = 1,
  perPage = 24,
): VehiclesPage {
  const all = demoVehicles;
  const uniq = (key: keyof Vehicle) =>
    [...new Set(all.map((v) => String(v[key] ?? "")).filter(Boolean))].sort();
  const count = (key: keyof Vehicle) =>
    Object.fromEntries(
      uniq(key).map((value) => [
        value,
        all.filter((v) => v[key] === value).length,
      ]),
    );
  const tipos = [...new Set(all.map((v) => v.vehicleType ?? "car"))].sort();
  const facets: VehicleFacets = {
    brands: uniq("brand"),
    brandLogos: demoBrandLogos(uniq("brand")),
    fuels: uniq("fuel"),
    transmissions: uniq("transmission"),
    colors: uniq("color"),
    segments: uniq("segment"),
    vehicleTypes: tipos,
    years: [...new Set(all.map((v) => v.year))].sort((a, b) => b - a),
    counts: {
      brand: count("brand"),
      fuel: count("fuel"),
      transmission: count("transmission"),
      color: count("color"),
      segment: count("segment"),
      vehicleType: Object.fromEntries(tipos.map((t) => [t, all.filter((v) => (v.vehicleType ?? "car") === t).length])),
    },
    priceBounds: [
      Math.min(...all.map((v) => v.price)),
      Math.max(...all.map((v) => v.price)),
    ],
    kmBounds: [
      Math.min(...all.map((v) => v.km)),
      Math.max(...all.map((v) => v.km)),
    ],
    total: all.length,
  };
  const text = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  let items = all.filter(
    (v) =>
      (!filters.q ||
        text([v.title, v.brand, v.model, v.color].join(" ")).includes(
          text(filters.q),
        )) &&
      (!filters.brands?.length
        ? !filters.brand || v.brand === filters.brand
        : filters.brands.includes(v.brand)) &&
      (!filters.fuel || v.fuel === filters.fuel) &&
      (!filters.transmission || v.transmission === filters.transmission) &&
      (!filters.color || v.color === filters.color) &&
      (!filters.segment || v.segment === filters.segment) &&
      (!filters.vehicleType || (v.vehicleType ?? "car") === filters.vehicleType) &&
      (filters.yearMin === undefined || v.year >= filters.yearMin) &&
      (filters.priceMin === undefined || v.price >= filters.priceMin) &&
      (filters.priceMax === undefined || v.price <= filters.priceMax) &&
      (filters.kmMin === undefined || v.km >= filters.kmMin) &&
      (filters.kmMax === undefined || v.km <= filters.kmMax),
  );
  // "recentes" (os que entraram por último na API): a demo não tem data de entrada, então usa
  // os marcados como novos primeiro e, depois, a ordem do catálogo.
  const recente = (v: Vehicle) => (v.badges.includes("novo") ? 0 : 1);
  items = items.toSorted((a, b) =>
    filters.sort === "recentes"
      ? recente(a) - recente(b) || all.indexOf(a) - all.indexOf(b)
      : filters.sort === "mais-novo"
        ? b.year - a.year
        : filters.sort === "maior-preco"
          ? b.price - a.price
          : a.price - b.price,
  );
  return {
    items: items.slice((page - 1) * perPage, page * perPage),
    total: items.length,
    page,
    perPage,
    hasMore: page * perPage < items.length,
    facets,
  };
}
