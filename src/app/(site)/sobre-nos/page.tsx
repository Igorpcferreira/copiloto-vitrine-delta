import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenant } from "@/lib/data";
import { pageMetadata } from "@/lib/page-metadata";
import SobreNos from "@/theme/SobreNos";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getTenant();
  return pageMetadata(config, {
    title: config.about?.title || "Sobre nós",
    description: config.about?.intro?.slice(0, 300) || undefined,
    path: "/sobre-nos",
  });
}

export default async function SobreNosPage() {
  const config = await getTenant();
  if (!config.sections.paginaSobre) notFound();
  return <SobreNos config={config} base="" />;
}
