import { describe, expect, it } from 'vitest';
import {
  angleTo, boneDepth, boneDescendants, clonePose, distToSegment, normalizeDeg, snapWorldBone,
  solveFK, worldToLocal, wouldCycle,
} from '../../src/lib/fk';
import { Bone } from '../../src/types';

const bn = (id: string, parentId: string | null, x: number, y: number, rotation: number, length: number): Bone =>
  ({ id, name: id, parentId, x, y, rotation, length });
const r2 = (v: number) => Math.round(v * 100) / 100;

describe('solveFK', () => {
  it('raiz: junta=local, tip ao longo da rotação', () => {
    const [w] = solveFK([bn('a', null, 10, 20, 90, 5)]);
    expect([w.jx, w.jy]).toEqual([10, 20]);
    expect(w.worldRot).toBe(90);
    expect([w.tipX, w.tipY].map(r2)).toEqual([10, 25]); // 90° aponta +Y (para baixo no canvas)
    expect(w.depth).toBe(0);
    expect(w.broken).toBe(false);
  });

  it('filho herda posição+rotação do pai', () => {
    const bones = [bn('p', null, 0, 0, 90, 10), bn('c', 'p', 5, 0, 0, 4)];
    const [, c] = solveFK(bones);
    expect([c.jx, c.jy].map(r2)).toEqual([0, 5]); // offset (5,0) girado 90°
    expect(c.worldRot).toBe(90);
    expect(c.depth).toBe(1);
  });

  it('cadeia acumula rotações', () => {
    const bones = [bn('a', null, 0, 0, 45, 10), bn('b', 'a', 10, 0, 45, 10)];
    const [, b] = solveFK(bones);
    expect(b.worldRot).toBe(90);
    expect([b.jx, b.jy].map(r2)).toEqual([7.07, 7.07]);
  });

  it('pose esparsa sobrescreve o repouso', () => {
    const bones = [bn('a', null, 0, 0, 0, 10)];
    const [w] = solveFK(bones, { a: { x: 3, y: 4, rotation: 30 } });
    expect([w.jx, w.jy, w.worldRot]).toEqual([3, 4, 30]);
  });

  it('pai ausente vira raiz sem quebrar', () => {
    const [w] = solveFK([bn('a', 'fantasma', 7, 8, 0, 5)]);
    expect([w.jx, w.jy, w.depth]).toEqual([7, 8, 0]);
    expect(w.broken).toBe(false);
    expect(w.parentId).toBeNull();
  });

  it('auto-pai quebra o vínculo de forma determinística', () => {
    const [w] = solveFK([bn('a', 'a', 7, 8, 0, 5)]);
    expect(w.broken).toBe(true);
    expect([w.jx, w.jy]).toEqual([7, 8]);
  });

  it('ciclo A<->B resolve sem travar (primeiro vira raiz)', () => {
    const bones = [bn('a', 'b', 1, 0, 0, 4), bn('b', 'a', 2, 0, 0, 4)];
    const [a, b] = solveFK(bones);
    expect(a.broken).toBe(true);
    expect(b.broken).toBe(false);
    expect(b.depth).toBe(1);
  });

  it('ordem de entrada preservada mesmo com filho antes do pai', () => {
    const bones = [bn('c', 'p', 5, 0, 0, 4), bn('p', null, 0, 0, 0, 10)];
    const [c, p] = solveFK(bones);
    expect(c.id).toBe('c');
    expect(p.id).toBe('p');
    expect([c.jx, c.jy]).toEqual([5, 0]);
  });

  it('números inválidos viram 0 (nunca NaN)', () => {
    const bad = { id: 'a', name: 'a', parentId: null, x: NaN, y: Infinity, rotation: NaN, length: NaN } as unknown as Bone;
    const [w] = solveFK([bad]);
    expect([w.jx, w.jy, w.worldRot, w.length]).toEqual([0, 0, 0, 0]);
  });
});

describe('wouldCycle / boneDepth / boneDescendants', () => {
  const bones = [bn('a', null, 0, 0, 0, 5), bn('b', 'a', 5, 0, 0, 5), bn('c', 'b', 5, 0, 0, 5)];
  it('detecta ciclo, auto-pai e aceita nulo', () => {
    expect(wouldCycle(bones, 'a', 'c')).toBe(true);
    expect(wouldCycle(bones, 'b', 'b')).toBe(true);
    expect(wouldCycle(bones, 'c', null)).toBe(false);
    expect(wouldCycle(bones, 'c', 'a')).toBe(false);
  });

  it('profundidade e descendentes', () => {
    expect(boneDepth(bones, 'a')).toBe(0);
    expect(boneDepth(bones, 'c')).toBe(2);
    expect(boneDepth(bones, 'fantasma')).toBe(0);
    expect([...boneDescendants(bones, 'a')].sort()).toEqual(['b', 'c']);
    expect([...boneDescendants(bones, 'c')]).toEqual([]);
  });
});

describe('worldToLocal / angleTo / distToSegment', () => {
  it('roundtrip mundo->local->mundo', () => {
    const bones = [bn('p', null, 10, 10, 90, 10)];
    const local = worldToLocal(bones, undefined, 'p', 10, 15);
    expect(local).toEqual({ x: 5, y: 0 });
    const root = worldToLocal(bones, undefined, null, 3, 4);
    expect(root).toEqual({ x: 3, y: 4 });
  });

  it('angleTo em graus de canvas', () => {
    expect(angleTo(0, 0, 10, 0)).toBeCloseTo(0, 10);
    expect(angleTo(0, 0, 0, 10)).toBeCloseTo(90, 10);
  });

  it('distToSegment: sobre a linha, ponta e fora', () => {
    expect(distToSegment(5, 0, 0, 0, 10, 0)).toBe(0);
    expect(distToSegment(15, 0, 0, 0, 10, 0)).toBe(5);
    expect(distToSegment(5, 3, 0, 0, 10, 0)).toBe(3);
    expect(distToSegment(1, 1, 0, 0, 0, 0)).toBeCloseTo(Math.SQRT2, 10);
  });
});

describe('normalizeDeg / snap / clonePose', () => {
  it('normaliza p/ (-180, 180]', () => {
    expect(normalizeDeg(370)).toBe(10);
    expect(normalizeDeg(-190)).toBe(170);
    expect(normalizeDeg(180)).toBe(-180);
    expect(normalizeDeg(NaN)).toBe(0);
  });

  it('snapWorldBone arredonda junta e tip', () => {
    const [w] = solveFK([bn('a', null, 0, 0, 45, 10)]);
    const s = snapWorldBone(w);
    expect([s.tipX, s.tipY]).toEqual([7, 7]);
  });

  it('clonePose é profundo e preserva ausência', () => {
    const p = { a: { x: 1, y: 2, rotation: 3 } };
    const c = clonePose(p)!;
    expect(c).toEqual(p);
    expect(c.a).not.toBe(p.a);
    expect(clonePose(undefined)).toBeUndefined();
  });
});
