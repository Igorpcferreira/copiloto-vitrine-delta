import { getStockNoun, getTenant } from "@/lib/data";
import Shell from "@/theme/Shell";
import ConsentBanner from "@/components/ConsentBanner";
import TrackingScripts from "@/components/TrackingScripts";

const GOOGLE_TAG_ID_PATTERN = /^(?:GT|G|AW)-[A-Z0-9]+$/;
const META_PIXEL_ID_PATTERN = /^\d{5,30}$/;

export default async function SiteChrome({ children }: { children: React.ReactNode }) {
  const [config, noun] = await Promise.all([getTenant(), getStockNoun()]);

  const rawGoogleTagId = config.tracking?.googleAnalyticsId?.trim().toUpperCase();
  const rawMetaPixelId = config.tracking?.metaPixelId?.trim();
  const googleTagId = rawGoogleTagId && GOOGLE_TAG_ID_PATTERN.test(rawGoogleTagId) ? rawGoogleTagId : undefined;
  const metaPixelId = rawMetaPixelId && META_PIXEL_ID_PATTERN.test(rawMetaPixelId) ? rawMetaPixelId : undefined;
  const needsConsent = Boolean(googleTagId || metaPixelId || config.sections.mapa);

  return (
    <>
      <TrackingScripts googleTagId={googleTagId} metaPixelId={metaPixelId} />
      <Shell config={config} base="" noun={noun}>
        {children}
      </Shell>
      {needsConsent && <ConsentBanner privacyUrl={config.privacyUrl} />}
    </>
  );
}
