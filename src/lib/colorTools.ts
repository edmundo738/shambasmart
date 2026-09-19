import { hexToRgb, normalizeHex, rgbToHex } from './color';

/** Ferramentas E4: rampas perceptuais, sombreamento e dithering determinístico. */
export type DitherPattern = 'solid' | 'checker' | 'bayer2' | 'bayer4';

export interface Oklab {
  L: number;
  a: number;
  b: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const cbrt = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 1 / 3);
const srgbToLinear = (v: number) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const linearToSrgb = (v: number) => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055;

/** sRGB hexadecimal -> OKLab. A interpolação neste espaço evita rampas cinzentas/sujas. */
export function hexToOklab(hex: string): Oklab {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = srgbToLinear(r8 / 255), g = srgbToLinear(g8 / 255), b = srgbToLinear(b8 / 255);
  const l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** OKLab -> sRGB hexadecimal, com gamut clamp determinístico. */
export function oklabToHex({ L, a, b }: Oklab): string {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const blue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return rgbToHex(linearToSrgb(clamp01(r)) * 255, linearToSrgb(clamp01(g)) * 255, linearToSrgb(clamp01(blue)) * 255);
}

/** Rampa inclusiva: primeiro e último são exactamente os extremos normalizados. */
export function buildColorRamp(start: string, end: string, steps: number): string[] {
  const n = Math.max(2, Math.min(32, Math.round(steps)));
  const a = hexToOklab(start), b = hexToOklab(end);
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return oklabToHex({ L: a.L + (b.L - a.L) * t, a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t });
  });
}

/** Sombra/realce no eixo L do OKLab, mantendo o matiz perceptual. */
export function shadeColor(hex: string, amount: number): string {
  const c = hexToOklab(hex);
  return oklabToHex({ ...c, L: Math.max(0.02, Math.min(0.98, c.L + amount)) });
}

export function buildShadeRamp(base: string, steps: number): string[] {
  const c = hexToOklab(base);
  const n = Math.max(3, Math.min(32, Math.round(steps)));
  const dark = Math.max(0.02, c.L - 0.28);
  const light = Math.min(0.98, c.L + 0.28);
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return oklabToHex({ L: dark + (light - dark) * t, a: c.a, b: c.b });
  });
}

const BAYER2 = [[0, 2], [3, 1]];
const BAYER4 = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5],
];

/** Decide qual cor ocupa uma célula; mesma entrada = mesmo padrão em qualquer renderer. */
export function ditherUsesPrimary(pattern: DitherPattern, x: number, y: number, strength = 0.5): boolean {
  if (pattern === 'solid') return true;
  const s = Math.max(0, Math.min(1, strength));
  if (pattern === 'checker') return ((x + y) & 1) === (s >= 0.5 ? 0 : 1);
  const matrix = pattern === 'bayer2' ? BAYER2 : BAYER4;
  const size = matrix.length;
  const threshold = (matrix[((y % size) + size) % size][((x % size) + size) % size] + 0.5) / (size * size);
  return threshold < s;
}

export function ditherColor(
  primary: string, secondary: string, pattern: DitherPattern, x: number, y: number, strength = 0.5,
): string {
  return normalizeHex(ditherUsesPrimary(pattern, x, y, strength) ? primary : secondary);
}
