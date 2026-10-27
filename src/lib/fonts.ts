import {
  Archivo,
  Barlow,
  Bebas_Neue,
  DM_Sans,
  Inter,
  Manrope,
  Montserrat,
  Oswald,
  Plus_Jakarta_Sans,
  Poppins,
  Raleway,
  Roboto,
  Rubik,
  Sora,
  Work_Sans,
} from "next/font/google";

const montserrat = Montserrat({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-montserrat", weight: ["400", "500", "600", "700"] });
const poppins = Poppins({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-poppins", weight: ["400", "500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-inter" });
const roboto = Roboto({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-roboto", weight: ["400", "500", "700"] });
const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-manrope" });
const oswald = Oswald({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-oswald", weight: ["400", "500", "600", "700"] });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-bebas-neue", weight: ["400"] });
const raleway = Raleway({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-raleway" });
const rubik = Rubik({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-rubik" });
const workSans = Work_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-work-sans" });
const barlow = Barlow({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-barlow", weight: ["400", "500", "600", "700"] });
const archivo = Archivo({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-archivo" });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-dm-sans" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-plus-jakarta" });
const sora = Sora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-sora" });

const FONTS: Record<string, { font: { variable: string }; cssVar: string }> = {
  Montserrat: { font: montserrat, cssVar: "--font-montserrat" },
  Poppins: { font: poppins, cssVar: "--font-poppins" },
  Inter: { font: inter, cssVar: "--font-inter" },
  Roboto: { font: roboto, cssVar: "--font-roboto" },
  Manrope: { font: manrope, cssVar: "--font-manrope" },
  Oswald: { font: oswald, cssVar: "--font-oswald" },
  "Bebas Neue": { font: bebasNeue, cssVar: "--font-bebas-neue" },
  Raleway: { font: raleway, cssVar: "--font-raleway" },
  Rubik: { font: rubik, cssVar: "--font-rubik" },
  "Work Sans": { font: workSans, cssVar: "--font-work-sans" },
  Barlow: { font: barlow, cssVar: "--font-barlow" },
  Archivo: { font: archivo, cssVar: "--font-archivo" },
  "DM Sans": { font: dmSans, cssVar: "--font-dm-sans" },
  "Plus Jakarta Sans": { font: plusJakarta, cssVar: "--font-plus-jakarta" },
  Sora: { font: sora, cssVar: "--font-sora" },
};

export const fontVariables = Object.values(FONTS)
  .map((f) => f.font.variable)
  .join(" ");

export function resolveFontFamily(name?: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed || trimmed === "Hanken Grotesk") return null;
  const entry = FONTS[trimmed];
  if (!entry) return null;
  return `var(${entry.cssVar}), system-ui, sans-serif`;
}
