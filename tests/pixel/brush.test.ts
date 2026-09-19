import { describe, expect, it } from 'vitest';
import {
  brushStamp, customStamp, ellipsePoints, pressureSize, rectPoints, roundedRectPoints,
  shapeEnds, snapLineAngle,
} from '../../src/lib/pixels';

/** Renderiza um conjunto de pontos como ASCII (█/·) no seu bbox. */
function ascii(pts: Array<[number, number]>): string[] {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const set = new Set(pts.map(([x, y]) => `${x},${y}`));
  const rows: string[] = [];
  for (let y = y0; y <= y1; y++) {
    let r = '';
    for (let x = x0; x <= x1; x++) r += set.has(`${x},${y}`) ? '█' : '·';
    rows.push(r);
  }
  return rows;
}

function stampPts(i: number[], w: number): Array<[number, number]> {
  return i.map((n) => [n % w, Math.floor(n / w)] as [number, number]);
}

function symmetricH(pts: Array<[number, number]>): boolean {
  const xs = pts.map((p) => p[0]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const set = new Set(pts.map(([x, y]) => `${x},${y}`));
  return pts.every(([x, y]) => set.has(`${2 * cx - x},${y}`));
}

describe('brushStamp quadrado', () => {
  it('1px = 1 célula; 3px = 3×3 cheio', () => {
    expect(brushStamp(5, 5, 1, 'square', 16, 16)).toHaveLength(1);
    expect(ascii(stampPts(brushStamp(5, 5, 3, 'square', 16, 16), 16))).toEqual(['███', '███', '███']);
  });
  it('par: caixa à direita/abaixo do cursor, cursor sempre incluído', () => {
    const pts = stampPts(brushStamp(5, 5, 2, 'square', 16, 16), 16);
    expect(ascii(pts)).toEqual(['██', '██']);
    expect(pts).toContainEqual([5, 5]);
  });
});

describe('brushStamp círculo', () => {
  it('retratos 1–5', () => {
    expect(ascii(stampPts(brushStamp(8, 8, 1, 'circle', 16, 16), 16))).toEqual(['█']);
    expect(ascii(stampPts(brushStamp(8, 8, 2, 'circle', 16, 16), 16))).toEqual(['██', '██']);
    expect(ascii(stampPts(brushStamp(8, 8, 3, 'circle', 16, 16), 16))).toEqual(['·█·', '███', '·█·']);
    expect(ascii(stampPts(brushStamp(8, 8, 4, 'circle', 16, 16), 16))).toEqual([
      '·██·', '████', '████', '·██·',
    ]);
    expect(ascii(stampPts(brushStamp(8, 8, 5, 'circle', 16, 16), 16))).toEqual([
      '·███·', '█████', '█████', '█████', '·███·',
    ]);
  });
  it('6px: 24 células, simétrico', () => {
    const pts = stampPts(brushStamp(8, 8, 6, 'circle', 16, 16), 16);
    expect(pts).toHaveLength(24);
    expect(symmetricH(pts)).toBe(true);
  });
  it('cursor sempre incluído e tudo dentro dos limites (1–8)', () => {
    for (let s = 1; s <= 8; s++) {
      for (const [cx, cy] of [[0, 0], [1, 7], [15, 15], [7, 3]] as Array<[number, number]>) {
        const pts = stampPts(brushStamp(cx, cy, s, 'circle', 16, 16), 16);
        expect(pts.length).toBeGreaterThan(0);
        if (cx >= 0 && cy >= 0) expect(pts).toContainEqual([cx, cy]);
        for (const [x, y] of pts) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThan(16);
          expect(y).toBeLessThan(16);
        }
      }
    }
  });
});

describe('customStamp', () => {
  it('máscara centralizada no cursor', () => {
    const plus = [false, true, false, true, true, true, false, true, false];
    const pts = stampPts(customStamp(5, 5, plus, 3, 3, 16, 16), 16);
    expect(pts).toHaveLength(5);
    expect(ascii(pts)).toEqual(['·█·', '███', '·█·']);
  });
  it('máscara inválida = vazio', () => {
    expect(customStamp(5, 5, [true], 2, 2, 16, 16)).toEqual([]);
    expect(customStamp(5, 5, [], 0, 0, 16, 16)).toEqual([]);
  });
});

describe('snapLineAngle', () => {
  it('eixos e diagonais exatos', () => {
    expect(snapLineAngle(0, 0, 10, 3)).toEqual([10, 0]);
    expect(snapLineAngle(0, 0, 3, 10)).toEqual([0, 10]);
    expect(snapLineAngle(0, 0, 10, 10)).toEqual([10, 10]);
    expect(snapLineAngle(5, 5, 5, 5)).toEqual([5, 5]);
  });
  it('diagonal acompanha o cursor (hipotenusa)', () => {
    expect(snapLineAngle(0, 0, 10, 9)).toEqual([9, 9]);
    expect(snapLineAngle(0, 0, -10, 1)).toEqual([-10, 0]);
  });
});

describe('roundedRectPoints', () => {
  it('r=0 é idêntico a rectPoints', () => {
    expect(roundedRectPoints(2, 1, 9, 6, 0, true)).toEqual(rectPoints(2, 1, 9, 6, true));
    expect(roundedRectPoints(2, 1, 9, 6, 0, false)).toEqual(rectPoints(2, 1, 9, 6, false));
  });
  it('8×6 r=2 corta 3px por canto', () => {
    expect(ascii(roundedRectPoints(0, 0, 7, 5, 2, true))).toEqual([
      '··████··',
      '·██████·',
      '████████',
      '████████',
      '·██████·',
      '··████··',
    ]);
  });
  it('anel ⊆ cheio e simétrico', () => {
    const full = new Set(roundedRectPoints(0, 0, 9, 7, 3, true).map(([x, y]) => `${x},${y}`));
    const ring = roundedRectPoints(0, 0, 9, 7, 3, false);
    expect(ring.length).toBeGreaterThan(0);
    for (const [x, y] of ring) expect(full.has(`${x},${y}`)).toBe(true);
    expect(symmetricH(ring)).toBe(true);
  });
});

describe('auditoria ellipsePoints', () => {
  it('círculo r=2: retrato 13px', () => {
    expect(ascii(ellipsePoints(5, 5, 2, 2, true))).toEqual([
      '··█··', '·███·', '█████', '·███·', '··█··',
    ]);
  });
  it('simetria H/V em centros .0 e .5', () => {
    for (const [cx, cy, rx, ry] of [[5, 5, 3, 2], [5.5, 4, 4, 2.5], [3, 6.5, 1.5, 3], [8, 8, 5, 5]] as Array<[number, number, number, number]>) {
      for (const filled of [true, false]) {
        const pts = ellipsePoints(cx, cy, rx, ry, filled);
        expect(pts.length).toBeGreaterThan(0);
        const set = new Set(pts.map(([x, y]) => `${x},${y}`));
        for (const [x, y] of pts) {
          expect(set.has(`${2 * cx - x},${y}`)).toBe(true);
          expect(set.has(`${x},${2 * cy - y}`)).toBe(true);
        }
      }
    }
  });
  it('anel ⊆ cheio', () => {
    const full = new Set(ellipsePoints(6, 6, 4, 3, true).map(([x, y]) => `${x},${y}`));
    for (const [x, y] of ellipsePoints(6, 6, 4, 3, false)) expect(full.has(`${x},${y}`)).toBe(true);
  });
});

describe('pressureSize', () => {
  it('mouse = base; caneta escala 30%–100%', () => {
    expect(pressureSize(4, 0.5, false)).toBe(4);
    expect(pressureSize(4, 1, true)).toBe(4);
    expect(pressureSize(4, 0, true)).toBe(4);
    expect(pressureSize(8, 0.5, true)).toBe(5); // 8*0.65=5.2
    expect(pressureSize(8, 0.01, true)).toBe(2); // mínimo útil
    expect(pressureSize(1, 0.01, true)).toBe(1); // nunca zera
  });
});

describe('shapeEnds', () => {
  it('livre passa direto; quadrado equaliza no quadrante do arrasto', () => {
    expect(shapeEnds(2, 2, 9, 5, false, false)).toEqual([2, 2, 9, 5]);
    expect(shapeEnds(2, 2, 9, 5, true, false)).toEqual([2, 2, 9, 9]);
    expect(shapeEnds(9, 9, 5, 7, true, false)).toEqual([9, 9, 5, 5]);
  });
  it('centro espelha os raios; quadrado+centro combina', () => {
    expect(shapeEnds(5, 5, 8, 6, false, true)).toEqual([2, 4, 8, 6]);
    expect(shapeEnds(5, 5, 8, 6, true, true)).toEqual([2, 2, 8, 8]);
  });
});
