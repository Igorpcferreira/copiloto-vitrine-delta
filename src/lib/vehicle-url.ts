import type { Vehicle } from "./types";

const REF_LENGTH = 8;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function vehicleSlug(vehicle: Pick<Vehicle, "id" | "title" | "slug">): string {
  if (vehicle.slug) return vehicle.slug;
  const name = slugify(vehicle.title) || "veiculo";
  return `${name}-${vehicle.id.slice(0, REF_LENGTH).toLowerCase()}`;
}
