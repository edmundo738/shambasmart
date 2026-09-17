import { Rng } from './rng';
import { hslToRgb, rgbToHex } from '../color';

export type StyleId = 'fantasia' | 'scifi' | 'fofo' | 'sombrio' | 'retro' | 'natureza';

export const STYLE_PRESETS: Array<{ id: StyleId; label: string; desc: string }> = [
  { id: 'fantasia', label: 'Fantasia', desc: 'Aço, ouro e brasas' },
  { id: 'scifi', label: 'Sci-fi', desc: 'Metal azul e energia' },
  { id: 'fofo', label: 'Fofo', desc: 'Pastel e brilho suave' },
  { id: 'sombrio', label: 'Sombrio', desc: 'Trevas e arcano' },
  { id: 'retro', label: 'Retrô', desc: 'Paleta limitada clássica' },
  { id: 'natureza', label: 'Natureza', desc: 'Bronze, couro e folhas' },
];

export interface StyleSpec {
  metal: string;
  metalDark: string;
  metalLight: string;
  wood: string;
  woodDark: string;
  accent: string;
  accentDark: string;
  glow: string;
  outline: string;
  /** rampa escuro → claro para fogo/energia */
  ramp: [string, string, string];
}

function hsl(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(((h % 360) + 360) % 360, s, l);
  return rgbToHex(r, g, b);
}

export function makeStyle(rng: Rng, style: StyleId): StyleSpec {
  const j = () => rng.range(-4, 4);
  switch (style) {
    case 'scifi':
      return {
        metal: hsl(215, 25, 62 + j()), metalDark: hsl(215, 30, 34), metalLight: hsl(210, 45, 86),
        wood: hsl(220, 20, 30), woodDark: hsl(220, 25, 18),
        accent: hsl(190, 90, 60), accentDark: hsl(190, 80, 36),
        glow: hsl(185, 100, 70), outline: hsl(220, 30, 12),
        ramp: [hsl(210, 85, 40), hsl(190, 95, 58), hsl(180, 100, 84)],
      };
    case 'fofo':
      return {
        metal: hsl(300, 30, 78 + j()), metalDark: hsl(300, 25, 55), metalLight: hsl(300, 40, 92),
        wood: hsl(30, 45, 70), woodDark: hsl(30, 40, 50),
        accent: hsl(335, 85, 68), accentDark: hsl(335, 70, 48),
        glow: hsl(50, 100, 80), outline: hsl(300, 25, 30),
        ramp: [hsl(330, 80, 62), hsl(320, 90, 76), hsl(0, 0, 96)],
      };
    case 'sombrio':
      return {
        metal: hsl(250, 12, 38 + j()), metalDark: hsl(250, 15, 22), metalLight: hsl(250, 18, 58),
        wood: hsl(260, 20, 22), woodDark: hsl(260, 25, 12),
        accent: hsl(275, 75, 58), accentDark: hsl(275, 70, 34),
        glow: hsl(0, 85, 60), outline: hsl(250, 20, 8),
        ramp: [hsl(275, 70, 32), hsl(285, 80, 52), hsl(300, 90, 74)],
      };
    case 'retro':
      return {
        metal: '#c2c3c7', metalDark: '#5f574f', metalLight: '#fff1e8',
        wood: '#ab5236', woodDark: '#5f3425',
        accent: '#ff004d', accentDark: '#7e2553',
        glow: '#ffec27', outline: '#1d2b53',
        ramp: ['#7e2553', '#ff004d', '#ffec27'],
      };
    case 'natureza':
      return {
        metal: hsl(35, 55, 52 + j()), metalDark: hsl(35, 50, 30), metalLight: hsl(40, 70, 74),
        wood: hsl(25, 50, 32), woodDark: hsl(25, 55, 20),
        accent: hsl(130, 60, 45), accentDark: hsl(130, 55, 28),
        glow: hsl(90, 80, 62), outline: hsl(120, 25, 12),
        ramp: [hsl(130, 55, 30), hsl(110, 65, 48), hsl(80, 80, 70)],
      };
    default: // fantasia
      return {
        metal: hsl(220, 15, 66 + j()), metalDark: hsl(220, 18, 38), metalLight: hsl(220, 30, 90),
        wood: hsl(25, 55, 32), woodDark: hsl(25, 60, 20),
        accent: hsl(45, 95, 55), accentDark: hsl(40, 85, 34),
        glow: hsl(25, 100, 60), outline: hsl(230, 25, 13),
        ramp: [hsl(10, 85, 42), hsl(28, 100, 55), hsl(50, 100, 72)],
      };
  }
}
