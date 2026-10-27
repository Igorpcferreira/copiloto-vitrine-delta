import { REMOTE_IMAGE_HOSTS } from "../../image-hosts";

export const ALLOWED_IMAGE_HOSTS = REMOTE_IMAGE_HOSTS;

export function isRenderableImageSrc(src?: string | null): src is string {
  if (typeof src !== "string") return false;
  const value = src.trim();
  if (!value) return false;

  if (value.startsWith("/")) return !value.startsWith("//");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;
  return ALLOWED_IMAGE_HOSTS.some((host) => url.hostname === host);
}
