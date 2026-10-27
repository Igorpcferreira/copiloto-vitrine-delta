export default function PrivacyNotice({ privacyUrl, className = "" }: { privacyUrl?: string; className?: string }) {
  return (
    <p className={`text-center text-[12px] leading-relaxed text-muted ${className}`}>
      Ao enviar, você autoriza a loja a usar seus dados para entrar em contato sobre este pedido.
      {privacyUrl && (
        <>
          {" "}
          Veja a{" "}
          <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-content">
            Política de Privacidade
          </a>
          .
        </>
      )}
    </p>
  );
}
