import { describe, expect, it } from 'vitest';
import {
  clampMs, durationsOf, fpsToMs, frameIndexAtTime, frameMs, moveIdTo, msToFps, totalDurationMs,
} from '../../src/lib/timeline';
import { Frame } from '../../src/types';

const fr = (id: string, durationMs: number): Frame => ({ id, cels: {}, durationMs });

describe('conversão fps/ms', () => {
  it('fpsToMs arredonda e prende aos limites', () => {
    expect(fpsToMs(8)).toBe(125);
    expect(fpsToMs(10)).toBe(100);
    expect(fpsToMs(1)).toBe(1000);
    expect(fpsToMs(60)).toBe(20); // 17ms -> mínimo do editor
    expect(fpsToMs(0)).toBe(1000);
  });

  it('msToFps inverte com arredondamento', () => {
    expect(msToFps(100)).toBe(10);
    expect(msToFps(125)).toBe(8);
    expect(msToFps(0)).toBe(1000);
  });

  it('clampMs saneia entradas estranhas', () => {
    expect(clampMs(NaN)).toBe(100);
    expect(clampMs(Infinity)).toBe(100);
    expect(clampMs(-5)).toBe(20);
    expect(clampMs(5000)).toBe(2000);
    expect(clampMs(33.6)).toBe(34);
  });

  it('frameMs tolera frame ausente', () => {
    expect(frameMs(undefined)).toBe(100);
    expect(frameMs(fr('a', 50))).toBe(50);
  });
});

describe('durações da ação', () => {
  const anim = { id: 'an', name: 'x', fps: 8, frameIds: ['a', 'b', 'missing'] };
  const frames = { a: fr('a', 100), b: fr('b', 200) };

  it('durationsOf preenche ausentes com o padrão', () => {
    expect(durationsOf(anim, frames)).toEqual([100, 200, 100]);
  });

  it('totalDurationMs soma na ordem', () => {
    expect(totalDurationMs(anim, frames)).toBe(400);
  });
});

describe('frameIndexAtTime', () => {
  const durs = [100, 100, 200];
  it('resolve o índice no instante t com loop', () => {
    expect(frameIndexAtTime(durs, 0)).toBe(0);
    expect(frameIndexAtTime(durs, 99)).toBe(0);
    expect(frameIndexAtTime(durs, 100)).toBe(1);
    expect(frameIndexAtTime(durs, 250)).toBe(2);
    expect(frameIndexAtTime(durs, 400)).toBe(0);
    expect(frameIndexAtTime(durs, 450)).toBe(0);
  });

  it('casos degenerados não quebram', () => {
    expect(frameIndexAtTime([], 50)).toBe(0);
    expect(frameIndexAtTime([0, 0], 10)).toBe(0);
    expect(frameIndexAtTime(durs, -1)).toBe(2);
  });
});

describe('moveIdTo', () => {
  it('move para o índice e prende nas bordas', () => {
    expect(moveIdTo(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a']);
    expect(moveIdTo(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
    expect(moveIdTo(['a', 'b', 'c'], 'b', 99)).toEqual(['a', 'c', 'b']);
    expect(moveIdTo(['a', 'b', 'c'], 'b', -5)).toEqual(['b', 'a', 'c']);
  });

  it('id desconhecido devolve cópia inalterada', () => {
    const ids = ['a', 'b'];
    const out = moveIdTo(ids, 'z', 0);
    expect(out).toEqual(ids);
    expect(out).not.toBe(ids);
  });
});
