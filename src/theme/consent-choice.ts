import type { ConsentCategory } from "@/lib/consent";
import { resolveTracking } from "@/lib/tracking";
import type { TenantConfig } from "@/lib/types";

/**
 * The contact map waits for the "Mapa" category of the cookie notice, as in the remote Horizon
 * (26 and 27/10/2026) and in the Halo (the user's choice for the Halo on 27/10/2026). For the
 * Delta the question was still open; it follows the Horizon until the user decides. With `false`
 * the map would show right away and the notice would stop asking about it.
 */
export const MAP_NEEDS_CONSENT = true;

/** Categories the cookie notice asks about in this store: the configured tracking and the map. */
export function consentCategoriesFor(config: TenantConfig): ConsentCategory[] {
  return resolveTracking(config).consentCategories.filter((category) => MAP_NEEDS_CONSENT || category !== "map");
}
