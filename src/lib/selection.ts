import { Cell, SelRect } from '../types';

/** Máscaras de seleção usam o mesmo buffer linear do canvas: O(N), sem objetos por pixel. */
export type SelectionMask = boolean[];

export function maskIndex(x: number, y: number, w: number): number {
  return y * w + x;
}

export function emptyMask(w: number, h: number): SelectionMask {
  return new Array(w * h).fill(false);
}

export function rectMask(w: number, h: number, rect: SelRect): SelectionMask {
  const out = emptyMask(w, h);
  const x0 = Math.max(0, Math.min(rect.x0, rect.x1));
  const y0 = Math.max(0, Math.min(rect.y0, rect.y1));
  const x1 = Math.min(w - 1, Math.max(rect.x0, rect.x1));
  const y1 = Math.min(h - 1, Math.max(rect.y0, rect.y1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out[maskIndex(x, y, w)] = true;
  return out;
}

/** Elipse rasterizada por centro de célula: seleção inclusiva, simétrica e determinística. */
export function ellipseMask(w: number, h: number, rect: SelRect): SelectionMask {
  const out = emptyMask(w, h);
  const x0 = Math.max(0, Math.min(rect.x0, rect.x1));
  const y0 = Math.max(0, Math.min(rect.y0, rect.y1));
  const x1 = Math.min(w - 1, Math.max(rect.x0, rect.x1));
  const y1 = Math.min(h - 1, Math.max(rect.y0, rect.y1));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const rx = Math.max(0.5, (x1 - x0 + 1) / 2), ry = Math.max(0.5, (y1 - y0 + 1) / 2);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = (x + 0.5 - (cx + 0.5)) / rx;
    const dy = (y + 0.5 - (cy + 0.5)) / ry;
    if (dx * dx + dy * dy <= 1 + 1e-9) out[maskIndex(x, y, w)] = true;
  }
  return out;
}

function insidePolygon(x: number, y: number, polygon: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    const crosses = (yi > y) !== (yj > y);
    if (crosses && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Laço fechado por regra even-odd; o ponto é amostrado no centro do pixel. */
export function lassoMask(w: number, h: number, polygon: Array<[number, number]>): SelectionMask {
  const out = emptyMask(w, h);
  if (polygon.length < 3) return out;
  let x0 = w - 1, y0 = h - 1, x1 = 0, y1 = 0;
  for (const [x, y] of polygon) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(w - 1, Math.ceil(x1)); y1 = Math.min(h - 1, Math.ceil(y1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (insidePolygon(x + 0.5, y + 0.5, polygon)) out[maskIndex(x, y, w)] = true;
  }
  return out;
}

/** Varinha: flood-fill exacto de cor (4-vizinhos), previsível e pixel-perfect. */
export function wandMask(cells: Cell[], w: number, h: number, sx: number, sy: number): SelectionMask {
  const out = emptyMask(w, h);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return out;
  const target = cells[maskIndex(sx, sy, w)] ?? '';
  const stack: Array<[number, number]> = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = maskIndex(x, y, w);
    if (out[i] || cells[i] !== target) continue;
    out[i] = true;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return out;
}

/** Object selection: só a ilha opaca tocada, nunca o fundo transparente inteiro. */
export function objectMask(cells: Cell[], w: number, h: number, sx: number, sy: number): SelectionMask {
  const out = emptyMask(w, h);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h || !cells[maskIndex(sx, sy, w)]) return out;
  const stack: Array<[number, number]> = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = maskIndex(x, y, w);
    if (out[i] || !cells[i]) continue;
    out[i] = true;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return out;
}

export function maskBounds(mask: SelectionMask, w: number, h: number): SelRect | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < mask.length && i < w * h; i++) if (mask[i]) {
    const x = i % w, y = Math.floor(i / w);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

export function pointInMask(mask: SelectionMask | null, x: number, y: number, w: number, h: number): boolean {
  return !!mask && x >= 0 && y >= 0 && x < w && y < h && !!mask[maskIndex(x, y, w)];
}

/** Move de seleção flutuante: limpa a origem uma vez, depois cola apenas opacos. */
export function moveMasked(
  cells: Cell[], w: number, h: number, mask: SelectionMask, dx: number, dy: number,
): { cells: Cell[]; mask: SelectionMask } {
  const out = [...cells];
  const floating: Array<[number, number, Cell]> = [];
  for (let i = 0; i < mask.length && i < w * h; i++) if (mask[i]) {
    const x = i % w, y = Math.floor(i / w);
    const c = out[i];
    out[i] = '';
    if (c) floating.push([x + dx, y + dy, c]);
  }
  const next = emptyMask(w, h);
  for (const [x, y, c] of floating) if (x >= 0 && y >= 0 && x < w && y < h) {
    out[maskIndex(x, y, w)] = c;
    next[maskIndex(x, y, w)] = true;
  }
  // Transparent selected cells still move the selection; retain them if in bounds.
  for (let i = 0; i < mask.length && i < w * h; i++) if (mask[i]) {
    const x = i % w + dx, y = Math.floor(i / w) + dy;
    if (x >= 0 && y >= 0 && x < w && y < h) next[maskIndex(x, y, w)] = true;
  }
  return { cells: out, mask: next };
}

function transformedMaskPixels(mask: SelectionMask, w: number, h: number, rect: SelRect, map: (x: number, y: number) => [number, number], outW: number, outH: number): SelectionMask {
  const out = emptyMask(w, h);
  const x0 = Math.min(rect.x0, rect.x1), y0 = Math.min(rect.y0, rect.y1);
  for (let y = y0; y <= Math.max(rect.y0, rect.y1); y++) for (let x = x0; x <= Math.max(rect.x0, rect.x1); x++) {
    if (!mask[maskIndex(x, y, w)]) continue;
    const [lx, ly] = map(x - x0, y - y0);
    const ox = x0 + lx, oy = y0 + ly;
    if (ox >= 0 && oy >= 0 && ox < w && oy < h && lx >= 0 && ly >= 0 && lx < outW && ly < outH) out[maskIndex(ox, oy, w)] = true;
  }
  return out;
}

/** Rotação ortogonal; nenhuma interpolação, nenhum blur. */
export function rotateMasked(
  cells: Cell[], w: number, h: number, mask: SelectionMask, rect: SelRect, clockwise = true,
): { cells: Cell[]; mask: SelectionMask; rect: SelRect } {
  const x0 = Math.min(rect.x0, rect.x1), y0 = Math.min(rect.y0, rect.y1);
  const bw = Math.abs(rect.x1 - rect.x0) + 1, bh = Math.abs(rect.y1 - rect.y0) + 1;
  const outCells = [...cells];
  for (let i = 0; i < mask.length && i < w * h; i++) if (mask[i]) outCells[i] = '';
  const nextMask = transformedMaskPixels(mask, w, h, rect,
    (x, y) => clockwise ? [bh - 1 - y, x] : [y, bw - 1 - x], bh, bw);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!nextMask[maskIndex(x, y, w)]) continue;
    const lx = x - x0, ly = y - y0;
    const sx = clockwise ? y0 + ly : x0 + (bw - 1 - ly);
    const sy = clockwise ? y0 + (bh - 1 - lx) : y0 + lx;
    if (sx >= 0 && sy >= 0 && sx < w && sy < h) outCells[maskIndex(x, y, w)] = cells[maskIndex(sx, sy, w)];
  }
  const nextRect = clockwise ? { x0, y0, x1: x0 + bh - 1, y1: y0 + bw - 1 } : { x0, y0, x1: x0 + bh - 1, y1: y0 + bw - 1 };
  return { cells: outCells, mask: nextMask, rect: nextRect };
}

/** Escala nearest-neighbor por caixa; factor=2 amplia, factor=0.5 reduz. */
export function scaleMasked(
  cells: Cell[], w: number, h: number, mask: SelectionMask, rect: SelRect, factor: number,
): { cells: Cell[]; mask: SelectionMask; rect: SelRect } {
  const f = Math.max(0.25, Math.min(8, factor));
  const x0 = Math.min(rect.x0, rect.x1), y0 = Math.min(rect.y0, rect.y1);
  const bw = Math.abs(rect.x1 - rect.x0) + 1, bh = Math.abs(rect.y1 - rect.y0) + 1;
  const nw = Math.max(1, Math.round(bw * f)), nh = Math.max(1, Math.round(bh * f));
  const out = [...cells];
  for (let i = 0; i < mask.length && i < w * h; i++) if (mask[i]) out[i] = '';
  const next = emptyMask(w, h);
  for (let oy = 0; oy < nh; oy++) for (let ox = 0; ox < nw; ox++) {
    const sx = Math.min(bw - 1, Math.floor(ox / f)), sy = Math.min(bh - 1, Math.floor(oy / f));
    const si = maskIndex(x0 + sx, y0 + sy, w);
    const tx = x0 + ox, ty = y0 + oy;
    if (!mask[si] || tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
    next[maskIndex(tx, ty, w)] = true;
    const c = cells[si];
    if (c) out[maskIndex(tx, ty, w)] = c;
  }
  return { cells: out, mask: next, rect: { x0, y0, x1: x0 + nw - 1, y1: y0 + nh - 1 } };
}
