import { beforeEach, describe, expect, it } from 'vitest';
import { useStudio } from '../../src/store/studio';
import { createLayer, makeFrame, migrateProject } from '../../src/lib/layers';
import { emptyCells } from '../../src/lib/pixels';
import { ProjectData } from '../../src/types';

function fixture(): ProjectData {
  const layer = createLayer('Linha');
  const cells = emptyCells(4, 4);
  cells[0] = '#ff0000';
  cells[6] = '#00ff00'; // (2,1)
  const f = makeFrame(layer.id, cells, 125);
  return {
    id: 'pj', name: 't', width: 4, height: 4,
    layers: [layer], frames: { [f.id]: f },
    animations: [{ id: 'an', name: 'idle', fps: 8, frameIds: [f.id], playMode: 'loop' }],
    variations: [], palette: [],
    rig: [], createdAt: 0, updatedAt: 0,
  };
}

function load() {
  const project = fixture();
  useStudio.setState({
    project, currentAnimationId: 'an', currentFrameId: project.animations[0].frameIds[0],
    currentLayerId: project.layers[0].id, selection: null,
    frameClipboard: null, past: [], future: [], dirty: false,
  });
}

const st = () => useStudio.getState();
const frame = () => st().project!.frames[st().currentFrameId!];

beforeEach(() => { load(); });

describe('âncoras', () => {
  it('add centraliza e nomeia; undo remove', () => {
    st().addAnchor();
    st().addAnchor('mao');
    expect(frame().anchors.map((a) => a.name)).toEqual(['ponto_1', 'mao']);
    expect(frame().anchors[0]).toMatchObject({ x: 2, y: 2 });
    st().undo();
    expect(frame().anchors).toHaveLength(1);
  });

  it('addAnchorAt prende ao canvas', () => {
    st().addAnchorAt(99, -5);
    expect(frame().anchors[0]).toMatchObject({ x: 3, y: 0 });
  });

  it('rename/move/delete com undo; no-ops não empilham', () => {
    st().addAnchor();
    const id = frame().anchors[0].id;
    st().renameAnchor(id, '  pe ');
    expect(frame().anchors[0].name).toBe('pe');
    st().renameAnchor(id, '   ');
    expect(st().past.length).toBe(2);
    st().moveAnchor(id, 0, 0);
    expect(frame().anchors[0]).toMatchObject({ x: 0, y: 0 });
    st().moveAnchor(id, 0, 0);
    expect(st().past.length).toBe(3);
    st().moveAnchorLive(id, 1, 1);
    st().moveAnchorLive(id, 2, 2);
    expect(st().past.length).toBe(3);
    expect(frame().anchors[0]).toMatchObject({ x: 2, y: 2 });
    st().deleteAnchor(id);
    expect(frame().anchors).toHaveLength(0);
    st().undo();
    expect(frame().anchors).toHaveLength(1);
  });
});

describe('hitbox', () => {
  it('set normaliza; null limpa; igual não empilha', () => {
    st().setHitbox({ x: 0, y: 0, w: 0, h: 99 });
    expect(frame().hitbox).toEqual({ x: 0, y: 0, w: 1, h: 4 });
    st().setHitbox({ x: 0, y: 0, w: 1, h: 4 });
    expect(st().past.length).toBe(1);
    st().setHitbox(null);
    expect(frame().hitbox).toBeNull();
    st().undo();
    expect(frame().hitbox).toEqual({ x: 0, y: 0, w: 1, h: 4 });
  });

  it('autoFit usa a bbox do composto; vazio não empilha', () => {
    st().autoFitHitbox();
    expect(frame().hitbox).toEqual({ x: 0, y: 0, w: 3, h: 2 });
    expect(st().past.length).toBe(1);
    st().autoFitHitbox();
    expect(st().past.length).toBe(1);
    // esvazia o frame: auto-fit vira no-op
    useStudio.setState((s) => {
      const p = s.project!;
      const fid = s.currentFrameId!;
      const lid = p.layers[0].id;
      return {
        project: {
          ...p,
          frames: { ...p.frames, [fid]: { ...p.frames[fid], hitbox: null, cels: { [lid]: emptyCells(4, 4) } } },
        },
      };
    });
    st().autoFitHitbox();
    expect(frame().hitbox).toBeNull();
    expect(st().past.length).toBe(1);
  });
});

describe('clipboard carrega metadados', () => {
  it('copiar/colar preserva âncoras + hitbox no clone', () => {
    st().addAnchorAt(1, 1, 'pivo');
    st().setHitbox({ x: 0, y: 0, w: 2, h: 2 });
    const fid = st().currentFrameId!;
    st().copyFrame(fid);
    st().pasteFrame();
    const pasted = frame();
    expect(pasted.id).not.toBe(fid);
    expect(pasted.anchors).toEqual([{ id: expect.any(String), name: 'pivo', x: 1, y: 1 }]);
    expect(pasted.hitbox).toEqual({ x: 0, y: 0, w: 2, h: 2 });
  });
});

describe('migração preenche metadados', () => {
  it('legado ganha [] / null; sujo é saneado; idempotente', () => {
    const legacy = JSON.parse(JSON.stringify(fixture())) as ProjectData;
    const lf = Object.values(legacy.frames)[0] as unknown as Record<string, unknown>;
    delete lf.anchors;
    delete lf.hitbox;
    const once = migrateProject(legacy);
    const f1 = Object.values(once.frames)[0];
    expect(f1.anchors).toEqual([]);
    expect(f1.hitbox).toBeNull();

    const dirty = JSON.parse(JSON.stringify(fixture())) as ProjectData;
    const df = Object.values(dirty.frames)[0] as unknown as Record<string, unknown>;
    df.anchors = [{ id: '', name: '', x: 99, y: 99 }, null];
    df.hitbox = { x: 0, y: 0, w: 0, h: 0 };
    const clean = migrateProject(dirty);
    const f2 = Object.values(clean.frames)[0];
    expect(f2.anchors).toEqual([{ id: expect.any(String), name: 'ponto', x: 3, y: 3 }]);
    expect(f2.hitbox).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(migrateProject(clean)).toBe(clean);
  });
});
