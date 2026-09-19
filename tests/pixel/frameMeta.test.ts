import { describe, expect, it } from 'vitest';
import {
  clampAnchor, cloneFrameMeta, normalizeHitbox, opaqueBBox, pickAnchor, pointInHitbox,
} from '../../src/lib/frameMeta';
import { FrameAnchor, FrameHitbox } from '../../src/types';

const an = (x: number, y: number, id = 'a'): FrameAnchor => ({ id, name: id, x, y });

describe('clampAnchor', () => {
  it('prende e arredonda', () => {
    expect(clampAnchor(an(99, -3), 4, 4)).toMatchObject({ x: 3, y: 0 });
    expect(clampAnchor(an(1.6, 1.4), 4, 4)).toMatchObject({ x: 2, y: 1 });
    expect(clampAnchor(an(NaN, NaN), 4, 4)).toMatchObject({ x: 0, y: 0 });
  });
});

describe('normalizeHitbox', () => {
  it('inteiros, mínimo 1x1, contida no canvas', () => {
    expect(normalizeHitbox({ x: 1.7, y: 0, w: 0, h: -5 }, 4, 4)).toEqual({ x: 2, y: 0, w: 1, h: 1 });
    expect(normalizeHitbox({ x: 3, y: 3, w: 2, h: 2 }, 4, 4)).toEqual({ x: 2, y: 2, w: 2, h: 2 });
    expect(normalizeHitbox({ x: 0, y: 0, w: 99, h: 99 }, 4, 4)).toEqual({ x: 0, y: 0, w: 4, h: 4 });
  });
});

describe('opaqueBBox', () => {
  it('bbox exata dos opacos; null quando vazio', () => {
    const cells = Array.from({ length: 16 }, () => '');
    cells[0] = '#fff';
    cells[6] = '#fff'; // (2,1)
    expect(opaqueBBox(cells, 4, 4)).toEqual({ x: 0, y: 0, w: 3, h: 2 });
    expect(opaqueBBox(Array.from({ length: 16 }, () => ''), 4, 4)).toBeNull();
  });
});

describe('pointInHitbox', () => {
  const b: FrameHitbox = { x: 1, y: 1, w: 2, h: 2 };
  it('bordas: origem inclusiva, fim exclusivo', () => {
    expect(pointInHitbox(1, 1, b)).toBe(true);
    expect(pointInHitbox(2, 2, b)).toBe(true);
    expect(pointInHitbox(3, 2, b)).toBe(false);
    expect(pointInHitbox(0, 1, b)).toBe(false);
  });
});

describe('pickAnchor', () => {
  const list = [an(5, 5, 'a'), an(8, 5, 'b')];
  it('a mais próxima dentro do raio; null fora', () => {
    expect(pickAnchor(list, 6, 5)?.id).toBe('a');
    expect(pickAnchor(list, 8, 5)?.id).toBe('b');
    expect(pickAnchor(list, 0, 0)).toBeNull();
    expect(pickAnchor(list, 5, 5, 0)?.id).toBe('a');
  });
});

describe('cloneFrameMeta', () => {
  it('cópia profunda; indefinido vira vazio', () => {
    const src = { id: 'f', cels: {}, durationMs: 100, anchors: [an(1, 2)], hitbox: { x: 0, y: 0, w: 2, h: 2 } };
    const c = cloneFrameMeta(src);
    expect(c).toEqual({ anchors: [an(1, 2)], hitbox: { x: 0, y: 0, w: 2, h: 2 } });
    expect(c.anchors[0]).not.toBe(src.anchors[0]);
    expect(c.hitbox).not.toBe(src.hitbox);
    expect(cloneFrameMeta(undefined)).toEqual({ anchors: [], hitbox: null });
  });
});
