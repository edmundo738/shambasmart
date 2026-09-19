import { describe, expect, it } from 'vitest';
import { emptyCells } from '../../src/lib/pixels';
import { canvasBlendMode, compositeStack, createGroup, createLayer, flattenCells, makeFrame, migrateProject } from '../../src/lib/layers';
import { Frame, Layer, ProjectData } from '../../src/types';

function project(layers: Layer[], frame: Frame): ProjectData {
  return { id: 'p', name: 'e5', width: 4, height: 2, layers, frames: { [frame.id]: frame }, animations: [], variations: [], palette: [], rig: [], createdAt: 0, updatedAt: 0 };
}

describe('E5 layer tree/compositor', () => {
  it('achata grupos sem desenhar o grupo e acumula opacidade', () => {
    const g = createGroup('Personagem'); g.id = 'g';
    const l = createLayer('Corpo', 50, 'g'); l.id = 'body';
    const f = makeFrame('body', ['#f00', '', '', '', '', '', '', '']);
    const stack = compositeStack(project([g, l], f), f);
    expect(stack.map((x) => x.layer.id)).toEqual(['body']);
    expect(stack[0].opacity).toBe(50);
  });

  it('clipping limita a layer à alfa da raster abaixo', () => {
    const base = createLayer('base'); base.id = 'base';
    const ink = createLayer('tinta'); ink.id = 'ink'; ink.clipping = true;
    const a = emptyCells(4, 2); a[0] = '#111';
    const b = emptyCells(4, 2); b[0] = '#fff'; b[1] = '#fff';
    const f = { ...makeFrame('base', a), cels: { base: a, ink: b } };
    const stack = compositeStack(project([base, ink], f), f);
    expect(stack[1].cells[0]).toBe('#fff');
    expect(stack[1].cells[1]).toBe('');
    expect(flattenCells(project([base, ink], f), f)[1]).toBe('');
  });

  it('mapeia blend modes para operações nativas sem inventar CSS', () => {
    expect(canvasBlendMode('normal')).toBe('source-over');
    expect(canvasBlendMode('multiply')).toBe('multiply');
    expect(canvasBlendMode('add')).toBe('lighter');
  });

  it('migra parentização legada e quebra ciclos sem perder a raster', () => {
    const g1 = createGroup('g1'); g1.id = 'g1'; g1.parentId = 'g2';
    const g2 = createGroup('g2'); g2.id = 'g2'; g2.parentId = 'g1';
    const a = createLayer('a', 100, 'g2'); a.id = 'a';
    const f = makeFrame('a', ['#fff', '', '', '', '', '', '', '']);
    const migrated = migrateProject(project([g1, g2, a], f));
    expect(migrated.layers.some((l) => l.id === 'g1' && l.parentId === null)).toBe(true);
    expect(compositeStack(migrated, f).map((x) => x.layer.id)).toContain('a');
    expect(migrateProject(migrated)).toBe(migrated);
  });
});
