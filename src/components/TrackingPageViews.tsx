"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function TrackingPageViews({ metaPixelId }: { metaPixelId?: string }) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (metaPixelId && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [metaPixelId, pathname]);

  return null;
}
