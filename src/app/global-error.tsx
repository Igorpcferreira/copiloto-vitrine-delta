"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          margin: 0,
          background: "#fafafa",
          color: "#0f1522",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: "440px", textAlign: "center" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>Algo deu errado</h1>
          <p style={{ marginTop: "12px", fontSize: "14px", lineHeight: 1.6, color: "#626b78" }}>
            Não conseguimos carregar o site agora. Tente novamente em instantes.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "24px",
              height: "44px",
              padding: "0 24px",
              borderRadius: "10px",
              border: "none",
              background: "#0f1522",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
