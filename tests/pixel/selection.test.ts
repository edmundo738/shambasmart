import { describe, expect, it } from 'vitest';
import {
  ellipseMask, lassoMask, maskBounds, moveMasked, objectMask, rectMask, rotateMasked, scaleMasked, wandMask,
} from '../../src/lib/selection';

const grid = (w: number, h: number, fill = '') => Array.from({ length: w * h }, () => fill);
const coords = (m: boolean[], w: number) => m.flatMap((v, i) => v ? [[i % w, Math.floor(i / w)]] : []);

describe('selection masks', () => {
  it('retângulo e elipse têm bbox correto e elipse é simétrica', () => {
    const r = rectMask(7, 7, { x0: 1, y0: 2, x1: 4, y1: 5 });
    expect(maskBounds(r, 7, 7)).toEqual({ x0: 1, y0: 2, x1: 4, y1: 5 });
    const e = ellipseMask(7, 7, { x0: 1, y0: 1, x1: 5, y1: 5 });
    for (const [x, y] of coords(e, 7)) expect(e[y * 7 + (6 - x)]).toBe(true);
  });

  it('laço usa regra even-odd e não vaza do polígono', () => {
    const m = lassoMask(6, 6, [[1, 1], [4, 1], [4, 4], [1, 4]]);
    expect(m[2 * 6 + 2]).toBe(true);
    expect(m[0]).toBe(false);
    expect(maskBounds(m, 6, 6)).toEqual({ x0: 1, y0: 1, x1: 3, y1: 3 });
  });

  it('varinha é flood-fill exacto 4-conectado', () => {
    const c = grid(5, 3);
    c[0] = c[1] = c[5] = '#f00'; c[4] = '#f00';
    const m = wandMask(c, 5, 3, 0, 0);
    expect(m.filter(Boolean)).toHaveLength(3);
    expect(m[4]).toBe(false); // diagonal/isolado não entra
  });

  it('objeto não seleciona o fundo transparente', () => {
    const c = grid(4, 2); c[0] = c[1] = '#fff'; c[7] = '#0ff';
    expect(objectMask(c, 4, 2, 0, 0).filter(Boolean)).toHaveLength(2);
    expect(objectMask(c, 4, 2, 2, 1).filter(Boolean)).toHaveLength(0);
  });
});

describe('selection transforms', () => {
  it('move limpa a origem, preserva transparência do destino e desloca a máscara', () => {
    const c = grid(5, 3); c[1] = '#f00'; c[2] = '#0f0'; c[4] = '#00f';
    const m = rectMask(5, 3, { x0: 1, y0: 0, x1: 2, y1: 0 });
    const out = moveMasked(c, 5, 3, m, 1, 1);
    expect(out.cells[1]).toBe(''); expect(out.cells[2]).toBe('');
    expect(out.cells[7]).toBe('#f00'); expect(out.cells[8]).toBe('#0f0');
    expect(out.mask[7]).toBe(true); expect(out.mask[8]).toBe(true);
  });

  it('rotação 90 graus é ortogonal e mantém pixels sem blur', () => {
    const c = grid(6, 6); c[1 * 6 + 1] = '#f00'; c[1 * 6 + 2] = '#0f0'; c[2 * 6 + 1] = '#00f';
    const rect = { x0: 1, y0: 1, x1: 2, y1: 2 };
    const out = rotateMasked(c, 6, 6, rectMask(6, 6, rect), rect, true);
    expect(out.cells[1 * 6 + 1]).toBe('#00f');
    expect(out.cells[1 * 6 + 2]).toBe('#f00');
    expect(out.cells[2 * 6 + 2]).toBe('#0f0');
  });

  it('escala nearest mantém cluster e bbox determinístico', () => {
    const c = grid(8, 8); c[1 * 8 + 1] = '#abc'; c[1 * 8 + 2] = '#def';
    const rect = { x0: 1, y0: 1, x1: 2, y1: 1 };
    const out = scaleMasked(c, 8, 8, rectMask(8, 8, rect), rect, 2);
    expect(out.rect).toEqual({ x0: 1, y0: 1, x1: 4, y1: 2 });
    expect(out.cells[1 * 8 + 1]).toBe('#abc');
    expect(out.cells[1 * 8 + 2]).toBe('#abc');
    expect(out.cells[1 * 8 + 3]).toBe('#def');
    expect(out.cells[2 * 8 + 4]).toBe('#def');
  });
});
