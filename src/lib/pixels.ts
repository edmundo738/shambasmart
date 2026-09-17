/** Operações de desenho em grade de pixels */

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
