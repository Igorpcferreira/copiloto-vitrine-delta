import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStockNoun, getTenant } from "@/lib/data";
import { myPossessive, possessive } from "@/lib/stock-noun";
import { pageMetadata } from "@/lib/page-metadata";
import Vender from "@/theme/Vender";

export async function generateMetadata(): Promise<Metadata> {
  const [config, noun] = await Promise.all([getTenant(), getStockNoun()]);
  return pageMetadata(config, {
    title: `Vender ${myPossessive(noun)} ${noun.singular}`,
    description: `Informe os dados ${noun.feminine ? "da" : "do"} ${possessive(noun)} ${noun.singular} para entrar em contato com a ${config.name}.`,
    path: "/vender",
  });
}

export default async function VenderPage() {
  const [config, noun] = await Promise.all([getTenant(), getStockNoun()]);
  if (!config.sections.paginaVender) notFound();
  return <Vender config={config} base="" noun={noun} />;
}
