import { describe, expect, it } from 'vitest';
import { Frame, Layer, ProjectData } from '../../src/types';
import { emptyCells } from '../../src/lib/pixels';
import {
  celStack, compositeStack, createLayer, ensureFrameCels, flattenCells,
  frameItem, makeFrame, migrateProject,
} from '../../src/lib/layers';

function proj(layers: Layer[], frames: Record<string, Frame>): ProjectData {
  return {
    id: 'pj', name: 't', width: 4, height: 4, layers, frames,
    animations: [], variations: [], palette: [], createdAt: 0, updatedAt: 0,
  };
}

describe('createLayer / makeFrame', () => {
  it('defaults sensatos', () => {
    const l = createLayer('Fundo');
    expect(l.name).toBe('Fundo');
    expect(l.visible).toBe(true);
    expect(l.locked).toBe(false);
    expect(l.opacity).toBe(100);
    expect(l.id).toMatch(/^ly_/);
  });
  it('makeFrame ancora a cel na layer', () => {
    const cells = emptyCells(4, 4);
    cells[5] = '#fff';
    const f = makeFrame('ly_a', cells);
    expect(f.cels['ly_a'][5]).toBe('#fff');
  });
});

describe('compositeStack / flattenCells', () => {
  const bg = { ...createLayer('fundo'), id: 'bg' };
  const fg = { ...createLayer('frente'), id: 'fg' };
  const mk = (bgCells: string[], fgCells: string[]): Frame => ({ id: 'fr', cels: { bg: bgCells, fg: fgCells } });

  it('topo vence sobre o fundo', () => {
    const b = emptyCells(4, 4); b[0] = '#111';
    const f = emptyCells(4, 4); f[0] = '#fff';
    const p = proj([bg, fg], {});
    expect(flattenCells(p, mk(b, f))[0]).toBe('#fff');
    expect(flattenCells(p, mk(b, emptyCells(4, 4)))[0]).toBe('#111');
  });
  it('layer invisível é ignorada', () => {
    const b = emptyCells(4, 4); b[0] = '#111';
    const f = emptyCells(4, 4); f[0] = '#fff';
    const hidden = { ...fg, visible: false };
    const p = proj([bg, hidden], {});
    expect(flattenCells(p, mk(b, f))[0]).toBe('#111');
    expect(compositeStack(p, mk(b, f)).length).toBe(1);
  });
  it('cel ausente vale vazio (sem crash)', () => {
    const b = emptyCells(4, 4); b[3] = '#111';
    const p = proj([bg, fg], {});
    const out = flattenCells(p, { id: 'fr', cels: { bg: b } });
    expect(out[3]).toBe('#111');
    expect(out.filter(Boolean).length).toBe(1);
  });
  it('ordem do stack é fundo→topo', () => {
    const p = proj([bg, fg], {});
    const stack = compositeStack(p, { id: 'fr', cels: {} });
    expect(stack.map((s) => s.layer.id)).toEqual(['bg', 'fg']);
  });
  it('celStack/frameItem formatos de render', () => {
    const b = emptyCells(4, 4);
    const p = proj([bg, fg], {});
    const f = mk(b, emptyCells(4, 4));
    expect(celStack([bg, fg], f)).toEqual([
      { cells: b, opacity: 100 },
      { cells: f.cels.fg, opacity: 100 },
    ]);
    const item = frameItem([bg, fg], f);
    expect(item.id).toBe('fr');
    expect(item.layers.length).toBe(2);
    void p;
  });
});

describe('ensureFrameCels', () => {
  it('preenche cels faltantes sem tocar nas existentes', () => {
    const a = createLayer('a');
    const b = createLayer('b');
    const p = proj([a, b], {});
    const old = emptyCells(4, 4); old[1] = '#abc';
    const f = ensureFrameCels(p, { id: 'fr', cels: { [a.id]: old } });
    expect(f.cels[a.id][1]).toBe('#abc');
    expect(f.cels[b.id].length).toBe(16);
    expect(f.cels[b.id].filter(Boolean).length).toBe(0);
  });
  it('não clona quando já completo', () => {
    const a = createLayer('a');
    const p = proj([a], {});
    const f = { id: 'fr', cels: { [a.id]: emptyCells(4, 4) } };
    expect(ensureFrameCels(p, f)).toBe(f);
  });
});

describe('migrateProject', () => {
  it('projeto antigo ganha layer + cels', () => {
    const cells = emptyCells(4, 4); cells[2] = '#fff';
    const old = { id: 'pj', name: 't', width: 4, height: 4, frames: { fr1: { id: 'fr1', cells } }, animations: [], variations: [], palette: [], createdAt: 0, updatedAt: 0 };
    const m = migrateProject(old as unknown as ProjectData);
    expect(m.layers.length).toBe(1);
    expect(m.layers[0].name).toBe('Camada 1');
    expect(m.frames['fr1'].cels[m.layers[0].id][2]).toBe('#fff');
  });
  it('idempotente: migrar 2x não duplica', () => {
    const cells = emptyCells(4, 4);
    const old = { id: 'pj', name: 't', width: 4, height: 4, frames: { fr1: { id: 'fr1', cells } }, animations: [], variations: [], palette: [], createdAt: 0, updatedAt: 0 };
    const once = migrateProject(old as unknown as ProjectData);
    const twice = migrateProject(once);
    expect(twice).toBe(once);
    expect(twice.layers.length).toBe(1);
  });
  it('projeto novo passa intacto', () => {
    const l = createLayer('x');
    const p = proj([l], { fr1: { id: 'fr1', cels: { [l.id]: emptyCells(4, 4) }, durationMs: 100, anchors: [], hitbox: null } });
    expect(migrateProject(p)).toBe(p);
  });
});
