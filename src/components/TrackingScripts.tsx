"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { clearTrackingCookies, useConsent, type ConsentState } from "@/lib/consent";
import { googleTagCategory } from "@/lib/tracking";
import { TrackingPageViews } from "./TrackingPageViews";

function googleConsent(consent: ConsentState) {
  const ads = consent.marketing ? "granted" : "denied";
  return {
    analytics_storage: consent.analytics ? "granted" : "denied",
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
  };
}

const GOOGLE_CONSENT_DENIED = googleConsent({ analytics: false, marketing: false, map: false });

export default function TrackingScripts({ googleTagId, metaPixelId }: { googleTagId?: string; metaPixelId?: string }) {
  const consent = useConsent();
  const loadGoogle = Boolean(googleTagId && consent?.[googleTagCategory(googleTagId)]);
  const loadMeta = Boolean(metaPixelId && consent?.marketing);
  const loaded = useRef({ google: false, meta: false });

  useEffect(() => {
    if (!consent) return;
    clearTrackingCookies(consent);
    if ((loaded.current.google && !loadGoogle) || (loaded.current.meta && !loadMeta)) {
      window.location.reload();
      return;
    }
    loaded.current = { google: loaded.current.google || loadGoogle, meta: loaded.current.meta || loadMeta };
    window.gtag?.("consent", "update", googleConsent(consent));
  }, [consent, loadGoogle, loadMeta]);

  if (!consent || (!loadGoogle && !loadMeta)) return null;

  return (
    <>
      {loadGoogle && googleTagId && (
        <>
          <Script id="google-tag-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', ${JSON.stringify(GOOGLE_CONSENT_DENIED)});
gtag('consent', 'update', ${JSON.stringify(googleConsent(consent))});
gtag('js', new Date());
gtag('config', ${JSON.stringify(googleTagId)});`}
          </Script>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleTagId)}`} strategy="afterInteractive" />
        </>
      )}
      {loadMeta && metaPixelId && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('consent', 'grant');
fbq('init', ${JSON.stringify(metaPixelId)});
fbq('track', 'PageView');`}
          </Script>
          <TrackingPageViews metaPixelId={metaPixelId} />
        </>
      )}
    </>
  );
}
