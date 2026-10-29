import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import path from "node:path";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const raw = process.env.SITE_CONFIG ?? await readFile(path.join(process.cwd(), "site-config.json"), "utf8");
const input = JSON.parse(raw);
if (!input || typeof input !== "object" || Array.isArray(input) || !/^[a-z0-9-]{3,60}$/.test(input.slug ?? "")) {
  throw new Error("SITE_CONFIG inválido ou sem slug válido.");
}

const configFields = [
  "slug", "name", "theme", "tagline", "logoUrl", "bannerUrl", "bannerLink", "faviconUrl",
  "primaryColor", "secondaryColor", "surfaceColor", "fontFamily", "appearance",
  "ctaImageUrl", "ctaTitle", "ctaButtonLabel", "customDomain", "tracking", "phone",
  "whatsapp", "email", "address", "city", "hours", "social", "about", "testimonials",
  "googleRating", "googleReviewCount", "sections", "storePhotos", "privacyUrl", "termsUrl", "mapQuery", "vehicleFocus",
];
const config = Object.fromEntries(configFields.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]));
config.theme = "delta";
if (!["car", "motorcycle", "truck"].includes(config.vehicleFocus)) delete config.vehicleFocus;
const rawAppearance = config.appearance && typeof config.appearance === "object" && !Array.isArray(config.appearance) ? config.appearance : {};
const appearance = {};
for (const key of ["headerBackgroundColor", "headerTextColor", "textColor", "contrastTextColor", "bannerTextColor"]) {
  if (typeof rawAppearance[key] === "string" && /^#[\da-f]{6}$/i.test(rawAppearance[key])) appearance[key] = rawAppearance[key];
}
if (["glass", "transparent", "solid"].includes(rawAppearance.headerStyle)) appearance.headerStyle = rawAppearance.headerStyle;
if (appearance.headerStyle !== "solid") delete appearance.headerBackgroundColor;
if (["image", "video"].includes(rawAppearance.bannerType)) appearance.bannerType = rawAppearance.bannerType;
if (appearance.bannerType === "video") {
  const url = rawAppearance.bannerVideoUrl;
  if (typeof url !== "string" || !url || url.length > 2048 || /[\\\u0000-\u0020]/.test(url)) throw new Error("Vídeo do banner sem URL válida.");
  if (/GoogleAccessId|X-Goog-Signature|X-Amz-Signature/i.test(url)) throw new Error("O vídeo precisa de uma URL permanente.");
  if (!/^\/(?!\/)/.test(url)) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("URL do vídeo inválida.");
  }
  appearance.bannerVideoUrl = url;
  delete config.bannerLink;
}
config.appearance = appearance;
for (const key of ["primaryColor", "secondaryColor", "surfaceColor"]) {
  if (typeof config[key] !== "string" || !/^#[\da-f]{6}$/i.test(config[key])) delete config[key];
}
const sectionFields = ["marcas", "destaques", "novidades", "ofertas", "depoimentos", "mapa", "ctaBanner", "paginaVender", "paginaSobre", "modalidadeVendaNaHora", "modalidadeTroca", "modalidadeConsignacao", "categorias", "vendaFinancie"];
config.sections = Object.fromEntries(Object.entries(config.sections ?? {}).filter(([key, value]) => sectionFields.includes(key) && typeof value === "boolean"));

const slug = config.slug;
const publicDir = path.join(process.cwd(), "public");
const outputDir = path.join(publicDir, slug);
const stagingDir = await mkdtemp(path.join(tmpdir(), "vitrine-assets-"));
const outDir = path.join(stagingDir, "assets");
const maxAssetBytes = 40 * 1024 * 1024;
const isRemote = (url) => typeof url === "string" && /^https?:\/\//.test(url);
const isExpiringUrl = (url) => typeof url === "string" && /GoogleAccessId|X-Goog-Signature|X-Amz-Signature/i.test(url);

async function download(url) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) {
        await res.body?.cancel();
        throw Object.assign(new Error(`HTTP ${res.status}`), { permanent: res.status !== 408 && res.status !== 429 && res.status < 500 });
      }
      if (Number(res.headers.get("content-length")) > maxAssetBytes) {
        await res.body?.cancel();
        throw Object.assign(new Error("Arquivo maior que 40 MB."), { permanent: true });
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of res.body) {
        size += chunk.length;
        if (size > maxAssetBytes) throw Object.assign(new Error("Arquivo maior que 40 MB."), { permanent: true });
        chunks.push(chunk);
      }
      return Buffer.concat(chunks, size);
    } catch (err) {
      lastErr = err;
      if (err.permanent || attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastErr;
}

const assetCache = new Map();
const isSvg = (buffer) => /<svg[\s>]/i.test(buffer.subarray(0, 4096).toString("utf8"));
const imageInput = (buffer) => sharp(buffer, isSvg(buffer) ? { density: 300 } : {});

function readAsset(url) {
  if (Buffer.isBuffer(url)) return Promise.resolve(url);
  if (!assetCache.has(url)) assetCache.set(url, loadAsset(url));
  return assetCache.get(url);
}

async function loadAsset(url) {
  if (isRemote(url)) return download(url);
  if (typeof url !== "string" || !/^\/(?!\/)/.test(url)) throw new Error("Caminho de mídia inválido.");
  const file = path.resolve(publicDir, decodeURIComponent(url.split(/[?#]/)[0]).slice(1));
  if (!file.startsWith(`${publicDir}${path.sep}`)) throw new Error("Mídia fora da pasta pública.");
  if ((await stat(file)).size > maxAssetBytes) throw new Error("Arquivo maior que 40 MB.");
  return readFile(file);
}

async function toWebp(url, name, maxWidth, { critical = false } = {}) {
  if (!url) return undefined;
  try {
    const buffer = await readAsset(url);
    const file = `${name}.webp`;
    await imageInput(buffer).rotate().resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(outDir, file));
    return `/${slug}/${file}`;
  } catch (err) {
    if (Buffer.isBuffer(url) || !isRemote(url) || isExpiringUrl(url)) {
      if (critical) throw new Error(`Falha ao preparar ${name}: ${err.message}`, { cause: err });
      console.warn(`[prepare-site] ${name} indisponível; removendo a referência.`);
      return undefined;
    }
    console.warn(`[prepare-site] Falha ao preparar ${name}: ${err.message}; mantendo URL original.`);
    return url;
  }
}

const FAVICON_ICO_SIZES = [16, 32, 48, 96];

async function writeFaviconIco(source) {
  if (!source) return;
  try {
    const buffer = await readAsset(source);
    const images = await Promise.all(FAVICON_ICO_SIZES.map((size) =>
      imageInput(buffer).rotate().resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()));
    const header = Buffer.alloc(6 + 16 * images.length);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(images.length, 4);
    let offset = header.length;
    images.forEach((png, i) => {
      const entry = 6 + 16 * i;
      header.writeUInt8(FAVICON_ICO_SIZES[i], entry);
      header.writeUInt8(FAVICON_ICO_SIZES[i], entry + 1);
      header.writeUInt16LE(1, entry + 4);
      header.writeUInt16LE(32, entry + 6);
      header.writeUInt32LE(png.length, entry + 8);
      header.writeUInt32LE(offset, entry + 12);
      offset += png.length;
    });
    await writeFile(path.join(publicDir, "favicon.ico"), Buffer.concat([header, ...images]));
  } catch (err) {
    console.warn(`[prepare-site] Falha ao gerar favicon.ico: ${err.message}; mantendo o padrão.`);
  }
}

async function toOgJpeg(source) {
  if (!source) return undefined;
  try {
    const buffer = await readAsset(source);
    await imageInput(buffer).rotate().resize({ width: 1200, height: 630, fit: "cover" }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(outDir, "og-banner.jpg"));
    return `/${slug}/og-banner.jpg`;
  } catch (err) {
    if (Buffer.isBuffer(source)) throw new Error("Falha ao gerar a imagem de compartilhamento do vídeo.", { cause: err });
    console.warn(`[prepare-site] Falha ao gerar og-image: ${err.message}.`);
    return undefined;
  }
}

// Tom do logo no rodapé (Horizon, 28/10/2026), medido contra o fundo em que o logo aparece
// no rodapé de cada tema: no Horizon, a superfície; no Delta, a placa clara (`--dl-raised`).
const DEFAULT_SURFACE = "#fafafa";
const LOGO_MIN_CONTRAST = 3;
const LIGHT_LUMINANCE = 0.1791;

const channelLuminance = (value) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (r, g, b) => 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** A placa do logo: branca nas superfícies claras e um degrau acima delas nas escuras (`raisedSurface`). */
function footerLogoBackground(surfaceColor) {
  const hex = parseInt(surfaceColor.slice(1), 16);
  const channels = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  if (luminance(...channels) > LIGHT_LUMINANCE) return "#ffffff";
  return `#${channels.map((c) => Math.round(c + (255 - c) * 0.08).toString(16).padStart(2, "0")).join("")}`;
}

async function footerLogoTone(url, surfaceColor) {
  if (!url) return undefined;
  try {
    const { data } = await imageInput(await readAsset(url)).resize({ width: 160, withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const hex = parseInt(surfaceColor.slice(1), 16);
    const surface = luminance((hex >> 16) & 255, (hex >> 8) & 255, hex & 255);
    let visible = 0;
    let hidden = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      visible++;
      if (contrast(luminance(data[i], data[i + 1], data[i + 2]), surface) < LOGO_MIN_CONTRAST) hidden++;
    }
    if (!visible || hidden / visible < 0.5) return undefined;
    return surface > LIGHT_LUMINANCE ? "dark" : "light";
  } catch (err) {
    console.warn(`[prepare-site] Falha ao medir o contraste do logo: ${err.message}.`);
    return undefined;
  }
}

async function firstVideoFrame(url) {
  if (!ffmpegPath) throw new Error("FFmpeg indisponível para preparar o vídeo.");
  const source = path.join(stagingDir, "video-source");
  const buffer = await readAsset(url);
  await writeFile(source, buffer);
  for (const [file, width, height, maxrate] of [
    ["banner-video.mp4", 1920, 1080, "4000k"],
    ["banner-video-mobile.mp4", 960, 720, "1200k"],
  ]) {
    await promisify(execFile)(ffmpegPath, [
      "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-threads", "2",
      "-protocol_whitelist", "file,pipe", "-i", source, "-map", "0:v:0", "-an", "-sn",
      "-vf", `scale=w='min(${width},iw)':h='min(${height},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1`,
      "-c:v", "libx264", "-preset", "fast", "-crf", "26", "-pix_fmt", "yuv420p",
      "-r", "30", "-maxrate", maxrate, "-bufsize", maxrate, "-threads", "2",
      "-movflags", "+faststart", path.join(outDir, file),
    ], { timeout: 180000, killSignal: "SIGKILL", maxBuffer: 1024 * 1024, windowsHide: true });
    if ((await stat(path.join(outDir, file))).size > maxAssetBytes) throw new Error("Vídeo otimizado maior que 40 MB. Use um vídeo mais curto.");
  }
  appearance.bannerVideoUrl = `/${slug}/banner-video.mp4`;
  try {
    const { stdout } = await promisify(execFile)(ffmpegPath, [
      "-hide_banner", "-loglevel", "error", "-nostdin", "-threads", "1",
      "-protocol_whitelist", "file,pipe", "-i", source, "-map", "0:v:0",
      "-frames:v", "1", "-an", "-sn", "-vf", "scale=w='min(2400,iw)':h=-2",
      "-f", "image2pipe", "-c:v", "png", "pipe:1",
    ], { encoding: "buffer", timeout: 30000, killSignal: "SIGKILL", maxBuffer: 32 * 1024 * 1024, windowsHide: true });
    if (!stdout.length) throw new Error("O vídeo não retornou uma imagem.");
    return stdout;
  } catch (err) {
    throw new Error("Não foi possível extrair a primeira imagem do vídeo; o build foi interrompido.", { cause: err });
  }
}

try {
  await mkdir(outDir, { recursive: true });
  const frame = appearance.bannerType === "video" ? await firstVideoFrame(appearance.bannerVideoUrl) : undefined;
  const ogSource = frame ?? config.bannerUrl ?? config.storePhotos?.[0] ?? config.logoUrl;
  config.ogImageUrl = await toOgJpeg(ogSource);
  await writeFaviconIco(config.faviconUrl ?? config.logoUrl);
  config.footerLogoTone = await footerLogoTone(config.logoUrl, footerLogoBackground(config.surfaceColor ?? DEFAULT_SURFACE));
  config.logoUrl = await toWebp(config.logoUrl, "logo", 600, { critical: true });
  config.faviconUrl = await toWebp(config.faviconUrl, "favicon", 128, { critical: true });
  config.bannerUrl = await toWebp(frame ?? config.bannerUrl, "banner", 2400, { critical: true });
  config.ctaImageUrl = await toWebp(config.ctaImageUrl, "cta", 2400, { critical: true });

  const storePhotos = Array.isArray(config.storePhotos) ? config.storePhotos : [];
  config.storePhotos = (await Promise.all(storePhotos.map((url, i) => toWebp(url, `loja-${i + 1}`, 1600)))).filter(Boolean);
  const testimonials = Array.isArray(config.testimonials) ? config.testimonials : [];
  config.testimonials = await Promise.all(testimonials.map(async (item, i) => ({
    ...item,
    avatarUrl: item.avatarUrl ? await toWebp(item.avatarUrl, `avatar-${i + 1}`, 160) : undefined,
  })));

  await rm(outputDir, { recursive: true, force: true });
  await cp(outDir, outputDir, { recursive: true });
  await writeFile(path.join(process.cwd(), "site-config.json"), `${JSON.stringify(config, null, 2)}\n`);
  console.log(`[prepare-site] site-config.json e imagens preparados para "${slug}".`);
} finally {
  await rm(stagingDir, { recursive: true, force: true });
}
