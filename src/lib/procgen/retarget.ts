/**
 * Movimento procedural para QUALQUER sprite desenhado à mão.
 * A partir de um frame estático, sintetiza animações inteiras via
 * deformações no espaço da imagem: squash & stretch, saltos, investidas,
 * tremor de dano com flash e dissolve de spawn/despawn.
 */

export interface ImgPose {
  dx: number; // deslocamento px
  dy: number;
  sx: number; // escala (squash & stretch)
  sy: number;
  shear: number; // inclinação lateral do topo (-0.3..0.3)
  flash: boolean; // silhueta branca (hit)
  dissolve: number | null; // 0..1: limiar de dissolve (null = desligado)
}

const TAU = Math.PI * 2;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** hash determinístico por pixel para o dissolve */
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export interface Anchor {
  x: number;
  y: number;
}

/**
 * Aplica uma pose a uma grade de pixels (mapeamento inverso, sem buracos).
 * Âncora padrão: base da imagem (pés plantados no chão).
 */
export function transformCells(
  cells: string[], w: number, h: number, pose: ImgPose, anchor?: Anchor,
): string[] {
  const ax = anchor?.x ?? w / 2;
  const ay = anchor?.y ?? (h - 1);
  const out = new Array<string>(w * h).fill('');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // dissolve: pixels somem/aparecem por hash
      if (pose.dissolve !== null && hash2(x, y) < pose.dissolve) continue;
      // desfaz translação
      const x1 = x - pose.dx;
      const y1 = y - pose.dy;
      // desfaz inclinação (x deslocado proporcional à altura sobre a âncora)
      const x2 = x1 - pose.shear * (ay - y1);
      // desfaz escala ao redor da âncora
      const sx = pose.sx === 0 ? 1 : pose.sx;
      const sy = pose.sy === 0 ? 1 : pose.sy;
      const x3 = Math.round(ax + (x2 - ax) / sx);
      const y3 = Math.round(ay + (y1 - ay) / sy);
      if (x3 < 0 || y3 < 0 || x3 >= w || y3 >= h) continue;
      const c = cells[y3 * w + x3];
      if (!c) continue;
      out[y * w + x] = pose.flash ? '#ffffff' : c;
    }
  }
  return out;
}

/* --------------------------------- presets -------------------------------- */

export type RetargetId = 'respirar' | 'flutuar' | 'pular' | 'investida' | 'dano' | 'aparecer' | 'sumir';

export interface RetargetDef {
  id: RetargetId;
  label: string;
  desc: string;
  frames: number;
  fps: number;
  sample: (t: number, k: number) => ImgPose;
}

const IDLE_POSE: ImgPose = { dx: 0, dy: 0, sx: 1, sy: 1, shear: 0, flash: false, dissolve: null };

export const RETARGET_DEFS: RetargetDef[] = [
  {
    id: 'respirar', label: 'respirar', desc: 'Idle com respiração e quique sutil', frames: 4, fps: 6,
    sample: (t, k) => {
      const br = Math.sin(t * TAU);
      const rise = -Math.round(((br * 0.5 + 0.5) * 1.4 * k));
      return { ...IDLE_POSE, dy: rise, sx: 1 + 0.05 * k * br, sy: 1 - 0.05 * k * br };
    },
  },
  {
    id: 'flutuar', label: 'flutuar', desc: 'Levitação com deriva lateral', frames: 6, fps: 7,
    sample: (t, k) => ({
      ...IDLE_POSE,
      dy: -1 - Math.round((Math.sin(t * TAU) * 0.5 + 0.5) * 2.4 * k),
      dx: Math.round(Math.sin(t * TAU + Math.PI / 2) * 1.6 * k),
    }),
  },
  {
    id: 'pular', label: 'pular', desc: 'Agacha → estica no ar → aterrissa', frames: 6, fps: 9,
    sample: (t, k) => {
      const H = 3 + Math.round(5 * k);
      if (t < 0.2) {
        const c = smoothstep(0, 0.2, t);
        return { ...IDLE_POSE, dy: Math.round(1 * c), sx: 1 + 0.14 * c * k, sy: 1 - 0.16 * c * k };
      }
      if (t < 0.78) {
        const v = (t - 0.2) / 0.58;
        const h = Math.sin(v * Math.PI);
        return { ...IDLE_POSE, dy: -Math.round(H * h), sx: 1 - 0.09 * h * k, sy: 1 + 0.14 * h * k };
      }
      const c = Math.sin(((t - 0.78) / 0.22) * Math.PI);
      return { ...IDLE_POSE, dy: Math.round(1 * c), sx: 1 + 0.14 * c * k, sy: 1 - 0.16 * c * k };
    },
  },
  {
    id: 'investida', label: 'investida', desc: 'Recua e avança com impacto', frames: 5, fps: 12,
    sample: (t, k) => {
      const wind = smoothstep(0, 0.3, t);
      const strike = smoothstep(0.3, 0.45, t);
      const rec = smoothstep(0.6, 0.95, t);
      const m = 1 - rec;
      return {
        ...IDLE_POSE,
        dx: Math.round((-2.5 * wind + 6 * strike) * k * m),
        sx: 1 + (0.08 * wind + 0.22 * strike) * k * m,
        sy: 1 - (0.06 * wind + 0.12 * strike) * k * m,
        shear: 0.16 * strike * k * m,
      };
    },
  },
  {
    id: 'dano', label: 'dano', desc: 'Tremor com flash branco de hit', frames: 5, fps: 12,
    sample: (t, k) => ({
      ...IDLE_POSE,
      dx: Math.round(3 * k * Math.sin(t * TAU * 2) * (1 - t)),
      sx: 1 - 0.06 * k * (1 - t),
      flash: t < 0.22,
    }),
  },
  {
    id: 'aparecer', label: 'aparecer', desc: 'Materializa subindo (spawn)', frames: 5, fps: 10,
    sample: (t, k) => ({
      ...IDLE_POSE,
      dissolve: 1 - smoothstep(0, 0.85, t),
      dy: -Math.round(2 * k * smoothstep(0, 1, t)),
      sy: 1 + 0.1 * k * Math.sin(t * Math.PI),
    }),
  },
  {
    id: 'sumir', label: 'sumir', desc: 'Desvanece afundando (despawn)', frames: 5, fps: 10,
    sample: (t, k) => ({
      ...IDLE_POSE,
      dissolve: smoothstep(0.1, 1, t),
      dy: Math.round(2 * k * smoothstep(0, 1, t)),
      sy: 1 - 0.12 * k * smoothstep(0, 1, t),
    }),
  },
];

/** Gera N frames de um preset a partir de um frame-fonte */
export function generateRetargetFrames(
  source: string[], w: number, h: number, def: RetargetDef, frameCount: number, intensity: number,
): string[][] {
  const out: string[][] = [];
  const n = Math.max(1, frameCount);
  for (let i = 0; i < n; i++) {
    out.push(transformCells(source, w, h, def.sample(i / n, intensity)));
  }
  return out;
}
