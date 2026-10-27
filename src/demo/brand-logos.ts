import { brandSlug } from "@/lib/brands";

/*
 * Logos de marca da demo e do preview do painel. Desde 22/10/2026 o Horizon não traz mais logos
 * no projeto: o logo de cada marca chega da API (`facets.brandLogos`), com o enquadramento no
 * parâmetro `box` (esquerda, topo, largura e altura do desenho dentro do quadro, de 0 a 1), que
 * `brandLogoStyle` usa para igualar o tamanho visual. A demo segue o mesmo caminho com os
 * arquivos de `public/brands/`: o endereço leva o `box` de cada desenho, como a API faria.
 */
const BOX: Record<string, [number, number, number, number]> = {
  agrale: [0, 0.404, 1, 0.192],
  audi: [0.074, 0.278, 0.856, 0.448],
  avelloz: [0, 0.366, 1, 0.27],
  bajaj: [0, 0.396, 1, 0.208],
  bmw: [0.034, 0.03407, 0.932, 0.93387],
  bull: [0.044, 0, 0.91, 1],
  byd: [0.108, 0.258, 0.782, 0.482],
  chery: [0.112, 0.292, 0.774, 0.418],
  chevrolet: [0.05, 0.3, 0.912, 0.404],
  citroen: [0.044, 0.176, 0.906, 0.64],
  daf: [0, 0.362, 1, 0.274],
  dafra: [0, 0.166, 1, 0.668],
  ducati: [0.03, 0, 0.94, 1],
  fiat: [0.03, 0.04, 0.934, 0.914],
  ford: [0.018, 0.32, 0.962, 0.36],
  foton: [0.02, 0.02, 0.96, 0.96],
  geely: [0, 0.162, 1, 0.676],
  gwm: [0, 0.406, 1, 0.188],
  haojue: [0, 0.416, 1, 0.168],
  "harley-davidson": [0, 0.112, 1, 0.776],
  honda: [0.032, 0.204, 0.936, 0.61],
  hyundai: [0.15, 0.26, 0.696, 0.436],
  iveco: [0, 0.396, 1, 0.206],
  jac: [0, 0.402, 1, 0.194],
  jaecoo: [0, 0.446, 1, 0.106],
  jeep: [0.096, 0.344, 0.794, 0.32],
  kawasaki: [0, 0.362, 1, 0.276],
  kia: [0.034, 0.254, 0.952, 0.478],
  kymco: [0, 0.422, 1, 0.154],
  landrover: [0.056, 0.268, 0.886, 0.464],
  man: [0, 0.22, 1, 0.56],
  "mercedes-benz": [0.1, 0.27, 0.798, 0.46],
  mini: [0.04, 0.306, 0.92, 0.388],
  mitsubishi: [0.158, 0.062, 0.684, 0.878],
  mottu: [0, 0.014, 1, 0.97],
  nissan: [0.044, 0.118, 0.91, 0.764],
  peugeot: [0.168, 0.266, 0.662, 0.466],
  porsche: [0.044, 0.27, 0.914, 0.458],
  ram: [0.13, 0.096, 0.738, 0.806],
  renault: [0.194, 0.106, 0.626, 0.782],
  "royal-enfield": [0, 0.432, 1, 0.134],
  scania: [0, 0.024, 1, 0.95],
  shineray: [0, 0.41, 1, 0.178],
  suzuki: [0.058, 0.302, 0.882, 0.394],
  toyota: [0.042, 0.374, 0.916, 0.252],
  triumph: [0, 0.05, 1, 0.898],
  vmoto: [0, 0.246, 1, 0.508],
  volkswagen: [0.102, 0.102, 0.796, 0.796],
  volvo: [0.046, 0.048, 0.904, 0.904],
  yamaha: [0, 0.328, 1, 0.344],
  zontes: [0, 0.388, 1, 0.224],
};

/** Logo de cada marca da lista que tem arquivo na demo, no formato que a API usa. */
export function demoBrandLogos(brands: string[]): Record<string, string> {
  return Object.fromEntries(
    brands.flatMap((brand) => {
      const slug = brandSlug(brand);
      const box = slug ? BOX[slug] : undefined;
      return box ? [[brand, `/brands/${slug}.webp?box=${box.join(",")}`]] : [];
    }),
  );
}
