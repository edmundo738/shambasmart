/**
 * Operações de canvas (E1+): redimensionar, cortar, dimensionar, espelhar.
 * 100% puras: recebem células/dimensões, devolvem novas. O store aplica com undo único.
 *
 * Convenção de âncora: teclado numérico com y-down (telas):
 *   7 8 9
 *   4 5 6
 *   1 2 3
 * 5 = centro (padrão).
 */
import { Bone, Cell, FrameAnchor, FrameHitbox, FramePose, ProjectData, SelRect } from '../types';
import { opaqueBBox } from './frameMeta';
import { angleTo, boneDescendants, normalizeDeg, solveFK, worldToLocal } from './fk';

export const CANVAS_MIN = 1;
export const CANVAS_MAX = 512;

export function clampCanvasSize(n: number): number {
  if (!Number.isFinite(n)) return 32;
  return Math.max(CANVAS_MIN, Math.min(CANVAS_MAX, Math.round(n)));
}

export type CanvasAnchor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Deslocamento (dx,dy) do conteúdo antigo dentro do novo buffer, dada a âncora. */
export function anchorOffset(
  anchor: CanvasAnchor, oldW: number, oldH: number, newW: number, newH: number,
): { dx: number; dy: number } {
  const col = anchor % 3; // 1->1 (esq), 2->2 (meio), 0->0 (dir)
  const ax = col === 1 ? 0 : col === 2 ? 0.5 : 1;
  const ay = anchor >= 7 ? 0 : anchor >= 4 ? 0.5 : 1;
  return { dx: Math.round((newW - oldW) * ax), dy: Math.round((newH - oldH) * ay) };
}

/** Recorta/expande o buffer: new[x,y] = old[x-dx, y-dy] ou transparente. */
export function resizeCells(
  cells: Cell[], oldW: number, oldH: number, newW: number, newH: number, dx: number, dy: number,
): Cell[] {
  const out: Cell[] = new Array(newW * newH).fill('');
  for (let y = 0; y < newH; y++) {
    const sy = y - dy;
    if (sy < 0 || sy >= oldH) continue;
    for (let x = 0; x < newW; x++) {
      const sx = x - dx;
      if (sx < 0 || sx >= oldW) continue;
      out[y * newW + x] = cells[sy * oldW + sx];
    }
  }
  return out;
}

/** Escala nearest-neighbor (pixel-crisp): fatores fracionários liberados. */
export function scaleCellsNN(
  cells: Cell[], oldW: number, oldH: number, newW: number, newH: number,
): Cell[] {
  const out: Cell[] = new Array(newW * newH);
  for (let y = 0; y < newH; y++) {
    const sy = Math.min(oldH - 1, Math.floor((y * oldH) / newH));
    for (let x = 0; x < newW; x++) {
      const sx = Math.min(oldW - 1, Math.floor((x * oldW) / newW));
      out[y * newW + x] = cells[sy * oldW + sx];
    }
  }
  return out;
}

export function flipCellsH(cells: Cell[], w: number, h: number): Cell[] {
  const out: Cell[] = new Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) out[y * w + x] = cells[y * w + (w - 1 - x)];
  }
  return out;
}

export function flipCellsV(cells: Cell[], w: number, h: number): Cell[] {
  const out: Cell[] = new Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) out[y * w + x] = cells[(h - 1 - y) * w + x];
  }
  return out;
}

/** União dos bboxes opacos de todos os frames × layers (null = projeto vazio). */
export function projectContentBounds(p: ProjectData): FrameHitbox | null {
  let x0 = p.width, y0 = p.height, x1 = -1, y1 = -1;
  for (const f of Object.values(p.frames)) {
    for (const l of p.layers) {
      const cel = f.cels[l.id];
      if (!cel) continue;
      const b = opaqueBBox(cel, p.width, p.height);
      if (!b) continue;
      if (b.x < x0) x0 = b.x;
      if (b.y < y0) y0 = b.y;
      if (b.x + b.w - 1 > x1) x1 = b.x + b.w - 1;
      if (b.y + b.h - 1 > y1) y1 = b.y + b.h - 1;
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Opaque fora de `rect` (coords do buffer atual) — avisa o que o corte destrói. */
export function countOutside(cells: Cell[], w: number, h: number, rect: FrameHitbox): number {
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!cells[y * w + x]) continue;
      if (x < rect.x || y < rect.y || x >= rect.x + rect.w || y >= rect.y + rect.h) n++;
    }
  }
  return n;
}

/* ------------------------- metadados (pontos e caixas) ------------------------- */

export type PointMap = (x: number, y: number) => [number, number];

export const translateMap = (dx: number, dy: number): PointMap => (x, y) => [x + dx, y + dy];
export const scaleMap = (sx: number, sy: number): PointMap => (x, y) => [x * sx, y * sy];
/** Espelho em coords de JUNTA (espaço contínuo): eixo no centro do buffer. */
export const flipHMap = (w: number): PointMap => (x, y) => [w - 1 - x, y];
export const flipVMap = (h: number): PointMap => (x, y) => [x, h - 1 - y];

export function mapAnchor(a: FrameAnchor, map: PointMap): FrameAnchor {
  const [x, y] = map(a.x, a.y);
  return { ...a, x: Math.round(x), y: Math.round(y) };
}

/* Caixas: regras exatas por operação (cantos inclusivos p/ flip/translate). */

export function translateHitbox(b: FrameHitbox, dx: number, dy: number): FrameHitbox {
  return { x: b.x + dx, y: b.y + dy, w: b.w, h: b.h };
}

export function scaleHitbox(b: FrameHitbox, sx: number, sy: number): FrameHitbox {
  return {
    x: Math.round(b.x * sx), y: Math.round(b.y * sy),
    w: Math.max(1, Math.round(b.w * sx)), h: Math.max(1, Math.round(b.h * sy)),
  };
}

export function flipHitboxH(b: FrameHitbox, w: number): FrameHitbox {
  return { x: w - (b.x + b.w), y: b.y, w: b.w, h: b.h };
}

export function flipHitboxV(b: FrameHitbox, h: number): FrameHitbox {
  return { x: b.x, y: h - (b.y + b.h), w: b.w, h: b.h };
}

export function translateSel(r: SelRect, dx: number, dy: number): SelRect {
  return { x0: r.x0 + dx, y0: r.y0 + dy, x1: r.x1 + dx, y1: r.y1 + dy };
}

export function scaleSel(r: SelRect, sx: number, sy: number): SelRect {
  const x0 = Math.round(r.x0 * sx), y0 = Math.round(r.y0 * sy);
  return {
    x0, y0,
    x1: x0 + Math.max(0, Math.round((r.x1 - r.x0 + 1) * sx) - 1),
    y1: y0 + Math.max(0, Math.round((r.y1 - r.y0 + 1) * sy) - 1),
  };
}

export function flipSelH(r: SelRect, w: number): SelRect {
  return { x0: w - 1 - r.x1, y0: r.y0, x1: w - 1 - r.x0, y1: r.y1 };
}

export function flipSelV(r: SelRect, h: number): SelRect {
  return { x0: r.x0, y0: h - 1 - r.y1, x1: r.x1, y1: h - 1 - r.y0 };
}

/* ------------------------- rig: re-solve FK no mundo novo ------------------------- */

const r2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * Re-solve dos locais de repouso após transformar o MUNDO por `map`
 * (afim: translate/flip/scale). Pais antes dos filhos; vínculo efetivo
 * (parentId resolvido pelo FK, à prova de ciclos).
 */
export function transformRest(rig: Bone[], map: PointMap): Bone[] {
  const world = new Map(solveFK(rig).map((w) => [w.id, w]));
  const order = [...rig].sort((a, b) => (world.get(a.id)?.depth ?? 0) - (world.get(b.id)?.depth ?? 0));
  const nJoint = new Map<string, [number, number]>();
  const nRot = new Map<string, number>();
  const out = new Map<string, Bone>();
  for (const b of order) {
    const w = world.get(b.id)!;
    const [jx, jy] = map(w.jx, w.jy);
    const [tx, ty] = map(w.tipX, w.tipY);
    const pid = w.parentId;
    const pj = pid ? nJoint.get(pid) : undefined;
    const pjx = pj?.[0] ?? 0, pjy = pj?.[1] ?? 0;
    const prot = pid ? (nRot.get(pid) ?? 0) : 0;
    const rad = (-prot * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const dx = jx - pjx, dy = jy - pjy;
    const wrot = angleTo(jx, jy, tx, ty);
    out.set(b.id, {
      ...b,
      x: r2(dx * cos - dy * sin),
      y: r2(dx * sin + dy * cos),
      rotation: normalizeDeg(wrot - prot),
      length: r2(Math.hypot(tx - jx, ty - jy)),
    });
    nJoint.set(b.id, [jx, jy]);
    nRot.set(b.id, wrot);
  }
  return rig.map((b) => out.get(b.id)!);
}

/**
 * Re-solve das poses: ossos da pose + descendentes (herdam mundo novo do pai).
 * Esparso: só reescreve o conjunto afetado; o resto continua no repouso novo.
 */
export function transformPose(rig: Bone[], newRig: Bone[], pose: FramePose, map: PointMap): FramePose {
  const oldW = solveFK(rig, pose);
  const affected = new Set<string>();
  for (const id of Object.keys(pose)) {
    affected.add(id);
    for (const d of boneDescendants(rig, id)) affected.add(d);
  }
  const order = oldW.filter((w) => affected.has(w.id)).sort((a, b) => a.depth - b.depth);
  const out: FramePose = {};
  for (const w of order) {
    const [jx, jy] = map(w.jx, w.jy);
    const [tx, ty] = map(w.tipX, w.tipY);
    const { x, y } = worldToLocal(newRig, out, w.parentId, jx, jy);
    const pw = w.parentId ? solveFK(newRig, out).find((q) => q.id === w.parentId) : undefined;
    out[w.id] = { x, y, rotation: normalizeDeg(angleTo(jx, jy, tx, ty) - (pw?.worldRot ?? 0)) };
  }
  return out;
}

/** Prende a seleção nos limites (monótono: preserva x0<=x1). */
export function clampSelRect(r: SelRect, w: number, h: number): SelRect {
  const cx = (v: number): number => Math.max(0, Math.min(w - 1, v));
  const cy = (v: number): number => Math.max(0, Math.min(h - 1, v));
  return { x0: cx(r.x0), y0: cy(r.y0), x1: cx(r.x1), y1: cy(r.y1) };
}
