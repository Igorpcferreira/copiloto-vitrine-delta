import { Suspense } from "react";
import type { TenantConfig } from "@/lib/types";
import CartasCarroceria from "./CartasCarroceria";
import type { DadosLoja } from "./base/montar";
import GridLargada from "./GridLargada";
import MarcasPista from "./MarcasPista";
import PainelBusca from "./PainelBusca";
import VendaTresToques from "./VendaTresToques";

/**
 * As seções da inicial que dependem do estoque, na sequência aprovada: busca, marcas,
 * carrocerias, vitrine e venda. No site vêm do `HomeStock`, lido no servidor; no preview do
 * painel, do catálogo de exemplo. Cada seção depois da busca tem o próprio limite `Suspense`,
 * para a hidratação vir em partes.
 */
export default function EstoqueInicio({ config, base, dados }: { config: TenantConfig; base: string; dados: DadosLoja }) {
  const s = config.sections;
  // Na fileira de marcas vão as cinco com mais carros na primeira página (a ordem não aparece).
  const conta = new Map<string, number>();
  for (const v of dados.itens) conta.set(v.brand, (conta.get(v.brand) ?? 0) + 1);
  const naPista = [...dados.marcas].sort((a, b) => (conta.get(b.nome) ?? 0) - (conta.get(a.nome) ?? 0)).slice(0, 5);
  return (
    <>
      <PainelBusca
        base={base}
        marcas={dados.marcas}
        outrasMarcas={dados.outrasMarcas}
        categorias={dados.categorias}
        precos={dados.precos}
        anos={dados.anos}
      />
      {s.marcas && dados.marcas.length > 0 && (
        <Suspense>
          <MarcasPista key={naPista.map((m) => m.nome).join("|")} base={base} marcas={naPista} outras={dados.outrasMarcas} />
        </Suspense>
      )}
      {s.categorias && dados.categorias.length > 0 && (
        <Suspense>
          <CartasCarroceria base={base} categorias={dados.categorias} carros={dados.itens} />
        </Suspense>
      )}
      {dados.grupos.length > 0 && (
        <Suspense>
          <GridLargada base={base} grupos={dados.grupos} />
        </Suspense>
      )}
      {s.vendaFinancie && (
        <Suspense>
          <VendaTresToques config={config} base={base} />
        </Suspense>
      )}
    </>
  );
}
