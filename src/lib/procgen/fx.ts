import { Rng } from './rng';
import { Px, ell, renderStatic } from './rig';
import { StyleSpec } from './styles';

export type FxType = 'explosao' | 'faiscas' | 'corte' | 'fumaca' | 'anel';

export const FX_TYPES: Array<{ id: FxType; label: string }> = [
  { id: 'explosao', label: 'Explosão' },
  { id: 'faiscas', label: 'Faíscas' },
  { id: 'corte', label: 'Corte' },
  { id: 'fumaca', label: 'Fumaça' },
  { id: 'anel', label: 'Anel' },
];

export interface FxBuild {
  type: FxType;
  frames: string[][];
  w: number;
  h: number;
  palette: string[];
  traits: string[];
  name: string;
  fps: number;
}

const CX = 16;
const CY = 16;

function hash2(x: number, y: number, s: number): number {
  const v = Math.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453;
  return v - Math.floor(v);
}

function circle(rng: Rng, cx: number, cy: number, r: number, c: string, noise: number, seed: number): Px[] {
  const px: Px[] = [];
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (d <= r && hash2(x, y, seed) >= noise) px.push({ x, y, c });
      void rng;
    }
  }
  return px;
}

function ring(cx: number, cy: number, r: number, thick: number, c: string, noise: number, seed: number): Px[] {
  const px: Px[] = [];
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (Math.abs(d - r) <= thick && hash2(x, y, seed) >= noise) px.push({ x, y, c });
    }
  }
  return px;
}

/* ------------------------------ construtores ------------------------------ */

function explosionFrame(rng: Rng, st: StyleSpec, t: number, frame: number): Px[] {
  const px: Px[] = [];
  const grow = Math.sin(Math.min(1, t * 1.08) * Math.PI);
  const r = Math.max(1, 11 * Math.pow(grow, 0.6));
  const fade = t * t * 0.65;
  if (t < 0.18) {
    px.push(...circle(rng, CX, CY, Math.max(2, r * 0.7), '#ffffff', 0, 1));
  }
  px.push(...circle(rng, CX, CY, r, st.ramp[0], fade * 0.5, 2));
  px.push(...circle(rng, CX, CY - 1, r * 0.68, st.ramp[1], fade * 0.7, 3));
  px.push(...circle(rng, CX, CY - 1, Math.max(1, r * 0.38), t < 0.5 ? '#ffffff' : st.ramp[2], fade, 4));
  // brasas voando
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const dist = 4 + t * 11 + (i % 3);
    const x = Math.round(CX + Math.cos(a) * dist);
    const y = Math.round(CY + Math.sin(a) * dist - t * 3);
    const c = t < 0.4 ? st.ramp[2] : st.ramp[1];
    px.push({ x, y, c });
    if (frame % 2 === 0) px.push({ x: x + 1, y, c });
  }
  return px;
}

function sparksFrame(rng: Rng, st: StyleSpec, t: number): Px[] {
  const px: Px[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.15, 0.15);
    const speed = rng.range(6, 11);
    const x = Math.round(CX + Math.cos(a) * speed * t);
    const y = Math.round(CY + Math.sin(a) * speed * t + 2 * t * t);
    const c = t < 0.35 ? '#ffffff' : t < 0.7 ? st.glow : st.accent;
    if (t < 0.55) {
      px.push({ x, y, c }, { x: x - 1, y, c }, { x: x + 1, y, c }, { x, y: y - 1, c }, { x, y: y + 1, c });
    } else {
      px.push({ x, y, c });
    }
  }
  if (t < 0.25) px.push(...ell(CX, CY, 2, 2, '#ffffff'));
  return px;
}

function slashFrame(rng: Rng, st: StyleSpec, t: number): Px[] {
  void rng;
  const px: Px[] = [];
  // faixa diagonal varrendo o círculo: x+y entra em ~10 e sai em ~54
  const band = 10 + t * 50;
  for (let y = 2; y < 30; y++) {
    for (let x = 2; x < 30; x++) {
      const dx = x - CX;
      const dy = y - CY;
      if (dx * dx + dy * dy > 121) continue;
      const v = x + y;
      if (v >= band && v < band + 3) px.push({ x, y, c: '#ffffff' });
      else if (v >= band - 4 && v < band) px.push({ x, y, c: st.glow });
    }
  }
  return px;
}

function smokeFrame(rng: Rng, st: StyleSpec, t: number): Px[] {
  void rng;
  const px: Px[] = [];
  const puffs = 5;
  const gray = st.metal;
  const dark = st.metalDark;
  for (let k = 0; k < puffs; k++) {
    const start = k * 0.12;
    if (t < start) continue;
    const age = (t - start) / (1 - start);
    const y = 23 - age * 17;
    const x = CX + Math.sin(age * 5 + k * 1.7) * 3;
    const r = 2 + age * 4;
    const fade = age * 0.65;
    px.push(...circle(rng, x, y, r, k % 2 ? gray : dark, fade, 10 + k));
  }
  return px;
}

function ringFrame(rng: Rng, st: StyleSpec, t: number): Px[] {
  const px: Px[] = [];
  const r1 = 2 + t * 11;
  px.push(...ring(CX, CY, r1, 1, t < 0.4 ? '#ffffff' : st.glow, t * 0.6, 20));
  if (r1 > 6) px.push(...ring(CX, CY, r1 - 4, 1, st.accent, t * 0.7, 21));
  if (t < 0.3) px.push(...ell(CX, CY, 2, 2, st.glow));
  void rng;
  return px;
}

/* --------------------------------- nomes ---------------------------------- */

const NAMES: Record<FxType, string[]> = {
  explosao: ['Nova', 'Impacto', 'Detonação', 'Erupção', 'Cataclismo'],
  faiscas: ['Centelha', 'Estalo', 'Chispa', 'Brilho', 'Fagulha'],
  corte: ['Lâmina', 'Fenda', 'Golpe', 'Talho', 'Rasgo'],
  fumaca: ['Névoa', 'Véu', 'Sopro', 'Bruma', 'Cinzas'],
  anel: ['Pulso', 'Onda', 'Eco', 'ressonância'.trim(), 'Círculo'],
};
const TITLES = ['Ancestral', 'Final', 'do Caos', 'Selvagem', 'do Vazio'];

/* ---------------------------------- api ----------------------------------- */

export function generateFx(
  seed: number, type: FxType | 'random', st: StyleSpec, size: number, frames: number, outline: boolean,
): FxBuild {
  const rng = new Rng(seed);
  const t: FxType = type === 'random' ? rng.pick(FX_TYPES).id : type;
  const label = FX_TYPES.find((f) => f.id === t)!.label;
  const count = Math.max(2, frames);
  const out: string[][] = [];
  const k = size / 32;
  for (let i = 0; i < count; i++) {
    const tt = i / count;
    let px: Px[];
    switch (t) {
      case 'faiscas': px = sparksFrame(rng, st, tt); break;
      case 'corte': px = slashFrame(rng, st, tt); break;
      case 'fumaca': px = smokeFrame(rng, st, tt); break;
      case 'anel': px = ringFrame(rng, st, tt); break;
      default: px = explosionFrame(rng, st, tt, i); break;
    }
    // centraliza e escala via renderStatic (coords já em 32-space)
    void k;
    out.push(renderStatic(px, size, outline ? st.outline : null));
  }
  return {
    type: t,
    frames: out,
    w: size,
    h: size,
    palette: [st.ramp[0], st.ramp[1], st.ramp[2], st.glow, st.accent],
    traits: [label, `${count} frames`, 'Loop suave'],
    name: `${rng.pick(NAMES[t])} ${rng.pick(TITLES)}`,
    fps: 12,
  };
}
