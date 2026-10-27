"use server";

import { headers } from "next/headers";
import type { LeadInput, SellRequestInput } from "./types";

const CLIENT_SLUG = process.env.CLIENT_SLUG;
const API_TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS = 60000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function visitorIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  } catch {
    return "";
  }
}

/**
 * The API base, or null when nothing should be sent. The demo never sends, and a site
 * without the full API configuration never pretends it did (divergence kept from the
 * Halo and the Atlas: the Horizon reports success in development without an API).
 */
function apiBase(pathname: string): string | null {
  if (process.env.VITRINE_DEMO === "true") return null;
  const api = process.env.CLIENT_API_URL;
  if (api && CLIENT_SLUG && process.env.CLIENT_API_TOKEN) return api;
  console.error(`[vitrine] ${pathname} descartado: CLIENT_API_URL, CLIENT_API_TOKEN ou CLIENT_SLUG ausentes.`);
  return null;
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function isValidEmail(email?: string): boolean {
  return !email || (email.length <= 320 && EMAIL_PATTERN.test(email));
}

async function apiPost(pathname: string, body: Record<string, unknown>): Promise<boolean> {
  const api = apiBase(pathname);
  if (!api) return false;
  try {
    const res = await fetch(`${api}${pathname}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-public-key": process.env.CLIENT_API_TOKEN ?? "",
        "x-visitor-ip": await visitorIp(),
      },
      body: JSON.stringify({ ...body, slug: CLIENT_SLUG }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function submitLead(input: LeadInput): Promise<{ ok: boolean }> {
  const name = input.name?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const email = input.email?.trim() || undefined;
  if (!name || name.length > 255 || !isValidPhone(phone) || !isValidEmail(email)) return { ok: false };
  return {
    ok: await apiPost(`/vitrine/public/${CLIENT_SLUG}/leads`, {
      vehicleId: input.vehicleId,
      name,
      email,
      phone,
      message: input.message?.slice(0, 2000),
      source: input.source,
    }),
  };
}

export async function uploadSellPhotos(formData: FormData): Promise<{ ok: boolean; urls: string[] }> {
  const api = apiBase("upload de fotos");
  if (!api) return { ok: false, urls: [] };
  try {
    const res = await fetch(`${api}/vitrine/public/${CLIENT_SLUG}/avaliacoes/fotos`, {
      method: "POST",
      headers: {
        "x-public-key": process.env.CLIENT_API_TOKEN ?? "",
        "x-visitor-ip": await visitorIp(),
      },
      body: formData,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, urls: [] };
    const json = await res.json();
    const data = json && typeof json === "object" && "data" in json ? json.data : json;
    const urls = Array.isArray(data?.urls) ? data.urls.filter((url: unknown): url is string => typeof url === "string") : [];
    return { ok: urls.length > 0, urls };
  } catch {
    return { ok: false, urls: [] };
  }
}

export async function submitSellRequest(input: SellRequestInput): Promise<{ ok: boolean }> {
  if (!input.name?.trim() || !isValidPhone(input.phone ?? "") || !isValidEmail(input.email?.trim()) || !input.brand?.trim()) {
    return { ok: false };
  }
  return { ok: await apiPost(`/vitrine/public/${CLIENT_SLUG}/avaliacoes`, { ...input }) };
}
