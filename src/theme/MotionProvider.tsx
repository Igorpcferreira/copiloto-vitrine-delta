"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// Long enough for a slow first frame, short enough that drag and animations never go missing.
const REVEAL_WAIT_LIMIT = 8000;

/**
 * Resolves once the browser has revealed every part of the page the server streamed later
 * (React keeps each one behind a `template` with an id starting with "B:" until then, and
 * reveals them on an animation frame). Loading the features earlier changes the Motion
 * context while those parts still wait, and React then drops their server HTML and builds
 * them again in the browser: on 21/10/2026 that happened whenever the features arrived
 * before the reveal, about one load in ten and every time the first frame was slow.
 */
function streamedPartsRevealed() {
  const start = performance.now();
  return new Promise<void>((resolve) => {
    const check = () => {
      const waiting = document.querySelector('template[id^="B:"]');
      if (waiting && performance.now() - start < REVEAL_WAIT_LIMIT) requestAnimationFrame(check);
      else resolve();
    };
    check();
  });
}

const loadFeatures = () =>
  streamedPartsRevealed()
    .then(() => import("./motion-features"))
    .then((module) => module.default);

/**
 * Motion for the whole theme. Components use the light `m` elements; the animation features
 * load right after the page's streamed parts are revealed, so they never compete with the
 * first paint nor make React render those parts again. `strict` stops any full `motion`
 * element from slipping back in. Honours the visitor's reduced-motion preference.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
