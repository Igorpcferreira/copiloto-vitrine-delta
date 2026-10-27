"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import PrivacyNotice from "@/components/PrivacyNotice";
import { whatsappLink } from "@/lib/format";
import { isRenderableImageSrc } from "@/lib/image-src";
import { stockNoun } from "@/lib/stock-noun";
import type { TenantConfig, Vehicle } from "@/lib/types";
import type { VeiculoProps } from "@/props";
import Dialogo from "./base/Dialogo";
import { CheckIcon, FotosIcon, PhoneIcon, TelaCheiaIcon, WhatsAppIcon, XIcon } from "./base/icones";
import { DEMO, useLead, type CampoLead } from "./base/useLead";
import { ano, cambio, combustivel, comprar, cx, inicio, km, posicao, precoAnterior, preco, selo, telefone, versao, zapCarro } from "./base/util";
import { useDefinirZapDoCarro } from "./base/zap-contexto";
import Cartao from "./Cartao";
import LinhaChegada from "./LinhaChegada";
import { irPara } from "./scroll";
import Visor from "./Visor";

type Lead = ReturnType<typeof useLead>;

/** No celular aparecem as três primeiras fotos; o resto fica no visor ("Ver mais fotos"). */
const NO_CELULAR = 3;

/** "Tenho interesse": os campos e o envio do contrato (`submitLead`), e a conversa no WhatsApp como no Horizon. */
function FormInteresse({
  lead,
  config,
  carro,
  prefixo,
  aoVoltar,
}: {
  lead: Lead;
  config: TenantConfig;
  carro: Vehicle;
  prefixo: string;
  aoVoltar?: () => void;
}) {
  const id = (c: string) => `${prefixo}-${c}`;
  const aviso = (c: CampoLead) =>
    lead.erro(c) ? (
      <span id={id(`${c}-erro`)} className="dl-campo__erro">
        {lead.erro(c)}
      </span>
    ) : null;
  const invalido = (c: CampoLead) => (lead.erro(c) ? { "aria-invalid": true as const, "aria-describedby": id(`${c}-erro`) } : {});

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Como o formulário do Horizon (26/10/2026): ao enviar, abre também a conversa no WhatsApp
    // com a mensagem, o nome e o telefone. A demo não abre nada.
    const campo = lead.enviar(() => {
      if (!DEMO && config.whatsapp)
        window.open(whatsappLink(config.whatsapp, `${lead.mensagem}\n\n${lead.nome.trim()}, ${lead.telefone}`), "_blank", "noopener");
    });
    if (campo) document.getElementById(id(campo))?.focus();
  };

  if (lead.enviado)
    return (
      <div className="dl-interesse__feito" role="status">
        <p className="dl-interesse__titulo">
          <CheckIcon size={18} />
          Recebemos o seu interesse
        </p>
        <p>
          {DEMO
            ? "Esta é uma demonstração: nenhum dado foi enviado."
            : `A equipe da ${config.name} vai falar com você sobre o ${versao(carro) || carro.title}.`}
        </p>
        <button type="button" className="dl-btn dl-btn--linha dl-btn--pequeno" onClick={lead.reiniciar}>
          Enviar outra mensagem
        </button>
      </div>
    );

  return (
    <form className="dl-interesse" onSubmit={enviar} noValidate>
      <div className="dl-interesse__linha">
        <label className="dl-campo">
          <span className="dl-campo__rotulo">Nome</span>
          <input id={id("nome")} value={lead.nome} onChange={(e) => lead.setNome(e.target.value)} autoComplete="name" maxLength={80} {...invalido("nome")} />
          {aviso("nome")}
        </label>
        <label className="dl-campo">
          <span className="dl-campo__rotulo">WhatsApp</span>
          <input
            id={id("telefone")}
            value={lead.telefone}
            onChange={(e) => lead.setTelefone(e.target.value)}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(62) 90000-0000"
            {...invalido("telefone")}
          />
          {aviso("telefone")}
        </label>
      </div>
      <label className="dl-campo">
        <span className="dl-campo__rotulo">E-mail (opcional)</span>
        <input
          id={id("email")}
          type="email"
          value={lead.email}
          onChange={(e) => lead.setEmail(e.target.value)}
          autoComplete="email"
          maxLength={120}
          {...invalido("email")}
        />
        {aviso("email")}
      </label>
      <label className="dl-campo">
        <span className="dl-campo__rotulo">Mensagem</span>
        <textarea value={lead.mensagem} onChange={(e) => lead.setMensagem(e.target.value)} rows={2} maxLength={500} />
      </label>
      {lead.falhou && (
        <p className="dl-campo__erro" role="alert">
          Não deu para enviar agora. Tente de novo ou fale pelo WhatsApp.
        </p>
      )}
      <div className="dl-interesse__acoes">
        {aoVoltar && (
          <button type="button" className="dl-btn dl-btn--linha" onClick={aoVoltar}>
            Voltar
          </button>
        )}
        <button type="submit" className="dl-btn dl-btn--acao dl-interesse__enviar" disabled={lead.pendente}>
          {lead.pendente ? "Enviando..." : "Enviar interesse"}
        </button>
      </div>
      <PrivacyNotice privacyUrl={config.privacyUrl} className="dl-interesse__privacidade" />
    </form>
  );
}

/**
 * Página do veículo do Delta: as fotos empilhadas na coluna da esquerda, em 4:3 com o foco no carro
 * (`photoFocalPoints`; cada uma abre o visor, que mostra a foto inteira) e, à direita, uma placa
 * presa na tela com marca, nome no `h1` e a versão embaixo, preço em lâmina, ficha
 * curta, um índice de miniaturas que acompanha a foto da vez e leva a cada uma, "Tenho
 * interesse" (o formulário abre na própria placa), WhatsApp com a mensagem do carro e o
 * telefone. Embaixo, a ficha completa em abas (Resumo, Itens e Descrição, só as que têm
 * conteúdo) e outros carros. No celular: nome e preço primeiro, as três primeiras fotos e "Ver
 * mais fotos", as abas e uma barra fixa com "Tenho interesse", lado a lado com o WhatsApp.
 */
export default function Veiculo({ config, base, vehicle: v, others }: VeiculoProps) {
  const id = useId();
  const tipo = v.vehicleType ?? "car";
  const nome = stockNoun([tipo]);
  const fotos = v.photos.filter((f) => isRenderableImageSrc(f));
  const n = fotos.length;
  const [atual, setAtual] = useState(0);
  const [visor, setVisor] = useState<number | null>(null);
  const [interesse, setInteresse] = useState(false);
  const [folha, setFolha] = useState(false);
  const [aba, setAba] = useState(0);
  const fotosRef = useRef<HTMLDivElement>(null);
  const lead = useLead({ vehicleId: v.id, mensagemInicial: `Olá! Tenho interesse no ${v.title}. Ainda está disponível?` });
  const zapHref = zapCarro(config, v);
  const tel = telefone(config);
  const anterior = precoAnterior(v);
  useDefinirZapDoCarro(zapHref, `Perguntar sobre ${nome.feminine ? "esta" : "este"} ${nome.singular}`);

  // O índice acompanha a foto que está passando pelo meio da tela.
  useEffect(() => {
    const caixa = fotosRef.current;
    if (!caixa || n < 2) return;
    const itens = [...caixa.querySelectorAll<HTMLElement>("[data-foto]")];
    const obs = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.foto));
        if (visivel.length) setAtual(Math.max(...visivel));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    itens.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [n]);

  // A miniatura da vez fica à vista dentro da fileira (rola só a fileira, nunca a página).
  const miniaturas = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fila = miniaturas.current;
    const mini = fila?.children[atual] as HTMLElement | undefined;
    if (!fila || !mini) return;
    const esquerda = mini.offsetLeft - fila.offsetLeft;
    if (esquerda < fila.scrollLeft) fila.scrollLeft = esquerda - 8;
    else if (esquerda + mini.offsetWidth > fila.scrollLeft + fila.clientWidth) fila.scrollLeft = esquerda + mini.offsetWidth - fila.clientWidth + 8;
  }, [atual]);

  const ficha = [ano(v), km(v), cambio(v), combustivel(v)].filter(Boolean) as string[];
  const versaoCarro = versao(v);
  const versaoExtra = versaoCarro && versaoCarro.toLowerCase() !== v.title.toLowerCase() ? versaoCarro : undefined;
  const resumo = (
    [
      ["Ano", ano(v)],
      ["Quilometragem", km(v)],
      ["Câmbio", cambio(v)],
      ["Combustível", combustivel(v)],
      ["Cor", v.color],
      [tipo === "motorcycle" ? "Cilindradas" : "Motor", v.motor],
      ["Potência", v.power],
      ...(tipo === "car" ? [["Portas", v.doors ? String(v.doors) : undefined]] : []),
      ...(tipo === "truck" ? [["Direção", v.steering]] : []),
      ["Carroceria", v.segment],
      ["Garantia", v.warranty],
    ] as [string, string | undefined][]
  ).filter(([, valor]) => valor) as [string, string][];
  const itens = v.items?.filter((item) => item.trim()) ?? [];
  const sobre = v.description?.trim();
  const abas = [
    ...(resumo.length ? [{ id: "resumo", rotulo: "Resumo" }] : []),
    ...(itens.length ? [{ id: "itens", rotulo: "Itens" }] : []),
    ...(sobre ? [{ id: "descricao", rotulo: "Descrição" }] : []),
  ];
  const abaAtual = abas[Math.min(aba, abas.length - 1)];

  const irParaFoto = (i: number) => {
    const el = fotosRef.current?.querySelector<HTMLElement>(`[data-foto="${i}"]`);
    if (el) irPara(el);
  };

  const teclasAbas = (e: React.KeyboardEvent) => {
    const ultimo = abas.length - 1;
    const para =
      e.key === "ArrowRight"
        ? aba >= ultimo
          ? 0
          : aba + 1
        : e.key === "ArrowLeft"
          ? aba <= 0
            ? ultimo
            : aba - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? ultimo
              : -1;
    if (para < 0) return;
    e.preventDefault();
    setAba(para);
    document.getElementById(`${id}-aba-${abas[para].id}`)?.focus();
  };

  const precoBloco = (
    <p className="dl-veiculo__preco">
      {anterior && (
        <s className="dl-veiculo__antes">
          <span className="dl-sr">De </span>
          {anterior}
        </s>
      )}
      <span className="dl-veiculo__valor">
        {anterior && <span className="dl-sr">por </span>}
        {preco(v)}
      </span>
    </p>
  );

  return (
    <div className="dl-veiculo">
      <div className="dl-wrap">
        <nav className="dl-trilha" aria-label="Você está em">
          <Link href={inicio(base)}>Início</Link>
          <span aria-hidden="true">/</span>
          <Link href={comprar(base)}>Nosso estoque</Link>
          <span aria-hidden="true">/</span>
          <Link href={comprar(base, { marca: v.brand })}>{v.brand}</Link>
        </nav>
      </div>

      <div className="dl-wrap dl-veiculo__grade">
        <aside className="dl-veiculo__painel" aria-labelledby={`${id}-titulo`}>
          <div className="dl-veiculo__placa">
            {!v.title.toLowerCase().startsWith(v.brand.toLowerCase()) && <p className="dl-veiculo__marca">{v.brand}</p>}
            <h1 id={`${id}-titulo`} className="dl-veiculo__titulo">
              {v.title}
            </h1>
            {versaoExtra && <p className="dl-veiculo__versao">{versaoExtra}</p>}
            {selo(v) && <span className="dl-veiculo__selo">{selo(v)}</span>}
            {precoBloco}
            {ficha.length > 0 && (
              <ul className="dl-veiculo__ficha" aria-label="Ficha curta">
                {ficha.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}

            {!interesse && n > 1 && (
              <div className="dl-veiculo__indice" role="group" aria-label="Ir para uma foto">
                <p className="dl-veiculo__indice-conta" aria-hidden="true">
                  Foto {atual + 1} de {n}
                </p>
                <div ref={miniaturas} className="dl-veiculo__miniaturas">
                  {fotos.map((f, i) => (
                    <button
                      key={f + i}
                      type="button"
                      className="dl-veiculo__mini"
                      aria-label={`Foto ${i + 1}`}
                      aria-current={i === atual ? "true" : undefined}
                      onClick={() => irParaFoto(i)}
                    >
                      <Image src={f} alt="" fill sizes="64px" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {interesse ? (
              <div className="dl-veiculo__form">
                <p className="dl-veiculo__form-titulo">Tenho interesse</p>
                <FormInteresse lead={lead} config={config} carro={v} prefixo={`${id}-painel`} aoVoltar={() => setInteresse(false)} />
              </div>
            ) : (
              <div className="dl-veiculo__acoes">
                <button type="button" className="dl-btn dl-btn--acao dl-btn--grande dl-veiculo__quero" onClick={() => setInteresse(true)}>
                  Tenho interesse
                </button>
                {zapHref && (
                  <a className="dl-btn dl-btn--linha dl-btn--grande dl-veiculo__zap" href={zapHref} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon size={18} />
                    WhatsApp
                  </a>
                )}
              </div>
            )}
            {tel && config.phone && (
              <a className="dl-veiculo__ligar" href={tel}>
                <PhoneIcon size={16} />
                Prefere ligar? {config.phone}
              </a>
            )}
          </div>
        </aside>

        <div ref={fotosRef} className="dl-veiculo__fotos" role="group" aria-label={`Fotos do ${v.title}`}>
          {n === 0 && <div className="dl-veiculo__sem-foto">Fotos em breve</div>}
          {fotos.map((f, i) => (
            <button
              key={f + i}
              type="button"
              className="dl-veiculo__foto"
              data-foto={i}
              onClick={() => setVisor(i)}
              aria-label={`Ampliar a foto ${i + 1} de ${n}`}
            >
              <Image
                src={f}
                alt={i === 0 ? v.title : ""}
                width={1600}
                height={1200}
                sizes="(min-width: 1280px) 760px, (min-width: 1024px) 58vw, 100vw"
                preload={i === 0}
                fetchPriority={i === 0 ? "high" : undefined}
                style={{ objectPosition: posicao(v, i, 4 / 3) ?? "50% 55%" }}
              />
              <span className="dl-veiculo__ampliar" aria-hidden="true">
                <TelaCheiaIcon size={18} />
              </span>
            </button>
          ))}
          {n > NO_CELULAR && (
            <button type="button" className="dl-btn dl-btn--linha dl-veiculo__mais" onClick={() => setVisor(NO_CELULAR)}>
              <FotosIcon size={18} />
              Ver mais fotos ({n - NO_CELULAR})
            </button>
          )}
        </div>
      </div>

      {abaAtual && (
        <section className="dl-wrap dl-veiculo__detalhes" aria-labelledby={`${id}-detalhes`}>
          <LinhaChegada
            id={`${id}-detalhes`}
            titulo="Ficha completa"
            extra={
              abas.length > 1 ? (
                <div className="dl-chave" role="tablist" aria-label="Ficha completa" onKeyDown={teclasAbas}>
                  {abas.map((a, i) => (
                    <button
                      key={a.id}
                      id={`${id}-aba-${a.id}`}
                      type="button"
                      role="tab"
                      aria-selected={a.id === abaAtual.id}
                      aria-controls={`${id}-painel-aba`}
                      tabIndex={a.id === abaAtual.id ? 0 : -1}
                      className={cx("dl-chave__item", a.id === abaAtual.id && "dl-chave__item--atual")}
                      onClick={() => setAba(i)}
                    >
                      {a.rotulo}
                    </button>
                  ))}
                </div>
              ) : undefined
            }
          />
          <div
            id={`${id}-painel-aba`}
            role={abas.length > 1 ? "tabpanel" : undefined}
            aria-labelledby={abas.length > 1 ? `${id}-aba-${abaAtual.id}` : undefined}
            className="dl-veiculo__aba"
          >
            {abaAtual.id === "resumo" && (
              <dl className="dl-veiculo__resumo">
                {resumo.map(([rotulo, valor]) => (
                  <div key={rotulo}>
                    <dt>{rotulo}</dt>
                    <dd>{valor}</dd>
                  </div>
                ))}
              </dl>
            )}
            {abaAtual.id === "itens" && (
              <ul className="dl-veiculo__itens">
                {itens.map((item) => (
                  <li key={item}>
                    <CheckIcon size={15} />
                    {item}
                  </li>
                ))}
              </ul>
            )}
            {abaAtual.id === "descricao" && <p className="dl-veiculo__descricao">{sobre}</p>}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="dl-wrap dl-veiculo__outros" aria-labelledby={`${id}-outros`}>
          <LinhaChegada id={`${id}-outros`} titulo={`Outros ${nome.plural}`} acao={{ href: comprar(base), rotulo: "Ver o estoque" }} />
          <div className="dl-grade dl-veiculo__outros-grade">
            {others.map((o) => (
              <Cartao key={o.id} carro={o} base={base} />
            ))}
          </div>
        </section>
      )}

      {/* Celular: barra fixa com o preço e "Tenho interesse"; o WhatsApp flutuante fica ao lado dela. */}
      <div className="dl-veiculo__barra">
        <div className="dl-veiculo__barra-texto">
          <span className="dl-veiculo__barra-nome">{v.title}</span>
          <span className="dl-veiculo__barra-preco">{preco(v)}</span>
        </div>
        <button
          type="button"
          className="dl-btn dl-btn--acao dl-veiculo__barra-quero"
          onClick={() => setFolha(true)}
          aria-haspopup="dialog"
          aria-label="Tenho interesse"
        >
          <span className="dl-veiculo__barra-longo">Tenho interesse</span>
          <span className="dl-veiculo__barra-curto" aria-hidden="true">
            Interesse
          </span>
        </button>
      </div>

      <Visor fotos={fotos} titulo={v.title} inicial={visor} aoFechar={() => setVisor(null)} />

      <Dialogo aberto={folha} aoFechar={() => setFolha(false)} rotulo="Tenho interesse" className="dl dl-folha">
        <div className="dl-folha__corpo" data-lenis-prevent="">
          <div className="dl-folha__topo">
            <p>Tenho interesse</p>
            <button type="button" className="dl-folha__fechar" aria-label="Fechar" onClick={() => setFolha(false)}>
              <XIcon size={20} />
            </button>
          </div>
          <div className="dl-folha__miolo">
            <p className="dl-folha__carro">
              {v.title} <strong>{preco(v)}</strong>
            </p>
            <FormInteresse lead={lead} config={config} carro={v} prefixo={`${id}-folha`} />
          </div>
        </div>
      </Dialogo>
    </div>
  );
}
