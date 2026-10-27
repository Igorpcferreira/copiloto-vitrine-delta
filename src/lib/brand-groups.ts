import { brandDisplayName, brandSlug } from "./brands";
import { isRenderableImageSrc } from "./image-src";

export function groupBrands(
  brands: string[],
  brandLogos: Record<string, string | undefined>,
  failedLogos?: ReadonlySet<string>,
) {
  const withLogo: { brand: string; label: string; logo: string }[] = [];
  const others: string[] = [];

  for (const brand of brands) {
    const logo = brandLogos[brand];
    if (brandSlug(brand) === "outros" || !isRenderableImageSrc(logo) || failedLogos?.has(logo)) {
      others.push(brand);
    } else {
      withLogo.push({ brand, label: brandDisplayName(brand), logo });
    }
  }

  return { withLogo, others };
}

export function otherBrandsParams(brands: string[]): URLSearchParams {
  const params = new URLSearchParams({ marca: "Outros" });
  for (const brand of new Set(brands)) params.append("marcas", brand);
  return params;
}
