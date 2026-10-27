"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { m } from "motion/react";
import type { TenantConfig } from "@/lib/types";
import Dialogo from "./base/Dialogo";
import { ArrowRightIcon, ClockIcon, MailIcon, MenuIcon, PhoneIcon, SearchIcon, WhatsAppIcon, XIcon } from "./base/icones";
import LogoLoja from "./base/LogoLoja";
import { externo, inicio, telefone, zap } from "./base/util";

/** Mola das placas: andam juntas quando se fundem na aba e quando voltam aos cantos. */
const MOLA = { type: "spring", stiffness: 380, damping: 38, mass: 0.9 } as const;

/**
 * Header do Delta: placas presas na borda de cima. No topo da página, três placas: o logo no
 * canto esquerdo, o menu numa aba no centro da tela e as ações no canto direito. Depois de
 * 56 px de rolagem as placas correm pela borda e se fundem numa aba única no centro (o recolher
 * que o usuário gostou no Halo, com outra forma). No Comprar, quando a barra do estoque chega
 * ao topo, a aba sobe ao descer e volta ao subir (CSS por `data-dl-estoque`, ver `EstoqueDock`).
 * "Buscar" abre o campo dentro da própria aba. Placas de vidro pelos tokens do painel
 * (`headerStyle`, `--header-bg`, `--header-text`).
 */
export default function Cabecalho({ config, base }: { config: TenantConfig; base: string }) {
  const path = usePathname();
  const home = inicio(base);
  const [recolhido, setRecolhido] = useState(false);
  const temAbertura = path === home;
  const [aberturaAtras, setAberturaAtras] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [menu, setMenu] = useState(false);
  const [caminhoMenu, setCaminhoMenu] = useState(path);
  const sentinela = useRef<HTMLSpanElement>(null);
  const botaoBusca = useRef<HTMLButtonElement>(null);

  // Trocou de página: menu e busca fecham.
  if (caminhoMenu !== path) {
    setCaminhoMenu(path);
    setMenu(false);
    setBuscando(false);
  }

  const nav = [
    { href: home, rotulo: "Início" },
    { href: `${base}/comprar`, rotulo: "Comprar" },
    ...(config.sections.paginaVender ? [{ href: `${base}/vender`, rotulo: "Vender" }] : []),
    ...(config.sections.paginaSobre ? [{ href: `${base}/sobre-nos`, rotulo: "Sobre nós" }] : []),
  ];
  const ativo = (href: string) => (href === home ? path === home : path.startsWith(href));
  const whatsapp = zap(config);
  const contato = whatsapp
    ? { href: whatsapp, externo: true }
    : telefone(config)
      ? { href: telefone(config)!, externo: false }
      : config.email
        ? { href: `mailto:${config.email}`, externo: false }
        : null;

  // Recolhe depois de 56 px: uma sentinela no topo da página avisa, sem ler a rolagem a cada quadro.
  useEffect(() => {
    const el = sentinela.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setRecolhido(!e.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Tom escuro enquanto o vídeo da abertura está atrás das placas (só na inicial).
  useEffect(() => {
    const hero = document.getElementById("dl-abertura");
    if (!temAbertura || !hero) return;
    const obs = new IntersectionObserver(([e]) => setAberturaAtras(e.isIntersecting), { rootMargin: "0px 0px -90% 0px" });
    obs.observe(hero);
    return () => obs.disconnect();
  }, [temAbertura]);

  const estado = buscando ? "busca" : recolhido ? "recolhido" : "aberto";
  const tom = temAbertura && aberturaAtras && !recolhido && !buscando ? "video" : "claro";

  return (
    <>
      <span ref={sentinela} className="dl-cab__sentinela" aria-hidden="true" />
      <header
        className="dl-cab"
        data-estado={estado}
        data-tom={tom}
        data-estilo={config.appearance?.headerStyle ?? "glass"}
      >
        <div className="dl-cab__barra">
          <m.div layout="position" transition={MOLA} className="dl-cab__placa dl-cab__placa--logo">
            <Link href={home} className="dl-cab__logo" aria-label={`${config.name}, página inicial`}>
              <LogoLoja nome={config.name} logoUrl={config.logoUrl} className="dl-cab__logo-img" altura={30} />
            </Link>
          </m.div>

          <m.div layout="position" transition={MOLA} className="dl-cab__placa dl-cab__placa--centro">
            {buscando ? (
              <BuscaNaAba
                base={base}
                aoFechar={() => {
                  setBuscando(false);
                  requestAnimationFrame(() => botaoBusca.current?.focus({ preventScroll: true }));
                }}
              />
            ) : (
              <nav className="dl-cab__nav" aria-label="Navegação principal">
                {nav.map((item) => (
                  <Link key={item.href} href={item.href} className="dl-cab__link" aria-current={ativo(item.href) ? "page" : undefined}>
                    {item.rotulo}
                  </Link>
                ))}
              </nav>
            )}
          </m.div>

          <m.div layout="position" transition={MOLA} className="dl-cab__placa dl-cab__placa--acoes">
            <button
              ref={botaoBusca}
              type="button"
              className="dl-cab__acao dl-cab__acao--busca"
              aria-label="Buscar um carro"
              aria-expanded={buscando}
              onClick={() => setBuscando((b) => !b)}
            >
              {buscando ? <XIcon size={18} /> : <SearchIcon size={18} />}
              <span className="dl-cab__acao-texto">{buscando ? "Fechar" : "Buscar"}</span>
            </button>
            {contato && (
              <a
                className="dl-cab__acao dl-cab__acao--conversa"
                href={contato.href}
                aria-label="Vamos conversar"
                {...(contato.externo ? externo : {})}
              >
                {whatsapp ? <WhatsAppIcon size={18} /> : <PhoneIcon size={17} />}
                <span className="dl-cab__acao-texto">Vamos conversar</span>
              </a>
            )}
            <button
              type="button"
              className="dl-cab__acao dl-cab__acao--menu"
              aria-label="Abrir menu"
              aria-haspopup="dialog"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              <MenuIcon size={20} />
            </button>
          </m.div>
        </div>
      </header>

      <Dialogo aberto={menu} aoFechar={() => setMenu(false)} rotulo="Menu" className="dl dl-cortina" saida={320}>
        <div className="dl-cortina__corpo">
          <div className="dl-cortina__topo">
            <Link href={home} className="dl-cortina__logo" onClick={() => setMenu(false)} aria-label={`${config.name}, página inicial`}>
              <LogoLoja nome={config.name} logoUrl={config.logoUrl} className="dl-cortina__logo-img" altura={28} />
            </Link>
            <button type="button" className="dl-cortina__fechar" aria-label="Fechar menu" onClick={() => setMenu(false)}>
              <XIcon size={22} />
            </button>
          </div>
          <nav className="dl-cortina__nav" aria-label="Menu">
            {nav.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenu(false)}
                aria-current={ativo(item.href) ? "page" : undefined}
                className="dl-cortina__link"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span>{item.rotulo}</span>
                <ArrowRightIcon size={22} />
              </Link>
            ))}
          </nav>
          <div className="dl-cortina__pe">
            {whatsapp && (
              <a className="dl-btn dl-btn--acao dl-btn--bloco" href={whatsapp} {...externo}>
                <WhatsAppIcon size={20} />
                Conversar no WhatsApp
              </a>
            )}
            {telefone(config) && config.phone && (
              <a className="dl-cortina__linha" href={telefone(config)}>
                <PhoneIcon size={18} />
                {config.phone}
              </a>
            )}
            {config.email && (
              <a className="dl-cortina__linha" href={`mailto:${config.email}`}>
                <MailIcon size={18} />
                {config.email}
              </a>
            )}
            {config.hours.weekdays && (
              <p className="dl-cortina__linha">
                <ClockIcon size={18} />
                {config.hours.weekdays}
              </p>
            )}
          </div>
        </div>
      </Dialogo>
    </>
  );
}

/**
 * Campo de busca dentro da aba do header: sem diálogo e sem sugestões (o header não recebe o
 * estoque). Enter leva ao Comprar com `q`; Esc fecha e devolve o foco ao botão "Buscar".
 * Funciona sem JavaScript (formulário GET para o Comprar).
 */
function BuscaNaAba({ base, aoFechar }: { base: string; aoFechar: () => void }) {
  const router = useRouter();
  const id = useId();
  const campo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    campo.current?.focus({ preventScroll: true });
  }, []);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const q = texto.trim();
    aoFechar();
    router.push(q ? `${base}/comprar?q=${encodeURIComponent(q)}` : `${base}/comprar`);
  };

  return (
    <form className="dl-busca-aba" role="search" action={`${base}/comprar`} onSubmit={enviar}>
      <SearchIcon size={18} className="dl-busca-aba__lupa" />
      <label htmlFor={`${id}-q`} className="dl-sr">
        Marca, modelo ou ano
      </label>
      <input
        ref={campo}
        id={`${id}-q`}
        name="q"
        type="search"
        className="dl-busca-aba__campo"
        placeholder="Marca, modelo ou ano"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={120}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            aoFechar();
          }
        }}
      />
      <button type="submit" className="dl-busca-aba__ir" aria-label="Buscar no estoque">
        <ArrowRightIcon size={18} />
      </button>
    </form>
  );
}
