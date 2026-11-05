"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { isRenderableImageSrc } from "@/lib/image-src";
import { vehiclePhotoPosition } from "@/lib/placeholders";
import type { Vehicle } from "@/lib/types";
import type { Categoria } from "@/theme/base/montar";
import { carroHref, comprar, preco, versao } from "@/theme/base/util";
import Dialogo from "@/theme/base/Dialogo";
import { XIcon } from "@/theme/base/icones";
import CartasCarroceria from "@/theme/CartasCarroceria";
import styles from "./categorias-propostas.module.css";

type Props = { categorias: Categoria[]; carros: Vehicle[] };
type OptionProps = Props & { tipo: "a" | "b" | "c"; titulo: string; descricao: string };

function Foto({ categoria }: { categoria: Categoria }) {
  return isRenderableImageSrc(categoria.foto) ? (
    <Image
      src={categoria.foto}
      alt={categoria.carro ? `${categoria.nome}: ${categoria.carro}` : categoria.nome}
      fill
      sizes="(min-width: 900px) 300px, 78vw"
      style={{ objectPosition: vehiclePhotoPosition(categoria.foco, 0, 1.28) ?? "50% 55%" }}
    />
  ) : null;
}

function carrosPorCategoria(categorias: Categoria[], carros: Vehicle[]) {
  return new Map(categorias.map((categoria) => [categoria.nome, carros.filter((carro) => carro.segment === categoria.nome)]));
}

function LinhaCarro({ carro }: { carro: Vehicle }) {
  return (
    <Link className={styles.carro} href={carroHref("", carro)}>
      <span>{versao(carro) || carro.title}</span>
      <strong>{preco(carro)}</strong>
    </Link>
  );
}

function CartaUmaPorVez({ categorias, carros }: Props) {
  const porCategoria = useMemo(() => carrosPorCategoria(categorias, carros), [categorias, carros]);
  const [aberta, setAberta] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  const botoes = useRef(new Map<string, HTMLButtonElement>());
  const abrir = (nome: string) => {
    setAberta((atual) => (atual === nome ? null : nome));
    setIndice(0);
  };
  const fechar = (nome: string) => {
    setAberta(null);
    requestAnimationFrame(() => botoes.current.get(nome)?.focus({ preventScroll: true }));
  };
  return (
    <div className={styles.fileira}>
      {categorias.map((categoria) => {
        const lista = porCategoria.get(categoria.nome) ?? [];
        const carro = lista[indice % Math.max(lista.length, 1)];
        const ativa = aberta === categoria.nome;
        return (
          <article key={categoria.nome} className={`${styles.carta} ${ativa ? styles.cartaAtiva : ""}`}>
            <div className={styles.frente} aria-hidden={ativa || undefined}><div className={styles.foto}><Foto categoria={categoria} /></div>
            <div className={styles.pe}><h3>{categoria.nome}</h3><button ref={el => { if (el) botoes.current.set(categoria.nome, el); else botoes.current.delete(categoria.nome); }} type="button" tabIndex={ativa ? -1 : undefined} onClick={() => abrir(categoria.nome)} aria-expanded={ativa}>Ver opções</button></div></div>
            {ativa && (
              <div className={styles.verso}>
                <h3>{categoria.nome}</h3>
                {carro ? <LinhaCarro carro={carro} /> : <p>Veja os veículos disponíveis no estoque.</p>}
                <div className={styles.controles}>
                  {lista.length > 1 && <><button type="button" onClick={() => setIndice((atual) => (atual - 1 + lista.length) % lista.length)}>Anterior</button><button type="button" onClick={() => setIndice((atual) => (atual + 1) % lista.length)}>Próximo</button></>}
                  <Link href={comprar("", categoria.params)}>Ver estoque</Link>
                  <button type="button" autoFocus onClick={() => fechar(categoria.nome)}>Voltar</button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function PainelPartilhado({ categorias, carros }: Props) {
  const porCategoria = useMemo(() => carrosPorCategoria(categorias, carros), [categorias, carros]);
  const [escolhida, setEscolhida] = useState(categorias[0]?.nome ?? "");
  const [pagina, setPagina] = useState(0);
  const categoria = categorias.find((item) => item.nome === escolhida) ?? categorias[0];
  const lista = categoria ? porCategoria.get(categoria.nome) ?? [] : [];
  const visiveis = lista.slice(pagina * 2, pagina * 2 + 2);
  const escolher = (nome: string) => { setEscolhida(nome); setPagina(0); };
  return (
    <div className={styles.comPartilhado}>
      <div className={styles.fileira}>
        {categorias.map((item) => <button key={item.nome} type="button" className={`${styles.carta} ${item.nome === escolhida ? styles.cartaAtiva : ""}`} onClick={() => escolher(item.nome)} aria-pressed={item.nome === escolhida}><span className={styles.foto}><Foto categoria={item} /></span><span className={styles.pe}><b>{item.nome}</b><i>Explorar</i></span></button>)}
      </div>
      {categoria && <section className={styles.painel} aria-live="polite"><div><p>Carroceria selecionada</p><h3>{categoria.nome}</h3><Link href={comprar("", categoria.params)}>Ver estoque</Link></div><div className={styles.lista}>{visiveis.length ? visiveis.map((carro) => <LinhaCarro key={carro.id} carro={carro} />) : <p>Consulte os veículos disponíveis no estoque desta carroceria.</p>}</div>{lista.length > 2 && <div className={styles.paginar}><button type="button" disabled={pagina === 0} onClick={() => setPagina((valor) => valor - 1)}>Anterior</button><button type="button" disabled={(pagina + 1) * 2 >= lista.length} onClick={() => setPagina((valor) => valor + 1)}>Próximo</button></div>}</section>}
    </div>
  );
}

function Gaveta({ categorias, carros }: Props) {
  const porCategoria = useMemo(() => carrosPorCategoria(categorias, carros), [categorias, carros]);
  const [escolhida, setEscolhida] = useState<Categoria | null>(null);
  const [pagina, setPagina] = useState(0);
  const lista = escolhida ? porCategoria.get(escolhida.nome) ?? [] : [];
  const visiveis = lista.slice(pagina * 2, pagina * 2 + 2);
  const fechar = () => setEscolhida(null);
  const abrir = (categoria: Categoria, botao: HTMLButtonElement) => {
    // Safari não foca botões no clique; o diálogo precisa registrar a origem correta.
    botao.focus({ preventScroll: true });
    setEscolhida(categoria);
    setPagina(0);
  };
  return <>
    <div className={styles.fileira}>{categorias.map((categoria) => <button key={categoria.nome} type="button" className={styles.carta} onClick={evento => abrir(categoria, evento.currentTarget)}><span className={styles.foto}><Foto categoria={categoria} /></span><span className={styles.pe}><b>{categoria.nome}</b><i>Escolher carro</i></span></button>)}</div>
    <Dialogo aberto={Boolean(escolhida)} aoFechar={fechar} rotulo={escolhida ? `Veículos ${escolhida.nome}` : "Veículos"} className={styles.gaveta}>
      {escolhida && <><header><div><p>{escolhida.nome}</p><h3>Escolha com calma</h3></div><button type="button" onClick={fechar} aria-label="Fechar"><XIcon size={20} /></button></header><div className={styles.lista}>{visiveis.length ? visiveis.map((carro) => <LinhaCarro key={carro.id} carro={carro} />) : <p>Consulte os veículos disponíveis no estoque desta carroceria.</p>}</div><footer><Link href={comprar("", escolhida.params)}>Ver estoque</Link>{lista.length > 2 && <span><button type="button" disabled={pagina === 0} onClick={() => setPagina((valor) => valor - 1)}>Anterior</button><button type="button" disabled={(pagina + 1) * 2 >= lista.length} onClick={() => setPagina((valor) => valor + 1)}>Próximo</button></span>}</footer></>}
    </Dialogo>
  </>;
}

function Opcao({ tipo, titulo, descricao, categorias, carros }: OptionProps) {
  return <section className={styles.opcao}><header className={styles.cabeca}><span>{tipo.toUpperCase()}</span><div><h2>{titulo}</h2><p>{descricao}</p></div></header>{tipo === "a" ? <CartaUmaPorVez categorias={categorias} carros={carros} /> : tipo === "b" ? <PainelPartilhado categorias={categorias} carros={carros} /> : <Gaveta categorias={categorias} carros={carros} />}</section>;
}

export default function CategoriasPropostas({ categorias, carros, simulador = false }: Props & { simulador?: boolean }) {
  const [celular, setCelular] = useState(false);
  return (
    <main className={`dl ${styles.pagina}`}>
      <nav className={styles.navegacao}><Link href="/">Voltar ao Delta</Link><Link href="/propostas/botoes">Opções de botões</Link>{simulador && <button type="button" aria-pressed={celular} onClick={() => setCelular(!celular)}>{celular ? "Fechar celular" : "Ver no celular"}</button>}</nav>
      <div className={styles.intro}><p>Delta, revisão de categorias</p><h1>Escolha pela carroceria</h1><span>As três opções mantêm as fotos grandes e separam os preços em uma linha que não corta.</span></div>
      {simulador && celular && <div className={styles.celular}><iframe title="Simulador das opções no celular" src="/propostas/categorias?modo=celular" /></div>}
      <Opcao tipo="a" titulo="Carta com rota" descricao="A carta revela um veículo por vez. Setas trocam de carro e preservam espaço para o valor." categorias={categorias} carros={carros} />
      <Opcao tipo="b" titulo="Painel de boxes" descricao="A foto escolhe a carroceria; até dois veículos aparecem em um painel claro abaixo." categorias={categorias} carros={carros} />
      <Opcao tipo="c" titulo="Gaveta de escolha" descricao="As cartas permanecem leves. A seleção abre uma gaveta confortável, com navegação por páginas." categorias={categorias} carros={carros} />
      <section className={styles.atual}><h2>Atual, com a paleta corrigida</h2><p>A versão que está no site, com dois carros por carta e preço em linha própria.</p><CartasCarroceria base="" categorias={categorias} carros={carros} /></section>
    </main>
  );
}
