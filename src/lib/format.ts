import type { VehicleFilters } from "./types";

export function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function formatPriceLabel(value: number): string {
  return value > 0 ? formatPrice(value) : "Sob consulta";
}

export function formatKm(km: number): string {
  return `${km.toLocaleString("pt-BR")}km`;
}

export function phoneWithCountryCode(phone?: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 8) return "";
  return digits.length >= 12 && digits.startsWith("55") ? digits : `55${digits}`;
}

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phoneWithCountryCode(phone)}?text=${encodeURIComponent(message)}`;
}

export function telHref(phone?: string | null): string | undefined {
  const digits = phoneWithCountryCode(phone);
  return digits ? `tel:+${digits}` : undefined;
}

export function maskPhoneBR(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function unmaskPhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function describeFilters(filters: VehicleFilters): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`a busca "${filters.q}"`);
  const others = [
    filters.brands?.length ? "brands" : filters.brand,
    filters.vehicleType,
    filters.color,
    filters.fuel,
    filters.transmission,
    filters.segment,
    filters.yearMin,
    filters.priceMin,
    filters.priceMax,
    filters.kmMin,
    filters.kmMax,
  ].filter((v) => v !== undefined && v !== "").length;
  if (others > 0) parts.push(others === 1 ? "1 filtro aplicado" : `${others} filtros aplicados`);
  return parts.length ? ` com ${parts.join(" e ")}` : "";
}
