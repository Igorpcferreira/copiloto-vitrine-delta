"use client";

import { useSyncExternalStore } from "react";

export type ConsentCategory = "analytics" | "marketing" | "map";

export type ConsentState = Record<ConsentCategory, boolean>;

const COOKIE_NAME = "vitrine_consent";
const LEGACY_STORAGE_KEY = "vitrine-consent";
const VERSION = 1;
const MAX_AGE_SECONDS = 180 * 24 * 60 * 60;
const CHANGE_EVENT = "vitrine-consent-change";
const OPEN_EVENT = "vitrine-consent-open";

const TRACKING_COOKIE_PATTERNS: Record<Exclude<ConsentCategory, "map">, RegExp> = {
  analytics: /^(_ga|_gid|_gat)/,
  marketing: /^(_fbp|_fbc|_gcl|_gac)/,
};

let memoryConsent: ConsentState | null = null;
let cachedRaw: string | null | undefined;
let cachedConsent: ConsentState | null = null;

function readCookie(): string | null {
  try {
    const entry = document.cookie.split("; ").find((item) => item.startsWith(`${COOKIE_NAME}=`));
    return entry ? entry.slice(COOKIE_NAME.length + 1) : null;
  } catch {
    return null;
  }
}

function parseConsent(raw: string | null): ConsentState | null {
  if (!raw) return null;
  try {
    const { version, updatedAt, analytics, marketing, map } = JSON.parse(decodeURIComponent(raw)) ?? {};
    const age = Date.now() - Date.parse(updatedAt);
    if (version !== VERSION || !(age >= 0 && age <= MAX_AGE_SECONDS * 1000)) return null;
    if (typeof analytics !== "boolean" || typeof marketing !== "boolean" || typeof map !== "boolean") return null;
    return { analytics, marketing, map };
  } catch {
    return null;
  }
}

function readConsent(): ConsentState | null {
  const raw = readCookie();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedConsent = parseConsent(raw);
  }
  return cachedConsent ?? memoryConsent;
}

function writeCookie(consent: ConsentState): void {
  const value = encodeURIComponent(JSON.stringify({ version: VERSION, ...consent, updatedAt: new Date().toISOString() }));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  try {
    document.cookie = `${COOKIE_NAME}=${value}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    return;
  }
}

function cookieDomains(): string[] {
  const parts = window.location.hostname.split(".");
  return ["", ...parts.slice(0, -1).map((_, index) => `; Domain=.${parts.slice(index).join(".")}`)];
}

export function clearTrackingCookies(consent: ConsentState): void {
  const denied = (Object.keys(TRACKING_COOKIE_PATTERNS) as (keyof typeof TRACKING_COOKIE_PATTERNS)[])
    .filter((category) => !consent[category])
    .map((category) => TRACKING_COOKIE_PATTERNS[category]);
  if (denied.length === 0) return;
  try {
    for (const entry of document.cookie.split(";")) {
      const name = entry.trim().split("=")[0];
      if (!name || !denied.some((pattern) => pattern.test(name))) continue;
      for (const domain of cookieDomains()) {
        document.cookie = `${name}=; Max-Age=0; Path=/${domain}`;
      }
    }
  } catch {
    return;
  }
}

export function saveConsent(consent: ConsentState): void {
  memoryConsent = consent;
  writeCookie(consent);
  clearTrackingCookies(consent);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function openConsentSettings(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onConsentSettingsOpen(callback: () => void): () => void {
  window.addEventListener(OPEN_EVENT, callback);
  return () => window.removeEventListener(OPEN_EVENT, callback);
}

function subscribe(callback: () => void): () => void {
  const onVisible = () => {
    if (document.visibilityState === "visible") callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("focus", callback);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("focus", callback);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export function useConsent(): ConsentState | null | undefined {
  return useSyncExternalStore<ConsentState | null | undefined>(subscribe, readConsent, () => undefined);
}
