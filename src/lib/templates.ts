import { Animation, DEFAULT_FRAME_MS, Frame, Layer, uid } from '../types';
import { fpsToMs } from './timeline';
import { createLayer } from './layers';
import { emptyCells } from './pixels';

/**
 * Templates procedurais: personagens prontos com animações sequenciadas.
 * Tudo desenhado em pixel art 32x32 via código.
 */

const W = 32;
const H = 32;

class Painter {
  cells: string[] = emptyCells(W, H);
  px(x: number, y: number, c: string) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H || !c) return;
    this.cells[y * W + x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const v = ((x - cx) / Math.max(rx, 0.5)) ** 2 + ((y - cy) / Math.max(ry, 0.5)) ** 2;
        if (v <= 1) this.px(x, y, c);
      }
    }
  }
  frame(layerId: string): Frame {
    return { id: uid('fr'), cels: { [layerId]: [...this.cells] }, durationMs: DEFAULT_FRAME_MS, anchors: [], hitbox: null };
  }
  clear() {
    this.cells = emptyCells(W, H);
  }
}

function makeAnim(name: string, fps: number, frames: Frame[]): Animation {
  const ms = fpsToMs(fps);
  for (const f of frames) f.durationMs = ms;
  return { id: uid('an'), name, fps, frameIds: frames.map((f) => f.id), playMode: 'loop' };
}

function collect(frames: Frame[]): Record<string, Frame> {
  const out: Record<string, Frame> = {};
  for (const f of frames) out[f.id] = f;
  return out;
}

export interface TemplateBuild {
  animations: Animation[];
  frames: Record<string, Frame>;
  layers: Layer[];
  palette: string[];
}

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  tags: string[];
  build: () => TemplateBuild;
}

/* ---------------------------------- SLIME --------------------------------- */

const SLIME = {
  body: '#3fd65f',
  bodyDark: '#1f9d44',
  outline: '#145c2b',
  light: '#c2ffa4',
  eye: '#ffffff',
  pupil: '#10131d',
  blush: '#ff8ab3',
  shadow: '#232c47',
};

function drawSlime(p: Painter, opts: { squash: number; dy: number; blink: boolean; dx?: number; stretchX?: number }) {
  const { squash, dy, blink, dx = 0, stretchX = 0 } = opts;
  const cx = 16 + dx;
  const cy = 21 + dy;
  const rx = 10 + squash + stretchX;
  const ry = 7 - squash;
  // sombra
  p.ellipse(16 + dx, 29, 7, 1.4, SLIME.shadow);
  // contorno + corpo
  p.ellipse(cx, cy, rx + 1, ry + 1, SLIME.outline);
  p.ellipse(cx, cy, rx, ry, SLIME.body);
  // barriga mais clara
  p.ellipse(cx, cy + 2, rx - 3, ry - 3, SLIME.bodyDark);
  p.ellipse(cx, cy + 1, rx - 4, ry - 4, SLIME.body);
  // brilho
  p.rect(cx - 6, cy - 5, 3, 2, SLIME.light);
  p.px(cx - 7, cy - 4, SLIME.light);
  // olhos
  const ey = cy - 2;
  if (blink) {
    p.rect(cx - 5, ey, 3, 1, SLIME.pupil);
    p.rect(cx + 2, ey, 3, 1, SLIME.pupil);
  } else {
    p.rect(cx - 6, ey - 1, 4, 5, SLIME.eye);
    p.rect(cx + 2, ey - 1, 4, 5, SLIME.eye);
    p.rect(cx - 5, ey, 2, 3, SLIME.pupil);
    p.rect(cx + 3, ey, 2, 3, SLIME.pupil);
    p.px(cx - 5, ey, '#ffffff');
    p.px(cx + 3, ey, '#ffffff');
  }
  // blush + boca
  p.rect(cx - 8, ey + 3, 2, 1, SLIME.blush);
  p.rect(cx + 6, ey + 3, 2, 1, SLIME.blush);
  p.rect(cx - 1, ey + 4, 2, 1, SLIME.outline);
}

function buildSlime(): TemplateBuild {
  const p = new Painter();
  const layer = createLayer('Camada 1');
  const all: Frame[] = [];

  const idleCfg = [
    { squash: 0, dy: 0, blink: false },
    { squash: -1, dy: -1, blink: false },
    { squash: 0, dy: 0, blink: false },
    { squash: 1.4, dy: 1, blink: true },
  ];
  const idleFrames = idleCfg.map((c) => { p.clear(); drawSlime(p, c); const f = p.frame(layer.id); all.push(f); return f; });

  const hopCfg = [
    { squash: 1.6, dy: 1, blink: false },
    { squash: -1.6, dy: -4, blink: false },
    { squash: -0.6, dy: -6, blink: false },
    { squash: 0.6, dy: -1, blink: false },
  ];
  const hopFrames = hopCfg.map((c) => { p.clear(); drawSlime(p, c); const f = p.frame(layer.id); all.push(f); return f; });

  // dash attack: estica para a direita com linhas de velocidade
  const dashDx = [-2, 4, 1];
  const dashFrames = dashDx.map((dx, i) => {
    p.clear();
    drawSlime(p, { squash: i === 1 ? -0.5 : 1, dy: 0, blink: false, dx, stretchX: i === 1 ? 3 : 0 });
    if (i === 1) {
      p.rect(2, 16, 5, 1, '#9be8ff');
      p.rect(1, 20, 7, 1, '#9be8ff');
      p.rect(3, 24, 5, 1, '#9be8ff');
    }
    const f = p.frame(layer.id); all.push(f); return f;
  });

  return {
    animations: [
      makeAnim('idle', 6, idleFrames),
      makeAnim('pular', 8, hopFrames),
      makeAnim('dash', 10, dashFrames),
    ],
    frames: collect(all),
    layers: [layer],
    palette: [SLIME.body, SLIME.bodyDark, SLIME.outline, SLIME.light, '#ffffff', '#10131d', SLIME.blush, '#9be8ff'],
  };
}

/* ---------------------------------- KNIGHT -------------------------------- */

const KN = {
  outline: '#1c2333',
  steel: '#9fb2cc',
  steelDark: '#5b6b8c',
  plume: '#ff4d6d',
  plumeDark: '#c22a4d',
  skin: '#ffcf9e',
  tunic: '#3b82f6',
  tunicDark: '#1d4ed8',
  belt: '#20263c',
  pants: '#333d5c',
  boots: '#7a4a1f',
  bootsDark: '#542f12',
  blade: '#e8eefc',
  gold: '#ffd23f',
  wood: '#7a4a1f',
  shadow: '#232c47',
};

type LegPose = 'neutro' | 'passoA' | 'passoB';
type SwordPose = 'idle' | 'erguer' | 'golpe';

function drawKnight(p: Painter, opts: { dy: number; legs: LegPose; sword: SwordPose }) {
  const { dy, legs, sword } = opts;
  const Y = (y: number) => y + dy;
  p.ellipse(16, 29, 7, 1.4, KN.shadow);

  // pernas
  if (legs === 'neutro') {
    p.rect(11, Y(21), 3, 4, KN.pants); p.rect(11, Y(25), 3, 2, KN.boots);
    p.rect(15, Y(21), 3, 4, KN.pants); p.rect(15, Y(25), 4, 2, KN.boots);
  } else if (legs === 'passoA') {
    p.rect(9, Y(21), 3, 4, KN.pants); p.rect(9, Y(25), 3, 2, KN.boots); // trás
    p.rect(16, Y(21), 3, 3, KN.pants); p.rect(16, Y(24), 4, 2, KN.boots); // frente levantada
  } else {
    p.rect(12, Y(21), 3, 3, KN.pants); p.rect(12, Y(24), 3, 2, KN.boots); // trás levantada
    p.rect(16, Y(21), 3, 4, KN.pants); p.rect(16, Y(25), 4, 2, KN.boots); // frente
  }
  p.rect(11, Y(20), 8, 1, KN.pants);

  // torso / túnica
  p.rect(10, Y(14), 8, 7, KN.tunic);
  p.rect(10, Y(14), 2, 7, KN.tunicDark);
  p.rect(10, Y(17), 8, 2, KN.belt);
  p.rect(13, Y(17), 2, 2, KN.gold);
  // ombreira + braço de trás
  p.rect(17, Y(14), 3, 3, KN.steel);
  p.rect(17, Y(14), 1, 3, KN.steelDark);
  p.rect(8, Y(15), 2, 5, KN.steelDark);

  // elmo
  p.rect(9, Y(6), 1, 7, KN.outline);
  p.rect(10, Y(6), 9, 7, KN.steel);
  p.rect(10, Y(6), 2, 7, KN.steelDark);
  p.rect(10, Y(5), 9, 1, KN.outline);
  p.rect(10, Y(13), 9, 1, KN.outline);
  // pluma
  p.rect(12, Y(2), 2, 3, KN.plume);
  p.rect(11, Y(3), 1, 2, KN.plumeDark);
  p.rect(14, Y(3), 1, 2, KN.plumeDark);
  // rosto (virado p/ direita)
  p.rect(15, Y(9), 4, 4, KN.skin);
  p.px(17, Y(10), KN.outline);
  p.rect(15, Y(12), 4, 1, '#e8a76f');

  // espada
  if (sword === 'golpe') {
    // arco do golpe
    p.rect(21, Y(8), 2, 1, '#ffffff');
    p.rect(24, Y(7), 2, 1, '#ffffff');
    p.rect(27, Y(8), 2, 1, '#ffffff');
    p.rect(21, Y(17), 2, 1, '#ffffff');
    p.rect(24, Y(18), 2, 1, '#ffffff');
    p.rect(27, Y(17), 2, 1, '#ffffff');
    // lâmina horizontal
    p.rect(20, Y(12), 9, 2, KN.blade);
    p.rect(29, Y(12), 1, 2, KN.steelDark);
    p.rect(19, Y(11), 1, 4, KN.gold);
    p.rect(17, Y(12), 2, 2, KN.wood);
    p.rect(15, Y(13), 3, 3, KN.steelDark); // braço estendido
    p.px(18, Y(14), KN.skin);
  } else if (sword === 'erguer') {
    p.rect(19, Y(3), 2, 8, KN.blade);
    p.px(19, Y(2), KN.blade); p.px(20, Y(2), KN.blade);
    p.rect(18, Y(11), 4, 1, KN.gold);
    p.rect(19, Y(12), 2, 3, KN.wood);
    p.rect(16, Y(14), 3, 2, KN.steelDark);
    p.px(18, Y(14), KN.skin);
  } else {
    p.rect(20, Y(6), 2, 8, KN.blade);
    p.px(20, Y(5), KN.blade); p.px(21, Y(5), KN.blade);
    p.rect(19, Y(14), 4, 1, KN.gold);
    p.rect(20, Y(15), 2, 3, KN.wood);
    p.rect(17, Y(16), 3, 2, KN.steelDark);
    p.px(18, Y(16), KN.skin);
  }
}

function buildKnight(): TemplateBuild {
  const p = new Painter();
  const layer = createLayer('Camada 1');
  const all: Frame[] = [];

  const idleCfg: Array<{ dy: number; legs: LegPose; sword: SwordPose }> = [
    { dy: 0, legs: 'neutro', sword: 'idle' },
    { dy: -1, legs: 'neutro', sword: 'idle' },
  ];
  const idle = idleCfg.map((c) => { p.clear(); drawKnight(p, c); const f = p.frame(layer.id); all.push(f); return f; });

  const walkCfg: Array<{ dy: number; legs: LegPose; sword: SwordPose }> = [
    { dy: 0, legs: 'neutro', sword: 'idle' },
    { dy: -1, legs: 'passoA', sword: 'idle' },
    { dy: 0, legs: 'neutro', sword: 'idle' },
    { dy: -1, legs: 'passoB', sword: 'idle' },
  ];
  const walk = walkCfg.map((c) => { p.clear(); drawKnight(p, c); const f = p.frame(layer.id); all.push(f); return f; });

  const atkCfg: Array<{ dy: number; legs: LegPose; sword: SwordPose }> = [
    { dy: 0, legs: 'neutro', sword: 'erguer' },
    { dy: 1, legs: 'passoA', sword: 'golpe' },
    { dy: 0, legs: 'neutro', sword: 'idle' },
  ];
  const atk = atkCfg.map((c) => { p.clear(); drawKnight(p, c); const f = p.frame(layer.id); all.push(f); return f; });

  return {
    animations: [
      makeAnim('idle', 4, idle),
      makeAnim('andar', 8, walk),
      makeAnim('ataque', 10, atk),
    ],
    frames: collect(all),
    layers: [layer],
    palette: [KN.steel, KN.steelDark, KN.plume, KN.skin, KN.tunic, KN.tunicDark, KN.boots, KN.blade, KN.gold, KN.outline],
  };
}

/* ---------------------------------- COIN ---------------------------------- */

const COIN = {
  gold: '#ffd23f',
  goldDark: '#c78a12',
  goldLight: '#ffe89a',
  shine: '#ffffff',
};

function drawCoin(p: Painter, rx: number, dy = 0, sparkles = false) {
  const cx = 16, cy = 16 + dy, ry = 10;
  p.ellipse(cx, cy, rx + 1, ry + 1, COIN.goldDark);
  p.ellipse(cx, cy, rx, ry, COIN.gold);
  if (rx > 4) {
    p.ellipse(cx, cy, rx - 3, ry - 3, COIN.goldLight);
    p.ellipse(cx, cy, rx - 5, ry - 5, COIN.gold);
    p.rect(cx - 2, cy - 6, 2, 4, COIN.shine);
  }
  if (sparkles) {
    const s: Array<[number, number]> = [[6, 6], [26, 5], [4, 24], [27, 23]];
    for (const [x, y] of s) {
      p.px(x, y, '#ffffff');
      p.px(x - 1, y, '#ffffff'); p.px(x + 1, y, '#ffffff');
      p.px(x, y - 1, '#ffffff'); p.px(x, y + 1, '#ffffff');
    }
  }
}

function buildCoin(): TemplateBuild {
  const p = new Painter();
  const layer = createLayer('Camada 1');
  const all: Frame[] = [];
  const spinRx = [9, 6, 2, 6];
  const spin = spinRx.map((rx) => { p.clear(); drawCoin(p, rx); const f = p.frame(layer.id); all.push(f); return f; });
  const collectCfg = [
    { rx: 9, dy: 0, sp: false },
    { rx: 9, dy: -4, sp: true },
    { rx: 6, dy: -8, sp: true },
  ];
  const collectA = collectCfg.map((c) => { p.clear(); drawCoin(p, c.rx, c.dy, c.sp); const f = p.frame(layer.id); all.push(f); return f; });
  return {
    animations: [makeAnim('girar', 10, spin), makeAnim('coletar', 8, collectA)],
    frames: collect(all),
    layers: [layer],
    palette: [COIN.gold, COIN.goldDark, COIN.goldLight, '#ffffff'],
  };
}

/* ---------------------------------- GHOST --------------------------------- */

const GH = {
  body: '#e8eefc',
  shade: '#9fb2cc',
  outline: '#5b6b8c',
  eye: '#1c2333',
  blush: '#c9a7ff',
};

function drawGhost(p: Painter, dy: number, blink: boolean, mouthOpen: boolean) {
  const cx = 16, top = 8 + dy;
  p.ellipse(cx, top + 6, 9, 8, GH.outline);
  p.ellipse(cx, top + 6, 8, 7, GH.body);
  // corpo até embaixo com barra ondulada
  p.rect(cx - 8, top + 6, 16, 10, GH.body);
  p.rect(cx - 8, top + 6, 16, 1, GH.outline);
  for (let x = cx - 8; x < cx + 8; x += 4) {
    p.px(x, top + 16, ''); p.px(x + 1, top + 16, ''); // recorte da barra
    p.px(x, top + 15, GH.body); p.px(x + 1, top + 15, GH.body);
  }
  p.rect(cx - 8, top + 16, 16, 1, GH.body);
  for (let x = cx - 8; x < cx + 8; x += 4) {
    p.px(x + 2, top + 16, ''); p.px(x + 3, top + 16, '');
  }
  // sombra lateral
  p.rect(cx + 5, top + 2, 3, 12, GH.shade);
  // olhos
  const ey = top + 6;
  if (blink) {
    p.rect(cx - 5, ey, 3, 1, GH.eye);
    p.rect(cx + 2, ey, 3, 1, GH.eye);
  } else {
    p.rect(cx - 6, ey - 1, 4, 6, '#ffffff');
    p.rect(cx + 2, ey - 1, 4, 6, '#ffffff');
    p.rect(cx - 5, ey + 1, 2, 3, GH.eye);
    p.rect(cx + 3, ey + 1, 2, 3, GH.eye);
  }
  // blush + boca
  p.rect(cx - 7, ey + 5, 2, 1, GH.blush);
  p.rect(cx + 5, ey + 5, 2, 1, GH.blush);
  if (mouthOpen) p.rect(cx - 1, ey + 6, 3, 3, GH.eye);
  else p.rect(cx - 1, ey + 7, 3, 1, GH.eye);
}

function buildGhost(): TemplateBuild {
  const p = new Painter();
  const layer = createLayer('Camada 1');
  const all: Frame[] = [];
  const floatCfg = [
    { dy: 0, blink: false, mouth: false },
    { dy: -1, blink: false, mouth: false },
    { dy: -2, blink: true, mouth: false },
    { dy: -1, blink: false, mouth: true },
  ];
  const float = floatCfg.map((c) => {
    p.clear(); drawGhost(p, c.dy, c.blink, c.mouth);
    const f = p.frame(layer.id); all.push(f); return f;
  });
  const scareCfg = [
    { dy: 0, blink: false, mouth: false },
    { dy: -3, blink: false, mouth: true },
    { dy: 0, blink: true, mouth: false },
  ];
  const scare = scareCfg.map((c) => {
    p.clear(); drawGhost(p, c.dy, c.blink, c.mouth);
    const f = p.frame(layer.id); all.push(f); return f;
  });
  return {
    animations: [makeAnim('flutuar', 6, float), makeAnim('assustar', 8, scare)],
    frames: collect(all),
    layers: [layer],
    palette: [GH.body, GH.shade, GH.outline, '#ffffff', GH.eye, GH.blush],
  };
}

/* --------------------------- ANGOLA / 2D STUDIES -------------------------- */

const AO = {
  black: '#171717',
  red: '#ce1126',
  gold: '#f9d616',
  sand: '#d9a441',
  green: '#4f7f3a',
  sky: '#7ec8e3',
  white: '#f5f1e6',
  blue: '#1d5b82',
};

function buildImbondeiro(): TemplateBuild {
  const p = new Painter();
  const layer = createLayer('Imbondeiro');
  const frames: Frame[] = [];
  const configs = [-1, 0, 1, 0];
  for (const sway of configs) {
    p.clear();
    p.ellipse(16, 29, 8, 1, AO.black);
    p.rect(13, 16, 6, 12, AO.sand);
    p.rect(11, 20, 10, 7, AO.sand);
    p.rect(14, 18, 2, 9, '#8b5f28');
    p.rect(17, 17, 2, 10, '#b27a32');
    p.rect(15 + sway, 9, 3, 9, AO.sand);
    p.rect(8 + sway, 8, 16, 3, AO.green);
    p.rect(6 + sway, 10, 20, 3, AO.green);
    p.rect(10 + sway, 6, 12, 3, AO.green);
    p.rect(13 + sway, 4, 6, 3, AO.green);
    p.px(9 + sway, 7, AO.green); p.px(22 + sway, 7, AO.green);
    p.px(7 + sway, 12, AO.green); p.px(24 + sway, 12, AO.green);
    p.px(15 + sway, 3, AO.green); p.px(17 + sway, 2, AO.green);
    const f = p.frame(layer.id); frames.push(f);
  }
  return {
    animations: [makeAnim('vento', 5, frames)],
    frames: collect(frames),
    layers: [layer],
    palette: [AO.black, AO.sand, '#8b5f28', '#b27a32', AO.green],
  };
}

function buildPalanca(): TemplateBuild {
  const p = new Painter();
  const layer = createLayer('Palanca');
  const frames: Frame[] = [];
  const steps = [0, 1, 0, -1];
  for (const step of steps) {
    p.clear();
    p.ellipse(16, 28, 8, 1, AO.black);
    // corpo, peito e pescoço
    p.ellipse(15 + step, 17, 8, 5, AO.sand);
    p.rect(19 + step, 10, 3, 9, AO.sand);
    p.ellipse(22 + step, 9, 4, 3, AO.sand);
    // barriga clara e contorno da cabeça
    p.rect(11 + step, 16, 8, 3, '#e9c16f');
    p.rect(23 + step, 8, 2, 1, AO.black);
    p.rect(25 + step, 9, 2, 1, AO.black);
    // chifres
    p.rect(20 + step, 4, 1, 5, AO.black);
    p.rect(22 + step, 3, 1, 6, AO.black);
    p.px(19 + step, 5, AO.black); p.px(24 + step, 4, AO.black);
    // patas alternadas
    p.rect(10 + step, 20, 2, 7, AO.black);
    p.rect(18 + step, 20, 2, 7, AO.black);
    p.rect(13 + (step > 0 ? 2 : 0), 21, 2, 6, AO.black);
    p.rect(21 + (step < 0 ? -2 : 0), 21, 2, 6, AO.black);
    // cauda
    p.rect(7 + step, 14, 4, 1, AO.black);
    p.px(6 + step, 13, AO.black); p.px(6 + step, 15, AO.black);
    const f = p.frame(layer.id); frames.push(f);
  }
  return {
    animations: [makeAnim('andar', 8, frames)],
    frames: collect(frames),
    layers: [layer],
    palette: [AO.black, AO.sand, '#e9c16f'],
  };
}

function buildCandongueiro(): TemplateBuild {
  const p = new Painter();
  const layer = createLayer('Candongueiro');
  const frames: Frame[] = [];
  for (const light of [false, true]) {
    p.clear();
    p.rect(4, 12, 24, 12, AO.blue);
    p.rect(7, 8, 18, 5, AO.blue);
    p.rect(8, 9, 6, 3, AO.sky); p.rect(16, 9, 7, 3, AO.sky);
    p.rect(4, 16, 24, 3, AO.white);
    p.rect(4, 19, 24, 2, AO.red);
    p.rect(6, 21, 5, 5, AO.black); p.rect(21, 21, 5, 5, AO.black);
    p.rect(7, 22, 3, 3, '#4a4a4a'); p.rect(22, 22, 3, 3, '#4a4a4a');
    p.rect(26, 13, 2, 2, AO.gold);
    p.rect(2, 15, 2, 1, AO.white);
    if (light) { p.px(27, 10, AO.gold); p.px(28, 9, AO.gold); p.px(29, 8, AO.gold); }
    const f = p.frame(layer.id); frames.push(f);
  }
  return {
    animations: [makeAnim('parado', 3, frames)],
    frames: collect(frames),
    layers: [layer],
    palette: [AO.black, AO.blue, AO.sky, AO.white, AO.red, AO.gold, '#4a4a4a'],
  };
}

function buildPessoaAngolana(): TemplateBuild {
  const p = new Painter();
  const layer = createLayer('Pessoa');
  const frames: Frame[] = [];
  for (const step of [0, 1, 0, -1]) {
    p.clear();
    p.ellipse(16, 29, 6, 1, AO.black);
    p.rect(13, 8, 6, 6, '#7a4b2a');
    p.rect(12, 7, 8, 2, AO.black);
    p.rect(13, 6, 6, 2, AO.black);
    p.rect(12, 14, 8, 8, AO.red);
    p.rect(14, 15, 4, 7, AO.gold);
    p.rect(10, 15, 2, 7, '#7a4b2a'); p.rect(20, 15, 2, 7, '#7a4b2a');
    p.rect(13 + step, 22, 3, 6, AO.black);
    p.rect(17 - step, 22, 3, 6, AO.black);
    p.rect(12 + step, 28, 4, 1, AO.black); p.rect(18 - step, 28, 4, 1, AO.black);
    const f = p.frame(layer.id); frames.push(f);
  }
  return {
    animations: [makeAnim('andar', 8, frames)],
    frames: collect(frames),
    layers: [layer],
    palette: [AO.black, '#7a4b2a', AO.red, AO.gold],
  };
}

/* --------------------------------- REGISTRY -------------------------------- */

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'imbondeiro-angola',
    name: 'Imbondeiro de Angola',
    description: 'Estudo 2D de um imbondeiro com vento suave, baseado nas paisagens angolanas.',
    tags: ['angola', 'natureza', 'paisagem', '2d'],
    build: buildImbondeiro,
  },
  {
    id: 'palanca-angola',
    name: 'Palanca negra gigante',
    description: 'Silhueta 2D de palanca em caminhada para cenas de natureza e aventura.',
    tags: ['angola', 'fauna', 'palanca', '2d'],
    build: buildPalanca,
  },
  {
    id: 'candongueiro-angola',
    name: 'Candongueiro azul',
    description: 'Referência 2D de candongueiro para ambientes urbanos e jogos de Luanda.',
    tags: ['angola', 'luanda', 'cidade', '2d'],
    build: buildCandongueiro,
  },
  {
    id: 'pessoa-angola',
    name: 'Pessoa angolana',
    description: 'Base 2D simples para prototipar personagens com cores da bandeira de Angola.',
    tags: ['angola', 'pessoa', 'personagem', '2d'],
    build: buildPessoaAngolana,
  },
  {
    id: 'slime',
    name: 'Slime',
    description: 'Mascote gelatinoso com idle, pulo e dash. Perfeito para platformers.',
    tags: ['inimigo', 'mascote', 'platformer'],
    build: buildSlime,
  },
  {
    id: 'knight',
    name: 'Cavaleiro',
    description: 'Herói de armadura com idle, andar e ataque de espada. Virado para a direita.',
    tags: ['herói', 'rpg', 'combate'],
    build: buildKnight,
  },
  {
    id: 'coin',
    name: 'Moeda',
    description: 'Moeda dourada girando + animação de coleta com brilhos.',
    tags: ['item', 'coletável', 'efeito'],
    build: buildCoin,
  },
  {
    id: 'ghost',
    name: 'Fantasma',
    description: 'Fantasminha flutuante com piscadas e susto. Ideal para fases sombrias.',
    tags: ['inimigo', 'terror', 'voo'],
    build: buildGhost,
  },
];

export const STARTER_PALETTES: Array<{ name: string; colors: string[] }> = [
  {
    name: 'Angola · terra e bandeira',
    colors: ['#171717', '#ce1126', '#f9d616', '#d9a441', '#4f7f3a', '#7ec8e3', '#f5f1e6', '#1d5b82'],
  },
  {
    name: 'PICO-8',
    colors: ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'],
  },
  {
    name: 'PixelForge',
    colors: ['#10131d', '#1c2333', '#333d5c', '#5b6b8c', '#9fb2cc', '#e8eefc', '#ffffff', '#ff4d6d', '#ff8a00', '#ffd23f', '#8ee000', '#3fd65f', '#22b8f0', '#3b82f6', '#c9a7ff', '#ff8ab3'],
  },
  {
    name: 'Monocromo',
    colors: ['#0b0d14', '#232c47', '#4a587f', '#8b9cc9', '#c9d6f2', '#ffffff'],
  },
];
