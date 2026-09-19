/** Utilidades de cor (hex/rgb/hsl) + aplicação de variações */

export function normalizeHex(hex: string): string {
  let h = hex.trim().toLowerCase();
  if (!h.startsWith('#')) h = '#' + h;
  if (/^#[0-9a-f]{3}$/.test(h)) {
    h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  if (!/^#[0-9a-f]{6}$/.test(h)) return '#000000';
  return h;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex);
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Desloca matiz/saturação/luminosidade de uma cor hex */
export function shiftColor(hex: string, dh: number, ds: number, dl: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h + dh, s + ds, l + dl);
  return rgbToHex(nr, ng, nb);
}

export interface VariationTransform {
  mapping: Record<string, string>;
  hue: number;
  sat: number;
  light: number;
}

/** Aplica remapeamento de paleta + ajustes HSL a uma cor (não-destrutivo) */
export function applyVariationToColor(cell: string, v: VariationTransform | null | undefined): string {
  if (!cell) return '';
  if (!v) return normalizeHex(cell);
  const key = normalizeHex(cell);
  const mapped = v.mapping[key] ? normalizeHex(v.mapping[key]) : key;
  if (v.hue === 0 && v.sat === 0 && v.light === 0) return mapped;
  return shiftColor(mapped, v.hue, v.sat, v.light);
}

/** Gera um remapeamento automático deslocando o matiz das cores mais usadas */
export function autoHueMapping(colors: string[], hueShift: number): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const c of colors) {
    const n = normalizeHex(c);
    mapping[n] = shiftColor(n, hueShift, 0, 0);
  }
  return mapping;
}
