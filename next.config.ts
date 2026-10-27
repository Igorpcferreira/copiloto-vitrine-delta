import type { NextConfig } from "next";
import { REMOTE_IMAGE_HOSTS } from "./image-hosts";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const PREVIEW_FRAME_ANCESTORS = "frame-ancestors 'self' https://ocopiloto.com.br https://*.ocopiloto.com.br http://localhost:* https://localhost:*";

const nextConfig: NextConfig = {
  // Persist the selected build mode in server bundles, including Vercel functions.
  // This flag is public configuration, never an API credential.
  env: { VITRINE_DEMO: process.env.VITRINE_DEMO === "true" ? "true" : "false" },
  devIndicators: false,
  // Lets the local review also open at http://127.0.0.1:<port> in development.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      { source: "/((?!_next/).*)", headers: [...SECURITY_HEADERS, { key: "Content-Security-Policy", value: "frame-ancestors 'self'" }] },
      { source: "/preview", headers: [{ key: "Content-Security-Policy", value: PREVIEW_FRAME_ANCESTORS }] },
    ];
  },
  images: {
    // Logos de marca da demo levam o enquadramento em `?box=`, como os da API (22/10/2026).
    localPatterns: [{ pathname: "/brands/**" }, { pathname: "/**", search: "" }],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    remotePatterns: REMOTE_IMAGE_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname })),
  },
};

export default nextConfig;
