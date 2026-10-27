"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { SELL_MODES } from "@/lib/sell-wizard";
import type { TenantConfig } from "@/lib/types";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, WhatsAppIcon } from "./base/icones";
import { cx, externo, zap } from "./base/util";
import { useNoun } from "./contexto";

/**
 * Venda e financiamento do Delta, "venda em três toques": uma placa baixa partida por um corte
 * diagonal. À esquerda, na cor principal, a pergunta, as etapas e o financiamento; à direita, um
 * passo de cada vez, no próprio lugar. 1: como a pessoa quer negociar (só as formas ligadas no painel; com
 * uma só, o passo some). 2: qual é o carro (marca, modelo, ano). 3: o formulário do Vender, já
 * preenchido pelos parâmetros que ele lê (`modo`, `marca`, `modelo`, `ano`). Nada é enviado
 * daqui. O passo novo entra pela direita e o anterior volta pela esquerda. Financiamento numa
 * linha pelo WhatsApp, com a mensagem do Halo e do Atlas, sem simulador nem promessa. Sem a página
 * Vender ligada, fica só essa linha.
 */
export default function VendaTresToques({ config, base }: { config: TenantConfig; base: string }) {
  const router = useRouter();
  const noun = useNoun();
  const id = useId();
  const modos = SELL_MODES.filter((m) => config.sections[m.flag]);
  const comEscolha = modos.length > 1;
  const [passo, setPasso] = useState(comEscolha ? 0 : 1);
  const [sentido, setSentido] = useState<1 | -1>(1);
  const [modo, setModo] = useState(modos[0]?.id ?? "");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  // Mesma mensagem do financiamento no Halo e no Atlas.
  const zapHref = zap(config, `Olá! Vim pelo site da ${config.name} e quero saber sobre financiamento.`);
  const vender = config.sections.paginaVender;
  const anoMaximo = new Date().getFullYear() + 1;
  const etapas = [...(comEscolha ? ["Como negociar"] : []), `${noun.feminine ? "A" : "O"} ${noun.singular}`, "Formulário"];
  const etapaAtual = comEscolha ? passo : passo - 1;

  const ir = (para: number) => {
    setSentido(para > passo ? 1 : -1);
    setPasso(para);
  };

  const continuar = (e: FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (modo) sp.set("modo", modo);
    if (marca.trim()) sp.set("marca", marca.trim());
    if (modelo.trim()) sp.set("modelo", modelo.trim());
    if (/^\d{4}$/.test(ano) && Number(ano) >= 1950 && Number(ano) <= anoMaximo) sp.set("ano", ano);
    const qs = sp.toString();
    router.push(`${base}/vender${qs ? `?${qs}` : ""}`);
  };

  const financiar = zapHref && (
    <p className="dl-venda__financiar">
      Vai financiar?{" "}
      <a href={zapHref} {...externo}>
        <WhatsAppIcon size={15} />
        Conversar no WhatsApp
      </a>
    </p>
  );

  // Sem a página Vender, fica só a linha do financiamento (como no Atlas).
  if (!vender) {
    if (!financiar) return null;
    return (
      <section className="dl dl-venda dl-venda--so-financiar" aria-label="Financiamento" data-dl-setor="Financiamento">
        <div className="dl-wrap">
          <div className="dl-venda__lado">{financiar}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="dl dl-venda" aria-labelledby="dl-venda-titulo" data-dl-setor="Venda">
      <div className="dl-wrap">
        <div className="dl-venda__caixa">
          <div className="dl-venda__lado">
            <h2 id="dl-venda-titulo" className="dl-venda__titulo">
              Quer vender {noun.feminine ? "a sua" : "o seu"}?
            </h2>
            <ol className="dl-venda__etapas" aria-label="Etapas">
              {etapas.map((e, i) => (
                <li key={e} data-feita={i < etapaAtual || undefined} aria-current={i === etapaAtual ? "step" : undefined}>
                  <span className="dl-venda__marca" aria-hidden="true">
                    {i < etapaAtual ? <CheckIcon size={12} /> : i + 1}
                  </span>
                  <span className="dl-venda__etapa-nome">{e}</span>
                </li>
              ))}
            </ol>
            {financiar}
          </div>

          <div className="dl-venda__palco">
            <AnimatePresence mode="popLayout" initial={false} custom={sentido}>
              {passo === 0 ? (
                <m.div
                  key="modo"
                  className="dl-venda__passo"
                  custom={sentido}
                  variants={{ entra: (s: number) => ({ opacity: 0, x: s * 40 }), fica: { opacity: 1, x: 0 }, sai: (s: number) => ({ opacity: 0, x: -s * 40 }) }}
                  initial="entra"
                  animate="fica"
                  exit="sai"
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="dl-venda__pergunta" id={`${id}-modo`}>
                    Como você quer negociar?
                  </p>
                  <div className="dl-venda__modos" role="radiogroup" aria-labelledby={`${id}-modo`}>
                    {modos.map((mo) => (
                      <button
                        key={mo.id}
                        type="button"
                        role="radio"
                        aria-checked={modo === mo.id}
                        className={cx("dl-opcao", modo === mo.id && "dl-opcao--ativa")}
                        onClick={() => {
                          setModo(mo.id);
                          ir(1);
                        }}
                      >
                        <strong>{mo.title}</strong>
                        <span>{mo.body}</span>
                      </button>
                    ))}
                  </div>
                </m.div>
              ) : (
                <m.form
                  key="carro"
                  className="dl-venda__passo dl-venda__form"
                  action={`${base}/vender`}
                  onSubmit={continuar}
                  custom={sentido}
                  variants={{ entra: (s: number) => ({ opacity: 0, x: s * 40 }), fica: { opacity: 1, x: 0 }, sai: (s: number) => ({ opacity: 0, x: -s * 40 }) }}
                  initial="entra"
                  animate="fica"
                  exit="sai"
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <input type="hidden" name="modo" value={modo} />
                  <label className="dl-campo">
                    <span className="dl-campo__rotulo">Marca</span>
                    <input name="marca" value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ex: Fiat" autoComplete="off" maxLength={60} />
                  </label>
                  <label className="dl-campo">
                    <span className="dl-campo__rotulo">Modelo</span>
                    <input
                      name="modelo"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      placeholder="Ex: Argo Drive"
                      autoComplete="off"
                      maxLength={80}
                    />
                  </label>
                  <label className="dl-campo dl-campo--curto">
                    <span className="dl-campo__rotulo">Ano</span>
                    <input
                      name="ano"
                      value={ano}
                      onChange={(e) => setAno(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="2020"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>
                  <div className="dl-venda__acoes">
                    {comEscolha && (
                      <button type="button" className="dl-btn dl-btn--linha" onClick={() => ir(0)}>
                        <ArrowLeftIcon size={16} />
                        Voltar
                      </button>
                    )}
                    <button type="submit" className="dl-btn dl-btn--acao">
                      Continuar no formulário
                      <ArrowRightIcon size={18} />
                    </button>
                  </div>
                </m.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
