import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getTenant, getVehicle, getVehiclesPage } from "@/lib/data";
import { vehicleSlug } from "@/lib/vehicle-url";
import { siteBaseUrl } from "@/lib/site-url";
import { formatKm, formatPrice } from "@/lib/format";
import { jsonLd } from "@/lib/json-ld";
import type { Vehicle } from "@/lib/types";
import Veiculo from "@/theme/Veiculo";

interface Props {
  params: Promise<{ id: string }>;
}

function vehicleDescription(vehicle: Vehicle): string {
  const specs = [
    vehicle.year,
    formatKm(vehicle.km),
    vehicle.transmission,
    vehicle.fuel,
    vehicle.price ? formatPrice(vehicle.price) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return vehicle.description?.trim() ? `${specs}. ${vehicle.description.trim()}`.slice(0, 300) : specs;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [config, vehicle] = await Promise.all([getTenant(), getVehicle(id)]);
  if (!vehicle) return {};
  const description = vehicleDescription(vehicle);
  const url = `/veiculo/${vehicleSlug(vehicle)}`;
  const coverPhoto = vehicle.photos[0];
  return {
    title: vehicle.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: config.name,
      title: vehicle.title,
      description,
      locale: "pt_BR",
      ...(coverPhoto ? { images: [{ url: coverPhoto, alt: vehicle.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: vehicle.title,
      description,
      ...(coverPhoto ? { images: [coverPhoto] } : {}),
    },
  };
}

const SCHEMA_TYPES: Record<string, string> = { car: "Car", motorcycle: "Motorcycle" };

function vehicleJsonLd(vehicle: Vehicle, config: { name: string; customDomain?: string }, canonical: string) {
  const base = siteBaseUrl(config.customDomain)?.origin;
  return {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPES[vehicle.vehicleType ?? "car"] ?? "Vehicle",
    name: vehicle.title,
    ...(vehicle.description ? { description: vehicle.description } : {}),
    ...(vehicle.photos.length ? { image: vehicle.photos } : {}),
    brand: { "@type": "Brand", name: vehicle.brand },
    model: vehicle.model,
    ...(vehicle.year ? { vehicleModelDate: String(vehicle.year) } : {}),
    ...(vehicle.color ? { color: vehicle.color } : {}),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: vehicle.km, unitCode: "KMT" },
    ...(vehicle.fuel ? { fuelType: vehicle.fuel } : {}),
    ...(vehicle.doors ? { numberOfDoors: vehicle.doors } : {}),
    offers: {
      "@type": "Offer",
      ...(vehicle.price > 0 ? { price: vehicle.price, priceCurrency: "BRL" } : {}),
      availability: "https://schema.org/InStock",
      itemCondition: vehicle.km < 100 ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      ...(base ? { url: `${base}/veiculo/${canonical}` } : {}),
      seller: { "@type": "AutoDealer", name: config.name },
    },
  };
}

export default async function VeiculoPage({ params }: Props) {
  const { id } = await params;
  const [config, vehicle] = await Promise.all([getTenant(), getVehicle(id)]);
  if (!vehicle) notFound();
  const canonical = vehicleSlug(vehicle);
  if (id !== canonical) permanentRedirect(`/veiculo/${canonical}`);
  const { items } = await getVehiclesPage({ vehicleType: vehicle.vehicleType }, 1, 5).catch(() => ({ items: [] as Vehicle[] }));
  const others = items.filter((v) => v.id !== vehicle.id).slice(0, 4);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(vehicleJsonLd(vehicle, config, canonical)) }}
      />
      <Veiculo config={config} base="" vehicle={vehicle} others={others} />
    </>
  );
}
