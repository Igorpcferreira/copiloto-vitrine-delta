const LEADING_NOISE = new Set(["i", "imp", "nac", "moto", "motos"]);

const TRAILING_NOISE = new Set([
  "moto",
  "motos",
  "motocicleta",
  "motocicletas",
  "motociclo",
  "motociclos",
  "motocycles",
  "motocorp",
  "motorcycle",
  "motorcycles",
  "motorrad",
  "motor",
  "motores",
  "motors",
  "scooter",
  "scooters",
  "sportmotorcycle",
  "bike",
  "bikes",
  "caminhao",
  "caminhoes",
  "truck",
  "trucks",
  "automovel",
  "automoveis",
  "veiculo",
  "veiculos",
  "aumark",
  "amazonia",
  "brasil",
  "latin",
  "america",
  "company",
  "comercio",
  "industria",
  "ltda",
  "sa",
  "co",
  "da",
  "de",
  "do",
]);

const BRAND_ALIASES: Record<string, string> = {
  jeeaco: "jaecoo",
  "great-wall": "gwm",
  "great-wall-motors": "gwm",
  "gwm-haval": "gwm",
  "h-davidson": "harley-davidson",
  "vw-truck-e-bus": "volkswagen",
  "volkswagen-caminhoes-e-onibus": "volkswagen",
  harley: "harley-davidson",
  "h-d": "harley-davidson",
  hd: "harley-davidson",
  guzzi: "moto-guzzi",
  morini: "motomorini",
  agusta: "mv-agusta",
  sym: "sanyang",
  "cf-moto": "cfmoto",
  "piaggio-vespa": "vespa",
  "saab-scania": "scania",
  sinotruck: "sinotruk",
  shaanxi: "shacman",
  international: "navistar",
  volare: "marcopolo",
  jmc: "effa-jmc",
  effa: "effa-jmc",
  "jac-t": "jac",
  "haojue-suzuki": "haojue",
  vw: "volkswagen",
  volks: "volkswagen",
  volkswagem: "volkswagen",
  wolkswagen: "volkswagen",
  gm: "chevrolet",
  "general-motors": "chevrolet",
  chev: "chevrolet",
  "chevrolet-gm": "chevrolet",
  "gm-chevrolet": "chevrolet",
  "mmc-mitsubishi": "mitsubishi",
  "volkswagen-vw": "volkswagen",
  "vw-volkswagen": "volkswagen",
  chevy: "chevrolet",
  "gm-gmc": "gmc",
  "m-benz": "mercedes-benz",
  mercedes: "mercedes-benz",
  "mercedes-bens": "mercedes-benz",
  mercedez: "mercedes-benz",
  "mercedez-benz": "mercedes-benz",
  mmc: "mitsubishi",
  "land-rover": "landrover",
  lr: "landrover",
  "range-rover": "landrover",
  caoa: "chery",
  "caoa-chery": "chery",
  "chery-caoa": "chery",
  "caoa-hyundai": "hyundai",
  "hyundai-caoa": "hyundai",
  "dodge-ram": "ram",
  "mini-cooper": "mini",
  "citroen-psa": "citroen",
  hiundai: "hyundai",
  hiunday: "hyundai",
  hyunday: "hyundai",
  porche: "porsche",
  pegeot: "peugeot",
  pegeout: "peugeot",
};

const BRAND_NAMES: Record<string, string> = {
  geely: "Geely",
  gwm: "GWM",
  jaecoo: "Jaecoo",
  mottu: "Mottu",
  vmoto: "Vmoto",
  bull: "Bull",
  audi: "Audi",
  bmw: "BMW",
  byd: "BYD",
  chery: "Chery",
  chevrolet: "Chevrolet",
  citroen: "Citroën",
  fiat: "Fiat",
  ford: "Ford",
  honda: "Honda",
  hyundai: "Hyundai",
  jeep: "Jeep",
  kia: "Kia",
  landrover: "Land Rover",
  "mercedes-benz": "Mercedes-Benz",
  mini: "MINI",
  mitsubishi: "Mitsubishi",
  nissan: "Nissan",
  peugeot: "Peugeot",
  porsche: "Porsche",
  ram: "RAM",
  renault: "Renault",
  suzuki: "Suzuki",
  toyota: "Toyota",
  volkswagen: "Volkswagen",
  volvo: "Volvo",
  aprilia: "Aprilia",
  avelloz: "Avelloz",
  bajaj: "Bajaj",
  benelli: "Benelli",
  brp: "BRP",
  cfmoto: "CFMOTO",
  dafra: "Dafra",
  ducati: "Ducati",
  "gas-gas": "GAS GAS",
  garinni: "Garinni",
  haojue: "Haojue",
  "harley-davidson": "Harley-Davidson",
  hero: "Hero",
  hisun: "Hisun",
  husaberg: "Husaberg",
  husqvarna: "Husqvarna",
  indian: "Indian",
  kasinski: "Kasinski",
  kawasaki: "Kawasaki",
  ktm: "KTM",
  kymco: "Kymco",
  lifan: "Lifan",
  malaguti: "Malaguti",
  "moto-guzzi": "Moto Guzzi",
  motomorini: "Moto Morini",
  "mv-agusta": "MV Agusta",
  niu: "NIU",
  piaggio: "Piaggio",
  polaris: "Polaris",
  "royal-enfield": "Royal Enfield",
  sanyang: "SYM",
  shineray: "Shineray",
  sundown: "Sundown",
  "super-soco": "Super Soco",
  swm: "SWM",
  traxx: "Traxx",
  triumph: "Triumph",
  vespa: "Vespa",
  voltz: "Voltz",
  yamaha: "Yamaha",
  zontes: "Zontes",
  agrale: "Agrale",
  daf: "DAF",
  "effa-jmc": "Effa JMC",
  foton: "Foton",
  gmc: "GMC",
  iveco: "Iveco",
  jac: "JAC",
  man: "MAN",
  marcopolo: "Marcopolo",
  mascarello: "Mascarello",
  navistar: "Navistar",
  neobus: "Neobus",
  scania: "Scania",
  shacman: "Shacman",
  sinotruk: "Sinotruk",
};

const KNOWN_SLUGS = new Set<string>([
  ...Object.keys(BRAND_NAMES),
  ...Object.values(BRAND_ALIASES),
]);

const COMPACT_SLUGS = new Map<string, string>([
  ...[...KNOWN_SLUGS].map((slug): [string, string] => [slug.replace(/-/g, ""), slug]),
  ...Object.entries(BRAND_ALIASES).map(([alias, slug]): [string, string] => [alias.replace(/-/g, ""), slug]),
]);

function tokenize(brand: string): string[] {
  return brand
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .split("-")
    .filter((token, index, tokens) => token && token !== tokens[index - 1]);
}

function stripNoise(tokens: string[]): string[] {
  const result = [...tokens];
  while (result.length > 1 && LEADING_NOISE.has(result[0])) result.shift();
  while (result.length > 1 && TRAILING_NOISE.has(result[result.length - 1])) result.pop();
  return result;
}

function resolveKnown(slug: string): string | null {
  if (!slug) return null;
  const alias = BRAND_ALIASES[slug];
  if (alias) return alias;
  if (KNOWN_SLUGS.has(slug)) return slug;
  return COMPACT_SLUGS.get(slug.replace(/-/g, "")) ?? null;
}

export function brandSlug(brand: string): string {
  const tokens = tokenize(brand);
  if (!tokens.length) return "";

  const verbatim = resolveKnown(tokens.join("-"));
  if (verbatim) return verbatim;

  const stripped = stripNoise(tokens);
  const slug = stripped.join("-");
  return resolveKnown(slug) ?? slug;
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function brandDisplayName(brand: string): string {
  const slug = brandSlug(brand);
  if (!slug) return brand.trim();
  return BRAND_NAMES[slug] ?? titleCase(slug);
}
