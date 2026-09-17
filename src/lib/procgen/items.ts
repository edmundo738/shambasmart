import { Rng } from './rng';
import { Px, ell, rect, renderStatic } from './rig';
import { StyleSpec } from './styles';
import { transformCells } from './retarget';

export type ItemType = 'pocao' | 'moeda' | 'gema' | 'bau' | 'chave' | 'coracao' | 'cogumelo' | 'tocha';

export const ITEM_TYPES: Array<{ id: ItemType; label: string }> = [
  { id: 'pocao', label: 'Poção' },
  { id: 'moeda', label: 'Moeda' },
  { id: 'gema', label: 'Gema' },
  { id: 'bau', label: 'Baú' },
  { id: 'chave', label: 'Chave' },
  { id: 'coracao', label: 'Coração' },
  { id: 'cogumelo', label: 'Cogumelo' },
  { id: 'tocha', label: 'Tocha' },
];

export interface ItemBuild {
  type: ItemType;
  cells: string[];
  w: number;
  h: number;
  palette: string[];
  traits: string[];
  name: string;
  /** âncoras de brilho em coords 32-space */
  sparkles: Array<[number, number]>;
  /** chama viva (só tocha): pixels 32-space por frame */
  flame?: (frame: number) => Px[];
  /** corpo sem chama (só tocha) em 32-space */
  body32?: Px[];
}

const CX = 16;

function hsl(h: number, s: number, l: number): string {
  // mini hsl local para líquidos/gemas com matiz sorteado
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  const q = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${q(r)}${q(g)}${q(b)}`;
}

/* ------------------------------ construtores ------------------------------ */

function buildPotion(rng: Rng, st: StyleSpec): { px: Px[]; liquid: string; traits: string[] } {
  const traits: string[] = [];
  const shape = rng.pick(['redonda', 'frasco', 'alta'] as const);
  const liquid = hsl(rng.hue(0, 360), 80, 55);
  const liquidDark = hsl(0, 0, 0); // placeholder trocado abaixo
  void liquidDark;
  const px: Px[] = [];
  const glass = st.metalLight;
  if (shape === 'redonda') {
    px.push(...ell(CX, 20, 6, 6, glass));
    px.push(...ell(CX, 21, 4, 4, liquid));
    px.push(...rect(CX - 2, 11, CX + 1, 15, glass));
    traits.push('Poção redonda');
  } else if (shape === 'frasco') {
    for (let y = 14; y <= 24; y++) {
      const wdt = Math.round(2 + ((y - 14) / 10) * 4);
      px.push(...rect(CX - wdt, y, CX + wdt - 1, y, glass));
      if (y >= 18) px.push(...rect(CX - wdt + 1, y, CX + wdt - 2, y, liquid));
    }
    px.push(...rect(CX - 2, 10, CX + 1, 13, glass));
    traits.push('Frasco cônico');
  } else {
    px.push(...rect(CX - 3, 14, CX + 2, 25, glass));
    px.push(...rect(CX - 2, 18, CX + 1, 24, liquid));
    px.push(...rect(CX - 2, 10, CX + 1, 13, glass));
    traits.push('Poção alta');
  }
  px.push(...rect(CX - 2, 8, CX + 1, 10, st.wood)); // rolha
  px.push({ x: CX - 4, y: 18, c: '#ffffff' }, { x: CX - 4, y: 19, c: '#ffffff' }); // brilho
  if (rng.chance(0.6)) {
    px.push({ x: CX + 1, y: 20, c: '#ffffff' }, { x: CX - 1, y: 22, c: '#ffffff' });
    traits.push('Borbulhante');
  }
  return { px, liquid, traits };
}

function buildCoin(rng: Rng, st: StyleSpec): { px: Px[]; traits: string[] } {
  const traits: string[] = [];
  const gold = rng.chance(0.7) ? st.accent : st.metalLight;
  const edge = rng.chance(0.7) ? st.accentDark : st.metalDark;
  const px = [
    ...ell(CX, 16, 8, 8, edge),
    ...ell(CX, 16, 7, 7, gold),
    ...ell(CX, 16, 5, 5, st.glow),
  ];
  const symbol = rng.pick(['estrela', 'losango', 'lua'] as const);
  if (symbol === 'estrela') {
    px.push({ x: CX, y: 16, c: edge });
    px.push({ x: CX - 1, y: 16, c: edge }, { x: CX + 1, y: 16, c: edge });
    px.push({ x: CX, y: 15, c: edge }, { x: CX, y: 17, c: edge });
  } else if (symbol === 'losango') {
    px.push({ x: CX, y: 14, c: edge }, { x: CX - 1, y: 16, c: edge }, { x: CX, y: 16, c: edge }, { x: CX + 1, y: 16, c: edge }, { x: CX, y: 18, c: edge });
  } else {
    px.push(...ell(CX + 1, 16, 3, 4, edge), ...ell(CX + 2, 16, 3, 4, st.glow));
  }
  traits.push(symbol === 'estrela' ? 'Estrela cunhada' : symbol === 'losango' ? 'Losango cunhado' : 'Lua cunhada');
  px.push({ x: CX - 4, y: 11, c: '#ffffff' }, { x: CX - 3, y: 10, c: '#ffffff' });
  return { px, traits };
}

function buildGem(rng: Rng, st: StyleSpec): { px: Px[]; gem: string; traits: string[] } {
  const traits: string[] = [];
  const hue = rng.pick([0, 210, 140, 275, 35]);
  const gem = hsl(hue, 85, 55);
  const gemDark = hsl(hue, 80, 32);
  const gemLight = hsl(hue, 90, 78);
  void st;
  const rows: Array<[number, number]> = [[-1, 8], [-3, 10], [-5, 12], [-6, 14], [-4, 16], [-2, 18], [0, 20]];
  const px: Px[] = [];
  for (const [dx, y] of rows) {
    const wdt = dx === 0 ? 0 : Math.abs(dx);
    px.push(...rect(CX - wdt, y, CX + wdt, y + 1, gem));
  }
  // facetas
  px.push(...rect(CX - 5, 12, CX - 2, 14, gemLight));
  px.push(...rect(CX + 1, 16, CX + 3, 19, gemDark));
  px.push({ x: CX - 3, y: 12, c: '#ffffff' });
  traits.push(hue === 0 ? 'Rubi' : hue === 210 ? 'Safira' : hue === 140 ? 'Esmeralda' : hue === 275 ? 'Ametista' : 'Topázio');
  return { px, gem, traits };
}

function buildChest(rng: Rng, st: StyleSpec): { px: Px[]; traits: string[] } {
  const traits: string[] = [];
  const px = [
    ...rect(9, 15, 22, 25, st.wood),
    ...rect(9, 15, 22, 16, st.woodDark),
    ...rect(8, 12, 23, 15, st.wood),
    ...rect(8, 12, 23, 13, st.metalDark),
  ];
  for (const bx of [11, 19]) {
    px.push(...rect(bx, 12, bx + 1, 25, st.metalDark));
    traits.push('Aros de metal');
  }
  px.push(...rect(15, 17, 16, 19, st.accent));
  px.push({ x: 15, y: 18, c: st.outline });
  traits.push('Fechadura dourada');
  if (rng.chance(0.5)) {
    px.push({ x: 15, y: 14, c: st.glow }, { x: 16, y: 14, c: st.glow });
    traits.push('Brilho misterioso');
  }
  return { px, traits };
}

function buildKey(rng: Rng, st: StyleSpec): { px: Px[]; traits: string[] } {
  const traits: string[] = [];
  const gold = rng.chance(0.6) ? st.accent : st.metalLight;
  const ring = ell(CX, 10, 4, 4, gold);
  const hole = new Set(ell(CX, 10, 2, 2, '').map((p) => `${p.x},${p.y}`));
  const px = ring.filter((p) => !hole.has(`${p.x},${p.y}`));
  px.push(...rect(CX - 1, 14, CX, 24, gold));
  const teeth = 1 + rng.int(0, 2);
  for (let i = 0; i < teeth; i++) {
    px.push(...rect(CX + 1, 18 + i * 3, CX + 3, 18 + i * 3, gold));
  }
  traits.push(`${teeth} ${teeth === 1 ? 'dente' : 'dentes'}`);
  px.push({ x: CX - 3, y: 8, c: '#ffffff' });
  return { px, traits };
}

function buildHeart(rng: Rng, st: StyleSpec): { px: Px[]; traits: string[] } {
  const traits: string[] = [];
  const red = hsl(rng.range(-10, 10), 85, 55);
  const dark = hsl(0, 80, 32);
  void st;
  const px = [...ell(13, 14, 4, 4, red), ...ell(19, 14, 4, 4, red)];
  for (let y = 15; y <= 23; y++) {
    const wdt = Math.round(6 - ((y - 15) / 8) * 6);
    px.push(...rect(CX - wdt, y, CX + wdt - 1, y, red));
  }
  px.push(...rect(13, 19, 18, 22, dark));
  px.push({ x: 11, y: 12, c: '#ffffff' }, { x: 12, y: 11, c: '#ffffff' });
  traits.push(rng.chance(0.5) ? 'Coração cheio' : 'Coração pulsante');
  return { px, traits };
}

function buildMushroom(rng: Rng, st: StyleSpec): { px: Px[]; cap: string; traits: string[] } {
  const traits: string[] = [];
  const cap = rng.chance(0.6) ? hsl(rng.range(-12, 12), 80, 55) : st.accent;
  const stem = st.metalLight;
  const px = [
    ...rect(14, 18, 17, 26, stem),
    ...rect(14, 18, 14, 26, st.metalDark),
    ...ell(CX, 15, 8, 6, cap),
    ...rect(9, 16, 22, 18, st.metalLight),
  ];
  const spots = 3 + rng.int(0, 2);
  for (let i = 0; i < spots; i++) {
    const sx = rng.int(10, 21);
    const sy = rng.int(10, 14);
    px.push({ x: sx, y: sy, c: '#ffffff' });
    if (rng.chance(0.5)) px.push({ x: sx + 1, y: sy, c: '#ffffff' });
  }
  traits.push(`${spots} manchas`);
  return { px, cap, traits };
}

function buildTorchBody(st: StyleSpec): Px[] {
  return [
    ...rect(15, 17, 16, 28, st.wood),
    ...rect(15, 17, 15, 28, st.woodDark),
    ...rect(14, 16, 17, 18, st.metalDark),
  ];
}

function torchFlame(seed: number, ramp: [string, string, string]): Px[] {
  const rng = new Rng(seed);
  const px: Px[] = [];
  // camadas de chama com tremulação determinística
  const layers: Array<[number, number, number, string]> = [
    [9, 4, 3, ramp[0]],
    [6, 3, 2, ramp[1]],
    [4, 2, 1, ramp[2]],
  ];
  for (const [baseY, half, h, c] of layers) {
    for (let y = 0; y < h * 2 + 2; y++) {
      const yy = baseY + 8 - y;
      const wdt = Math.max(0, Math.round(half * (1 - y / (h * 2 + 3))));
      const jx = rng.int(-1, 1);
      for (let x = -wdt; x <= wdt; x++) px.push({ x: CX + x + jx, y: yy, c });
    }
  }
  px.push({ x: CX, y: 14, c: '#ffffff' });
  return px;
}

/* --------------------------------- nomes ---------------------------------- */

const NAMES: Record<ItemType, string[]> = {
  pocao: ['Elixir', 'Tônico', 'Essência', 'Filtro', 'Brebagem'],
  moeda: ['Pataca', 'Dobrão', 'Tostão', 'Real', 'Moeda'],
  gema: ['Pedra', 'Cristal', 'Joia', 'Relíquia', 'Fragmento'],
  bau: ['Baú', 'Arca', 'Cofre', 'Reserva', 'Tesouro'],
  chave: ['Chave', 'Passagem', 'Segredo', 'Acesso', ' Portal'.trim()],
  coracao: ['Coração', 'Vida', 'Pulso', 'Âmago', 'Fôlego'],
  cogumelo: ['Chapéu', 'Fungo', 'Boleto', 'Cogumelo', 'Esporo'],
  tocha: ['Tocha', 'Chama', 'Farol', 'Braseiro', 'Lume'],
};
const TITLES = ['Ancestral', 'Brilhante', 'Esquecido', 'Raro', 'Encantado'];

/* ---------------------------------- api ----------------------------------- */

export type ItemAction = 'idle' | 'brilho';

export function generateItem(
  seed: number, type: ItemType | 'random', st: StyleSpec, size: number, outline: boolean,
): ItemBuild {
  const rng = new Rng(seed);
  const t: ItemType = type === 'random' ? rng.pick(ITEM_TYPES).id : type;
  let px: Px[] = [];
  let extra = '';
  let traits: string[] = [];
  let flame: ((frame: number) => Px[]) | undefined;
  let body32: Px[] | undefined;
  switch (t) {
    case 'pocao': { const b = buildPotion(rng, st); px = b.px; extra = b.liquid; traits = b.traits; break; }
    case 'moeda': { const b = buildCoin(rng, st); px = b.px; traits = b.traits; break; }
    case 'gema': { const b = buildGem(rng, st); px = b.px; extra = b.gem; traits = b.traits; break; }
    case 'bau': { const b = buildChest(rng, st); px = b.px; traits = b.traits; break; }
    case 'chave': { const b = buildKey(rng, st); px = b.px; traits = b.traits; break; }
    case 'coracao': { const b = buildHeart(rng, st); px = b.px; traits = b.traits; break; }
    case 'cogumelo': { const b = buildMushroom(rng, st); px = b.px; extra = b.cap; traits = b.traits; break; }
    case 'tocha': {
      body32 = buildTorchBody(st);
      flame = (frame: number) => torchFlame(seed + frame * 131, st.ramp);
      px = [...body32, ...flame(0)];
      traits = ['Chama viva'];
      break;
    }
  }
  const label = ITEM_TYPES.find((i) => i.id === t)!.label;
  const k = size / 32;
  const sparkles: Array<[number, number]> = [[7, 8], [25, 7], [6, 24], [26, 23]].map(
    ([x, y]) => [Math.round(x * k), Math.round(y * k)] as [number, number],
  );
  return {
    type: t,
    cells: renderStatic(px, size, outline ? st.outline : null),
    w: size,
    h: size,
    palette: [st.metal, st.wood, st.accent, st.glow, ...(extra ? [extra] : [])],
    traits: [label, ...traits],
    name: `${rng.pick(NAMES[t])} ${rng.pick(TITLES)}`,
    sparkles,
    flame,
    body32,
  };
}

function plus(cells: string[], w: number, h: number, x: number, y: number, c: string) {
  const pts = [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
  for (const [px, py] of pts) {
    if (px >= 0 && py >= 0 && px < w && py < h) cells[py * w + px] = c;
  }
}

export function itemFrames(build: ItemBuild, action: ItemAction, n: number, outline: string | null): string[][] {
  const out: string[][] = [];
  const count = Math.max(1, n);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    let base = build.cells;
    // tocha: chama redesenhada por frame
    if (build.type === 'tocha' && build.flame && build.body32) {
      base = renderStatic([...build.body32, ...build.flame(i)], build.w, outline);
    }
    const bob = build.type === 'bau' ? 0 : -Math.round((Math.sin(t * Math.PI * 2) * 0.5 + 0.5) * 1.5);
    let cells = transformCells(base, build.w, build.h, {
      dx: 0, dy: bob, sx: 1, sy: 1, shear: 0, flash: false, dissolve: null,
    });
    if (action === 'brilho') {
      cells = [...cells];
      build.sparkles.forEach(([x, y], k) => {
        if ((i + k) % 2 === 0) plus(cells, build.w, build.h, x, y, '#ffffff');
      });
    }
    out.push(cells);
  }
  return out;
}
