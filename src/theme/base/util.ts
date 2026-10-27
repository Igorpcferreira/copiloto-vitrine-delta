import { formatPrice, formatPriceLabel, telHref, whatsappLink } from "@/lib/format";
import { fuelLabel, transmissionLabel } from "@/lib/labels";
import { vehiclePhoto, vehiclePhotoPosition } from "@/lib/placeholders";
import type { TenantConfig, Vehicle } from "@/lib/types";
import { vehicleSlug } from "@/lib/vehicle-url";

/*
 * Utilitários do Delta, sem nada de servidor: servem aos componentes de cliente e de
 * servidor. Tudo que é dado da loja passa por aqui, para o tema inteiro ler igual.
 */

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export const inicio = (base: string) => base || "/";

/** Link do Comprar com os parâmetros do contrato (vazios saem). */
export function comprar(base: string, params?: Record<string, string | number | undefined | null> | string) {
  const sp = new URLSearchParams();
  if (typeof params === "string") {
    new URLSearchParams(params).forEach((valor, chave) => sp.append(chave, valor));
  } else if (params) {
    for (const [chave, valor] of Object.entries(params)) {
      if (valor !== undefined && valor !== null && String(valor) !== "") sp.set(chave, String(valor));
    }
  }
  const qs = sp.toString();
  return `${base}/comprar${qs ? `?${qs}` : ""}`;
}

export const carroHref = (base: string, v: Pick<Vehicle, "id" | "title" | "slug">) => `${base}/veiculo/${vehicleSlug(v)}`;

export const foto = (v: Vehicle, i = 0) => vehiclePhoto(v.photos, i);

/** Posição da foto pelo ponto focal, para o recorte da proporção pedida (largura / altura). */
export const posicao = (v: Vehicle, i: number, aspecto: number) => vehiclePhotoPosition(v.photoFocalPoints, i, aspecto);

export const preco = (v: Vehicle) => formatPriceLabel(v.price);

export const precoAnterior = (v: Vehicle) =>
  v.previousPrice && v.previousPrice > v.price ? formatPrice(v.previousPrice) : undefined;

export const ano = (v: Vehicle) => (v.year > 0 ? String(v.year) : undefined);

export const km = (v: Vehicle) =>
  Number.isFinite(v.km) && v.km >= 0 ? `${v.km.toLocaleString("pt-BR")} km` : undefined;

export const cambio = (v: Vehicle) => (v.transmission ? transmissionLabel(v.transmission) : undefined);

export const combustivel = (v: Vehicle) => (v.fuel ? fuelLabel(v.fuel) : undefined);

/** Versão sem a repetição do modelo que a API às vezes manda ("ARGO ARGO TREKKING"). */
export function versao(v: Vehicle) {
  const partes = v.model.trim().split(/\s+/);
  if (partes.length > 1 && partes[0].toLowerCase() === partes[1].toLowerCase()) partes.shift();
  return partes.join(" ");
}

export function selo(v: Vehicle): string | undefined {
  if (v.badges.includes("baixou-preco")) return "Baixou o preço";
  if (v.badges.includes("novo")) return "Novidade";
  if (v.badges.includes("destaque")) return "Destaque";
  return undefined;
}

/** Ficha curta, sem dado vazio: ano, km e câmbio. */
export const ficha = (v: Vehicle) => [ano(v), km(v), cambio(v)].filter(Boolean) as string[];

export const zap = (config: TenantConfig, mensagem?: string) =>
  config.whatsapp ? whatsappLink(config.whatsapp, mensagem ?? `Olá! Vim pelo site da ${config.name}.`) : undefined;

export const zapCarro = (config: TenantConfig, v: Vehicle) =>
  zap(config, `Olá! Tenho interesse no ${v.title}. Ainda está disponível?`);

/** Link de ligação com o código do país, como o Horizon de 26/10/2026 (`telHref`). */
export const telefone = (config: TenantConfig) => telHref(config.phone);

const consultaMapa = (config: TenantConfig) => config.mapQuery || config.address;

export const mapaEmbed = (config: TenantConfig) =>
  `https://www.google.com/maps?q=${encodeURIComponent(consultaMapa(config))}&z=16&output=embed`;

export const mapaRota = (config: TenantConfig) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(consultaMapa(config))}`;

export const mapaAbrir = (config: TenantConfig) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consultaMapa(config))}`;

/** "R$ 80 mil", "R$ 1,2 mi": rótulo curto para faixas de preço. */
export function mil(valor: number) {
  if (valor >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  return `R$ ${Math.round(valor / 1000).toLocaleString("pt-BR")} mil`;
}

export const externo = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Texto padrão do título do hero e do banner quando o painel está vazio. */
export const tituloHero = (config: TenantConfig) => config.tagline?.trim() || "Seu próximo carro está mais perto.";
export const tituloBanner = (config: TenantConfig) => config.ctaTitle?.trim() || "Ainda não achou o seu?";
export const botaoBanner = (config: TenantConfig) => config.ctaButtonLabel?.trim() || "Ver o estoque completo";

export const ANO = new Date().getFullYear();
