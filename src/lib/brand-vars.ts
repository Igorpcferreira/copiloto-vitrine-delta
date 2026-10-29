import type { CSSProperties } from "react";

type Rgb = [number, number, number];

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex?: string | null): Rgb | null {
  if (!hex) return null;
  const value = hex.trim().replace(/^#/, "");
  const expanded = value.length === 3 ? value.replace(/(.)/g, "$1$1") : value;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;
  const int = parseInt(expanded, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

function mix(hex: string, target: Rgb, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return toHex(
    r + (target[0] - r) * amount,
    g + (target[1] - g) * amount,
    b + (target[2] - b) * amount,
  );
}

function lighten(hex: string, amount: number): string {
  return mix(hex, [255, 255, 255], amount);
}

function darken(hex: string, amount: number): string {
  return mix(hex, [0, 0, 0], amount);
}

function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const DEFAULT_SURFACE = "#fafafa";
const DEFAULT_CONTENT = "#0f1522";
const PAGE_BACKGROUND = "#ffffff";
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

/**
 * Luminance where white and black tie at 4.58:1 against the same background.
 * Above it black wins, below it white wins. Using 0.5 here would report "dark"
 * for colours where black is in fact the readable foreground.
 */
const LIGHT_THRESHOLD = 0.1791;
const TEXT_CONTRAST = 4.5;
const SOFT_SURFACE_AMOUNT = 0.96;

export function hasContrast(foreground: string, background: string, minimum = TEXT_CONTRAST): boolean {
  const foregroundRgb = parseHex(foreground);
  const backgroundRgb = parseHex(background);
  return Boolean(foregroundRgb && backgroundRgb && contrastRatio(foregroundRgb, backgroundRgb) >= minimum);
}

export function pageTextColor(textColor?: string | null): string | undefined {
  return textColor && hasContrast(textColor, PAGE_BACKGROUND) ? textColor : undefined;
}

/**
 * Walks a colour away from `background` until it clears `target`, so an accent colour
 * used as text stays readable no matter what the store picked.
 */
function toneForContrast(hex: string, background: Rgb, target: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  if (contrastRatio(rgb, background) >= target) return hex;

  const step = relativeLuminance(background) > LIGHT_THRESHOLD ? darken : lighten;
  for (let amount = 0.05; amount <= 1; amount += 0.05) {
    const candidate = step(hex, amount);
    const parsed = parseHex(candidate);
    if (parsed && contrastRatio(parsed, background) >= target) return candidate;
  }
  return step === darken ? "#000000" : "#ffffff";
}

/** Picks the foreground that reads best on `background`, so a light brand colour never yields white-on-white. */
export function readableForeground(background?: string | null): string {
  const rgb = parseHex(background);
  if (!rgb) return "#ffffff";
  return contrastRatio(rgb, WHITE) >= contrastRatio(rgb, BLACK)
    ? "#ffffff"
    : toHex(BLACK[0], BLACK[1], BLACK[2]);
}

function isLight(hex: string): boolean {
  const rgb = parseHex(hex);
  return rgb ? relativeLuminance(rgb) > LIGHT_THRESHOLD : false;
}

/** Derives the dark-surface scale, stepping away from the base in whichever direction stays visible. */
function surfaceScale(primary: string): Record<string, string> {
  const step = isLight(primary) ? darken : lighten;
  return {
    "--color-navy-950": primary,
    "--color-navy-card": step(primary, 0.04),
    "--color-navy-900": step(primary, 0.08),
    "--color-navy-800": step(primary, 0.16),
    "--color-navy-700": step(primary, 0.24),
  };
}

export interface BrandColors {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  surfaceColor?: string | null;
}

/**
 * Builds the brand CSS variables from the store's chosen colours.
 * Every derived value keeps a readable foreground, so a store can pick any colour
 * without producing invisible text.
 */
/** Raised panels and the header glass: white on light surfaces, a gentle step up on dark ones. */
export function raisedSurface(surfaceColor?: string | null): string {
  const surface = parseHex(surfaceColor) ? (surfaceColor as string) : DEFAULT_SURFACE;
  return isLight(surface) ? "#ffffff" : lighten(surface, 0.08);
}

export function buildBrandVars(
  primaryColor?: string | null,
  secondaryColor?: string | null,
  surfaceColor?: string | null,
  textColor?: string | null,
): CSSProperties {
  const vars: Record<string, string> = {};
  const surfaceRgb = parseHex(surfaceColor) ?? parseHex(DEFAULT_SURFACE)!;

  const primary = parseHex(primaryColor) ? (primaryColor as string) : null;
  if (primary) {
    Object.assign(vars, surfaceScale(primary));
    vars["--color-on-navy"] = readableForeground(primary);
    // Text in the store's primary tone, walked until it stays comfortably readable on the surface.
    vars["--color-surface-ink"] = toneForContrast(primary, surfaceRgb, 7);
    // Same idea for text placed on white controls laid over photos and video.
    vars["--color-ink-on-white"] = toneForContrast(primary, WHITE, 7);
  }

  const secondary = parseHex(secondaryColor) ? (secondaryColor as string) : null;
  if (secondary) {
    vars["--color-brand-red"] = secondary;
    vars["--color-on-brand"] = readableForeground(secondary);
    // In these themes the page is the surface, so accent text is toned against it even when it is dark
    // (the Horizon tones it against white there, because its page stays white).
    vars["--color-brand-ink"] = toneForContrast(secondary, surfaceRgb, TEXT_CONTRAST);
    // Leave contrast headroom for the existing hover brightness treatment.
    vars["--apex-action-bg"] = toneForContrast(secondary, WHITE, 6);
  }

  const surface = parseHex(surfaceColor) ? (surfaceColor as string) : null;
  if (surface) {
    vars["--color-surface"] = surface;
    vars["--color-on-surface"] = readableForeground(surface);
    // Lines sit on the page, which is the surface in these themes.
    vars["--color-line"] = isLight(surface) ? darken(surface, 0.08) : lighten(surface, 0.12);
    if (!isLight(surface)) {
      vars["--surface-soft"] = lighten(surface, SOFT_SURFACE_AMOUNT);
      vars["--surface-line"] = lighten(surface, 0.12);
    }
    vars["--color-surface-raised"] = raisedSurface(surface);
  }

  // Text on the surface (Horizon, 28/10/2026). The theme ink is already toned for the surface,
  // so only a store text colour that cannot be read there gives way.
  const surfaceBackground = surface ?? DEFAULT_SURFACE;
  const content = pageTextColor(textColor) ?? vars["--color-surface-ink"] ?? DEFAULT_CONTENT;
  if (!hasContrast(content, surfaceBackground)) vars["--surface-text"] = readableForeground(surfaceBackground);

  return vars as CSSProperties;
}
