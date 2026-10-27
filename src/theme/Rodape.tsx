import Link from "next/link";
import CopilotoLogo from "@/components/CopilotoLogo";
import { DEFAULT_STOCK_NOUN, possessive, type StockNoun } from "@/lib/stock-noun";
import type { TenantConfig } from "@/lib/types";
import { ArrowUpIcon, ClockIcon, FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon, WhatsAppIcon, YoutubeIcon } from "./base/icones";
import LogoLoja from "./base/LogoLoja";
import { ANO, externo, inicio, telefone, zap } from "./base/util";
import BuscaRodape from "./BuscaRodape";
import Topo from "./Topo";

/**
 * Rodapé do Delta, "box": escuro na cor principal, com a borda de cima em diagonal. Em cima, à
 * esquerda, "A próxima direção é sua.", "Vamos conversar?" e "Fale com a gente" (do lado oposto
 * ao botão da fita, para as duas chamadas não ficarem uma em cima da outra); à direita, um campo
 * de busca do estoque. No meio, Explore, Contato e Acompanhe (este só com links do painel) e a
 * placa do logo. Na base, copyright, crédito em branco e "Voltar ao topo" numa lâmina que desliza.
 * Textos da regra 12 do SKILL.md.
 */
export default function Rodape({ config, base, noun = DEFAULT_STOCK_NOUN }: { config: TenantConfig; base: string; noun?: StockNoun }) {
  const zapHref = zap(config);
  const tel = telefone(config);
  const fale = zapHref ?? tel ?? (config.email ? `mailto:${config.email}` : undefined);

  const explore = [
    { href: inicio(base), rotulo: "Início" },
    { href: `${base}/comprar`, rotulo: "Nosso estoque" },
    ...(config.sections.paginaVender ? [{ href: `${base}/vender`, rotulo: `Venda ${possessive(noun)} ${noun.singular}` }] : []),
    ...(config.sections.paginaSobre ? [{ href: `${base}/sobre-nos`, rotulo: "Sobre nós" }] : []),
  ];
  const acompanhe = [
    ...(config.social.instagram ? [{ href: config.social.instagram, rotulo: "Instagram", Icone: InstagramIcon }] : []),
    ...(config.social.facebook ? [{ href: config.social.facebook, rotulo: "Facebook", Icone: FacebookIcon }] : []),
    ...(config.social.youtube ? [{ href: config.social.youtube, rotulo: "YouTube", Icone: YoutubeIcon }] : []),
    ...(config.privacyUrl ? [{ href: config.privacyUrl, rotulo: "Política de Privacidade", Icone: undefined }] : []),
    ...(config.termsUrl ? [{ href: config.termsUrl, rotulo: "Termos e condições", Icone: undefined }] : []),
  ];

  return (
    <footer className="dl dl-rod">
      <div className="dl-wrap">
        <div className="dl-rod__topo">
          <div className="dl-rod__chamada">
            <p className="dl-rod__frase">A próxima direção é sua.</p>
            <div className="dl-rod__conversa">
              <h2 className="dl-rod__titulo">Vamos conversar?</h2>
              {fale && (
                <a className="dl-btn dl-btn--claro dl-rod__fale" href={fale} {...(fale.startsWith("http") ? externo : {})}>
                  {zapHref ? <WhatsAppIcon size={18} /> : <PhoneIcon size={17} />}
                  Fale com a gente
                </a>
              )}
            </div>
          </div>
          <BuscaRodape base={base} noun={noun} />
        </div>

        <div className="dl-rod__meio">
          <Link href={inicio(base)} className="dl-rod__placa" aria-label={`${config.name}, página inicial`}>
            <LogoLoja nome={config.name} logoUrl={config.logoUrl} className="dl-rod__logo" altura={32} />
          </Link>
          <nav className="dl-rod__col" aria-labelledby="dl-rod-explore">
            <h3 id="dl-rod-explore" className="dl-rod__rotulo">
              Explore
            </h3>
            <ul>
              {explore.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.rotulo}</Link>
                </li>
              ))}
            </ul>
          </nav>
          {/* Sem "Acompanhe", o contato ocupa as duas colunas da direita, em duas colunas. */}
          <div className={acompanhe.length ? "dl-rod__col dl-rod__col--contato" : "dl-rod__col dl-rod__col--contato dl-rod__col--larga"}>
            <h3 className="dl-rod__rotulo">Contato</h3>
            <ul>
              {tel && config.phone && (
                <li>
                  <a href={tel}>
                    <PhoneIcon size={16} />
                    {config.phone}
                  </a>
                </li>
              )}
              {zapHref && (
                <li>
                  <a href={zapHref} {...externo}>
                    <WhatsAppIcon size={16} />
                    WhatsApp
                  </a>
                </li>
              )}
              {config.email && (
                <li>
                  <a href={`mailto:${config.email}`}>
                    <MailIcon size={16} />
                    {config.email}
                  </a>
                </li>
              )}
              {config.address && (
                <li>
                  <span>
                    <PinIcon size={16} />
                    {config.address}
                  </span>
                </li>
              )}
              {config.hours.weekdays && (
                <li>
                  <span>
                    <ClockIcon size={16} />
                    {config.hours.weekdays}
                    {config.hours.saturday && (
                      <>
                        <br />
                        {config.hours.saturday}
                      </>
                    )}
                  </span>
                </li>
              )}
            </ul>
          </div>
          {acompanhe.length > 0 && (
            <div className="dl-rod__col">
              <h3 className="dl-rod__rotulo">Acompanhe</h3>
              <ul>
                {acompanhe.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} {...externo}>
                      {l.Icone && <l.Icone size={16} />}
                      {l.rotulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="dl-rod__base">
          <p>© Copyright {ANO}. Copiloto Inova Simples (I.s.)</p>
          <a className="dl-rod__credito" href="https://ocopiloto.com.br/" {...externo}>
            Desenvolvida com <span aria-hidden="true">♥</span>
            <span className="dl-sr">amor</span> por <CopilotoLogo className="dl-rod__copiloto" />
            <span className="dl-sr">Copiloto</span>
          </a>
          <Topo className="dl-rod__subir">
            Voltar ao topo
            <ArrowUpIcon size={16} />
          </Topo>
        </div>
      </div>
    </footer>
  );
}
