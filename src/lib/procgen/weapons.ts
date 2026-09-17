import { Rng } from './rng';
import { Px, ell, rect, renderStatic } from './rig';
import { StyleSpec } from './styles';
import { transformCells } from './retarget';

export type WeaponType = 'espada' | 'adaga' | 'machado' | 'martelo' | 'cajado' | 'arco' | 'lanca';

export const WEAPON_TYPES: Array<{ id: WeaponType; label: string }> = [
  { id: 'espada', label: 'Espada' },
  { id: 'adaga', label: 'Adaga' },
  { id: 'machado', label: 'Machado' },
  { id: 'martelo', label: 'Martelo' },
  { id: 'cajado', label: 'Cajado' },
  { id: 'arco', label: 'Arco' },
  { id: 'lanca', label: 'Lança' },
];

export interface WeaponBuild {
  type: WeaponType;
  cells: string[];
  /** índices do metal (para o brilho varrer só a lâmina) */
  metal: number[];
  w: number;
  h: number;
  palette: string[];
  traits: string[];
  name: string;
}

const CX = 16;

/* ------------------------------ construtores ------------------------------ */

function buildBlade(
  rng: Rng, st: StyleSpec, long: boolean,
): { px: Px[]; metal: Px[]; traits: string[] } {
  const traits: string[] = [];
  const bladeLen = long ? 12 + rng.int(0, 6) : 6 + rng.int(0, 3);
  const hw = long ? rng.int(1, 2) : 1; // meia-largura
  const guardY = 20;
  const top = guardY - bladeLen;
  const px: Px[] = [];
  const metal: Px[] = [];
  const M = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    const r = rect(x0, y0, x1, y1, c);
    px.push(...r);
    metal.push(...r);
  };
  // lâmina
  M(CX - hw, top + 2, CX + hw - 1, guardY - 1, st.metal);
  // ponta
  const tip = rng.pick(['ponta', 'reta', 'ponta'] as const);
  if (tip === 'ponta') {
    M(CX - hw + 1, top, CX + hw - 2, top + 1, st.metal);
    if (hw >= 2) M(CX, top - 1, CX, top - 1, st.metalLight);
  } else {
    M(CX - hw, top, CX + hw - 1, top + 1, st.metal);
  }
  // fio de luz + canal central
  M(CX - hw, top + 2, CX - hw, guardY - 2, st.metalLight);
  if (hw >= 2 && rng.chance(0.7)) M(CX, top + 3, CX, guardY - 3, st.metalDark);
  if (rng.chance(0.4)) {
    px.push({ x: CX, y: top + 5, c: st.accent });
    traits.push('Lâmina rúnica');
  }
  // guarda
  const gw = hw + 2 + rng.int(0, 2);
  const gstyle = rng.pick(['reta', 'curva', 'caida'] as const);
  px.push(...rect(CX - gw, guardY, CX + gw - 1, guardY + 1, st.metalDark));
  if (gstyle === 'curva') {
    px.push({ x: CX - gw - 1, y: guardY - 1, c: st.metalDark }, { x: CX + gw, y: guardY - 1, c: st.metalDark });
  } else if (gstyle === 'caida') {
    px.push({ x: CX - gw - 1, y: guardY + 2, c: st.metalDark }, { x: CX + gw, y: guardY + 2, c: st.metalDark });
  }
  traits.push(gstyle === 'reta' ? 'Guarda reta' : gstyle === 'curva' ? 'Guarda curva' : 'Guarda caída');
  // gema
  if (rng.chance(0.6)) {
    const gem = rng.pick(['redonda', 'losango'] as const);
    if (gem === 'redonda') px.push(...rect(CX - 1, guardY - 1, CX, guardY, st.accent));
    else px.push({ x: CX - 1, y: guardY, c: st.accent }, { x: CX, y: guardY, c: st.accent }, { x: CX - 1, y: guardY - 1, c: st.glow });
    traits.push('Gema arcana');
  }
  // cabo + pomo
  const grip = 3 + rng.int(0, 2);
  px.push(...rect(CX - 1, guardY + 2, CX, guardY + 1 + grip, st.wood));
  if (rng.chance(0.6)) {
    for (let y = guardY + 3; y < guardY + grip; y += 2) px.push({ x: CX, y, c: st.accentDark });
    traits.push('Cabo enrolado');
  }
  const py = guardY + 2 + grip;
  if (rng.chance(0.7)) {
    px.push(...rect(CX - 1, py, CX, py, st.metalDark));
    if (rng.chance(0.4)) px.push({ x: CX - 1, y: py + 1, c: st.metalDark });
  }
  return { px, metal, traits };
}

function buildAxe(rng: Rng, st: StyleSpec): { px: Px[]; metal: Px[]; traits: string[] } {
  const traits: string[] = [];
  const px: Px[] = [];
  const metal: Px[] = [];
  const top = 9;
  const hw = 3 + rng.int(0, 2);
  px.push(...rect(CX - 1, top, CX, 27, st.wood));
  px.push(...rect(CX - 1, 26, CX, 27, st.woodDark));
  const M = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    const r = rect(x0, y0, x1, y1, c);
    px.push(...r);
    metal.push(...r);
  };
  const double = rng.chance(0.35);
  const sides = double ? [-1, 1] : [1];
  if (double) traits.push('Filo duplo');
  for (const s of sides) {
    const x0 = s === 1 ? CX + 1 : CX - hw;
    const x1 = s === 1 ? CX + hw : CX - 2;
    M(x0, top, x1, top + 5, st.metal);
    // fio
    const ex = s === 1 ? x1 : x0;
    M(ex, top, ex, top + 5, st.metalLight);
    if (rng.chance(0.5)) {
      // barba (gancho inferior)
      M(s === 1 ? x1 - 2 : x0, top + 6, s === 1 ? x1 : x0 + 2, top + 7, st.metal);
      traits.push('Barba de guerra');
    }
  }
  if (rng.chance(0.4)) {
    M(CX - 1, top - 2, CX, top - 1, st.metalDark);
    traits.push('Espeto superior');
  }
  if (rng.chance(0.5)) {
    px.push(...rect(CX - 1, top + 8, CX, top + 9, st.accentDark));
    traits.push('Faixa de batalha');
  }
  return { px, metal, traits };
}

function buildHammer(rng: Rng, st: StyleSpec): { px: Px[]; metal: Px[]; traits: string[] } {
  const traits: string[] = [];
  const px: Px[] = [];
  const metal: Px[] = [];
  const hw = 3 + rng.int(0, 2);
  const top = 8;
  px.push(...rect(CX - 1, top + 4, CX, 27, st.wood));
  const M = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    const r = rect(x0, y0, x1, y1, c);
    px.push(...r);
    metal.push(...r);
  };
  M(CX - hw, top, CX + hw - 1, top + 4, st.metal);
  M(CX - hw, top, CX - hw, top + 4, st.metalDark);
  M(CX + hw - 1, top, CX + hw - 1, top + 4, st.metalDark);
  M(CX - hw, top, CX + hw - 1, top, st.metalLight);
  px.push(...rect(CX - 1, top, CX, top + 4, st.accentDark));
  traits.push('Cabeça de guerra');
  if (rng.chance(0.45)) {
    M(CX - 1, top - 2, CX, top - 1, st.metal);
    traits.push('Espigão');
  }
  if (rng.chance(0.5)) {
    px.push(...rect(CX - 1, 22, CX, 24, st.accentDark));
    traits.push('Punho reforçado');
  }
  return { px, metal, traits };
}

function buildStaff(rng: Rng, st: StyleSpec): { px: Px[]; metal: Px[]; traits: string[] } {
  const traits: string[] = [];
  const px: Px[] = [];
  const top = 9;
  px.push(...rect(CX, top + 2, CX, 28, st.wood));
  if (rng.chance(0.6)) px.push({ x: CX - 1, y: 20, c: st.woodDark }, { x: CX - 1, y: 24, c: st.woodDark });
  const crown = rng.pick(['orbe', 'cristal', 'anel'] as const);
  if (crown === 'orbe') {
    const r = 2 + rng.int(0, 1);
    px.push(...ell(CX, top, r, r, st.accent));
    px.push(...ell(CX, top, r - 1, r - 1, st.glow));
    px.push({ x: CX - 1, y: top - 1, c: '#ffffff' });
    traits.push('Orbe de poder');
  } else if (crown === 'cristal') {
    px.push({ x: CX, y: top - 4, c: st.glow }, { x: CX, y: top - 3, c: st.accent });
    px.push(...rect(CX - 1, top - 2, CX + 1, top + 1, st.accent));
    px.push(...rect(CX - 1, top, CX, top + 1, st.accentDark));
    px.push({ x: CX, y: top + 2, c: st.accentDark });
    traits.push('Cristal focal');
  } else {
    px.push(...ell(CX, top, 3, 3, st.metal));
    const hole = ell(CX, top, 1, 1, '');
    const holeSet = new Set(hole.map((p) => `${p.x},${p.y}`));
    for (let i = px.length - 1; i >= 0; i--) {
      if (holeSet.has(`${px[i].x},${px[i].y}`) && px[i].c === st.metal) px.splice(i, 1);
    }
    px.push({ x: CX, y: top, c: st.glow });
    traits.push('Anel arcano');
  }
  px.push(...rect(CX - 1, top + 3, CX + 1, top + 4, st.metalDark));
  if (rng.chance(0.5)) {
    px.push({ x: CX - 1, y: 16, c: st.accent }, { x: CX + 1, y: 18, c: st.accent });
    traits.push('Runas gravadas');
  }
  return { px, metal: [], traits };
}

function buildBow(rng: Rng, st: StyleSpec): { px: Px[]; metal: Px[]; traits: string[] } {
  const traits: string[] = [];
  const px: Px[] = [];
  // arco curvo (abertura para a esquerda, corda reta)
  for (let y = 6; y <= 26; y++) {
    const t = (y - 16) / 10;
    const lx = CX + Math.round(5 * (1 - t * t));
    px.push({ x: lx, y, c: st.wood });
    if (y % 3 === 0) px.push({ x: lx - 1, y, c: st.woodDark });
  }
  px.push(...rect(CX - 2, 6, CX - 2, 26, st.metalLight)); // corda
  px.push(...rect(CX + 3, 15, CX + 4, 17, st.accentDark)); // punho
  traits.push('Curvatura élfica');
  if (rng.chance(0.6)) {
    // flecha engatilhada
    px.push(...rect(CX - 2, 16, CX + 6, 16, st.woodDark));
    px.push({ x: CX + 7, y: 16, c: st.metalLight }, { x: CX + 6, y: 15, c: st.metalLight });
    px.push({ x: CX - 3, y: 15, c: st.accent }, { x: CX - 3, y: 17, c: st.accent });
    traits.push('Flecha engatilhada');
  }
  if (rng.chance(0.4)) {
    px.push({ x: CX + 5, y: 6, c: st.accent }, { x: CX + 5, y: 26, c: st.accent });
    traits.push('Pontas ornamentadas');
  }
  return { px, metal: [], traits };
}

function buildSpear(rng: Rng, st: StyleSpec): { px: Px[]; metal: Px[]; traits: string[] } {
  const traits: string[] = [];
  const px: Px[] = [];
  const metal: Px[] = [];
  px.push(...rect(CX, 10, CX, 28, st.wood));
  px.push(...rect(CX - 1, 26, CX - 1, 28, st.woodDark));
  const head = rng.pick(['folha', 'diamante', 'farpa'] as const);
  const M = (x: number, y: number, c: string) => {
    px.push({ x, y, c });
    metal.push({ x, y, c });
  };
  if (head === 'folha') {
    for (let i = 0; i < 6; i++) {
      const wdt = i < 2 ? 0 : i < 4 ? 1 : 0;
      for (let dx = -wdt; dx <= wdt; dx++) M(CX + dx, 3 + i, dx === -wdt ? st.metalLight : st.metal);
    }
    traits.push('Ponta em folha');
  } else if (head === 'diamante') {
    const rows: Array<[number, number]> = [[0, 0], [-1, 1], [0, 1], [1, 1], [-1, 2], [0, 2], [1, 2], [0, 3]];
    for (const [dx, dy] of rows) M(CX + dx, 4 + dy, st.metal);
    M(CX - 1, 5, st.metalLight);
    traits.push('Ponta diamante');
  } else {
    for (let i = 0; i < 5; i++) M(CX, 3 + i, st.metal);
    M(CX - 1, 6, st.metal); M(CX + 1, 6, st.metal);
    M(CX - 1, 4, st.metalLight);
    traits.push('Ponta farpada');
  }
  px.push(...rect(CX - 1, 9, CX + 1, 10, st.metalDark));
  if (rng.chance(0.55)) {
    px.push({ x: CX - 2, y: 11, c: st.accent }, { x: CX - 2, y: 12, c: st.accent }, { x: CX + 2, y: 11, c: st.accent });
    traits.push('Estandarte de guerra');
  }
  return { px, metal, traits };
}

/* --------------------------------- nomes ---------------------------------- */

const NAMES: Record<WeaponType, string[]> = {
  espada: ['Alvorada', 'Juramento', 'Presa', 'Aurora', 'Sentença'],
  adaga: ['Sussurro', 'Espinho', 'Véu', 'Agulha', 'Noturna'],
  machado: ['Fendedor', 'Trovão', 'Carvalho', 'Rachador', 'Inverno'],
  martelo: ['Juízo', 'Montanha', 'Bigorna', 'Esmagador', 'Rugido'],
  cajado: ['Confluência', 'Horizonte', 'Raiz', 'Oráculo', 'Meridiano'],
  arco: ['Vento', 'Longínquo', 'Céu', 'Caçada', 'Estrela'],
  lanca: ['Aguilhão', 'Muralha', 'Ponta', 'Vanguarda', 'Cometa'],
};
const TITLES = ['Antiga', 'Rúnica', 'Sombria', 'Dourada', 'Veloz', 'Arcana'];

/* ---------------------------------- api ----------------------------------- */

export type WeaponAction = 'idle' | 'brilho';

export function generateWeapon(
  seed: number, type: WeaponType | 'random', st: StyleSpec, size: number, outline: boolean,
): WeaponBuild {
  const rng = new Rng(seed);
  const t: WeaponType = type === 'random' ? rng.pick(WEAPON_TYPES).id : type;
  let built: { px: Px[]; metal: Px[]; traits: string[] };
  switch (t) {
    case 'adaga': built = buildBlade(rng, st, false); break;
    case 'machado': built = buildAxe(rng, st); break;
    case 'martelo': built = buildHammer(rng, st); break;
    case 'cajado': built = buildStaff(rng, st); break;
    case 'arco': built = buildBow(rng, st); break;
    case 'lanca': built = buildSpear(rng, st); break;
    default: built = buildBlade(rng, st, true); break;
  }
  const label = WEAPON_TYPES.find((w) => w.id === t)!.label;
  const traits = [label, ...built.traits];
  const k = size / 32;
  const metalSet = new Set(built.metal.map((p) => `${Math.round(p.x * k)},${Math.round(p.y * k)}`));
  const cells = renderStatic(built.px, size, outline ? st.outline : null);
  const metal: number[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (cells[y * size + x] && metalSet.has(`${x},${y}`)) metal.push(y * size + x);
    }
  }
  return {
    type: t,
    cells,
    metal,
    w: size,
    h: size,
    palette: [st.metal, st.metalDark, st.metalLight, st.wood, st.accent, st.glow],
    traits,
    name: `${rng.pick(NAMES[t])} ${rng.pick(TITLES)}`,
  };
}

export function weaponFrames(build: WeaponBuild, action: WeaponAction, n: number): string[][] {
  const out: string[][] = [];
  const count = Math.max(1, n);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const bob = -Math.round((Math.sin(t * Math.PI * 2) * 0.5 + 0.5) * 1.5);
    let cells = transformCells(build.cells, build.w, build.h, {
      dx: 0, dy: bob, sx: 1, sy: 1, shear: 0, flash: false, dissolve: null,
    });
    if (action === 'brilho' && build.metal.length) {
      // faixa de luz varrendo a lâmina na diagonal, do topo à guarda
      let minV = Infinity;
      let maxV = -Infinity;
      for (const idx of build.metal) {
        const v = (idx % build.w) + Math.floor(idx / build.w) * 2;
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
      const center = minV - 4 + t * (maxV - minV + 8);
      cells = [...cells];
      for (const idx of build.metal) {
        const x = idx % build.w;
        const y = Math.floor(idx / build.w);
        const v = x + y * 2;
        if (v >= center && v < center + 3) cells[idx] = '#ffffff';
      }
    }
    out.push(cells);
  }
  return out;
}
