export function siteBaseUrl(customDomain?: string): URL | undefined {
  const domain =
    customDomain ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (domain) return new URL(`https://${domain}`);
  if (process.env.NODE_ENV !== "production") return new URL("http://localhost:3000");
  return undefined;
}
