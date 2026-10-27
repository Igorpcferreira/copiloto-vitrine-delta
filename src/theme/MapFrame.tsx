"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Google map embed brings several heavy scripts. It is only requested when its section
 * is about one screen away, then fades in over the toned placeholder once it has loaded.
 */
export default function MapFrame({ src, title }: { src: string; title: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const section = marker.current?.closest("section");
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <span ref={marker} hidden />
      {near && (
        <iframe
          title={title}
          src={src}
          loading="lazy"
          tabIndex={-1}
          referrerPolicy="no-referrer-when-downgrade"
          data-ready={ready}
          onLoad={() => setReady(true)}
        />
      )}
    </>
  );
}
