import { buildAppearanceVars } from "@/lib/appearance";
import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { getTenant } from "@/lib/data";
import { buildBrandVars } from "@/lib/brand-vars";
import { fontVariables, resolveFontFamily } from "@/lib/fonts";
import { siteBaseUrl } from "@/lib/site-url";
import { shareImage } from "@/lib/page-metadata";
import { jsonLd } from "@/lib/json-ld";
import "./globals.css";
import "lenis/dist/lenis.css";
import "@/theme/delta.css";
import "@/theme/delta-home.css";
import "@/theme/delta-pages.css";

// Not preloaded: a store that picks another font in the panel (the Radial demo uses Manrope)
// was downloading these 34 KB first, competing with the opening (21/10/2026). Stores on the
// default still get it as soon as the CSS asks, with the text already on the adjusted fallback.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});


export async function generateMetadata(): Promise<Metadata> {
  const config = await getTenant();
  const favicon = config.faviconUrl ?? config.logoUrl;
  const image = shareImage(config);
  return {
    metadataBase: siteBaseUrl(config.customDomain),
    title: { default: config.name, template: `%s | ${config.name}` },
    description: config.tagline,
    alternates: { canonical: "/" },
    openGraph: {
      siteName: config.name,
      title: config.name,
      description: config.tagline,
      url: "/",
      locale: "pt_BR",
      type: "website",
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: config.name,
      description: config.tagline,
      ...(image ? { images: [image.url] } : {}),
    },
    ...(favicon ? { icons: { icon: favicon } } : {}),
  };
}

async function dealerJsonLd() {
  const config = await getTenant();
  const base = siteBaseUrl(config.customDomain)?.origin;
  const social = Object.values(config.social ?? {}).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: config.name,
    ...(config.tagline ? { description: config.tagline } : {}),
    ...(base ? { url: base } : {}),
    ...(config.logoUrl ? { logo: config.logoUrl, image: config.logoUrl } : {}),
    telephone: config.phone,
    email: config.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: config.address,
      addressLocality: config.city,
      addressCountry: "BR",
    },
    ...(social.length ? { sameAs: social } : {}),
    ...(config.googleRating && config.googleReviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: config.googleRating,
            reviewCount: config.googleReviewCount,
          },
        }
      : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getTenant();
  const dealer = await dealerJsonLd();
  const brandVars = buildBrandVars(config.primaryColor, config.secondaryColor, config.surfaceColor);
  const fontFamily = resolveFontFamily(config.fontFamily);

  return (
    <html
      lang="pt-BR"
      className={`${hanken.variable} ${fontVariables} h-full antialiased`}
      style={{ ...brandVars, ...buildAppearanceVars(config.appearance) }}
      suppressHydrationWarning
    >
      <head>
        {fontFamily && (
          <style dangerouslySetInnerHTML={{ __html: `:root { --font-store: ${fontFamily}; }` }} />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(dealer) }}
        />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
