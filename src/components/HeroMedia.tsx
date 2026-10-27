"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { SiteAppearance } from "@/lib/appearance";
import { normalizeAppearance } from "@/lib/appearance";
import { isRenderableImageSrc } from "@/lib/image-src";

/**
 * The opening image, optimized and preloaded: it is the largest paint of the page, so it
 * gets a responsive size and high priority instead of waiting for the video element.
 */
/**
 * The poster must stay the largest paint. Chrome counts an upscaled image by its natural pixels,
 * so on a tall phone hero a 750w poster (about 316k px) lost to the video (about 335k px) and the
 * LCP moved to the video, seconds later. On phones it asks for a wider file (1080w here, about
 * 21 KB) so its natural area covers the hero.
 */
function Poster({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? null : (
    <Image src={src} alt="" fill sizes="(max-width: 767px) 140vw, 100vw" preload fetchPriority="high" onError={() => setFailed(true)} />
  );
}

/** Data saver on, or a 2G connection: about 1 MB of video would cost more than it gives. */
function constrainedConnection() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!connection && (connection.saveData === true || /2g$/.test(connection.effectiveType ?? ""));
}

/**
 * Banner video over its poster. The sources are attached only after the page has loaded
 * (and the browser is idle), so the video never competes with the critical CSS, scripts
 * and the poster on slow connections. With reduced motion, the data saver on or a 2G
 * connection it is never downloaded and the poster stays. It fades in once it is really
 * playing, and pauses off screen or in a hidden tab.
 */
function BannerVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const visible = useRef(true);
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const mobileSrc = /^\/[a-z0-9-]+\/banner-video\.mp4$/.test(src)
    ? src.replace(/\.mp4$/, "-mobile.mp4")
    : undefined;

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let idle = 0;
    let timer = 0;
    const arm = () => {
      if (reduced.matches || constrainedConnection()) return;
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(() => setArmed(true), { timeout: 2500 });
      } else {
        timer = window.setTimeout(() => setArmed(true), 300);
      }
    };
    const onReducedChange = () => {
      if (!reduced.matches) arm();
    };
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });
    reduced.addEventListener("change", onReducedChange);
    return () => {
      window.removeEventListener("load", arm);
      reduced.removeEventListener("change", onReducedChange);
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
    };
  }, [src]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !armed) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (!visible.current || document.hidden || reduced.matches) video.pause();
      else void video.play().catch(() => undefined);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      sync();
    });
    observer.observe(video);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    // The sources were just added; load() makes the element pick them up.
    video.load();
    sync();
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [armed]);

  return (
    <div className="hero-media bg-surface" aria-hidden="true">
      {poster && <Poster src={poster} />}
      {!failed && (
        <video
          ref={ref}
          muted
          playsInline
          loop
          preload="none"
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          data-playing={playing}
          onPlaying={() => setPlaying(true)}
          onError={(event) => {
            if (event.target === event.currentTarget) setFailed(true);
          }}
        >
          {armed && mobileSrc && <source src={mobileSrc} type="video/mp4" media="(max-width:767px)" />}
          {armed && <source src={src} type="video/mp4" onError={() => setFailed(true)} />}
        </video>
      )}
    </div>
  );
}

export default function HeroMedia({ imageUrl, appearance }: { imageUrl?: string; appearance?: SiteAppearance }) {
  const config = normalizeAppearance(appearance);
  const video = config.bannerType === "video" ? config.bannerVideoUrl : undefined;
  const poster = isRenderableImageSrc(imageUrl) ? imageUrl : undefined;
  return video ? (
    <BannerVideo key={video} src={video} poster={poster} />
  ) : (
    <div className="hero-media bg-surface" aria-hidden="true">
      {poster && <Poster key={poster} src={poster} />}
    </div>
  );
}
