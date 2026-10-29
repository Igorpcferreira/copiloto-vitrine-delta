import { notFound } from "next/navigation";
import BotoesPropostas from "@/theme/propostas/BotoesPropostas";

export const metadata = { title: "Opções de botões e campos", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.VITRINE_DEMO !== "true") notFound();
  return <BotoesPropostas />;
}
