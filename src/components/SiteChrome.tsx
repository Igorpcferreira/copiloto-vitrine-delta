import { getStockNoun, getTenant } from "@/lib/data";
import { resolveTracking } from "@/lib/tracking";
import Shell from "@/theme/Shell";
import { consentCategoriesFor } from "@/theme/consent-choice";
import ConsentBanner from "@/components/ConsentBanner";
import TrackingScripts from "@/components/TrackingScripts";

export default async function SiteChrome({ children }: { children: React.ReactNode }) {
  const [config, noun] = await Promise.all([getTenant(), getStockNoun()]);
  const { googleTagId, metaPixelId } = resolveTracking(config);
  const consentCategories = consentCategoriesFor(config);

  return (
    <>
      <TrackingScripts googleTagId={googleTagId} metaPixelId={metaPixelId} />
      <Shell config={config} base="" noun={noun}>
        {children}
      </Shell>
      {consentCategories.length > 0 && <ConsentBanner categories={consentCategories} privacyUrl={config.privacyUrl} />}
    </>
  );
}
