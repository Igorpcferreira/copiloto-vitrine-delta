"use client";

import { useEffect, useState } from "react";
import {
  onConsentSettingsOpen,
  openConsentSettings,
  saveConsent,
  useConsent,
  type ConsentCategory,
  type ConsentState,
} from "@/lib/consent";
import Dialogo from "@/theme/base/Dialogo";
import { CookieIcon, XIcon } from "@/theme/base/icones";

const CATEGORY_COPY: Record<ConsentCategory, { title: string; description: string; purpose: string }> = {
  analytics: {
    title: "Analytics",
    description: "Ajudam a entender o uso do site.",
    purpose: "entender sua navegação",
  },
  marketing: {
    title: "Marketing",
    description: "Permitem medir campanhas e mostrar anúncios.",
    purpose: "melhorar nossos anúncios",
  },
  map: {
    title: "Mapa",
    description: "Mostra a localização da loja com o Google Maps. O Google pode usar cookies.",
    purpose: "mostrar o mapa",
  },
};

const NO_CONSENT: ConsentState = { analytics: false, marketing: false, map: false };

const purposeList = new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" });

/** Scroll distance before the notice shows, so it never covers the opening. */
const REVEAL_AFTER = 200;

/**
 * Cookie notice of the remote Horizon (27/10/2026): same categories, texts and effect
 * (`saveConsent`, "Configurar cookies" in the footer). In the Delta only the look and the place
 * change: the compact card at the bottom left, never edge to edge, so it never covers the
 * WhatsApp button or the vehicle bar (rule 5), and only after the first scroll, so it never
 * covers the opening. Nothing that needs consent loads before the choice. While it is open the
 * footer gains room at the bottom (CSS by `:has(.dl-consentimento)`). The preferences open in
 * the Delta dialog, from the notice or from "Configurar cookies".
 */
export default function ConsentBanner({ categories, privacyUrl }: { categories: ConsentCategory[]; privacyUrl?: string }) {
  const consent = useConsent();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentState>(NO_CONSENT);
  const [revealed, setRevealed] = useState(false);

  useEffect(
    () =>
      onConsentSettingsOpen(() => {
        setDraft(consent ?? NO_CONSENT);
        setSettingsOpen(true);
      }),
    [consent],
  );

  useEffect(() => {
    if (revealed || consent !== null) return;
    const check = () => {
      if (window.scrollY > REVEAL_AFTER) setRevealed(true);
    };
    // A page restored further down shows the notice without waiting for a new scroll.
    const frame = requestAnimationFrame(check);
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", check);
    };
  }, [revealed, consent]);

  const choose = (enabled: (category: ConsentCategory) => boolean) => {
    const allowed = (category: ConsentCategory) => categories.includes(category) && enabled(category);
    saveConsent({ analytics: allowed("analytics"), marketing: allowed("marketing"), map: allowed("map") });
    setSettingsOpen(false);
  };
  const acceptAll = () => choose(() => true);
  const rejectOptional = () => choose(() => false);
  const savePreferences = () => choose((category) => draft[category]);
  const revocable = categories.some((category) => category !== "map");
  const purposes = purposeList.format(categories.map((category) => CATEGORY_COPY[category].purpose));

  return (
    <>
      {consent === null && revealed && (
        <aside className="dl dl-consentimento" aria-label="Preferências de cookies">
          <p className="dl-consentimento__texto">
            <CookieIcon size={20} className="dl-consentimento__icone" />
            <span>
              Podemos usar cookies para {purposes}? Você decide.
              {privacyUrl && (
                <>
                  {" "}
                  <a href={privacyUrl} target="_blank" rel="noopener noreferrer">
                    Política de Privacidade
                  </a>
                </>
              )}
            </span>
          </p>
          <div className="dl-consentimento__acoes">
            <button type="button" className="dl-btn dl-btn--linha dl-btn--pequeno dl-consentimento__config" onClick={openConsentSettings}>
              Configurar
            </button>
            <button type="button" className="dl-btn dl-btn--linha dl-btn--pequeno" onClick={rejectOptional}>
              Recusar opcionais
            </button>
            <button type="button" className="dl-btn dl-btn--escuro dl-btn--pequeno" onClick={acceptAll}>
              Aceitar todos
            </button>
          </div>
        </aside>
      )}

      <Dialogo
        aberto={settingsOpen}
        aoFechar={() => setSettingsOpen(false)}
        rotulo="Configurar cookies"
        className="dl dl-cookies"
      >
        <div className="dl-cookies__painel">
          <div className="dl-cookies__topo">
            <CookieIcon size={22} className="dl-consentimento__icone" />
            <h2>Configurar cookies</h2>
            <button type="button" className="dl-cookies__fechar" aria-label="Fechar preferências" onClick={() => setSettingsOpen(false)}>
              <XIcon size={20} />
            </button>
          </div>
          <p className="dl-cookies__lead">
            Você pode mudar sua escolha a qualquer momento. Os cookies opcionais não são necessários para usar o site.
          </p>
          <ul className="dl-cookies__lista">
            <li className="dl-cookies__linha">
              <span className="dl-cookies__texto">
                <strong>Necessários</strong>
                <small>Permitem o funcionamento do site e guardam sua escolha.</small>
              </span>
              <em>Sempre ativos</em>
            </li>
            {categories.map((category) => (
              <li key={category}>
                <label className="dl-cookies__linha">
                  <span className="dl-cookies__texto">
                    <strong id={`dl-cookie-${category}-titulo`}>{CATEGORY_COPY[category].title}</strong>
                    <small id={`dl-cookie-${category}-descricao`}>{CATEGORY_COPY[category].description}</small>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    className="dl-cookies__chave"
                    checked={draft[category]}
                    onChange={(event) => setDraft((current) => ({ ...current, [category]: event.target.checked }))}
                    aria-labelledby={`dl-cookie-${category}-titulo`}
                    aria-describedby={`dl-cookie-${category}-descricao`}
                  />
                </label>
              </li>
            ))}
          </ul>
          {revocable && (
            <p className="dl-cookies__nota">Se você desligar uma opção que estava ativa, a página recarrega para parar a coleta.</p>
          )}
          <div className="dl-cookies__acoes">
            <button type="button" className="dl-btn dl-btn--linha dl-btn--pequeno" onClick={rejectOptional}>
              Recusar opcionais
            </button>
            <button type="button" className="dl-btn dl-btn--escuro dl-btn--pequeno" onClick={savePreferences}>
              Salvar preferências
            </button>
          </div>
        </div>
      </Dialogo>
    </>
  );
}
