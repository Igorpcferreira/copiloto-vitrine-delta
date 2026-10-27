import type { Metadata } from "next";
import type { TenantConfig } from "./types";

export interface ShareImage {
  url: string;
  width?: number;
  height?: number;
  type?: string;
}

export function shareImage(config: TenantConfig): ShareImage | undefined {
  if (config.ogImageUrl) {
    return { url: config.ogImageUrl, width: 1200, height: 630, type: "image/jpeg" };
  }
  const url = config.bannerUrl ?? config.storePhotos?.[0] ?? config.logoUrl;
  return url ? { url } : undefined;
}

interface PageMeta {
  title: string;
  description?: string;
  path: string;
  image?: string;
}

export function pageMetadata(config: TenantConfig, { title, description, path, image }: PageMeta): Metadata {
  const img: ShareImage | undefined = image ? { url: image } : shareImage(config);
  const desc = description ?? config.tagline;
  const fullTitle = `${title} | ${config.name}`;
  return {
    title,
    ...(desc ? { description: desc } : {}),
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: config.name,
      title: fullTitle,
      ...(desc ? { description: desc } : {}),
      locale: "pt_BR",
      ...(img ? { images: [img] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      ...(desc ? { description: desc } : {}),
      ...(img ? { images: [img.url] } : {}),
    },
  };
}
