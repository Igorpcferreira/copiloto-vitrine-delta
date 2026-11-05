"use client";

import { useEffect } from "react";

const NAVIGATION_KEYS = new Set(["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export default function InputModality() {
  useEffect(() => {
    const root = document.documentElement;
    const onPointer = () => {
      root.dataset.input = "pointer";
    };
    const onKey = (event: KeyboardEvent) => {
      if (NAVIGATION_KEYS.has(event.key)) {
        root.dataset.input = "keyboard";
      }
    };

    window.addEventListener("pointerdown", onPointer, { capture: true, passive: true });
    window.addEventListener("keydown", onKey, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", onPointer, { capture: true });
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, []);

  return null;
}
