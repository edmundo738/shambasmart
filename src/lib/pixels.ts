/** Operações de desenho em grade de pixels */

import { SelRect } from '../types';

export function emptyCells(w: number, h: number): string[] {
  return new Array(w * h).fill('');
}

export function inBounds(x: number, y: number, w: number, h: number): boolean {
  return x >= 0 && y >= 0 && x < w && y < h;
}

export function idx(x: number, y: number, w: number): number {
  return y * w + x;
}

/** Linha de Bresenham */
export function linePoints(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0, y = y0;
  for (;;) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return pts;
}

export function rectPoints(
  x0: number, y0: number, x1: number, y1: number, filled: boolean,
): Array<[number, number]> {
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const pts: Array<[number, number]> = [];
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) {
      if (filled || x === xa || x === xb || y === ya || y === yb) pts.push([x, y]);
    }
  }
  return pts;
}

export function ellipsePoints(
  cx: number, cy: number, rx: number, ry: number, filled: boolean,
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  if (rx < 0 || ry < 0) return pts;
  const rxc = Math.max(rx, 0.5), ryc = Math.max(ry, 0.5);
  const inside = (x: number, y: number) =>
    ((x - cx) / rxc) ** 2 + ((y - cy) / ryc) ** 2 <= 1;
  const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!inside(x, y)) continue;
      if (filled) {
        pts.push([x, y]);
        continue;
      }
      // contorno = ponto cheio com ao menos um vizinho-4 fora (anel 1px conexo)
      if (!inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1)) {
        pts.push([x, y]);
      }
    }
  }
  return pts;
}

/** Flood fill — retorna índices alterados */
export function floodFill(
  cells: string[], w: number, h: number, sx: number, sy: number, color: string,
): number[] {
  if (!inBounds(sx, sy, w, h)) return [];
  const target = cells[idx(sx, sy, w)];
  if (target === color) return [];
  const changed: number[] = [];
  const stack: Array<[number, number]> = [[sx, sy]];
  const seen = new Set<number>();
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (!inBounds(x, y, w, h)) continue;
    const i = idx(x, y, w);
    if (seen.has(i) || cells[i] !== target) continue;
    seen.add(i);
    changed.push(i);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return changed;
}

/** Pincel quadrado centralizado */
export function brushIndices(cx: number, cy: number, size: number, w: number, h: number): number[] {
  const out: number[] = [];
  const half = Math.floor(size / 2);
  for (let y = cy - half; y < cy - half + size; y++) {
    for (let x = cx - half; x < cx - half + size; x++) {
      if (inBounds(x, y, w, h)) out.push(idx(x, y, w));
    }
  }
  return out;
}

/** Aplica espelhamento a um ponto, retornando todas as réplicas */
export function mirrorPoints(
  x: number, y: number, w: number, h: number, mx: boolean, my: boolean,
): Array<[number, number]> {
  const xs = mx ? [x, w - 1 - x] : [x];
  const ys = my ? [y, h - 1 - y] : [y];
  const out: Array<[number, number]> = [];
  for (const yy of ys) for (const xx of xs) out.push([xx, yy]);
  return out;
}

export interface PpStep {
  /** trilha atualizada (pontos considerados pintados no traço) */
  trail: Array<[number, number]>;
  /** pontos novos a pintar */
  paint: Array<[number, number]>;
  /** cantos a restaurar à cor original (pintados antes neste traço) */
  unpaint: Array<[number, number]>;
}

/**
 * Passo pixel-perfect estilo Aseprite, para pincel 1px sem espelho.
 * Se os dois últimos pontos + `next` formarem um canto perpendicular (L),
 * o canto sai da pintura (evita o "degrau duplo" das diagonais).
 * Puro e determinístico — o chamador restaura `unpaint` com a cor pré-traço.
 */
export function pixelPerfectStep(
  trail: Array<[number, number]>, next: [number, number],
): PpStep {
  const n = trail.length;
  if (!n) return { trail: [next], paint: [next], unpaint: [] };
  const last = trail[n - 1];
  if (last[0] === next[0] && last[1] === next[1]) {
    return { trail, paint: [], unpaint: [] };
  }
  if (n < 2) return { trail: [...trail, next], paint: [next], unpaint: [] };
  const prev = trail[n - 2];
  const dx1 = last[0] - prev[0];
  const dy1 = last[1] - prev[1];
  const dx2 = next[0] - last[0];
  const dy2 = next[1] - last[1];
  const unit1 = Math.abs(dx1) + Math.abs(dy1) === 1;
  const unit2 = Math.abs(dx2) + Math.abs(dy2) === 1;
  const perpendicular = dx1 * dx2 + dy1 * dy2 === 0;
  if (unit1 && unit2 && perpendicular) {
    return { trail: [...trail.slice(0, -1), next], paint: [next], unpaint: [last] };
  }
  return { trail: [...trail, next], paint: [next], unpaint: [] };
}

/**
 * Move o conteúdo de um retângulo: recorta na origem, cola deslocado (clipado).
 * Só pixels opacos colam — transparente não apaga o destino.
 * Puro: devolve novas células + novo retângulo lógico (pode sair do canvas).
 */
export function moveRect(
  cells: string[], w: number, h: number,
  rect: SelRect, dx: number, dy: number,
): { cells: string[]; rect: SelRect } {
  const x0 = Math.max(0, Math.min(rect.x0, rect.x1));
  const y0 = Math.max(0, Math.min(rect.y0, rect.y1));
  const x1 = Math.min(w - 1, Math.max(rect.x0, rect.x1));
  const y1 = Math.min(h - 1, Math.max(rect.y0, rect.y1));
  const out = [...cells];
  const floating: Array<{ x: number; y: number; c: string }> = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = out[y * w + x];
      if (c) floating.push({ x, y, c });
      out[y * w + x] = '';
    }
  }
  for (const { x, y, c } of floating) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = c;
  }
  return {
    cells: out,
    rect: { x0: rect.x0 + dx, y0: rect.y0 + dy, x1: rect.x1 + dx, y1: rect.y1 + dy },
  };
}

/** Conta cores usadas ordenadas por frequência */
export function countColors(cells: string[]): Array<{ color: string; count: number }> {
  const map = new Map<string, number>();
  for (const c of cells) {
    if (!c) continue;
    map.set(c, (map.get(c) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count);
}

/* ------------------------- E2: Brush Engine ------------------------- */

export type BrushStampShape = 'square' | 'circle';

/**
 * Carimbo do pincel na mesma caixa do brushIndices
 * (origem cx - floor(size/2), size×size).
 * Círculo = centros de célula dentro do raio, com bias -0.1 anti-canto:
 * 3px vira "plus" como nos editores (sem o bias seria um 3×3 cheio).
 */
export function brushStamp(
  cx: number, cy: number, size: number, shape: BrushStampShape, w: number, h: number,
): number[] {
  const s = Math.max(1, Math.round(size));
  const half = Math.floor(s / 2);
  const ox = cx - half, oy = cy - half;
  const out: number[] = [];
  if (shape === 'square') {
    for (let y = oy; y < oy + s; y++) {
      for (let x = ox; x < ox + s; x++) {
        if (inBounds(x, y, w, h)) out.push(idx(x, y, w));
      }
    }
    return out;
  }
  const r = s / 2 - 0.1;
  const ccx = ox + s / 2, ccy = oy + s / 2;
  for (let y = oy; y < oy + s; y++) {
    for (let x = ox; x < ox + s; x++) {
      const dx = x + 0.5 - ccx, dy = y + 0.5 - ccy;
      if (dx * dx + dy * dy > r * r) continue;
      if (inBounds(x, y, w, h)) out.push(idx(x, y, w));
    }
  }
  return out;
}

/** Carimbo custom: máscara centralizada no cursor (mesma convenção de origem). */
export function customStamp(
  cx: number, cy: number, mask: boolean[], mw: number, mh: number, w: number, h: number,
): number[] {
  const out: number[] = [];
  if (mw <= 0 || mh <= 0 || mask.length !== mw * mh) return out;
  const ox = cx - Math.floor(mw / 2), oy = cy - Math.floor(mh / 2);
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      if (!mask[y * mw + x]) continue;
      const px = ox + x, py = oy + y;
      if (inBounds(px, py, w, h)) out.push(idx(px, py, w));
    }
  }
  return out;
}

/**
 * Snap de ângulo p/ a ferramenta linha (Shift): endpoint em múltiplos de 45°,
 * alcance = hipotenusa arredondada (ponta acompanha o cursor nas diagonais).
 */
export function snapLineAngle(x0: number, y0: number, x1: number, y1: number): [number, number] {
  const dx = x1 - x0, dy = y1 - y0;
  if (!dx && !dy) return [x0, y0];
  const len = Math.round(Math.hypot(dx, dy));
  const k = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  const a = (k * Math.PI) / 4;
  return [x0 + Math.round(Math.cos(a) * len), y0 + Math.round(Math.sin(a) * len)];
}

/**
 * Retângulo arredondado: r=0 é idêntico a rectPoints; cantos cortados por
 * quarto de círculo simétrico (r=1 chanfra 1px por canto).
 */
export function roundedRectPoints(
  x0: number, y0: number, x1: number, y1: number, r: number, filled: boolean,
): Array<[number, number]> {
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const rad = Math.max(0, Math.min(Math.round(r), Math.floor(Math.min(xb - xa + 1, yb - ya + 1) / 2)));
  if (!rad) return rectPoints(xa, ya, xb, yb, filled);
  const cut = (x: number, y: number): boolean => {
    let i = -1, j = -1;
    if (x >= xa && x < xa + rad) i = x - xa;
    else if (x <= xb && x > xb - rad) i = xb - x;
    else return false;
    if (y >= ya && y < ya + rad) j = y - ya;
    else if (y <= yb && y > yb - rad) j = yb - y;
    else return false;
    return (rad - i) * (rad - i) + (rad - j) * (rad - j) > rad * rad;
  };
  const inside = (x: number, y: number): boolean => {
    if (x < xa || x > xb || y < ya || y > yb) return false;
    return !cut(x, y);
  };
  const pts: Array<[number, number]> = [];
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) {
      if (!inside(x, y)) continue;
      if (filled) {
        pts.push([x, y]);
        continue;
      }
      if (!inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1)) {
        pts.push([x, y]);
      }
    }
  }
  return pts;
}

/** Tamanho efetivo com pressão da caneta (mouse = inalterado). */
export function pressureSize(base: number, pressure: number, isPen: boolean): number {
  const b = Math.max(1, Math.round(base));
  if (!isPen || !(pressure > 0)) return b;
  const p = Math.max(0, Math.min(1, pressure));
  return Math.max(1, Math.round(b * (0.3 + 0.7 * p)));
}

/**
 * Normaliza extremidades de forma: square (Shift) = lado igual preservando o
 * quadrante do arrasto; center (Alt) = ponto inicial vira o centro.
 */
export function shapeEnds(
  x0: number, y0: number, x1: number, y1: number, square: boolean, center: boolean,
): [number, number, number, number] {
  let ax1 = x1, ay1 = y1;
  if (square) {
    const side = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    ax1 = x0 + (x1 < x0 ? -side : side);
    ay1 = y0 + (y1 < y0 ? -side : side);
  }
  if (center) {
    const rx = Math.abs(ax1 - x0), ry = Math.abs(ay1 - y0);
    return [x0 - rx, y0 - ry, x0 + rx, y0 + ry];
  }
  return [x0, y0, ax1, ay1];
}
