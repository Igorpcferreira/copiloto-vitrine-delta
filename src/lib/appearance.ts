import type { CSSProperties } from "react";
import { readableForeground } from "./brand-vars";

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

export function buildAppearanceVars(value?: SiteAppearance | null): CSSProperties {
  const appearance = normalizeAppearance(value);
  const vars: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(colors)) {
    const value = appearance[key as keyof SiteAppearance];
    if (key === "headerBackgroundColor" && appearance.headerStyle !== "solid") continue;
    if (typeof value === "string") vars[cssVar] = value;
  }
  if (appearance.headerStyle === "solid") {
    const background = appearance.headerBackgroundColor ?? "#ffffff";
    vars["--header-default-text"] = background.toLowerCase() === "#ffffff" ? "#0f1522" : readableForeground(background);
  }
  if (appearance.headerTextColor) {
    vars["--drawer-bg"] = appearance.headerStyle === "solid"
      ? appearance.headerBackgroundColor ?? "#ffffff"
      : readableForeground(appearance.headerTextColor);
  }
  if (appearance.textColor) {
    vars["--color-on-surface"] = appearance.textColor;
    vars["--color-muted"] = appearance.textColor;
  }
  if (appearance.contrastTextColor) {
    for (const key of ["--color-on-navy", "--color-on-brand"]) {
      vars[key] = appearance.contrastTextColor;
    }
  }
  return vars as CSSProperties;
}
