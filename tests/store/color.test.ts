import { beforeEach, describe, expect, it } from 'vitest';
import { useStudio } from '../../src/store/studio';
import { createLayer, makeFrame } from '../../src/lib/layers';
import { emptyCells } from '../../src/lib/pixels';
import { ProjectData } from '../../src/types';

function load() {
  const layer = createLayer('Cor');
  const cells = emptyCells(3, 3); cells[1] = '#4f8fca'; cells[4] = '#ffffff';
  const frame = makeFrame(layer.id, cells);
  const p: ProjectData = {
    id: 'e4', name: 'e4', width: 3, height: 3, layers: [layer], frames: { [frame.id]: frame },
    animations: [{ id: 'a', name: 'idle', fps: 8, frameIds: [frame.id], playMode: 'loop' }],
    variations: [], palette: ['#4f8fca', '#ffffff'], rig: [], createdAt: 0, updatedAt: 0,
  };
  useStudio.getState().loadProject(p);
}
const st = () => useStudio.getState();
const cel = () => { const s = st(); return s.project!.frames[s.currentFrameId!].cels[s.currentLayerId!]!; };
beforeEach(load);

describe('E4 store — cor', () => {
  it('mantém cores principal e secundária independentes', () => {
    st().setColor('#ce1126');
    st().setSecondaryColor('#f9d616');
    expect(st().color).toBe('#ce1126');
    expect(st().secondaryColor).toBe('#f9d616');
    st().setPaletteSlot(0, '#171717');
    expect(st().project!.palette[0]).toBe('#171717');
  });

  it('adiciona uma rampa sem duplicar cores e desfaz numa transação', () => {
    st().addPaletteColors(['#000000', '#4f8fca', '#ffffff']);
    expect(st().project!.palette).toEqual(['#4f8fca', '#ffffff', '#000000']);
    expect(st().past).toHaveLength(1);
    st().undo();
    expect(st().project!.palette).toEqual(['#4f8fca', '#ffffff']);
  });

  it('sombreia apenas a máscara e regista as novas cores na paleta', () => {
    const mask = new Array(9).fill(false); mask[1] = true;
    st().setSelectionMask(mask, 'rect');
    st().shadeSelection(-0.12);
    expect(cel()[1]).not.toBe('#4f8fca');
    expect(cel()[4]).toBe('#ffffff');
    expect(st().project!.palette).toContain(cel()[1]);
    st().undo();
    expect(cel()[1]).toBe('#4f8fca');
  });
});
