"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import PrivacyNotice from "@/components/PrivacyNotice";
import { unmaskPhone } from "@/lib/format";
import { SELL_STEPS, SELL_VEHICLE_TYPES, useSellWizard, type SellFormState } from "@/lib/sell-wizard";
import { article, myPossessive, possessive, type StockNoun } from "@/lib/stock-noun";
import type { TenantConfig } from "@/lib/types";
import type { VenderProps } from "@/props";
import { CameraIcon, CarIcon, CheckIcon, PhoneIcon, WhatsAppIcon, XIcon } from "./base/icones";
import { DEMO } from "./base/useLead";
import { cx, externo, telefone, zap } from "./base/util";
import { useNoun } from "./contexto";

type Campo = keyof SellFormState;

const ERROS: Partial<Record<Campo, string>> = {
  name: "Informe seu nome.",
  phone: "Informe um telefone com DDD.",
  email: "Informe um e-mail válido.",
  mode: "Escolha uma forma de negociar.",
  brand: "Informe a marca.",
  model: "Informe o modelo.",
  year: "Informe o ano.",
  km: "Informe a quilometragem.",
  color: "Informe a cor.",
  transmission: "Escolha o câmbio.",
  fuel: "Escolha o combustível.",
  description: "Conte um pouco sobre o veículo.",
};

/** Os campos que faltam em cada etapa, pelas mesmas regras do `stepValid` do `useSellWizard`. */
function faltando(etapa: number, form: SellFormState, modos: string[]): Campo[] {
  const vazio = (c: Campo) => form[c].trim() === "";
  if (etapa === 0) {
    return [
      ...(vazio("name") ? (["name"] as const) : []),
      ...(unmaskPhone(form.phone).length < 10 ? (["phone"] as const) : []),
      ...(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? (["email"] as const) : []),
    ];
  }
  if (etapa === 1) return modos.includes(form.mode) ? [] : ["mode"];
  if (etapa === 2) return (["brand", "model", "year", "km", "color", "transmission", "fuel", "description"] as Campo[]).filter(vazio);
  return [];
}

type Inicial = { marca?: string; modelo?: string; ano?: string; modo?: string; tipo?: string };

const doPedido = (v: string | null) => (v?.trim() ? v.trim().slice(0, 80) : undefined);

/** O começo do pedido que veio no endereço (`?modo=&marca=&modelo=&ano=&tipo=`, da venda em três toques). */
function VenderComPedido(props: { config: TenantConfig; noun?: StockNoun }) {
  const sp = useSearchParams();
  const inicial: Inicial = {
    modo: doPedido(sp.get("modo")),
    marca: doPedido(sp.get("marca")),
    modelo: doPedido(sp.get("modelo")),
    ano: doPedido(sp.get("ano")),
    tipo: doPedido(sp.get("tipo")),
  };
  return <PistaVertical {...props} inicial={inicial} />;
}

/**
 * Vender do Delta, "pista vertical": as quatro etapas do contrato (Contato, Negócio, Veículo e
 * Fotos) numa linha vertical, com um carro em lâmina que desce até a etapa da vez. A etapa aberta
 * fica inteira; as feitas viram uma linha de resumo com "Editar", que volta a ela; as próximas
 * mostram só o nome. Os campos, as regras e o envio são os do `useSellWizard` (fotos uma a uma,
 * comprimidas, e o pedido), com o tipo do veículo do Horizon. Começo pela URL. Na demo, nada é
 * enviado e o estado de enviado aparece com o aviso.
 */
function PistaVertical({ config, noun: nounDaRota, inicial = {} }: { config: TenantConfig; noun?: StockNoun; inicial?: Inicial }) {
  const nounDoTema = useNoun();
  const noun = nounDaRota ?? nounDoTema;
  const tipoInicial = SELL_VEHICLE_TYPES.some((t) => t.value === inicial.tipo) ? inicial.tipo! : (noun.type ?? "car");
  const w = useSellWizard(config.sections, tipoInicial);
  const tipoDoForm = SELL_VEHICLE_TYPES.find((t) => t.value === w.form.vehicleType) ?? SELL_VEHICLE_TYPES[0];
  const [tentou, setTentou] = useState([false, false, false, false]);
  const [trocas, setTrocas] = useState(0);
  const [preenchido, setPreenchido] = useState(false);
  const pista = useRef<HTMLOListElement>(null);
  const carro = useRef<HTMLSpanElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const zapHref = zap(config, `Olá! Vim pelo site da ${config.name} e quero vender ou trocar ${myPossessive(noun)} ${noun.singular}.`);
  const tel = telefone(config);
  const ids = w.modes.map((m) => m.id);
  const enviado = w.sent || (DEMO && w.failure !== null);
  const falha = DEMO ? null : w.failure;
  const umModo = w.modes.length === 1;
  const nomeEtapa = (i: number) => (i === 1 && umModo ? w.modes[0].title : SELL_STEPS[i]);
  const etapa = enviado ? SELL_STEPS.length : w.step;

  // O carro desce até a etapa da vez: um `transform`, medido quando a etapa ou a altura muda.
  useLayoutEffect(() => {
    const lista = pista.current;
    const marca = carro.current;
    if (!lista || !marca) return;
    const medir = () => {
      const alvo = lista.querySelector<HTMLElement>(`[data-etapa="${Math.min(etapa, SELL_STEPS.length - 1)}"] .dl-vender__numero`);
      if (!alvo) return;
      const y = alvo.offsetTop + alvo.offsetHeight / 2 - marca.offsetHeight / 2;
      marca.style.transform = `translate3d(0, ${Math.round(y)}px, 0)`;
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(lista);
    return () => obs.disconnect();
  }, [etapa]);

  // Depois de cada troca pedida (nunca na primeira pintura), o foco vai ao título da etapa aberta;
  // enviado, ao título "Dados enviados".
  useEffect(() => {
    if (trocas) titulo.current?.focus({ preventScroll: true });
  }, [trocas]);
  useEffect(() => {
    if (enviado) titulo.current?.focus({ preventScroll: true });
  }, [enviado]);

  const erro = (e: number, c: Campo) => (tentou[e] && faltando(e, w.form, ids).includes(c) ? ERROS[c] : undefined);
  const ligar = (e: number, c: Campo) => ({
    id: `dl-vender-${c}`,
    name: c,
    value: w.form[c],
    onChange: w.set(c),
    ...(erro(e, c) ? { "aria-invalid": true as const, "aria-describedby": `dl-vender-${c}-erro` } : {}),
  });
  const aviso = (e: number, c: Campo) =>
    erro(e, c) ? (
      <span id={`dl-vender-${c}-erro`} className="dl-campo__erro">
        {erro(e, c)}
      </span>
    ) : null;

  // Modo, marca, modelo e ano da URL entram ao sair da primeira etapa (sem apagar o que a pessoa digitou).
  const preencher = () => {
    if (preenchido) return;
    setPreenchido(true);
    if (inicial.modo && ids.includes(inicial.modo)) w.setMode(inicial.modo);
    if (inicial.marca && !w.form.brand) w.setValue("brand", inicial.marca);
    if (inicial.modelo && !w.form.model) w.setValue("model", inicial.modelo);
    if (inicial.ano && !w.form.year) w.setValue("year", inicial.ano.replace(/\D/g, "").slice(0, 4));
  };

  const avancar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (w.pending) return;
    const atual = w.step;
    const falta = faltando(atual, w.form, ids);
    setTentou((t) => t.map((v, i) => (i === atual ? true : v)));
    if (falta.length) {
      const alvo = falta[0] === "mode" ? document.querySelector<HTMLElement>('input[name="dl-vender-modo"]') : document.getElementById(`dl-vender-${falta[0]}`);
      alvo?.focus();
      return;
    }
    if (atual === 0) preencher();
    if (atual < SELL_STEPS.length - 1) setTrocas((n) => n + 1);
    w.next();
  };

  const voltarPara = (i: number) => {
    for (let k = w.step; k > i; k--) w.back();
    setTrocas((n) => n + 1);
  };

  const outro = () => {
    setTentou([false, false, false, false]);
    setTrocas((n) => n + 1);
    w.reset();
  };

  // Resumo de uma etapa feita, numa linha.
  const resumo = (i: number) => {
    const f = w.form;
    if (i === 0) return [f.name.trim(), f.phone].filter(Boolean).join(" · ");
    if (i === 1) return w.modes.find((m) => m.id === f.mode)?.title ?? "";
    if (i === 2) return [f.brand, f.model, f.year].map((s) => s.trim()).filter(Boolean).join(" ");
    return w.photos.length ? `${w.photos.length} ${w.photos.length === 1 ? "foto" : "fotos"}` : "Sem fotos";
  };

  const conversar = zapHref ? (
    <a className="dl-btn dl-btn--linha" href={zapHref} {...externo}>
      <WhatsAppIcon size={18} />
      Falar no WhatsApp
    </a>
  ) : tel ? (
    <a className="dl-btn dl-btn--linha" href={tel}>
      <PhoneIcon size={18} />
      Ligar
    </a>
  ) : null;

  const cabeca = (
    <header className="dl-vender__cabeca">
      <h1 className="dl-vender__h1">
        Venda {possessive(noun)} {noun.singular}
      </h1>
      <p className="dl-vender__intro">
        Conte sobre {article(noun)} {noun.singular} em quatro etapas. A equipe da {config.name} avalia os dados e responde pelo telefone que você informar.
      </p>
    </header>
  );

  if (!w.modes.length) {
    return (
      <div className="dl-vender dl-wrap">
        {cabeca}
        <p className="dl-vender__intro">A avaliação de veículos não está disponível agora. Fale com a loja.</p>
        {conversar}
      </div>
    );
  }

  return (
    <div className="dl-vender dl-wrap">
      {cabeca}

      <div className="dl-vender__corpo">
        <span ref={carro} className="dl-vender__carro" aria-hidden="true" data-chegou={enviado || undefined}>
          {enviado ? <CheckIcon size={18} /> : <CarIcon size={18} />}
        </span>
        <ol ref={pista} className="dl-vender__pista" aria-label="Etapas">
          {SELL_STEPS.map((nome, i) => {
            const estado = i < etapa ? "feita" : i === etapa ? "atual" : "proxima";
            return (
              <li key={nome} className="dl-vender__etapa" data-etapa={i} data-estado={estado} aria-current={estado === "atual" ? "step" : undefined}>
                <div className="dl-vender__linha">
                  <span className="dl-vender__numero" aria-hidden="true">
                    {estado === "feita" ? <CheckIcon size={14} /> : i + 1}
                  </span>
                  {estado === "atual" ? (
                    <h2 ref={titulo} tabIndex={-1} className="dl-vender__nome">
                      {nomeEtapa(i)}
                    </h2>
                  ) : (
                    <p className="dl-vender__nome">
                      {nomeEtapa(i)}
                      {estado === "feita" && <span className="dl-sr"> (feita)</span>}
                    </p>
                  )}
                  {estado === "feita" && <span className="dl-vender__resumo">{resumo(i)}</span>}
                  {estado === "feita" && !enviado && (
                    <button type="button" className="dl-vender__editar" onClick={() => voltarPara(i)} aria-label={`Editar ${nomeEtapa(i)}`}>
                      Editar
                    </button>
                  )}
                </div>

                {estado === "atual" && (
                  <form className="dl-vender__form" noValidate onSubmit={avancar}>
                    {i === 0 && (
                      <div className="dl-vender__campos">
                        <label className="dl-campo dl-vender__largo">
                          <span className="dl-campo__rotulo">Nome</span>
                          <input type="text" autoComplete="name" enterKeyHint="next" {...ligar(0, "name")} />
                          {aviso(0, "name")}
                        </label>
                        <label className="dl-campo">
                          <span className="dl-campo__rotulo">Telefone ou WhatsApp</span>
                          <input type="tel" autoComplete="tel-national" inputMode="tel" enterKeyHint="next" {...ligar(0, "phone")} />
                          {aviso(0, "phone")}
                        </label>
                        <label className="dl-campo">
                          <span className="dl-campo__rotulo">E-mail</span>
                          <input type="email" autoComplete="email" inputMode="email" enterKeyHint="next" {...ligar(0, "email")} />
                          {aviso(0, "email")}
                        </label>
                      </div>
                    )}

                    {i === 1 &&
                      (umModo ? (
                        <p className="dl-vender__texto">{w.modes[0].body}</p>
                      ) : (
                        <fieldset className="dl-vender__modos">
                          <legend className="dl-sr">Forma de negociar</legend>
                          {w.modes.map((mo, k) => (
                            <label key={mo.id} className={cx("dl-opcao", w.form.mode === mo.id && "dl-opcao--ativa")}>
                              <input
                                type="radio"
                                className="dl-sr"
                                name="dl-vender-modo"
                                value={mo.id}
                                checked={w.form.mode === mo.id}
                                onChange={() => w.setMode(mo.id)}
                                {...(erro(1, "mode") && k === 0 ? { "aria-invalid": true as const, "aria-describedby": "dl-vender-mode-erro" } : {})}
                              />
                              <strong>
                                {w.form.mode === mo.id && <CheckIcon size={15} />}
                                {mo.title}
                              </strong>
                              <span>{mo.body}</span>
                            </label>
                          ))}
                          {aviso(1, "mode")}
                        </fieldset>
                      ))}

                    {i === 2 && (
                      <div className="dl-vender__campos dl-vender__campos--tres">
                        <label className="dl-campo">
                          <span className="dl-campo__rotulo">Tipo do veículo</span>
                          <select {...ligar(2, "vehicleType")}>
                            {SELL_VEHICLE_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {(
                          [
                            ["brand", "Marca", false],
                            ["model", "Modelo", false],
                            ["year", "Ano", true],
                            ["km", "Quilometragem", true],
                            ["color", "Cor", false],
                          ] as const
                        ).map(([c, rotulo, numero]) => (
                          <label key={c} className="dl-campo">
                            <span className="dl-campo__rotulo">{rotulo}</span>
                            <input
                              type="text"
                              autoComplete="off"
                              enterKeyHint="next"
                              {...(numero ? { inputMode: "numeric" as const } : {})}
                              {...(c === "model" ? { placeholder: tipoDoForm.modelPlaceholder } : {})}
                              {...ligar(2, c)}
                            />
                            {aviso(2, c)}
                          </label>
                        ))}
                        {(
                          [
                            ["transmission", "Câmbio", ["Automático", "Manual", "Automatizado", "CVT"]],
                            ["fuel", "Combustível", ["Flex", "Gasolina", "Diesel", "Híbrido", "Elétrico"]],
                          ] as const
                        ).map(([c, rotulo, opcoes]) => (
                          <label key={c} className="dl-campo">
                            <span className="dl-campo__rotulo">{rotulo}</span>
                            <select {...ligar(2, c)}>
                              <option value="">Selecione</option>
                              {opcoes.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                            {aviso(2, c)}
                          </label>
                        ))}
                        <label className="dl-campo">
                          <span className="dl-campo__rotulo">Preço desejado (opcional)</span>
                          <input type="text" autoComplete="off" inputMode="numeric" enterKeyHint="next" {...ligar(2, "desiredPrice")} />
                        </label>
                        <label className="dl-campo dl-vender__largo">
                          <span className="dl-campo__rotulo">Descrição</span>
                          <textarea rows={3} autoComplete="off" {...ligar(2, "description")} />
                          {aviso(2, "description")}
                        </label>
                      </div>
                    )}

                    {i === 3 && (
                      <div className="dl-vender__fotos">
                        <p className="dl-vender__texto">Fotos ajudam a avaliar melhor. São opcionais: até 8, em PNG, JPEG ou WebP, com até 10 MB cada.</p>
                        <input
                          ref={arquivo}
                          className="dl-sr"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          multiple
                          tabIndex={-1}
                          aria-hidden="true"
                          onChange={(ev) => {
                            if (ev.target.files) w.addPhotos(ev.target.files);
                            ev.target.value = "";
                          }}
                        />
                        <div className="dl-vender__galeria">
                          {w.photos.map((p, k) => (
                            <figure key={p.preview} className="dl-vender__foto">
                              {/* eslint-disable-next-line @next/next/no-img-element -- prévia local de createObjectURL */}
                              <img src={p.preview} alt={`Foto ${k + 1} de ${w.photos.length} ${noun.feminine ? "da sua" : "do seu"} ${noun.singular}`} />
                              <button type="button" onClick={() => w.removePhoto(k)} aria-label={`Remover a foto ${k + 1}`}>
                                <XIcon size={16} />
                              </button>
                            </figure>
                          ))}
                          {w.photos.length < 8 && (
                            <button type="button" className="dl-vender__adicionar" onClick={() => arquivo.current?.click()}>
                              <CameraIcon size={22} />
                              Adicionar fotos
                            </button>
                          )}
                        </div>
                        <p className="dl-vender__conta" aria-live="polite">
                          {w.photos.length} de 8 fotos{w.photoWarning ? `. ${w.photoWarning}.` : ""}
                        </p>
                        {DEMO && <p className="dl-vender__demo">Demonstração: os dados não serão enviados.</p>}
                        {falha && (
                          <div className="dl-vender__falha" role="alert">
                            <p>
                              {falha === "photos"
                                ? "Não conseguimos enviar as fotos agora. Tente de novo, envie sem elas ou fale com a loja."
                                : "Não conseguimos enviar os dados agora. Tente de novo ou fale com a loja."}
                            </p>
                            {conversar}
                          </div>
                        )}
                        <PrivacyNotice privacyUrl={config.privacyUrl} className="dl-vender__privacidade" />
                      </div>
                    )}

                    <div className="dl-vender__acoes">
                      {i > 0 && (
                        <button type="button" className="dl-btn dl-btn--linha" onClick={() => voltarPara(i - 1)}>
                          Voltar
                        </button>
                      )}
                      <button type="submit" className="dl-btn dl-btn--acao" aria-disabled={w.pending || undefined}>
                        {i < SELL_STEPS.length - 1 ? "Continuar" : w.pending ? "Enviando..." : "Enviar para avaliação"}
                      </button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ol>

        {enviado && (
          <div className="dl-vender__ok" role="status">
            <h2 ref={titulo} tabIndex={-1} className="dl-vender__ok-titulo">
              Dados enviados
            </h2>
            <p>Recebemos os dados {noun.feminine ? "da sua" : "do seu"} {noun.singular}. Se quiser adiantar a conversa, fale com a loja.</p>
            {DEMO && <p className="dl-vender__demo">Demonstração: nada foi enviado.</p>}
            <div className="dl-vender__acoes">
              {conversar}
              <button type="button" className="dl-btn dl-btn--acao" onClick={outro}>
                Enviar outro veículo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Vender (contrato de `src/props.ts`): o formulário aceita o começo do pedido pelo endereço. */
export default function Vender({ config, noun }: VenderProps) {
  return (
    <Suspense fallback={<PistaVertical config={config} noun={noun} />}>
      <VenderComPedido config={config} noun={noun} />
    </Suspense>
  );
}
