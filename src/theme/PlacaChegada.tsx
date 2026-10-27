"use client";

import { useEffect, useState } from "react";
import { useConsent } from "@/lib/consent";
import type { TenantConfig } from "@/lib/types";
import { CarIcon, CheckIcon, ClockIcon, MailIcon, MapaIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "./base/icones";
import { externo, mapaEmbed, telefone, zap } from "./base/util";
import MapFrame from "./MapFrame";

const MODOS = [
  { id: "driving", rotulo: "De carro" },
  { id: "walking", rotulo: "A pé" },
  { id: "transit", rotulo: "De transporte" },
] as const;

const destino = (config: TenantConfig) => config.mapQuery || config.address;

/** Rota do Google Maps até a loja no modo escolhido (`travelmode`); o Google calcula o caminho. */
const rota = (config: TenantConfig, modo: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino(config))}&travelmode=${modo}`;

/**
 * Contato do Delta, "placa de chegada": uma faixa de mapa e uma placa inclinada metade sobre o
 * mapa e metade fora, na base dele, com o endereço, "Copiar endereço" (avisa que copiou) e
 * "Como você vem?" com De carro, A pé e De transporte, que abrem a rota no Google Maps no modo
 * escolhido. Ao lado, horário e canais. O mapa segue o consentimento de cookies do Horizon
 * (26/10/2026): com o aceite ele aparece sozinho, perto da tela; antes, um desenho de ruas com
 * "Mostrar o mapa".
 */
export default function PlacaChegada({
  config,
  titulo = "Venha conhecer a loja",
  mapa = true,
  setor = "Contato",
}: {
  config: TenantConfig;
  titulo?: string;
  /** Sem o mapa (seção `mapa` desligada no painel), a placa fica sozinha, com os canais ao lado. */
  mapa?: boolean;
  setor?: string;
}) {
  const consentimento = useConsent();
  const [abriu, setAbriu] = useState(false);
  const [copiou, setCopiou] = useState(false);
  const mostrarMapa = consentimento === "granted" || abriu;
  const tel = telefone(config);
  const zapHref = zap(config);

  useEffect(() => {
    if (!copiou) return;
    const t = window.setTimeout(() => setCopiou(false), 2400);
    return () => window.clearTimeout(t);
  }, [copiou]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(config.address);
      setCopiou(true);
    } catch {
      setCopiou(false);
    }
  };

  return (
    <section className={mapa ? "dl dl-chegada" : "dl dl-chegada dl-chegada--sem-mapa"} aria-labelledby="dl-chegada-titulo" data-dl-setor={setor}>
      <div className="dl-wrap">
        {mapa && (
          <div className="dl-chegada__mapa" data-aberto={mostrarMapa || undefined}>
            {mostrarMapa ? (
              <MapFrame src={`${mapaEmbed(config)}&hl=pt-BR`} title={`Mapa: ${config.address}`} />
            ) : (
              <div className="dl-chegada__ruas">
                <span className="dl-chegada__alfinete" aria-hidden="true">
                  <PinIcon size={20} />
                </span>
                <p>O mapa do Google usa cookies.</p>
                <button type="button" className="dl-btn dl-btn--claro" onClick={() => setAbriu(true)}>
                  <MapaIcon size={18} />
                  Mostrar o mapa
                </button>
              </div>
            )}
          </div>
        )}

        <div className="dl-chegada__baixo">
          <div className="dl-chegada__placa">
            <div className="dl-chegada__placa-dentro">
              <h2 id="dl-chegada-titulo" className="dl-chegada__titulo">
                {titulo}
              </h2>
              <p className="dl-chegada__endereco">
                <PinIcon size={18} />
                <span>{config.address}</span>
              </p>
              <div className="dl-chegada__acoes">
                <button type="button" className="dl-btn dl-btn--linha dl-chegada__copiar" onClick={copiar}>
                  {copiou ? <CheckIcon size={16} /> : <PinIcon size={16} />}
                  {copiou ? "Endereço copiado" : "Copiar endereço"}
                </button>
                <span className="dl-sr" role="status">
                  {copiou ? "Endereço copiado." : ""}
                </span>
              </div>
              <div className="dl-chegada__modos" role="group" aria-label="Como você vem? Abre a rota no Google Maps">
                <span className="dl-chegada__pergunta">Como você vem?</span>
                {MODOS.map((m) => (
                  <a key={m.id} href={rota(config, m.id)} {...externo} className="dl-chip dl-chip--link">
                    {m.id === "driving" && <CarIcon size={15} />}
                    {m.rotulo}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <ul className="dl-chegada__dados">
            {(config.hours.weekdays || config.hours.saturday) && (
              <li>
                <ClockIcon size={18} />
                <span>
                  <strong>Horário</strong>
                  {config.hours.weekdays && <span>{config.hours.weekdays}</span>}
                  {config.hours.saturday && <span>{config.hours.saturday}</span>}
                </span>
              </li>
            )}
            {zapHref && (
              <li>
                <WhatsAppIcon size={18} />
                <span>
                  <strong>WhatsApp</strong>
                  <a href={zapHref} {...externo}>
                    Conversar agora
                  </a>
                </span>
              </li>
            )}
            {tel && config.phone && (
              <li>
                <PhoneIcon size={18} />
                <span>
                  <strong>Telefone</strong>
                  <a href={tel}>{config.phone}</a>
                </span>
              </li>
            )}
            {config.email && (
              <li>
                <MailIcon size={18} />
                <span>
                  <strong>E-mail</strong>
                  <a href={`mailto:${config.email}`}>{config.email}</a>
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
