"use server";

import type { Vehicle, VehicleFilters } from "./types";
import { getVehiclesPage } from "./data";

const SORTS: readonly string[] = ["menor-preco", "maior-preco", "mais-novo", "recentes"];
const MAX_PAGE = 500;

function text(value: unknown, max = 120): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function amount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function sanitizeFilters(raw: unknown): VehicleFilters {
  const filters = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const brands = Array.isArray(filters.brands)
    ? filters.brands.map((brand) => text(brand)).filter((brand): brand is string => Boolean(brand)).slice(0, 100)
    : undefined;
  return {
    q: text(filters.q),
    brand: text(filters.brand),
    brands: brands?.length ? brands : undefined,
    fuel: text(filters.fuel, 60),
    transmission: text(filters.transmission, 60),
    color: text(filters.color, 60),
    segment: text(filters.segment, 60),
    vehicleType: text(filters.vehicleType, 20),
    yearMin: amount(filters.yearMin),
    priceMin: amount(filters.priceMin),
    priceMax: amount(filters.priceMax),
    kmMin: amount(filters.kmMin),
    kmMax: amount(filters.kmMax),
    sort: typeof filters.sort === "string" && SORTS.includes(filters.sort) ? (filters.sort as VehicleFilters["sort"]) : undefined,
  };
}

export async function loadVehiclesPage(
  filters: VehicleFilters,
  page: number,
): Promise<{ items: Vehicle[]; hasMore: boolean }> {
  const safePage = Number.isInteger(page) && page > 0 && page <= MAX_PAGE ? page : 1;
  const result = await getVehiclesPage(sanitizeFilters(filters), safePage);
  return { items: result.items, hasMore: result.hasMore };
}
