import { beforeEach, describe, expect, it } from 'vitest';
import { useStudio } from '../../src/store/studio';
import { createLayer, makeFrame } from '../../src/lib/layers';
import { emptyCells } from '../../src/lib/pixels';
import { ProjectData } from '../../src/types';

function load() {
  const l = createLayer('pixels');
  const cells = emptyCells(3, 2); cells[0] = '#111';
  const f = makeFrame(l.id, cells);
  const p: ProjectData = { id: 'p', name: 'e5', width: 3, height: 2, layers: [l], frames: { [f.id]: f }, animations: [{ id: 'a', name: 'idle', fps: 8, frameIds: [f.id], playMode: 'loop' }], variations: [], palette: [], rig: [], createdAt: 0, updatedAt: 0 };
  useStudio.getState().loadProject(p);
}
const st = () => useStudio.getState();
const cel = () => { const s = st(); return s.project!.frames[s.currentFrameId!].cels[s.currentLayerId!]!; };
beforeEach(load);

describe('E5 store layers', () => {
  it('alpha lock protege transparência e permite pintar pixel existente', () => {
    const id = st().currentLayerId!;
    st().toggleLayerAlphaLock(id);
    st().paint([1], '#f00');
    st().paint([0], '#0f0');
    expect(cel()[1]).toBe('');
    expect(cel()[0]).toBe('#00ff00');
  });

  it('grupo cria filho e remoção do grupo remove a subárvore', () => {
    st().addGroup('Arte');
    const group = st().currentLayerId!;
    st().addLayer('Tinta');
    expect(st().project!.layers.find((l) => l.name === 'Tinta')?.parentId).toBe(group);
    st().selectLayer(group);
    st().deleteLayer(group);
    expect(st().project!.layers.some((l) => l.name === 'Arte' || l.name === 'Tinta')).toBe(false);
  });

  it('blend, clipping e parent têm undo', () => {
    const id = st().currentLayerId!;
    st().setLayerBlendMode(id, 'multiply');
    st().toggleLayerClipping(id);
    expect(st().project!.layers[0].blendMode).toBe('multiply');
    expect(st().project!.layers[0].clipping).toBe(true);
    expect(st().past.length).toBe(2);
    st().undo();
    expect(st().project!.layers[0].clipping).toBe(false);
  });

  it('visibilidade, lock e opacidade também são reversíveis', () => {
    const id = st().currentLayerId!;
    st().toggleLayerVis(id);
    expect(st().project!.layers[0].visible).toBe(false);
    st().undo();
    expect(st().project!.layers[0].visible).toBe(true);
    st().toggleLayerLock(id);
    st().setLayerOpacity(id, 40);
    expect(st().project!.layers[0].locked).toBe(true);
    expect(st().project!.layers[0].opacity).toBe(40);
    st().undo();
    expect(st().project!.layers[0].opacity).toBe(100);
    st().undo();
    expect(st().project!.layers[0].locked).toBe(false);
  });
});
