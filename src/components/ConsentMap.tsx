"use client";

import { useState } from "react";
import { useConsent } from "@/lib/consent";

export default function ConsentMap({ src, title, className = "" }: { src: string; title: string; className?: string }) {
  const consent = useConsent();
  const [opened, setOpened] = useState(false);

  if (consent === "granted" || opened) {
    return <iframe title={title} src={src} className={className} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />;
  }

  return (
    <div className={`grid place-items-center bg-surface text-center ${className}`}>
      <div className="flex flex-col items-center gap-3 px-6">
        <p className="text-[14px] text-muted">O mapa usa cookies do Google.</p>
        <button
          type="button"
          onClick={() => setOpened(true)}
          className="h-10 rounded-lg border border-line bg-white px-4 text-[14px] font-medium text-content transition hover:border-navy-950"
        >
          Mostrar mapa
        </button>
      </div>
    </div>
  );
}
