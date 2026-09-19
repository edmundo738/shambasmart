import { beforeEach, describe, expect, it } from 'vitest';
import { useStudio } from '../../src/store/studio';
import { createLayer, makeFrame } from '../../src/lib/layers';
import { emptyCells } from '../../src/lib/pixels';
import { ProjectData } from '../../src/types';

function load() {
  const layer = createLayer('Linha');
  const f0 = makeFrame(layer.id, emptyCells(8, 8), 125);
  const project: ProjectData = {
    id: 'pj', name: 't', width: 8, height: 8,
    layers: [layer], frames: { [f0.id]: f0 },
    animations: [{ id: 'an', name: 'idle', fps: 8, frameIds: [f0.id], playMode: 'loop' }],
    variations: [], palette: [], rig: [], createdAt: 0, updatedAt: 0,
  };
  useStudio.setState({
    project, currentAnimationId: 'an', currentFrameId: f0.id,
    currentLayerId: project.layers[0].id, selection: null,
    brushShape: 'square', customBrush: null,
    past: [], future: [], dirty: false,
  });
}

const st = () => useStudio.getState();

beforeEach(() => { load(); });

describe('captureBrushFromSelection', () => {
  it('captura a máscara opaca e ativa o carimbo custom', () => {
    st().paint([0, 1, 8], '#ffffff'); // (0,0),(1,0),(0,1)
    st().setSelection({ x0: 0, y0: 0, x1: 1, y1: 1 });
    st().captureBrushFromSelection();
    expect(st().customBrush).toEqual({ w: 2, h: 2, mask: [true, true, true, false] });
    expect(st().brushShape).toBe('custom');
  });
  it('área vazia ou sem seleção = no-op', () => {
    st().setSelection({ x0: 0, y0: 0, x1: 1, y1: 1 });
    st().captureBrushFromSelection();
    expect(st().customBrush).toBeNull();
    expect(st().brushShape).toBe('square');
  });
  it('clearCustomBrush volta ao quadrado', () => {
    st().paint([0], '#ffffff');
    st().setSelection({ x0: 0, y0: 0, x1: 0, y1: 0 });
    st().captureBrushFromSelection();
    st().clearCustomBrush();
    expect(st().customBrush).toBeNull();
    expect(st().brushShape).toBe('square');
  });
});
