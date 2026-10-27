"use client";

import Script from "next/script";
import { useConsent } from "@/lib/consent";
import { TrackingPageViews } from "./TrackingPageViews";

export default function TrackingScripts({ googleTagId, metaPixelId }: { googleTagId?: string; metaPixelId?: string }) {
  const consent = useConsent();
  if (consent !== "granted" || (!googleTagId && !metaPixelId)) return null;

  return (
    <>
      {googleTagId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleTagId)}`} strategy="afterInteractive" />
          <Script id="google-tag-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', ${JSON.stringify(googleTagId)});`}
          </Script>
        </>
      )}
      {metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(metaPixelId)});
fbq('track', 'PageView');`}
        </Script>
      )}
      <TrackingPageViews metaPixelId={metaPixelId} />
    </>
  );
}
