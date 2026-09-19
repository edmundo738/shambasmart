import { beforeEach, describe, expect, it } from 'vitest';
import { useStudio } from '../../src/store/studio';
import { createLayer, makeFrame } from '../../src/lib/layers';
import { emptyCells } from '../../src/lib/pixels';
import { ProjectData } from '../../src/types';

function load() {
  const layer = createLayer('Pixels');
  const cells = emptyCells(6, 6);
  cells[1 * 6 + 1] = '#f00'; cells[1 * 6 + 2] = '#0f0'; cells[2 * 6 + 1] = '#00f';
  cells[5 * 6 + 5] = '#fff';
  const frame = makeFrame(layer.id, cells);
  const project: ProjectData = {
    id: 'e3', name: 'e3', width: 6, height: 6, layers: [layer], frames: { [frame.id]: frame },
    animations: [{ id: 'a', name: 'idle', fps: 8, frameIds: [frame.id], playMode: 'loop' }],
    variations: [], palette: [], rig: [], createdAt: 0, updatedAt: 0,
  };
  useStudio.getState().loadProject(project);
}
const st = () => useStudio.getState();
const cel = () => { const s = st(); return s.project!.frames[s.currentFrameId!].cels[s.currentLayerId!]!; };

beforeEach(load);

describe('E3 store — objeto e transformação', () => {
  it('Selecionar objeto pega apenas a ilha e mover é um undo único', () => {
    st().selectObjectAt(1, 1);
    expect(st().selectionMask?.filter(Boolean)).toHaveLength(3);
    st().moveSelection(2, 1);
    expect(cel()[2 * 6 + 3]).toBe('#f00');
    expect(cel()[1 * 6 + 1]).toBe('');
    expect(st().past).toHaveLength(1);
    st().undo();
    expect(cel()[1 * 6 + 1]).toBe('#f00');
  });

  it('rotaciona e escala nearest sem cores intermediárias', () => {
    st().selectObjectAt(1, 1);
    st().rotateSelection(true);
    const rotated = cel();
    expect(rotated[1 * 6 + 1]).toBe('#00f');
    expect(rotated[1 * 6 + 2]).toBe('#f00');
    st().scaleSelection(2);
    expect(cel().filter((c) => c).length).toBe(13); // + o pixel branco fora da seleção
    expect(cel().some((c) => c !== '' && !['#f00', '#0f0', '#00f', '#fff'].includes(c))).toBe(false);
  });

  it('setSelectionMask aceita seleção elíptica sem transformar pixels fora da máscara', () => {
    const m = new Array(36).fill(false); m[1 * 6 + 1] = true;
    st().setSelectionMask(m, 'ellipse');
    st().deleteSelection();
    expect(cel()[1 * 6 + 1]).toBe('');
    expect(cel()[1 * 6 + 2]).toBe('#0f0');
  });
});
