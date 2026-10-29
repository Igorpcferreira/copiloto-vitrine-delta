import { notFound } from "next/navigation";
import { getVehiclesPage } from "@/lib/data";
import { montarDados } from "@/theme/base/montar";
import CategoriasPropostas from "@/theme/propostas/CategoriasPropostas";

export const metadata = { title: "Opções de carroceria", robots: { index: false, follow: false } };

/** Opções internas de revisão: a demo é o único lugar que as expõe. */
export default async function PropostasCategoriasPage({ searchParams }: { searchParams: Promise<{ modo?: string }> }) {
  if (process.env.VITRINE_DEMO !== "true") notFound();
  const modo = await searchParams;
  const lista = await getVehiclesPage({}, 1, 24);
  const dados = montarDados(await (await import("@/lib/data")).getTenant(), lista.items, lista.facets, !lista.hasMore);
  return <CategoriasPropostas categorias={dados.categorias} carros={lista.items} simulador={modo.modo !== "celular"} />;
}
