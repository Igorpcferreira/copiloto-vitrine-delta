import type { PhotoFocalPoint } from "./types";

export const VEHICLE_PHOTO_PLACEHOLDER = "/defaults/placeholder-vehicle.webp";

export function vehiclePhoto(photos: string[], index = 0): string {
  return photos[index] ?? VEHICLE_PHOTO_PLACEHOLDER;
}

function centeredOffset(focalPct: number, visibleFraction: number): number {
  if (visibleFraction >= 1) return 50;
  const position = (focalPct - 50 * visibleFraction) / (1 - visibleFraction);
  return Math.min(100, Math.max(0, position));
}

export function vehiclePhotoPosition(
  focalPoints: (PhotoFocalPoint | null)[] | undefined,
  index = 0,
  containerAspect?: number,
): string | undefined {
  const focalPoint = focalPoints?.[index];
  if (!focalPoint) return undefined;
  const imageAspect = focalPoint.aspectRatio;
  if (!containerAspect || !imageAspect) {
    return `${focalPoint.x}% ${focalPoint.y}%`;
  }
  let posX = 50;
  let posY = 50;
  if (imageAspect > containerAspect) {
    posX = centeredOffset(focalPoint.x, containerAspect / imageAspect);
  } else {
    posY = centeredOffset(focalPoint.y, imageAspect / containerAspect);
  }
  return `${Math.round(posX * 100) / 100}% ${Math.round(posY * 100) / 100}%`;
}
