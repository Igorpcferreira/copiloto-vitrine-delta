"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="dl-wrap dl-aviso">
      <p className="dl-aviso__rotulo">Algo deu errado</p>
      <h1 className="dl-aviso__titulo">Não conseguimos carregar esta página agora</h1>
      <p className="dl-aviso__texto">Pode ser uma instabilidade momentânea. Tente novamente em alguns segundos.</p>
      <button type="button" onClick={reset} className="dl-btn dl-btn--linha">
        Tentar novamente
      </button>
    </div>
  );
}
