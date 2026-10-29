import type { ConsentCategory } from "@/lib/consent";
import type { TenantConfig } from "@/lib/types";

const GOOGLE_TAG_ID_PATTERN = /^(?:GT|G|AW)-[A-Z0-9]+$/;
const META_PIXEL_ID_PATTERN = /^\d{5,30}$/;

export function googleTagCategory(googleTagId: string): ConsentCategory {
  return googleTagId.startsWith("AW-") ? "marketing" : "analytics";
}

export function resolveTracking(config: TenantConfig) {
  const rawGoogleTagId = config.tracking?.googleAnalyticsId?.trim().toUpperCase();
  const rawMetaPixelId = config.tracking?.metaPixelId?.trim();
  const googleTagId = rawGoogleTagId && GOOGLE_TAG_ID_PATTERN.test(rawGoogleTagId) ? rawGoogleTagId : undefined;
  const metaPixelId = rawMetaPixelId && META_PIXEL_ID_PATTERN.test(rawMetaPixelId) ? rawMetaPixelId : undefined;
  const used = new Set<ConsentCategory>();
  if (googleTagId) used.add(googleTagCategory(googleTagId));
  if (metaPixelId) used.add("marketing");
  if (config.sections.mapa) used.add("map");
  const consentCategories = (["analytics", "marketing", "map"] as const).filter((category) => used.has(category));
  return { googleTagId, metaPixelId, consentCategories };
}
