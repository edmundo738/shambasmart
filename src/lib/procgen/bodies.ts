import { Rng } from './rng';
import { Px, RigNode, carve, ell, rect } from './rig';
import { hslToRgb, rgbToHex } from '../color';

export type BodyType = 'humanoid' | 'slime' | 'robot' | 'ghost' | 'critter';
export type MoodId = 'random' | 'floresta' | 'fogo' | 'oceano' | 'sombra' | 'doce' | 'areia';

export const BODY_TYPES: Array<{ id: BodyType; label: string }> = [
  { id: 'humanoid', label: 'Humanoide' },
  { id: 'slime', label: 'Slime' },
  { id: 'robot', label: 'Robô' },
  { id: 'ghost', label: 'Fantasma' },
  { id: 'critter', label: 'Criatura' },
];

export const MOODS: Array<{ id: MoodId; label: string }> = [
  { id: 'random', label: 'Aleatória' },
  { id: 'floresta', label: 'Floresta' },
  { id: 'fogo', label: 'Fogo' },
  { id: 'oceano', label: 'Oceano' },
  { id: 'sombra', label: 'Sombra' },
  { id: 'doce', label: 'Doce' },
  { id: 'areia', label: 'Areia' },
];

const SKIN_TONES = ['#ffd9b3', '#ffcf9e', '#f0b88a', '#c98d5e', '#8a5a3b', '#5e3a26'];
const HAIR_COLORS = ['#3a2a1f', '#6b4a2b', '#b8860b', '#c22a4d', '#e8eefc', '#ff8a00', '#20263c'];

function hsl(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(((h % 360) + 360) % 360, s, l);
  return rgbToHex(r, g, b);
}

export interface Palette {
  base: string;
  dark: string;
  deep: string;
  light: string;
  accent: string;
  accentDark: string;
  outline: string;
}

function moodHue(rng: Rng, mood: MoodId): { h: number; s: number; l: number } {
  switch (mood) {
    case 'floresta': return { h: rng.hue(90, 150), s: rng.range(45, 65), l: rng.range(42, 55) };
    case 'fogo': return { h: rng.hue(-15, 35), s: rng.range(70, 90), l: rng.range(48, 58) };
    case 'oceano': return { h: rng.hue(185, 225), s: rng.range(55, 75), l: rng.range(45, 58) };
    case 'sombra': return { h: rng.hue(230, 285), s: rng.range(35, 55), l: rng.range(30, 42) };
    case 'doce': return { h: rng.hue(300, 345), s: rng.range(60, 80), l: rng.range(60, 70) };
    case 'areia': return { h: rng.hue(40, 65), s: rng.range(40, 60), l: rng.range(50, 62) };
    default: return { h: rng.hue(0, 360), s: rng.range(50, 80), l: rng.range(42, 60) };
  }
}

function makePalette(rng: Rng, mood: MoodId): Palette {
  const { h, s, l } = moodHue(rng, mood);
  const ah = h + 150 + rng.range(-30, 30);
  return {
    base: hsl(h, s, l),
    dark: hsl(h, s, Math.max(12, l - 20)),
    deep: hsl(h, Math.min(95, s + 5), Math.max(8, l - 32)),
    light: hsl(h, Math.max(20, s - 10), Math.min(88, l + 20)),
    accent: hsl(ah, rng.range(70, 90), rng.range(55, 65)),
    accentDark: hsl(ah, 70, 38),
    outline: hsl(h, 35, 13),
  };
}

/* --------------------------------- olhos ---------------------------------- */

export type EyeStyle = 'redondo' | 'grande' | 'bravo' | 'sonolento' | 'feliz';

function eyePixels(
  style: EyeStyle, dir: 'side' | 'front', white: string, pupil: string, dark: string,
): { main: Px[]; alt: Px[] } {
  const W = white, P = pupil, D = dark;
  const px = (x: number, y: number, c: string): Px => ({ x, y, c });
  switch (style) {
    case 'grande': {
      const main = [...rect(-1, -3, 2, 1, W), ...(dir === 'side' ? rect(1, -2, 2, 0, P) : rect(0, -2, 1, 0, P)), px(-1, -3, W)];
      return { main, alt: [...rect(-1, 0, 2, 0, D), px(2, -1, D)] };
    }
    case 'bravo': {
      const brow = [px(-2, -3, D), px(-1, -2, D), px(0, -2, D), px(1, -2, D)];
      const main = [...brow, ...rect(-1, -1, 1, 1, W), ...(dir === 'side' ? rect(0, -1, 1, 0, P) : rect(-1, 0, 0, 1, P))];
      return { main, alt: [...brow, ...rect(-1, 1, 1, 1, D)] };
    }
    case 'sonolento': {
      const main = [...rect(-1, -1, 1, 1, W), ...rect(-1, -1, 1, -1, D), ...(dir === 'side' ? [px(1, 0, P), px(1, 1, P)] : [px(0, 0, P), px(0, 1, P)])];
      return { main, alt: rect(-1, 0, 1, 0, D) };
    }
    case 'feliz': {
      const main = [px(-2, 0, D), px(-1, -1, D), px(0, -1, D), px(1, -1, D), px(2, 0, D)];
      return { main, alt: [...main] };
    }
    default: {
      const main = [...rect(-1, -2, 1, 1, W), ...(dir === 'side' ? rect(0, -1, 1, 0, P) : rect(-1, 0, 0, 1, P))];
      return { main, alt: rect(-1, 0, 1, 0, D) };
    }
  }
}

/* --------------------------------- bocas ---------------------------------- */

export type MouthStyle = 'sorriso' | 'aberta' | 'reta' | 'presas' | 'nenhuma';

function mouthPixels(style: MouthStyle, front: boolean, dark: string, teeth: string): Px[] {
  const px = (x: number, y: number, c: string): Px => ({ x, y, c });
  if (style === 'nenhuma') return [];
  if (style === 'aberta') {
    return front
      ? [...rect(-1, 0, 1, 2, dark), px(-1, 0, teeth), px(0, 0, teeth), px(1, 0, teeth)]
      : [...rect(0, 0, 1, 2, dark), px(0, 0, teeth), px(1, 0, teeth)];
  }
  if (style === 'reta') return front ? rect(-1, 0, 1, 0, dark) : rect(0, 0, 1, 0, dark);
  if (style === 'presas') {
    return front
      ? [px(-2, 0, dark), px(-1, 1, dark), px(0, 1, dark), px(1, 1, dark), px(2, 0, dark), px(-1, 2, teeth), px(1, 2, teeth)]
      : [px(0, 0, dark), px(1, 0, dark), px(2, -1, dark), px(1, 1, teeth)];
  }
  // sorriso
  return front
    ? [px(-2, 0, dark), px(-1, 1, dark), px(0, 1, dark), px(1, 1, dark), px(2, 0, dark)]
    : [px(0, 0, dark), px(1, 0, dark), px(2, -1, dark)];
}

function mouthOpenAlt(front: boolean, dark: string, teeth: string): Px[] {
  return front
    ? [...ell(0, 1, 2, 2, dark), ...rect(-1, -1, 1, 0, teeth)]
    : [...ell(1, 1, 1, 2, dark), ...rect(0, -1, 1, 0, teeth)];
}

/* ------------------------------ construtores ------------------------------ */

export interface BodyBuild {
  nodes: RigNode[];
  swatches: string[];
  traits: string[];
}

function scaleNodes(nodes: RigNode[], k: number): RigNode[] {
  const sc = (v: number) => Math.round(v * k);
  return nodes.map((n) => ({
    ...n,
    attach: { x: sc(n.attach.x), y: sc(n.attach.y) },
    pixels: n.pixels.map((p) => ({ x: sc(p.x), y: sc(p.y), c: p.c })),
    alt: n.alt?.map((p) => ({ x: sc(p.x), y: sc(p.y), c: p.c })),
  }));
}

/** Humanoide / Robô — visão lateral, virado para a direita */
function buildBiped(rng: Rng, pal: Palette, robot: boolean): BodyBuild {
  const traits: string[] = [];
  const skin = robot ? pal.base : rng.pick(SKIN_TONES);
  const skinDark = robot ? pal.dark : hsl(25, 45, 38);
  const cloth = robot ? pal.base : pal.base;
  const clothDark = robot ? pal.dark : pal.dark;
  const pants = robot ? pal.deep : pal.accentDark;
  const boots = robot ? pal.deep : rng.pick(['#5e3a26', '#3a2a1f', '#20263c', '#4a3b2a']);
  const steel = robot ? pal.light : '#9fb2cc';

  const bulk = rng.chance(0.45) ? 1 : 0;
  const torsoH = 7 + rng.int(0, 2);
  const armLen = 5 + rng.int(0, 2);
  const legLen = 4 + rng.int(0, 2);
  const headW = robot ? 8 : 8 + rng.int(0, 2);
  const headH = robot ? 7 : 6 + rng.int(0, 2);
  const x0 = -3 - bulk, x1 = 2 + bulk;

  const nodes: RigNode[] = [];
  const sw = new Set<string>();

  // torso (raiz no quadril)
  const torsoPx = [
    ...rect(x0, -torsoH, x1, 0, cloth),
    ...rect(x0, -torsoH, x0 + 1, 0, clothDark),
    ...rect(x0, -1, x1, 0, clothDark),
    ...rect(x0, -3, x1, -2, pal.deep),
    ...rect(0, -3, 1, -2, robot ? pal.accent : '#ffd23f'),
  ];
  if (!robot && rng.chance(0.5)) {
    torsoPx.push(...rect(0, -torsoH + 2, 1, -torsoH + 3, pal.accent));
    traits.push('Emblema no peito');
  }
  if (robot) {
    torsoPx.push(...rect(x0 + 1, -torsoH + 1, x1 - 1, -torsoH + 2, pal.deep));
    torsoPx.push(...rect(0, -5, 1, -4, pal.accent)); // núcleo
    traits.push('Núcleo de energia');
  }
  nodes.push({ id: 'torso', parent: null, attach: { x: 16, y: 21 }, pixels: torsoPx, z: 4 });

  // cabeça
  const hw = Math.floor(headW / 2);
  const neckY = 21 - torsoH;
  const headPx = [...rect(-hw, -headH, hw - 1, -1, skin), ...rect(-hw, -headH, -hw + 1, -1, skinDark)];
  const eyeStyle = rng.pick<EyeStyle>(['redondo', 'grande', 'bravo', 'sonolento', 'feliz']);
  const mouthStyle = rng.pick<MouthStyle>(['sorriso', 'aberta', 'reta', 'presas', 'sorriso']);
  if (robot) {
    // capacete metálico
    headPx.push(...rect(-hw, -headH, hw - 1, -headH + 2, clothDark));
    headPx.push(...rect(-hw, -headH, -hw, -1, pal.deep));
    headPx.push(...rect(hw - 3, -2, hw - 1, -2, pal.deep), ...rect(hw - 3, -1, hw - 1, -1, pal.deep)); // grade
  } else {
    const top = rng.pick(['elmo', 'cabelo', 'capuz'] as const);
    if (top === 'elmo') {
      headPx.push(...rect(-hw, -headH, hw - 1, -headH + 2, steel));
      headPx.push(...rect(-hw, -headH + 3, hw - 1, -headH + 3, '#5b6b8c'));
      if (rng.chance(0.5)) {
        headPx.push(...rect(-1, -headH - 2, 0, -headH - 1, pal.accent));
        traits.push('Elmo com pluma');
      } else traits.push('Elmo de batalha');
    } else if (top === 'cabelo') {
      const hc = rng.pick(HAIR_COLORS);
      headPx.push(...rect(-hw, -headH, hw - 1, -headH + 1, hc));
      headPx.push(...rect(-hw, -headH, -hw + 1, -2, hc));
      sw.add(hc);
      traits.push('Cabelo');
    } else {
      headPx.push(...rect(-hw, -headH, hw - 1, -headH + 2, clothDark));
      headPx.push(...rect(-hw, -headH, -hw + 1, -1, clothDark));
      traits.push('Capuz');
    }
    if (rng.chance(0.25)) {
      const bone = '#e8eefc';
      headPx.push({ x: -hw + 1, y: -headH - 1, c: bone }, { x: -hw, y: -headH - 2, c: bone });
      sw.add(bone);
      traits.push('Chifres');
    }
    headPx.push(...mouthPixels(mouthStyle, false, pal.outline, '#ffffff').map((p) => ({ ...p, x: p.x + hw - 3, y: p.y - 2 })));
  }
  nodes.push({ id: 'head', parent: 'torso', attach: { x: 0, y: -torsoH }, pixels: headPx, z: 6 });

  // olho (visor no robô)
  if (robot) {
    const visor = rect(-2, -1, 3, 0, pal.accent);
    nodes.push({
      id: 'eye', parent: 'head', attach: { x: 1, y: -headH + 3 },
      pixels: visor, alt: visor.map((p) => ({ ...p, c: pal.accentDark })), z: 7,
    });
    traits.push('Visor luminoso');
    // antena
    nodes.push({
      id: 'antenna', parent: 'head', attach: { x: -1, y: -headH },
      pixels: [...rect(0, -3, 0, -1, pal.deep), { x: 0, y: -4, c: pal.accent }], z: 5,
    });
  } else {
    const { main, alt } = eyePixels(eyeStyle, 'side', '#ffffff', pal.outline, pal.outline);
    nodes.push({ id: 'eye', parent: 'head', attach: { x: hw - 3, y: -headH + 3 }, pixels: main, alt, z: 7 });
    traits.push(`Olhos ${eyeStyle === 'redondo' ? 'redondos' : eyeStyle === 'grande' ? 'grandes' : eyeStyle === 'bravo' ? 'bravos' : eyeStyle === 'sonolento' ? 'sonolentos' : 'felizes'}`);
  }

  // braços (frente + trás mais escuro)
  const mkArm = (darken: boolean, id: string, sx: number, z: number) => {
    const sl = darken ? clothDark : cloth;
    const sk = darken ? skinDark : skin;
    nodes.push({
      id, parent: 'torso', attach: { x: sx, y: -torsoH + 1 },
      pixels: [...rect(-1, 0, 1, 1, sl), ...rect(-1, 2, 1, armLen - 1, sk), ...rect(-1, armLen - 1, 1, armLen, darken ? skinDark : sk)],
      z,
    });
  };
  mkArm(false, 'armF', 1, 8);
  mkArm(true, 'armB', -1, 1);

  // arma na mão da frente
  const weapon = robot
    ? rng.pick(['blaster', 'espada', 'nenhuma'] as const)
    : rng.pick(['espada', 'machado', 'cajado', 'adaga', 'nenhuma'] as const);
  if (weapon !== 'nenhuma') {
    const wp: Px[] = [];
    // armas na diagonal (para cima e para a frente) — pose de prontidão
    const diag = (x: number, y: number, len: number, c: string): Px[] => {
      const out: Px[] = [];
      for (let i = 0; i < len; i++) out.push({ x: x + Math.round(i * 0.75), y: y - i, c });
      return out;
    };
    if (weapon === 'espada' || weapon === 'adaga') {
      const len = weapon === 'espada' ? 7 : 4;
      wp.push(...diag(1, -2, len, '#e8eefc'), ...diag(2, -2, len - 1, '#9fb2cc'));
      wp.push({ x: 1 + Math.round(len * 0.75), y: -2 - len, c: '#ffffff' });
      wp.push(...rect(-1, -1, 1, 0, '#ffd23f'), ...rect(0, 1, 1, 3, '#7a4a1f'));
      sw.add('#e8eefc'); sw.add('#ffd23f'); sw.add('#7a4a1f'); sw.add('#9fb2cc');
    } else if (weapon === 'machado') {
      wp.push(...diag(0, 2, 9, '#7a4a1f'));
      const hx = Math.round(8 * 0.75);
      wp.push(...rect(hx, -8, hx + 3, -5, steel), ...rect(hx, -8, hx + 1, -7, '#e8eefc'));
      sw.add('#7a4a1f'); sw.add(steel);
    } else {
      const len = weapon === 'blaster' ? 7 : 10;
      wp.push(...diag(0, 2, len, '#7a4a1f'));
      const ox = Math.round((len - 1) * 0.75);
      const oy = 2 - (len - 1);
      wp.push(...rect(ox - 1, oy - 2, ox + 1, oy, pal.accent));
      sw.add('#7a4a1f');
    }
    nodes.push({ id: 'weapon', parent: 'armF', attach: { x: 0, y: armLen }, pixels: wp, z: 9 });
    traits.push(`Arma: ${weapon}`);
  }

  // pernas
  const mkLeg = (id: string, sx: number, z: number, darken: boolean) => {
    const pn = darken ? clothDark : pants;
    const bt = darken ? pal.outline : boots;
    nodes.push({
      id, parent: 'torso', attach: { x: sx, y: 0 },
      pixels: [
        ...rect(-1, 0, 1, legLen - 1, pn),
        ...rect(-1, legLen, 1, legLen + 1, bt),
        ...rect(2, legLen + 1, 3, legLen + 1, bt), // bico da bota
      ],
      z,
    });
  };
  mkLeg('legF', 1, 5, false);
  mkLeg('legB', -1, 2, true);
  sw.add(boots);

  // cachecol
  if (!robot && rng.chance(0.35)) {
    nodes.push({
      id: 'scarf', parent: 'torso', attach: { x: x0 + 1, y: -torsoH + 1 },
      pixels: [...rect(-6, 0, 0, 1, pal.accent), { x: -7, y: 1, c: pal.accent }, { x: -6, y: 2, c: pal.accentDark }],
      z: 3,
    });
    traits.push('Cachecol');
  }

  // efeito de golpe (slash) — visível só na janela do ataque
  nodes.push({
    id: 'fx', parent: 'torso', attach: { x: 8, y: -torsoH + 3 },
    pixels: [
      { x: -1, y: -4, c: '#ffffff' }, { x: 0, y: -3, c: '#ffffff' }, { x: 1, y: -2, c: '#ffffff' },
      { x: 2, y: -1, c: '#ffffff' }, { x: 3, y: 0, c: '#ffffff' }, { x: 4, y: 1, c: '#ffffff' },
      { x: 0, y: -4, c: pal.accent }, { x: 2, y: -2, c: pal.accent }, { x: 4, y: 0, c: pal.accent },
    ],
    z: 10, noOutline: true,
  });

  void neckY;
  [cloth, clothDark, skin, pants, pal.accent, pal.deep].forEach((c) => sw.add(c));
  return { nodes, swatches: [...sw], traits };
}

/** Slime — visão frontal */
function buildSlime(rng: Rng, pal: Palette): BodyBuild {
  const traits: string[] = [];
  const nodes: RigNode[] = [];
  const rx = 9 + rng.int(0, 2);
  const ry = 6 + rng.int(0, 2);
  const bodyPx = [
    ...ell(0, -ry, rx, ry, pal.dark),
    ...ell(0, -ry - 1, rx - 1, ry - 1, pal.base),
    ...ell(-2, -4, 3, 2, pal.light),
    ...rect(-6, -ry - 3, -4, -ry - 2, '#ffffff'),
  ];
  nodes.push({ id: 'body', parent: null, attach: { x: 16, y: 27 }, pixels: bodyPx, z: 1 });

  const eyeStyle = rng.pick<EyeStyle>(['redondo', 'grande', 'feliz', 'sonolento', 'bravo']);
  const pupil = rng.chance(0.3) ? pal.accent : pal.outline;
  for (const [id, ax] of [['eyeL', -4], ['eyeR', 4]] as const) {
    const { main, alt } = eyePixels(eyeStyle, 'front', '#ffffff', pupil, pal.outline);
    nodes.push({ id, parent: 'body', attach: { x: ax, y: -ry - 1 }, pixels: main, alt, z: 3 });
  }
  traits.push(`Olhos ${eyeStyle}`);

  const mouthStyle = rng.pick<MouthStyle>(['sorriso', 'aberta', 'reta', 'presas', 'sorriso']);
  nodes.push({
    id: 'mouth', parent: 'body', attach: { x: 0, y: -ry + 3 },
    pixels: mouthPixels(mouthStyle, true, pal.outline, '#ffffff'),
    alt: mouthOpenAlt(true, pal.outline, '#ffffff'), z: 2,
  });

  const acc = rng.pick(['folha', 'coroa', 'laco', 'nenhum'] as const);
  if (acc === 'folha') {
    nodes.push({
      id: 'acc', parent: 'body', attach: { x: 2, y: -ry * 2 },
      pixels: [{ x: 0, y: -1, c: '#1f9d44' }, ...ell(2, -2, 3, 1, '#3fd65f')], z: 4,
    });
    traits.push('Folha na cabeça');
  } else if (acc === 'coroa') {
    nodes.push({
      id: 'acc', parent: 'body', attach: { x: 0, y: -ry * 2 + 1 },
      pixels: [...rect(-3, -2, 3, 0, '#ffd23f'), { x: -3, y: -3, c: '#ffd23f' }, { x: 0, y: -3, c: '#ffd23f' }, { x: 3, y: -3, c: '#ffd23f' }, { x: 0, y: -1, c: pal.accent }],
      z: 4,
    });
    traits.push('Coroa');
  } else if (acc === 'laco') {
    nodes.push({
      id: 'acc', parent: 'body', attach: { x: -rx + 2, y: -ry - 3 },
      pixels: [...rect(-3, -1, -1, 1, pal.accent), ...rect(1, -1, 3, 1, pal.accent), { x: 0, y: 0, c: pal.accentDark }],
      z: 4,
    });
    traits.push('Laço');
  }

  // linhas de velocidade do dash
  nodes.push({
    id: 'fx', parent: 'body', attach: { x: -rx - 3, y: -ry + 1 },
    pixels: [
      ...rect(-7, -3, -3, -3, '#ffffff'),
      ...rect(-8, 0, -2, 0, '#ffffff'),
      ...rect(-7, 3, -3, 3, pal.accent),
    ],
    z: 5, noOutline: true,
  });

  return { nodes, swatches: [pal.base, pal.dark, pal.light, pal.accent, '#ffffff'], traits };
}

/** Fantasma — visão frontal flutuante */
function buildGhost(rng: Rng, pal: Palette): BodyBuild {
  const traits: string[] = [];
  const nodes: RigNode[] = [];
  const w = 7 + rng.int(0, 2);
  const bodyH = 15 + rng.int(0, 3);
  const topY = -bodyH + 6;
  let bodyPx = [...ell(0, topY, w, 6, pal.base), ...rect(-w, topY, w, -1, pal.base)];
  bodyPx = carve(bodyPx, (x, y) => y === -1 && ((x + w + 100) % 4 < 2));
  bodyPx.push(...rect(w - 2, topY + 1, w, -2, pal.dark)); // sombra lateral
  bodyPx.push(...rect(-w + 2, topY - 3, -w + 4, topY - 2, '#ffffff')); // brilho
  nodes.push({ id: 'body', parent: null, attach: { x: 16, y: 28 }, pixels: bodyPx, z: 1 });

  const eyeStyle = rng.pick<EyeStyle>(['redondo', 'grande', 'feliz', 'sonolento']);
  for (const [id, ax] of [['eyeL', -3], ['eyeR', 3]] as const) {
    const { main, alt } = eyePixels(eyeStyle, 'front', '#ffffff', pal.outline, pal.outline);
    nodes.push({ id, parent: 'body', attach: { x: ax, y: topY + 2 }, pixels: main, alt, z: 3 });
  }
  traits.push(`Olhos ${eyeStyle}`);

  nodes.push({
    id: 'mouth', parent: 'body', attach: { x: 0, y: topY + 6 },
    pixels: mouthPixels('sorriso', true, pal.outline, '#ffffff'),
    alt: mouthOpenAlt(true, pal.outline, '#ffffff'), z: 2,
  });

  // bracinhos
  nodes.push({ id: 'armF', parent: 'body', attach: { x: w - 1, y: topY + 5 }, pixels: rect(0, 0, 2, 3, pal.base), z: 4 });
  nodes.push({ id: 'armB', parent: 'body', attach: { x: -w + 1, y: topY + 5 }, pixels: rect(-2, 0, 0, 3, pal.dark), z: 0 });

  const acc = rng.pick(['chapeu', 'laco', 'nenhum'] as const);
  if (acc === 'chapeu') {
    nodes.push({
      id: 'acc', parent: 'body', attach: { x: 1, y: topY - 5 },
      pixels: [
        ...rect(-5, 0, 5, 1, pal.deep), ...rect(-2, -5, 2, -1, pal.deep),
        ...rect(-3, -2, 3, -1, pal.accent), { x: 2, y: -6, c: pal.deep },
      ],
      z: 4,
    });
    traits.push('Chapéu de bruxo');
  } else if (acc === 'laco') {
    nodes.push({
      id: 'acc', parent: 'body', attach: { x: -w + 2, y: topY - 2 },
      pixels: [...rect(-3, -1, -1, 1, pal.accent), ...rect(1, -1, 3, 1, pal.accent), { x: 0, y: 0, c: '#ffffff' }],
      z: 4,
    });
    traits.push('Laço');
  }

  // faíscas do susto
  const spark = (cx: number, cy: number): Px[] => [
    { x: cx, y: cy, c: '#ffffff' },
    { x: cx - 1, y: cy, c: '#ffffff' }, { x: cx + 1, y: cy, c: '#ffffff' },
    { x: cx, y: cy - 1, c: '#ffffff' }, { x: cx, y: cy + 1, c: '#ffffff' },
  ];
  nodes.push({
    id: 'fx', parent: 'body', attach: { x: 0, y: topY + 4 },
    pixels: [...spark(-w - 3, -3), ...spark(w + 3, -3), ...spark(-w - 1, 6), ...spark(w + 1, 6)],
    z: 5, noOutline: true,
  });

  return { nodes, swatches: [pal.base, pal.dark, pal.accent, '#ffffff'], traits };
}

/** Criatura quadrúpede — visão lateral, virada para a direita */
function buildCritter(rng: Rng, pal: Palette): BodyBuild {
  const traits: string[] = [];
  const nodes: RigNode[] = [];
  const brx = 7 + rng.int(0, 2);
  const bry = 4 + rng.int(0, 1);
  const bodyPx = [...ell(0, 0, brx, bry, pal.base), ...ell(0, 2, brx - 2, bry - 2, pal.light)];
  const texture = rng.pick(['manchas', 'listras', 'nenhuma'] as const);
  if (texture === 'manchas') {
    for (let i = 0; i < 4; i++) {
      bodyPx.push(...ell(rng.int(-brx + 2, brx - 3), rng.int(-bry + 1, 0), 1, 1, pal.dark));
    }
    traits.push('Pelo manchado');
  } else if (texture === 'listras') {
    for (let x = -brx + 2; x < brx - 1; x += 3) bodyPx.push(...rect(x, -bry + 1, x, -1, pal.dark));
    traits.push('Pelo listrado');
  }
  nodes.push({ id: 'body', parent: null, attach: { x: 15, y: 20 }, pixels: bodyPx, z: 3 });

  // cabeça
  const r = 3 + rng.int(0, 1);
  const headPx = [...ell(0, 0, r, r, pal.base), ...ell(0, 2, r - 1, r - 2, pal.light)];
  headPx.push(...rect(1, 0, r + 2, 2, pal.light)); // focinho
  headPx.push({ x: r + 2, y: 0, c: pal.outline }); // nariz
  nodes.push({ id: 'head', parent: 'body', attach: { x: brx - 1, y: -3 }, pixels: headPx, z: 5 });

  const eyeStyle = rng.pick<EyeStyle>(['redondo', 'grande', 'bravo', 'sonolento', 'feliz']);
  const { main, alt } = eyePixels(eyeStyle, 'side', '#ffffff', pal.outline, pal.outline);
  nodes.push({ id: 'eye', parent: 'head', attach: { x: 1, y: -2 }, pixels: main, alt, z: 7 });
  traits.push(`Olhos ${eyeStyle}`);

  nodes.push({
    id: 'mouth', parent: 'head', attach: { x: r + 1, y: 2 },
    pixels: mouthPixels('sorriso', false, pal.outline, '#ffffff'),
    alt: mouthOpenAlt(false, pal.outline, '#ffffff'), z: 6,
  });

  // orelhas (frente + trás)
  const ear = rng.pick(['pontuda', 'caida', 'chifre'] as const);
  const earPx = (c: string): Px[] => {
    if (ear === 'pontuda') return [{ x: 0, y: -3, c }, { x: 0, y: -2, c }, { x: -1, y: -1, c }, { x: 0, y: -1, c }, { x: 1, y: -1, c }];
    if (ear === 'caida') return [...rect(0, 0, 2, 3, c), ...rect(0, 3, 1, 4, c)];
    return [{ x: 0, y: -2, c: '#e8eefc' }, { x: 1, y: -3, c: '#e8eefc' }, { x: 0, y: -1, c }];
  };
  nodes.push({ id: 'earBack', parent: 'head', attach: { x: -2, y: -r + 1 }, pixels: earPx(pal.dark), z: 4 });
  nodes.push({ id: 'earFront', parent: 'head', attach: { x: 0, y: -r + 1 }, pixels: earPx(pal.base), z: 6 });
  traits.push(ear === 'pontuda' ? 'Orelhas pontudas' : ear === 'caida' ? 'Orelhas caídas' : 'Chifres');

  // pernas (perto + longe)
  const legH = 3 + rng.int(0, 1);
  const mkLeg = (id: string, ax: number, z: number, c: string, paw: string) => {
    nodes.push({
      id, parent: 'body', attach: { x: ax, y: bry - 1 },
      pixels: [...rect(-1, 0, 1, legH - 1, c), ...rect(-1, legH, 1, legH, paw)],
      z,
    });
  };
  mkLeg('legNF', 4, 4, pal.base, pal.light);
  mkLeg('legNB', -4, 4, pal.base, pal.light);
  mkLeg('legFF', 3, 1, pal.dark, pal.dark);
  mkLeg('legFB', -5, 1, pal.dark, pal.dark);

  // cauda
  nodes.push({
    id: 'tail', parent: 'body', attach: { x: -brx + 1, y: -2 },
    pixels: [{ x: -1, y: -1, c: pal.base }, { x: -2, y: -2, c: pal.base }, { x: -3, y: -3, c: pal.base }, { x: -3, y: -4, c: pal.light }],
    z: 2,
  });
  traits.push('Cauda animada');

  // impacto da mordida
  nodes.push({
    id: 'fx', parent: 'body', attach: { x: brx + 3, y: -3 },
    pixels: [
      { x: 0, y: -2, c: '#ffffff' }, { x: 1, y: -1, c: '#ffffff' }, { x: 2, y: 0, c: '#ffffff' },
      { x: 1, y: 1, c: '#ffffff' }, { x: 0, y: 2, c: '#ffffff' }, { x: 1, y: 0, c: pal.accent },
    ],
    z: 8, noOutline: true,
  });

  return { nodes, swatches: [pal.base, pal.dark, pal.light, pal.accent], traits };
}

/* --------------------------------- nomes ---------------------------------- */

const NAMES: Record<BodyType, string[]> = {
  humanoid: ['Lâmina', 'Escudo', 'Andante', 'Guardião', 'Patrulha'],
  slime: ['Gosma', 'Gel', 'Bolha', 'Pudim', 'Visco'],
  robot: ['ZX-7', 'Ferrugem', 'Volt', 'Parafuso', 'Circuit'],
  ghost: ['Sombra', 'Eco', 'Névoa', 'Sussurro', 'Vulto'],
  critter: ['Pata', 'Faro', 'Dente', 'Rastro', 'Trovão'],
};
const TITLES = ['Cap.', 'Sir', 'Neo', 'Mini', 'Lord', 'Mestre'];

export function characterName(rng: Rng, body: BodyType): string {
  return `${rng.pick(TITLES)} ${rng.pick(NAMES[body])}`;
}

/* --------------------------------- build ---------------------------------- */

export function buildBody(rng: Rng, body: BodyType, mood: MoodId): BodyBuild & { palette: Palette } {
  const palette = makePalette(rng, mood === 'random' && rng.chance(0.5) ? rng.pick(MOODS.filter((m) => m.id !== 'random')).id : mood);
  switch (body) {
    case 'slime': return { ...buildSlime(rng, palette), palette };
    case 'robot': return { ...buildBiped(rng, palette, true), palette };
    case 'ghost': return { ...buildGhost(rng, palette), palette };
    case 'critter': return { ...buildCritter(rng, palette), palette };
    default: return { ...buildBiped(rng, palette, false), palette };
  }
}

export { scaleNodes };
