"use client";

import { buildAppearanceVars } from "@/lib/appearance";
import { Suspense, useEffect, useMemo, useState } from "react";
import { theme, THEME_ID } from "@/theme";
import type { TenantConfig } from "@/lib/types";
import { buildBrandVars } from "@/lib/brand-vars";
import { resolveFontFamily } from "@/lib/fonts";
import { buildPreviewData, filterPreview, sanitizePreviewConfig } from "@/lib/preview-fixtures";
import { demoVehicles } from "@/demo/catalog";
import { useSearchParams } from "next/navigation";
import { DEFAULT_STOCK_NOUN, focusNoun } from "@/lib/stock-noun";

type PreviewPage = "home" | "sobre" | "comprar" | "vender";

const INITIAL = sanitizePreviewConfig(THEME_ID, {
  name: "Sua Loja",
  tagline: "Explore os veículos disponíveis.",
});

export default function PreviewPage() {
  return (
    <Suspense>
      <PreviewContent />
    </Suspense>
  );
}

function PreviewContent() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<TenantConfig>(INITIAL);
  const [page, setPage] = useState<PreviewPage>("home");

  useEffect(() => {
    function isAllowedOrigin(origin: string): boolean {
      try {
        const { hostname, protocol } = new URL(origin);
        if (hostname === "localhost" || hostname === "127.0.0.1") return protocol === "http:" || protocol === "https:";
        if (protocol !== "https:") return false;
        return hostname === "ocopiloto.com.br" || hostname.endsWith(".ocopiloto.com.br");
      } catch {
        return false;
      }
    }
    function onMessage(e: MessageEvent) {
      if (!isAllowedOrigin(e.origin)) return;
      const data = e.data;
      if (!data || data.type !== "vitrine-preview") return;
      if (data.config) setConfig(sanitizePreviewConfig(THEME_ID, data.config));
      if (data.page) setPage(data.page as PreviewPage);
    }
    window.addEventListener("message", onMessage);
    window.parent?.postMessage({ type: "vitrine-preview-ready" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const fixture = process.env.VITRINE_DEMO === "true" ? searchParams.get("fixture") : null;
  const { vehicles, facets } = useMemo(
    () => buildPreviewData(config, fixture === "empty" ? [] : fixture === "one" ? demoVehicles.slice(0, 1) : undefined),
    [config, fixture],
  );
  const noun = focusNoun(config.vehicleFocus) ?? DEFAULT_STOCK_NOUN;
  const { Shell, Home, Comprar, Vender, SobreNos } = theme;

  const brandVars = useMemo(
    () => ({ ...buildBrandVars(config.primaryColor, config.secondaryColor, config.surfaceColor), ...buildAppearanceVars(config.appearance) }) as Record<string, string>,
    [config.primaryColor, config.secondaryColor, config.surfaceColor, config.appearance],
  );
  const fontFamily = resolveFontFamily(config.fontFamily);

  useEffect(() => {
    const root = document.documentElement;
    const names = Object.keys(brandVars);
    for (const name of names) root.style.setProperty(name, brandVars[name]);
    if (fontFamily) root.style.setProperty("--font-store", fontFamily);
    else root.style.removeProperty("--font-store");
    return () => {
      for (const name of names) root.style.removeProperty(name);
      root.style.removeProperty("--font-store");
    };
  }, [brandVars, fontFamily]);

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Shell config={config} base="/preview" noun={noun}>
        {page === "home" && (
          <Home
            config={config}
            base="/preview"
            destaques={vehicles.filter((v) => v.badges.includes("destaque"))}
            novidades={vehicles.filter((v) => v.badges.includes("novo"))}
            ofertas={vehicles.filter((v) => v.badges.includes("baixou-preco"))}
            facets={facets}
            inventory={vehicles}
            noun={noun}
          />
        )}
        {page === "comprar" && (
          <Comprar config={config} base="/preview" vehicles={filterPreview(vehicles, {})} facets={facets} filters={{}} noun={noun} />
        )}
        {page === "vender" && <Vender config={config} base="/preview" noun={noun} />}
        {page === "sobre" && <SobreNos config={config} base="/preview" />}
      </Shell>
    </div>
  );
}
