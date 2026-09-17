import { describe, expect, it } from 'vitest';
import {
  brushIndices, ellipsePoints, emptyCells, floodFill, idx, inBounds, linePoints,
  mirrorPoints, pixelPerfectStep, rectPoints,
} from '../../src/lib/pixels';

const adjacent = (a: [number, number], b: [number, number]) =>
  Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1;

describe('linePoints (Bresenham)', () => {
  it('ponto único', () => {
    expect(linePoints(3, 4, 3, 4)).toEqual([[3, 4]]);
  });
  it('horizontal inclui extremos', () => {
    expect(linePoints(0, 0, 4, 0)).toEqual([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
  });
  it('diagonal sem falhas (8-conectada)', () => {
    const pts = linePoints(0, 0, 9, 5);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[pts.length - 1]).toEqual([9, 5]);
    for (let i = 1; i < pts.length; i++) expect(adjacent(pts[i - 1], pts[i])).toBe(true);
  });
  it('íngreme sem falhas', () => {
    const pts = linePoints(2, 0, 4, 12);
    for (let i = 1; i < pts.length; i++) expect(adjacent(pts[i - 1], pts[i])).toBe(true);
  });
  it('interpolação de traço nunca deixa buraco', () => {
    // simula drag rápido: eventos distantes conectados por segmentos
    const events: Array<[number, number]> = [[0, 0], [7, 2], [3, 9]];
    const painted: Array<[number, number]> = [];
    for (let i = 1; i < events.length; i++) {
      painted.push(...linePoints(events[i - 1][0], events[i - 1][1], events[i][0], events[i][1]).slice(1));
    }
    const full: Array<[number, number]> = [events[0], ...painted];
    for (let i = 1; i < full.length; i++) expect(adjacent(full[i - 1], full[i])).toBe(true);
  });
});

describe('pixelPerfectStep', () => {
  it('primeiro ponto pinta', () => {
    const r = pixelPerfectStep([], [5, 5]);
    expect(r.paint).toEqual([[5, 5]]);
    expect(r.unpaint).toEqual([]);
  });
  it('ponto repetido não pinta', () => {
    const r = pixelPerfectStep([[5, 5]], [5, 5]);
    expect(r.paint).toEqual([]);
    expect(r.unpaint).toEqual([]);
  });
  it('reta não remove nada', () => {
    const r = pixelPerfectStep([[0, 0], [1, 0]], [2, 0]);
    expect(r.paint).toEqual([[2, 0]]);
    expect(r.unpaint).toEqual([]);
  });
  it('canto em L remove o canto (sem degrau duplo)', () => {
    const r = pixelPerfectStep([[0, 0], [1, 0]], [1, 1]);
    expect(r.paint).toEqual([[1, 1]]);
    expect(r.unpaint).toEqual([[1, 0]]);
    expect(r.trail).toEqual([[0, 0], [1, 1]]);
  });
  it('canto em L nas 4 rotações', () => {
    expect(pixelPerfectStep([[1, 1], [1, 0]], [2, 0]).unpaint).toEqual([[1, 0]]);
    expect(pixelPerfectStep([[2, 0], [1, 0]], [1, 1]).unpaint).toEqual([[1, 0]]);
    expect(pixelPerfectStep([[1, 1], [1, 2]], [0, 2]).unpaint).toEqual([[1, 2]]);
  });
  it('salto não-unitário não remove (só interpolado remove)', () => {
    const r = pixelPerfectStep([[0, 0], [1, 0]], [3, 2]);
    expect(r.unpaint).toEqual([]);
    expect(r.paint).toEqual([[3, 2]]);
  });
  it('diagonal pura (xadrez) não remove', () => {
    // (0,0)->(1,1) não é passo unitário ortogonal: mantém
    const r = pixelPerfectStep([[0, 0], [1, 1]], [2, 2]);
    expect(r.unpaint).toEqual([]);
  });
});

describe('floodFill', () => {
  it('preenche região contígua e respeita obstáculo', () => {
    const cells = emptyCells(5, 5);
    cells[idx(2, 2, 5)] = '#fff'; // obstáculo
    const changed = floodFill(cells, 5, 5, 0, 0, '#000');
    expect(changed.length).toBe(24);
    expect(changed).not.toContain(idx(2, 2, 5));
  });
  it('não faz nada se a cor é a mesma (sem undo vazio)', () => {
    const cells = emptyCells(4, 4);
    cells[idx(1, 1, 4)] = '#fff';
    expect(floodFill(cells, 4, 4, 1, 1, '#fff')).toEqual([]);
  });
  it('fora dos limites retorna vazio', () => {
    expect(floodFill(emptyCells(4, 4), 4, 4, 9, 9, '#fff')).toEqual([]);
  });
  it('preenche só a cor-alvo conectada', () => {
    const cells = emptyCells(4, 4);
    cells[idx(0, 0, 4)] = '#a';
    cells[idx(3, 3, 4)] = '#a'; // mesma cor, desconectado
    const changed = floodFill(cells, 4, 4, 0, 0, '#b');
    expect(changed).toEqual([idx(0, 0, 4)]);
  });
});

describe('mirrorPoints / brushIndices', () => {
  it('sem espelho retorna o próprio ponto', () => {
    expect(mirrorPoints(2, 3, 8, 8, false, false)).toEqual([[2, 3]]);
  });
  it('espelho duplo retorna 4 réplicas', () => {
    expect(mirrorPoints(1, 2, 8, 8, true, true)).toEqual([[1, 2], [6, 2], [1, 5], [6, 5]]);
  });
  it('pincel 1px = centro', () => {
    expect(brushIndices(3, 3, 1, 8, 8)).toEqual([idx(3, 3, 8)]);
  });
  it('pincel recorta nas bordas', () => {
    const out = brushIndices(0, 0, 3, 8, 8);
    expect(out.length).toBe(4); // só o quadrante visível
    for (const i of out) expect(i).toBeGreaterThanOrEqual(0);
  });
});

describe('rectPoints / ellipsePoints', () => {
  it('retângulo contorno vs preenchido', () => {
    expect(rectPoints(0, 0, 2, 2, false).length).toBe(8);
    expect(rectPoints(0, 0, 2, 2, true).length).toBe(9);
  });
  it('elipse gera pontos limitados ao raio', () => {
    const pts = ellipsePoints(8, 8, 4, 3, false);
    expect(pts.length).toBeGreaterThan(8);
    for (const [x, y] of pts) {
      expect(Math.abs(x - 8)).toBeLessThanOrEqual(5);
      expect(Math.abs(y - 8)).toBeLessThanOrEqual(4);
    }
    // anel conexo: todo ponto tem vizinho-8 no conjunto
    const set = new Set(pts.map(([x, y]) => `${x},${y}`));
    for (const [x, y] of pts) {
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx || dy) && set.has(`${x + dx},${y + dy}`)) neighbors++;
        }
      }
      expect(neighbors).toBeGreaterThan(0);
    }
  });
  it('elipse pequena não some (mínimo: os 4 topos)', () => {
    const pts = ellipsePoints(8, 8, 2, 1.5, false);
    expect(pts.length).toBeGreaterThanOrEqual(4);
  });
  it('inBounds', () => {
    expect(inBounds(0, 0, 8, 8)).toBe(true);
    expect(inBounds(8, 8, 8, 8)).toBe(false);
    expect(inBounds(-1, 0, 8, 8)).toBe(false);
  });
});
