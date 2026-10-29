import type { CSSProperties } from "react";
import { hasContrast, pageTextColor, readableForeground } from "./brand-vars";

export interface SiteAppearance {
  headerStyle?: "glass" | "transparent" | "solid" | null;
  headerBackgroundColor?: string | null;
  headerTextColor?: string | null;
  textColor?: string | null;
  contrastTextColor?: string | null;
  bannerTextColor?: string | null;
  bannerType?: "image" | "video" | null;
  bannerVideoUrl?: string | null;
}

export interface AppearancePalette {
  primaryColor?: string | null;
}

const DEFAULT_BRAND = "#0f1522";
const LIGHT_BACKDROP = "#ffffff";

const colors = {
  headerBackgroundColor: "--header-bg",
  headerTextColor: "--header-text",
  textColor: "--site-text",
  contrastTextColor: "--contrast-text",
  bannerTextColor: "--hero-text",
} as const;

export function safeMediaUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2048) return undefined;
  if (/^\/(?!\/)/.test(value) && !/[\\\u0000-\u0020]/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function normalizeAppearance(value: unknown): SiteAppearance {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(colors)) {
    const color = raw[key];
    if (typeof color === "string" && /^#[\da-f]{6}$/i.test(color)) result[key] = color;
  }
  if (["glass", "transparent", "solid"].includes(String(raw.headerStyle))) result.headerStyle = raw.headerStyle;
  if (["image", "video"].includes(String(raw.bannerType))) result.bannerType = raw.bannerType;
  const videoUrl = safeMediaUrl(raw.bannerVideoUrl);
  if (result.bannerType === "video" && videoUrl) result.bannerVideoUrl = videoUrl;
  return result as SiteAppearance;
}

function validHex(value?: string | null): string | undefined {
  return value && /^#[\da-f]{6}$/i.test(value) ? value : undefined;
}

export function buildAppearanceVars(value?: SiteAppearance | null, palette: AppearancePalette = {}): CSSProperties {
  const appearance = normalizeAppearance(value);
  const brand = validHex(palette.primaryColor) ?? DEFAULT_BRAND;
  const solidHeader = appearance.headerStyle === "solid";
  const headerBackground = appearance.headerBackgroundColor ?? LIGHT_BACKDROP;
  const headerTextColor =
    appearance.headerTextColor && (!solidHeader || hasContrast(appearance.headerTextColor, headerBackground))
      ? appearance.headerTextColor
      : undefined;
  const vars: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(colors)) {
    const value = appearance[key as keyof SiteAppearance];
    if (key === "headerBackgroundColor" && !solidHeader) continue;
    if (key === "textColor" && !pageTextColor(value)) continue;
    if (key === "headerTextColor" && !headerTextColor) continue;
    if (typeof value === "string") vars[cssVar] = value;
  }
  if (solidHeader) {
    vars["--header-default-text"] = headerBackground.toLowerCase() === LIGHT_BACKDROP ? DEFAULT_BRAND : readableForeground(headerBackground);
  }
  if (headerTextColor && !solidHeader && !hasContrast(headerTextColor, LIGHT_BACKDROP)) {
    vars["--header-light-text"] = readableForeground(LIGHT_BACKDROP);
  }
  if (headerTextColor) {
    vars["--drawer-bg"] = solidHeader ? headerBackground : readableForeground(headerTextColor);
  }
  const textColor = pageTextColor(appearance.textColor);
  if (textColor) {
    vars["--color-on-surface"] = textColor;
    vars["--color-muted"] = textColor;
  }
  if (appearance.contrastTextColor) {
    if (hasContrast(appearance.contrastTextColor, brand)) vars["--color-on-navy"] = appearance.contrastTextColor;
    vars["--color-on-brand"] = appearance.contrastTextColor;
  }
  return vars as CSSProperties;
}
