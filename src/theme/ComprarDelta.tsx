"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { VehicleFacets } from "@/lib/data";
import { groupBrands } from "@/lib/brand-groups";
import { brandLogoStyle } from "@/lib/brand-logo-layout";
import { fuelLabel, transmissionLabel, vehicleTypeLabel } from "@/lib/labels";
import type { Vehicle, VehicleFilters } from "@/lib/types";
import { loadVehiclesPage } from "@/lib/vehicle-actions";
import Dialogo from "./base/Dialogo";
import Escolha, { type Opcao } from "./base/Escolha";
import { agrupar, faixasDaOrdem } from "./base/faixas";
import { ativos, filtrarLocal, ORDENS, ordenarLocal, sem, urlComprar } from "./base/filtros";
import { ChevronDownIcon, FiltrosIcon, OrdemIcon, SearchIcon, XIcon } from "./base/icones";
import { limites } from "./base/montar";
import { cx } from "./base/util";
import Cartao from "./Cartao";
import { useNoun } from "./contexto";
import EstoqueDock from "./EstoqueDock";
import Regua, { limitesDePreco, passoDePreco, precoCurto } from "./Regua";
import { alturaCabecalho, irPara, rolarAte } from "./scroll";
import { contagemNoun } from "./textos";

type Par = [number, number];

/** Valor da escolha "Outras marcas" (o grupo de marcas sem logo que vem da inicial). */
const OUTRAS = "__outras";

/** Painel que abre logo abaixo de um botão da barra: fecha com Esc, clique fora ou ao aplicar. */
function Pop({ rotulo, valor, ativo, children }: { rotulo: string; valor: string; ativo: boolean; children: (fechar: () => void) => ReactNode }) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAberto(false);
      botao.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);
  return (
    <div ref={raiz} className="dl-pop" data-aberto={aberto || undefined}>
      <button
        ref={botao}
        id={`${id}-botao`}
        type="button"
        className={cx("dl-barra__botao", ativo && "dl-barra__botao--ativo")}
        aria-expanded={aberto}
        aria-controls={`${id}-painel`}
        onClick={() => setAberto((a) => !a)}
      >
        <span className="dl-barra__rotulo">{rotulo}</span>
        <span className="dl-barra__valor">{valor}</span>
        <ChevronDownIcon size={16} className="dl-barra__seta" />
      </button>
      {aberto && (
        <div id={`${id}-painel`} className="dl-pop__painel" role="group" aria-label={rotulo}>
          {children(() => {
            setAberto(false);
            // Pelo id, não pela ref: a função vai para o painel durante a renderização.
            document.getElementById(`${id}-botao`)?.focus({ preventScroll: true });
          })}
        </div>
      )}
    </div>
  );
}

/** Régua com "Aplicar": arrastar não muda a lista; a escolha vira filtro quando a pessoa confirma. */
function ReguaAplicar({
  inicial,
  aoAplicar,
  resumo,
  junto,
  ...regua
}: {
  rotulo: string;
  rotulos: [string, string] | string;
  min: number;
  max: number;
  passo: number;
  inicial: Par | number;
  formatar: (v: number) => string;
  aoAplicar: (v: Par | number) => void;
  histograma?: number[];
  resumo?: (v: Par | number) => string | undefined;
  /** Botão que fica ao lado do "Aplicar" (o "Fechar" do painel de filtros). */
  junto?: ReactNode;
}) {
  const [valor, setValor] = useState<Par | number>(inicial);
  return (
    <div className="dl-pop__regua">
      <Regua {...regua} valor={valor} aoMudar={setValor} resumo={resumo?.(valor)} />
      <div className="dl-pop__acoes">
        {junto}
        <button type="button" className="dl-btn dl-btn--acao dl-btn--pequeno" onClick={() => aoAplicar(valor)}>
          Aplicar
        </button>
      </div>
    </div>
  );
}

/**
 * Comprar do Delta: título com o total numa etiqueta fora do `h1` e uma barra que gruda no topo
 * (uma barra por vez com o header, pelo `EstoqueDock`): busca, Marca, Preço (régua de dois
 * polegares; com o estoque inteiro na página, sobre o histograma dos preços), Ano (régua),
 * "Filtros" (painel que desce da barra com tipo, carroceria, câmbio, combustível, cor e km, com
 * contagem) e Ordenar. No celular a barra fica com a busca, "Filtrar" (folha que sobe) e Ordenar.
 * Os resultados vêm em faixas (de preço; de ano em "mais novos"; sem faixas em "mais recentes"):
 * o título da faixa é uma linha no meio da grade, que não gruda; a segunda linha da barra lista as
 * faixas já carregadas, marca a da vez enquanto a página rola e leva a cada uma, e cada faixa
 * marca um setor no trilho da rolagem.
 * Escreve só os parâmetros do contrato. No preview do painel (`local`), os filtros valem ali
 * mesmo, sobre o catálogo de exemplo, sem trocar de endereço.
 */
export default function ComprarDelta({
  base,
  facets,
  filtros: filtrosDaRota,
  carros: iniciais,
  total,
  temMais: temMaisInicial,
  estoque,
  completo,
  local = false,
}: {
  base: string;
  /** Facetas do estoque inteiro (contagens, limites e logos), como a API manda. */
  facets: VehicleFacets;
  filtros: VehicleFilters;
  /** Primeira página do resultado. */
  carros: Vehicle[];
  total: number;
  temMais: boolean;
  /** Primeira página do estoque sem filtro: dá o histograma dos preços quando é o estoque inteiro. */
  estoque: Vehicle[];
  completo: boolean;
  local?: boolean;
}) {
  const router = useRouter();
  const noun = useNoun();
  const [pendente, iniciar] = useTransition();
  const [carregando, setCarregando] = useState(false);
  const [folha, setFolha] = useState(false);
  const [painel, setPainel] = useState(false);
  const toggleFiltros = useRef<HTMLButtonElement>(null);
  const contagem = (n: number) => contagemNoun(n, noun);

  // Um painel por vez: o de filtros fecha com um clique fora dele (inclusive em outro botão da
  // barra, que abre o dele) e com Esc, de onde estiver o foco.
  useEffect(() => {
    if (!painel) return;
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (document.getElementById("dl-comprar-filtros")?.contains(alvo) || toggleFiltros.current?.contains(alvo)) return;
      setPainel(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setPainel(false);
      toggleFiltros.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [painel]);

  const [filtrosLocais, setFiltrosLocais] = useState<VehicleFilters>(filtrosDaRota);
  const filtros = local ? filtrosLocais : filtrosDaRota;

  // A lista recomeça quando o servidor manda outra primeira página (filtros novos); no preview,
  // é o catálogo filtrado ali mesmo.
  const [lista, setLista] = useState({ origem: iniciais, carros: iniciais, pagina: 1, temMais: temMaisInicial });
  if (!local && lista.origem !== iniciais) setLista({ origem: iniciais, carros: iniciais, pagina: 1, temMais: temMaisInicial });
  const doPreview = useMemo(() => (local ? ordenarLocal(filtrarLocal(iniciais, filtros), filtros.sort) : []), [local, iniciais, filtros]);
  const carros = local ? doPreview : lista.carros;
  const temMais = !local && lista.temMais;
  const totalVisto = local ? doPreview.length : total;

  const [texto, setTexto] = useState(filtros.q ?? "");
  const [qAntes, setQAntes] = useState(filtros.q);
  if (qAntes !== filtros.q) {
    setQAntes(filtros.q);
    setTexto(filtros.q ?? "");
  }

  const ir = (f: VehicleFilters) => {
    // Com a barra presa, um filtro novo leva ao começo dos resultados.
    if (document.documentElement.dataset.dlEstoque === "presa") irPara("#dl-comprar-resultados");
    if (local) setFiltrosLocais(f);
    else iniciar(() => router.push(urlComprar(base, f), { scroll: false }));
  };

  const buscar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = texto.trim().slice(0, 120);
    if ((q || undefined) !== filtros.q) ir({ ...filtros, q: q || undefined });
  };

  const maisCarros = async () => {
    if (carregando || !temMais) return;
    const origem = lista.origem;
    setCarregando(true);
    try {
      const r = await loadVehiclesPage(filtros, lista.pagina + 1);
      setLista((l) =>
        l.origem !== origem
          ? l
          : {
              ...l,
              carros: [...l.carros, ...r.items.filter((v) => !l.carros.some((x) => x.id === v.id))],
              pagina: l.pagina + 1,
              temMais: r.hasMore,
            },
      );
    } catch {
      // Sem a próxima página, o botão "Ver mais" continua ali para tentar de novo.
    } finally {
      setCarregando(false);
    }
  };

  // Carregamento contínuo: perto do fim da lista, a próxima página vem sozinha.
  const fim = useRef<HTMLDivElement>(null);
  const proxima = useRef(maisCarros);
  useEffect(() => {
    proxima.current = maisCarros;
  });
  useEffect(() => {
    const el = fim.current;
    if (!el || !temMais) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && void proxima.current(), { rootMargin: "600px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [temMais, lista.pagina, lista.origem]);

  // Faixas da ordem atual e a da vez (a última cujo título já passou de 30% da tela para cima).
  const { precos, anos } = useMemo(() => limites(facets, estoque), [facets, estoque]);
  const faixas = useMemo(() => faixasDaOrdem(filtros.sort, precos, facets.years), [filtros.sort, precos, facets.years]);
  const grupos = useMemo(() => agrupar(carros, faixas), [carros, faixas]);
  const comFaixa = grupos.filter((g) => g.faixa);
  const [faixaDaVez, setFaixaDaVez] = useState<string | null>(null);
  // Recalcula a cada rolagem (um quadro por vez): um salto (índice, topo) não cruzaria uma faixa observada.
  useEffect(() => {
    const titulos = [...document.querySelectorAll<HTMLElement>("[data-dl-faixa]")];
    // Sem faixas (ordem "mais recentes"), a faixa guardada não acha grupo e some sozinha.
    if (!titulos.length) return;
    let quadro = 0;
    const calcular = () => {
      quadro = 0;
      const linha = window.innerHeight * 0.3;
      const acima = titulos.filter((t) => t.getBoundingClientRect().top < linha);
      setFaixaDaVez(acima.length ? (acima[acima.length - 1].dataset.dlFaixa ?? null) : null);
    };
    const aoRolar = () => {
      if (!quadro) quadro = requestAnimationFrame(calcular);
    };
    calcular();
    addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      removeEventListener("scroll", aoRolar);
      cancelAnimationFrame(quadro);
    };
  }, [grupos.length, faixas]);
  // Antes de qualquer título passar da linha (o topo da lista), a da vez é a primeira.
  const faixaAtiva = comFaixa.some((g) => g.faixa!.id === faixaDaVez) ? faixaDaVez : comFaixa[0]?.faixa?.id;

  // A faixa da vez fica à vista na linha das faixas (no celular ela rola para o lado).
  const faixasLista = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const lista = faixasLista.current;
    const ativo = lista?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!lista || !ativo) return;
    if (ativo.offsetLeft < lista.scrollLeft || ativo.offsetLeft + ativo.offsetWidth > lista.scrollLeft + lista.clientWidth) {
      lista.scrollTo({ left: Math.max(0, ativo.offsetLeft - 8), behavior: "smooth" });
    }
  }, [faixaAtiva]);

  // Salto até uma faixa: descendo, a barra fica no topo; subindo, volta o header.
  const irParaFaixa = (id: string) => {
    const titulo = document.getElementById(`faixa-${id}`);
    if (!titulo) return;
    const topo = titulo.getBoundingClientRect().top + window.scrollY;
    const barra = document.querySelector<HTMLElement>(".dl-barra");
    const folga = (topo > window.scrollY ? (barra?.offsetHeight ?? 0) : alturaCabecalho()) + 14;
    rolarAte(Math.max(0, topo - folga), () => titulo.focus({ preventScroll: true }));
  };

  // Opções dos filtros, com contagem (bem-vinda nas páginas internas).
  const ligados = ativos(filtros);
  const marcaOpcoes: Opcao[] = useMemo(() => {
    const { withLogo } = groupBrands(facets.brands, facets.brandLogos);
    const comLogo = new Map(withLogo.map((m) => [m.brand, m]));
    return facets.brands.map((b) => {
      const m = comLogo.get(b);
      return {
        valor: b,
        rotulo: m?.label ?? b,
        logo: m?.logo,
        estilo: m ? brandLogoStyle(m.logo) : undefined,
        detalhe: contagemNoun(facets.counts.brand[b] ?? 0, noun),
      };
    });
  }, [facets, noun]);
  const grupoDeMarcas = filtros.brand === "Outros" && (filtros.brands?.length ?? 0) > 0;
  const opcoesMarca = grupoDeMarcas ? [...marcaOpcoes, { valor: OUTRAS, rotulo: "Outras marcas" }] : marcaOpcoes;
  const marcaAtual = grupoDeMarcas ? OUTRAS : filtros.brand;
  const escolherMarca = (v?: string) => {
    if (v === OUTRAS) return;
    ir({ ...filtros, brand: v, brands: undefined });
  };

  const [pLo, pHi] = limitesDePreco(precos.min, precos.max);
  const temPreco = pHi > pLo;
  const precoAtual: Par = [filtros.priceMin ?? pLo, filtros.priceMax ?? pHi];
  const histograma = useMemo(() => {
    if (!completo || !temPreco) return undefined;
    const partes = 16;
    const barras = Array.from({ length: partes }, () => 0);
    for (const v of estoque) {
      if (!(v.price > 0)) continue;
      barras[Math.min(partes - 1, Math.max(0, Math.floor(((v.price - pLo) / (pHi - pLo)) * partes)))] += 1;
    }
    return barras;
  }, [completo, estoque, pLo, pHi, temPreco]);

  const temAno = anos.max > anos.min;
  const kmPasso = facets.kmBounds[1] > 200_000 ? 10_000 : 5_000;
  const kmLimites: Par = [Math.floor(facets.kmBounds[0] / kmPasso) * kmPasso, Math.ceil(facets.kmBounds[1] / kmPasso) * kmPasso];
  const temKm = kmLimites[1] > kmLimites[0];
  const kmCurto = (v: number) => (v >= 1000 ? `${Math.round(v / 1000).toLocaleString("pt-BR")} mil km` : `${v} km`);

  const precoValor = filtros.priceMin || filtros.priceMax ? `${precoCurto(precoAtual[0])} a ${precoCurto(precoAtual[1])}` : "Qualquer";
  const anoValor = filtros.yearMin ? `Desde ${filtros.yearMin}` : "Qualquer";
  const quantosFiltros = [
    filtros.vehicleType,
    filtros.segment,
    filtros.transmission,
    filtros.fuel,
    filtros.color,
    filtros.kmMin || filtros.kmMax ? "km" : undefined,
  ].filter(Boolean).length;

  const grupoChips = (
    titulo: string,
    valores: string[],
    contar: Record<string, number>,
    atual: string | undefined,
    rotular: (v: string) => string,
    aplicar: (v?: string) => void,
  ) =>
    valores.length > 0 && (
      <fieldset className="dl-filtros__grupo">
        <legend className="dl-filtros__titulo">{titulo}</legend>
        <div className="dl-filtros__chips">
          {valores.map((v) => (
            <button key={v} type="button" className="dl-chip" aria-pressed={atual === v} onClick={() => aplicar(atual === v ? undefined : v)}>
              {rotular(v)}
              <small>{contar[v] ?? 0}</small>
            </button>
          ))}
        </div>
      </fieldset>
    );

  const reguaKm = (junto?: ReactNode) =>
    temKm && (
      <div className="dl-filtros__grupo dl-filtros__grupo--regua">
        <ReguaAplicar
          junto={junto}
          key={`km-${filtros.kmMin}-${filtros.kmMax}`}
          rotulo="Quilometragem"
          rotulos={["Quilometragem mínima", "Quilometragem máxima"]}
          min={kmLimites[0]}
          max={kmLimites[1]}
          passo={kmPasso}
          inicial={[filtros.kmMin ?? kmLimites[0], filtros.kmMax ?? kmLimites[1]]}
          formatar={kmCurto}
          resumo={(v) => (Array.isArray(v) && v[0] <= kmLimites[0] && v[1] >= kmLimites[1] ? "Qualquer" : undefined)}
          aoAplicar={(v) => {
            if (!Array.isArray(v)) return;
            ir({ ...filtros, kmMin: v[0] > kmLimites[0] ? v[0] : undefined, kmMax: v[1] < kmLimites[1] ? v[1] : undefined });
          }}
        />
      </div>
    );

  const fecharPainel = (
    <button
      type="button"
      className="dl-btn dl-btn--linha dl-btn--pequeno"
      onClick={() => {
        setPainel(false);
        document.getElementById("dl-comprar-filtros-botao")?.focus({ preventScroll: true });
      }}
    >
      Fechar
    </button>
  );

  const chips = (
    <>
      {facets.vehicleTypes.length > 1 &&
        grupoChips("Tipo", facets.vehicleTypes, facets.counts.vehicleType, filtros.vehicleType, vehicleTypeLabel, (v) => ir({ ...filtros, vehicleType: v }))}
      {grupoChips(
        "Carroceria",
        facets.segments,
        facets.counts.segment,
        filtros.segment,
        (v) => v,
        (v) => ir({ ...filtros, segment: v }),
      )}
      {grupoChips("Câmbio", facets.transmissions, facets.counts.transmission, filtros.transmission, transmissionLabel, (v) =>
        ir({ ...filtros, transmission: v }),
      )}
      {grupoChips("Combustível", facets.fuels, facets.counts.fuel, filtros.fuel, fuelLabel, (v) => ir({ ...filtros, fuel: v }))}
      {grupoChips(
        "Cor",
        facets.colors,
        facets.counts.color,
        filtros.color,
        (v) => v,
        (v) => ir({ ...filtros, color: v }),
      )}
    </>
  );

  const reguaPreco = (fechar?: () => void) =>
    temPreco && (
      <ReguaAplicar
        key={`p-${filtros.priceMin}-${filtros.priceMax}`}
        rotulo="Preço"
        rotulos={["Preço mínimo", "Preço máximo"]}
        min={pLo}
        max={pHi}
        passo={passoDePreco(pHi)}
        inicial={precoAtual}
        formatar={precoCurto}
        histograma={histograma}
        resumo={(v) => (Array.isArray(v) && v[0] <= pLo && v[1] >= pHi ? "Qualquer preço" : undefined)}
        aoAplicar={(v) => {
          if (!Array.isArray(v)) return;
          fechar?.();
          ir({ ...filtros, priceMin: v[0] > pLo ? v[0] : undefined, priceMax: v[1] < pHi ? v[1] : undefined });
        }}
      />
    );
  const reguaAno = (fechar?: () => void) =>
    temAno && (
      <ReguaAplicar
        key={`a-${filtros.yearMin}`}
        rotulo="Ano"
        rotulos="Ano a partir de"
        min={anos.min}
        max={anos.max}
        passo={1}
        inicial={filtros.yearMin ?? anos.min}
        formatar={(v) => String(v)}
        resumo={(v) => (typeof v === "number" ? (v <= anos.min ? "Qualquer ano" : `A partir de ${v}`) : undefined)}
        aoAplicar={(v) => {
          if (typeof v !== "number") return;
          fechar?.();
          ir({ ...filtros, yearMin: v > anos.min ? v : undefined });
        }}
      />
    );

  return (
    <div className="dl-comprar" data-pendente={pendente || undefined}>
      <header className="dl-wrap dl-comprar__cabeca">
        <h1 className="dl-comprar__titulo">Nosso estoque</h1>
        <p className="dl-etiqueta dl-comprar__total" aria-live="polite">
          {contagem(totalVisto)}
        </p>
      </header>

      <EstoqueDock />
      <div className="dl-barra">
        <div className="dl-wrap dl-barra__dentro">
          <form className="dl-barra__busca" role="search" onSubmit={buscar}>
            <SearchIcon size={18} className="dl-barra__lupa" />
            <label htmlFor="dl-comprar-q" className="dl-sr">
              Buscar por marca ou modelo
            </label>
            <input
              id="dl-comprar-q"
              type="search"
              placeholder="Marca ou modelo"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              enterKeyHint="search"
              maxLength={120}
              autoComplete="off"
            />
            {texto && (
              <button
                type="button"
                className="dl-barra__limpar"
                aria-label="Limpar a busca"
                onClick={() => {
                  setTexto("");
                  if (filtros.q) ir({ ...filtros, q: undefined });
                }}
              >
                <XIcon size={16} />
              </button>
            )}
          </form>

          {opcoesMarca.length > 0 && (
            <Escolha
              prefixo="dl"
              className="dl-barra__marca dl-barra__largo"
              rotulo="Marca"
              opcoes={opcoesMarca}
              valor={marcaAtual}
              vazio="Todas"
              aoEscolher={escolherMarca}
            />
          )}
          {temPreco && (
            <div className="dl-barra__largo">
              <Pop rotulo="Preço" valor={precoValor} ativo={Boolean(filtros.priceMin || filtros.priceMax)}>
                {reguaPreco}
              </Pop>
            </div>
          )}
          {temAno && (
            <div className="dl-barra__largo">
              <Pop rotulo="Ano" valor={anoValor} ativo={Boolean(filtros.yearMin)}>
                {reguaAno}
              </Pop>
            </div>
          )}
          <button
            ref={toggleFiltros}
            id="dl-comprar-filtros-botao"
            type="button"
            className={cx("dl-barra__botao dl-barra__largo", quantosFiltros > 0 && "dl-barra__botao--ativo")}
            aria-expanded={painel}
            aria-controls="dl-comprar-filtros"
            onClick={() => setPainel((p) => !p)}
          >
            <FiltrosIcon size={18} />
            <span className="dl-barra__valor">Filtros{quantosFiltros ? ` (${quantosFiltros})` : ""}</span>
          </button>
          <button
            type="button"
            className={cx("dl-barra__botao dl-barra__estreito", ligados.length > 0 && "dl-barra__botao--ativo")}
            aria-haspopup="dialog"
            onClick={() => setFolha(true)}
          >
            <FiltrosIcon size={18} />
            <span className="dl-barra__valor">Filtrar{ligados.length ? ` (${ligados.length})` : ""}</span>
          </button>
          <Escolha
            prefixo="dl"
            className="dl-barra__ordem"
            rotulo="Ordenar"
            icone={<OrdemIcon size={18} className="dl-barra__icone-ordem" />}
            opcoes={ORDENS.filter((o) => o.id !== "menor-preco").map((o) => ({ valor: o.id, rotulo: o.rotulo }))}
            valor={filtros.sort && filtros.sort !== "menor-preco" ? filtros.sort : undefined}
            vazio="Menor preço"
            tituloFolha="Ordenar por"
            aoEscolher={(v) => ir({ ...filtros, sort: (v as VehicleFilters["sort"]) ?? "menor-preco" })}
          />
        </div>

        {comFaixa.length > 1 && (
          <nav className="dl-wrap dl-barra__faixas" aria-label="Faixas da lista">
            <span className="dl-barra__faixas-rotulo" aria-hidden="true">
              Faixas
            </span>
            <div ref={faixasLista} className="dl-barra__faixas-lista">
              {comFaixa.map((g) => (
                <a
                  key={g.faixa!.id}
                  href={`#faixa-${g.faixa!.id}`}
                  aria-current={faixaAtiva === g.faixa!.id ? "true" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    irParaFaixa(g.faixa!.id);
                  }}
                >
                  {g.faixa!.rotulo}
                </a>
              ))}
            </div>
          </nav>
        )}

        {painel && (
          <div id="dl-comprar-filtros" className="dl-barra__painel dl-barra__largo" data-lenis-prevent="">
            <div className="dl-wrap dl-filtros dl-filtros--painel">
              <div className="dl-filtros__grupos">{chips}</div>
              <div className="dl-filtros__lado">
                {reguaKm(fecharPainel)}
                {!temKm && <div className="dl-pop__acoes">{fecharPainel}</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="dl-wrap dl-comprar__corpo" id="dl-comprar-resultados">
        {ligados.length > 0 && (
          <div className="dl-comprar__ligados">
            {ligados.map((l) => (
              <button key={l.chave} type="button" className="dl-chip dl-chip--remover" onClick={() => ir(sem(filtros, l.chave))}>
                {l.rotulo}
                <XIcon size={14} />
                <span className="dl-sr">(remover)</span>
              </button>
            ))}
            <button type="button" className="dl-comprar__limpar" onClick={() => ir({ sort: filtros.sort })}>
              Limpar tudo
            </button>
          </div>
        )}

        {carros.length === 0 ? (
          <div className="dl-comprar__vazio">
            <p className="dl-comprar__vazio-titulo">{ligados.length > 0 ? `Nenhum ${noun.singular} com esses filtros` : "O estoque está sendo atualizado"}</p>
            <p>{ligados.length > 0 ? "Tire um filtro ou busque por outra marca." : "Volte daqui a pouco ou fale com a gente pelo WhatsApp."}</p>
            {ligados.length > 0 && (
              <button type="button" className="dl-btn dl-btn--acao" onClick={() => ir({ sort: filtros.sort })}>
                Limpar os filtros
              </button>
            )}
          </div>
        ) : (
          <div className="dl-comprar__lista">
            {grupos.map((g, gi) => {
              const faixa = g.faixa;
              const filtroDaFaixa = faixa?.filtro;
              const soEsta =
                comFaixa.length > 1 && filtroDaFaixa && (filtroDaFaixa.priceMin !== filtros.priceMin || filtroDaFaixa.priceMax !== filtros.priceMax);
              return (
                <section
                  key={faixa?.id ?? `todos-${gi}`}
                  className="dl-comprar__grupo"
                  aria-labelledby={faixa ? `faixa-${faixa.id}` : undefined}
                  aria-label={faixa ? undefined : `Lista de ${noun.plural}`}
                  data-dl-setor={faixa?.rotulo}
                >
                  {faixa && (
                    <div className="dl-comprar__faixa">
                      <h2 id={`faixa-${faixa.id}`} className="dl-comprar__faixa-texto" data-dl-faixa={faixa.id} tabIndex={-1}>
                        {faixa.rotulo}
                      </h2>
                      <span className="dl-comprar__faixa-traco" aria-hidden="true" />
                      {!temMais && <span className="dl-comprar__faixa-conta">{contagem(g.carros.length)}</span>}
                      {soEsta && (
                        <button
                          type="button"
                          className="dl-comprar__faixa-so"
                          onClick={() => ir({ ...filtros, priceMin: filtroDaFaixa.priceMin, priceMax: filtroDaFaixa.priceMax })}
                        >
                          Só esta faixa
                        </button>
                      )}
                    </div>
                  )}
                  <div className="dl-grade">
                    {g.carros.map((carro, i) => (
                      <Cartao key={carro.id} carro={carro} base={base} prioridade={gi === 0 && i === 0} />
                    ))}
                  </div>
                </section>
              );
            })}
            <div ref={fim} className="dl-comprar__fim">
              {temMais && (
                <button type="button" className="dl-btn dl-btn--linha" onClick={() => void maisCarros()} disabled={carregando}>
                  {carregando ? "Carregando..." : `Ver mais ${noun.plural}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialogo aberto={folha} aoFechar={() => setFolha(false)} rotulo="Filtros" className="dl dl-folha">
        <div className="dl-folha__corpo" data-lenis-prevent="">
          <div className="dl-folha__topo">
            <p>Filtrar</p>
            <button type="button" className="dl-folha__fechar" aria-label="Fechar" onClick={() => setFolha(false)}>
              <XIcon size={20} />
            </button>
          </div>
          <div className="dl-filtros">
            {opcoesMarca.length > 0 && (
              <Escolha
                prefixo="dl"
                rotulo="Marca"
                opcoes={opcoesMarca}
                valor={marcaAtual}
                vazio="Todas"
                tituloFolha="Escolha a marca"
                aoEscolher={escolherMarca}
              />
            )}
            {temPreco && <div className="dl-filtros__grupo dl-filtros__grupo--regua">{reguaPreco()}</div>}
            {temAno && <div className="dl-filtros__grupo dl-filtros__grupo--regua">{reguaAno()}</div>}
            {chips}
            {reguaKm()}
          </div>
          <div className="dl-folha__pe">
            {ligados.length > 0 && (
              <button type="button" className="dl-btn dl-btn--linha" onClick={() => ir({ sort: filtros.sort })}>
                Limpar
              </button>
            )}
            <button type="button" className="dl-btn dl-btn--acao dl-folha__ver" onClick={() => setFolha(false)}>
              Ver {contagem(totalVisto)}
            </button>
          </div>
        </div>
      </Dialogo>
    </div>
  );
}
