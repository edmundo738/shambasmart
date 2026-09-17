import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudio } from '../../src/store/studio';
import { createLayer, makeFrame, migrateProject } from '../../src/lib/layers';
import { emptyCells } from '../../src/lib/pixels';
import { ProjectData } from '../../src/types';

let now = 2_000_000;
vi.spyOn(Date, 'now').mockImplementation(() => now);
const tick = (ms = 2000) => { now += ms; };

function fixture(): ProjectData {
  const layer = createLayer('Linha');
  const mk = (color: string) => {
    const cells = emptyCells(4, 4);
    cells[0] = color;
    return makeFrame(layer.id, cells, 125);
  };
  const f0 = mk('#ff0000'), f1 = mk('#00ff00'), f2 = mk('#0000ff');
  return {
    id: 'pj', name: 't', width: 4, height: 4,
    layers: [layer],
    frames: { [f0.id]: f0, [f1.id]: f1, [f2.id]: f2 },
    animations: [{ id: 'an', name: 'idle', fps: 8, frameIds: [f0.id, f1.id, f2.id] }],
    variations: [], palette: [],
    createdAt: 0, updatedAt: 0,
  };
}

function load() {
  const project = fixture();
  tick();
  useStudio.setState({
    project, currentAnimationId: 'an', currentFrameId: project.animations[0].frameIds[1],
    currentLayerId: project.layers[0].id, selection: null,
    frameClipboard: null, past: [], future: [], dirty: false,
  });
  return project.animations[0].frameIds;
}

const st = () => useStudio.getState();
const anim = () => st().project!.animations[0];

beforeEach(() => { load(); });

describe('duração por frame', () => {
  it('setFrameDuration define + prende + desfaz', () => {
    const [f0] = load();
    st().setFrameDuration(f0, 250);
    expect(st().project!.frames[f0].durationMs).toBe(250);
    st().setFrameDuration(f0, 99999);
    expect(st().project!.frames[f0].durationMs).toBe(2000);
    st().undo(); // volta p/ 250
    expect(st().project!.frames[f0].durationMs).toBe(250);
    st().undo(); // volta p/ 125
    expect(st().project!.frames[f0].durationMs).toBe(125);
  });

  it('valor igual não empilha undo', () => {
    const [f0] = load();
    st().setFrameDuration(f0, 125);
    expect(st().past.length).toBe(0);
  });
});

describe('reordenar e navegar', () => {
  it('moveFrameTo reordena com 1 undo; mesmo lugar não empilha', () => {
    const [f0, f1, f2] = load();
    st().moveFrameTo(f0, 2);
    expect(anim().frameIds).toEqual([f1, f2, f0]);
    expect(st().past.length).toBe(1);
    st().moveFrameTo(f0, 2);
    expect(st().past.length).toBe(1);
    st().undo();
    expect(anim().frameIds).toEqual([f0, f1, f2]);
  });

  it('stepFrame circula nas duas direções', () => {
    const [f0, f1, f2] = load(); // atual = f1
    st().stepFrame(1);
    expect(st().currentFrameId).toBe(f2);
    st().stepFrame(1);
    expect(st().currentFrameId).toBe(f0);
    st().stepFrame(-1);
    expect(st().currentFrameId).toBe(f2);
  });
});

describe('copiar/recortar/colar', () => {
  it('copiar + colar insere clone após o atual (multi-colar OK)', () => {
    const [f0, f1] = load(); // atual = f1
    st().copyFrame(f0);
    expect(st().frameClipboard).toHaveLength(1);
    st().pasteFrame();
    const ids = anim().frameIds;
    expect(ids).toHaveLength(4);
    const pasted = st().project!.frames[st().currentFrameId!];
    expect(pasted.cels[st().currentLayerId!][0]).toBe('#ff0000');
    expect(pasted.durationMs).toBe(125);
    expect(ids.indexOf(st().currentFrameId!)).toBe(ids.indexOf(f1) + 1);
    // clipboard preservado: cola de novo com id novo
    const first = st().currentFrameId!;
    st().pasteFrame();
    expect(anim().frameIds).toHaveLength(5);
    expect(st().currentFrameId).not.toBe(first);
    st().undo();
    expect(anim().frameIds).toHaveLength(4);
  });

  it('recortar remove e seleciona o vizinho, com 1 undo', () => {
    const [f0, f1, f2] = load(); // atual = f1
    st().cutFrame(f1);
    expect(anim().frameIds).toEqual([f0, f2]);
    expect(st().currentFrameId).toBe(f2); // vizinho seguinte
    expect(st().frameClipboard![0].cels[st().currentLayerId!][0]).toBe('#00ff00');
    expect(st().past.length).toBe(1);
    st().undo();
    expect(anim().frameIds).toEqual([f0, f1, f2]);
  });

  it('excluir o atual seleciona o vizinho (não o 1º)', () => {
    const [f0, f1, f2] = load();
    st().deleteFrame(f1);
    expect(st().currentFrameId).toBe(f2);
    useStudio.setState({ currentFrameId: f2 });
    st().deleteFrame(f2);
    expect(st().currentFrameId).toBe(f0); // último -> novo último
  });
});

describe('FPS base carimba todos os frames', () => {
  it('setAnimFps define fps + durações com undo único', () => {
    const [f0, f1, f2] = load();
    tick();
    st().setAnimFps('an', 10);
    expect(anim().fps).toBe(10);
    for (const fid of [f0, f1, f2]) {
      expect(st().project!.frames[fid].durationMs).toBe(100);
    }
    st().undo();
    expect(anim().fps).toBe(8);
    for (const fid of [f0, f1, f2]) {
      expect(st().project!.frames[fid].durationMs).toBe(125);
    }
  });
});

describe('migração preenche durações', () => {
  it('legado sem durationMs herda o fps da ação; idempotente', () => {
    const legacy = JSON.parse(JSON.stringify(fixture())) as ProjectData;
    for (const f of Object.values(legacy.frames)) {
      delete (f as unknown as Record<string, unknown>).durationMs;
    }
    const once = migrateProject(legacy);
    for (const f of Object.values(once.frames)) {
      expect(f.durationMs).toBe(125); // fps 8 preservado
    }
    const twice = migrateProject(once);
    expect(twice).toBe(once); // sem mudança -> mesma referência
  });
});
