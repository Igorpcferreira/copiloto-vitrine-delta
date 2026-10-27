import type { CSSProperties } from "react";

const MAX_WIDTH = 1;
const MAX_HEIGHT = 0.66;
const MAX_AREA = 0.4;

export function brandLogoStyle(src?: string | null): CSSProperties | undefined {
  const box = new URLSearchParams(src?.split("?")[1] ?? "").get("box")?.split(",").map(Number) ?? [];
  const [left = 0, top = 0, width = 0, height = 0] = box;
  if (box.length !== 4 || !(width > 0 && height > 0 && left >= 0 && top >= 0 && left + width <= 1.001 && top + height <= 1.001)) {
    return undefined;
  }

  const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height, Math.sqrt(MAX_AREA / (width * height)));
  const offsetX = (0.5 - left - width / 2) * 100;
  const offsetY = (0.5 - top - height / 2) * 100;

  return { transform: `scale(${scale.toFixed(4)}) translate(${offsetX.toFixed(3)}%, ${offsetY.toFixed(3)}%)` };
}
