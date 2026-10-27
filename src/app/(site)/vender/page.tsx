import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenant } from "@/lib/data";
import { pageMetadata } from "@/lib/page-metadata";
import Vender from "@/theme/Vender";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getTenant();
  return pageMetadata(config, {
    title: "Vender meu carro",
    description: `Informe os dados do seu veículo para entrar em contato com a ${config.name}.`,
    path: "/vender",
  });
}

export default async function VenderPage() {
  const config = await getTenant();
  if (!config.sections.paginaVender) notFound();
  return <Vender config={config} base="" />;
}
