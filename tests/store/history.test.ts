import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudio } from '../../src/store/studio';
import { createLayer, makeFrame } from '../../src/lib/layers';
import { emptyCells } from '../../src/lib/pixels';
import { ORIGINAL_VARIATION_ID, ProjectData } from '../../src/types';

let now = 1_000_000;
vi.spyOn(Date, 'now').mockImplementation(() => now);
const tick = (ms = 2000) => { now += ms; };

function fixture(): { project: ProjectData; frameId: string; layerId: string } {
  const layer = createLayer('Linha');
  const cells = emptyCells(4, 4);
  cells[0] = '#ff0000';
  cells[5] = '#00ff00';
  const frame = makeFrame(layer.id, cells);
  const project: ProjectData = {
    id: 'pj', name: 't', width: 4, height: 4,
    layers: [layer], frames: { [frame.id]: frame },
    animations: [{ id: 'an', name: 'idle', fps: 8, frameIds: [frame.id] }],
    variations: [], palette: ['#ff0000', '#00ff00'],
    createdAt: 0, updatedAt: 0,
  };
  return { project, frameId: frame.id, layerId: layer.id };
}

function load() {
  const { project, frameId, layerId } = fixture();
  tick();
  useStudio.setState({
    project, currentFrameId: frameId, currentLayerId: layerId,
    currentAnimationId: 'an', selection: null, past: [], future: [], dirty: false,
  });
  return { frameId, layerId };
}

const st = () => useStudio.getState();
const cel = () => st().project!.frames[st().currentFrameId!].cels[st().currentLayerId!]!;

beforeEach(() => { load(); });

describe('seleção: mover', () => {
  it('moveSelection desloca pixels + retângulo com 1 undo', () => {
    st().setSelection({ x0: 0, y0: 0, x1: 0, y1: 0 });
    st().moveSelection(1, 1);
    expect(cel()[0]).toBe('');
    expect(cel()[5]).toBe('#ff0000');
    expect(st().selection).toEqual({ x0: 1, y0: 1, x1: 1, y1: 1 });
    expect(st().past.length).toBe(1);
    st().undo();
    expect(cel()[0]).toBe('#ff0000'); // pixels restaurados
    expect(st().selection).toEqual({ x0: 1, y0: 1, x1: 1, y1: 1 }); // seleção é estado de vista
  });

  it('moveSelectionLive N× não empilha histórico (arrasto = 1 undo)', () => {
    st().setSelection({ x0: 0, y0: 0, x1: 0, y1: 0 });
    st().beginStroke();
    const pastLen = st().past.length;
    st().moveSelectionLive(1, 0);
    st().moveSelectionLive(0, 1);
    st().moveSelectionLive(1, 0);
    expect(st().past.length).toBe(pastLen);
    expect(cel()[0]).toBe('');
    expect(cel()[6]).toBe('#ff0000');
    st().undo();
    expect(cel()[0]).toBe('#ff0000');
    expect(cel()[6]).toBe('');
  });

  it('camada travada bloqueia mover e limpar', () => {
    useStudio.setState((s) => ({
      project: s.project ? {
        ...s.project,
        layers: s.project.layers.map((l) => ({ ...l, locked: true })),
      } : null,
    }));
    st().setSelection({ x0: 0, y0: 0, x1: 0, y1: 0 });
    const pastLen = st().past.length;
    st().moveSelection(1, 0);
    st().deleteSelection();
    expect(cel()[0]).toBe('#ff0000');
    expect(st().past.length).toBe(pastLen);
  });
});

describe('seleção: limpar', () => {
  it('deleteSelection limpa dentro e preserva fora, com undo', () => {
    st().setSelection({ x0: 0, y0: 0, x1: 0, y1: 0 });
    st().deleteSelection();
    expect(cel()[0]).toBe('');
    expect(cel()[5]).toBe('#00ff00');
    st().undo();
    expect(cel()[0]).toBe('#ff0000');
  });
});

describe('histórico: paleta e variações', () => {
  it('setPaletteSlot coalesce cliques rápidos em 1 entrada', () => {
    tick();
    st().setPaletteSlot(0, '#111111');
    const pastLen = st().past.length;
    st().setPaletteSlot(0, '#222222'); // mesma janela: sem nova entrada
    expect(st().past.length).toBe(pastLen);
    expect(st().project!.palette[0]).toBe('#222222');
    st().undo();
    expect(st().project!.palette[0]).toBe('#ff0000');
  });

  it('add/remove/loadPalette entram no undo', () => {
    tick();
    st().addPaletteColor('#123456');
    expect(st().project!.palette).toContain('#123456');
    st().undo();
    expect(st().project!.palette).not.toContain('#123456');
    st().redo();
    expect(st().project!.palette).toContain('#123456');
  });

  it('variações entram no undo; sliders coalescem', () => {
    tick();
    const id = st().addVariation('Grande');
    expect(st().project!.variations).toHaveLength(1);
    st().undo();
    expect(st().project!.variations).toHaveLength(0);
    st().redo();
    tick();
    st().updateVariation(id, { hue: 20 });
    const pastLen = st().past.length;
    st().updateVariation(id, { hue: 30 });
    expect(st().past.length).toBe(pastLen);
    expect(st().project!.variations[0].hue).toBe(30);
    tick();
    st().deleteVariation(id);
    expect(st().project!.variations).toHaveLength(0);
    st().undo();
    expect(st().project!.variations).toHaveLength(1);
  });

  it('renameAnimation entra no undo', () => {
    tick();
    st().renameAnimation('an', 'correr');
    expect(st().project!.animations[0].name).toBe('correr');
    st().undo();
    expect(st().project!.animations[0].name).toBe('idle');
    expect(st().project!.variations[0]).toBeUndefined();
    expect(st().variationId).toBe(ORIGINAL_VARIATION_ID);
  });
});
