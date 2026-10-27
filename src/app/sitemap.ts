import type { MetadataRoute } from "next";
import { getTenant, getVehiclesPage } from "@/lib/data";
import { siteBaseUrl } from "@/lib/site-url";
import { vehicleSlug } from "@/lib/vehicle-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = await getTenant();
  const base = siteBaseUrl(config.customDomain)?.origin;
  if (!base) return [];

  const vehicles = [] as Awaited<ReturnType<typeof getVehiclesPage>>["items"];
  try {
    for (let page = 1; page <= 20; page++) {
      const result = await getVehiclesPage({}, page, 60);
      vehicles.push(...result.items);
      if (!result.hasMore) break;
    }
  } catch {}
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/comprar`, changeFrequency: "daily", priority: 0.9 },
    ...(config.sections.paginaVender ? [{ url: `${base}/vender`, changeFrequency: "monthly" as const, priority: 0.6 }] : []),
    ...(config.sections.paginaSobre ? [{ url: `${base}/sobre-nos`, changeFrequency: "monthly" as const, priority: 0.5 }] : []),
    ...vehicles.map((v) => ({
      url: `${base}/veiculo/${vehicleSlug(v)}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
