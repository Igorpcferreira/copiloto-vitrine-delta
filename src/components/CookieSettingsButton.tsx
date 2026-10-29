"use client";

import { openConsentSettings } from "@/lib/consent";

export default function CookieSettingsButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      Configurar cookies
    </button>
  );
}
