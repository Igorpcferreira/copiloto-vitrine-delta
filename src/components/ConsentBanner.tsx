"use client";

import { useEffect, useState } from "react";
import { saveConsent, useConsent } from "@/lib/consent";

/**
 * Aviso de cookies do Horizon (26/10/2026), com o mesmo texto e o mesmo efeito (`saveConsent`).
 * No Delta muda só o lugar e o desenho: um cartão compacto embaixo à esquerda, nunca de ponta a
 * ponta, para não cobrir o WhatsApp nem a barra do carro (regra 5), e só depois da primeira
 * rolagem, para não cobrir a abertura (nada que precise do aceite carrega antes dele: o mapa e o
 * rastreamento esperam). Enquanto ele está aberto, o rodapé ganha espaço embaixo (CSS por
 * `:has(.dl-consentimento)`).
 */
export default function ConsentBanner({ privacyUrl }: { privacyUrl?: string }) {
  const consent = useConsent();
  const [rolou, setRolou] = useState(false);
  useEffect(() => {
    if (rolou) return;
    const ver = () => {
      if (window.scrollY > 200) setRolou(true);
    };
    addEventListener("scroll", ver, { passive: true });
    return () => removeEventListener("scroll", ver);
  }, [rolou]);
  if (consent !== null || !rolou) return null;
  return (
    <div role="region" aria-label="Aviso de cookies" className="dl dl-consentimento">
      <p className="dl-consentimento__texto">
        Usamos cookies para medir as visitas, mostrar o mapa e melhorar os anúncios. Você pode aceitar ou recusar.
        {privacyUrl && (
          <>
            {" "}
            <a href={privacyUrl} target="_blank" rel="noopener noreferrer">
              Política de Privacidade
            </a>
            .
          </>
        )}
      </p>
      <div className="dl-consentimento__acoes">
        <button type="button" className="dl-btn dl-btn--linha dl-btn--pequeno" onClick={() => saveConsent("denied")}>
          Recusar
        </button>
        <button type="button" className="dl-btn dl-btn--escuro dl-btn--pequeno" onClick={() => saveConsent("granted")}>
          Aceitar
        </button>
      </div>
    </div>
  );
}
