import type { MetadataRoute } from "next";
import { getTenant } from "@/lib/data";
import { siteBaseUrl } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (process.env.VITRINE_DEMO === "true") return { rules: { userAgent: "*", disallow: "/" } };
  const config = await getTenant();
  const base = siteBaseUrl(config.customDomain)?.origin;
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/preview" },
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
