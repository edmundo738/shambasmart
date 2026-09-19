import { beforeEach, describe, expect, it } from 'vitest';
import { useStudio } from '../../src/store/studio';
import { createLayer, makeFrame, migrateProject } from '../../src/lib/layers';
import { emptyCells } from '../../src/lib/pixels';
import { ProjectData } from '../../src/types';

function fixture(): ProjectData {
  const layer = createLayer('Linha');
  const f0 = makeFrame(layer.id, emptyCells(8, 8), 125);
  const f1 = makeFrame(layer.id, emptyCells(8, 8), 125);
  return {
    id: 'pj', name: 't', width: 8, height: 8,
    layers: [layer], frames: { [f0.id]: f0, [f1.id]: f1 },
    animations: [{ id: 'an', name: 'idle', fps: 8, frameIds: [f0.id, f1.id], playMode: 'loop' }],
    variations: [], palette: [], rig: [],
    createdAt: 0, updatedAt: 0,
  };
}

function load() {
  const project = fixture();
  useStudio.setState({
    project, currentAnimationId: 'an', currentFrameId: project.animations[0].frameIds[0],
    currentLayerId: project.layers[0].id, selection: null,
    frameClipboard: null, poseClipboard: null, selectedBoneId: null,
    past: [], future: [], dirty: false,
  });
  return project.animations[0].frameIds;
}

const st = () => useStudio.getState();
const rig = () => st().project!.rig;
const frame = () => st().project!.frames[st().currentFrameId!];

beforeEach(() => { load(); });

describe('estrutura do rig', () => {
  it('addBone cria raiz no centro e seleciona, com undo', () => {
    const id = st().addBone();
    expect(rig()).toHaveLength(1);
    expect(rig()[0]).toMatchObject({ id, parentId: null, x: 4, y: 4, rotation: 0, length: 12 });
    expect(st().selectedBoneId).toBe(id);
    st().undo();
    expect(rig()).toHaveLength(0);
  });

  it('addBone filho ancora no ponto com comprimento automático', () => {
    const pid = st().addBone();
    const cid = st().addBone(pid, { x: 7, y: 4 });
    const child = rig().find((b) => b.id === cid)!;
    expect(child.parentId).toBe(pid);
    expect({ x: child.x, y: child.y }).toEqual({ x: 3, y: 0 });
    expect(child.length).toBe(3);
    // pai fantasma -> vira raiz
    const oid = st().addBone('fantasma', { x: 1, y: 1 });
    expect(rig().find((b) => b.id === oid)!.parentId).toBeNull();
  });

  it('rename/delete com undo; filhos sobem; poses limpas em todos os frames', () => {
    const [f0, f1] = load();
    const a = st().addBone();
    const b = st().addBone(a, { x: 6, y: 4 });
    st().renameBone(b, 'braco');
    expect(rig().find((x) => x.id === b)!.name).toBe('braco');
    st().poseBone(b, { rotation: 45 });
    useStudio.setState({ currentFrameId: f1 });
    st().poseBone(b, { rotation: 90 });
    useStudio.setState({ currentFrameId: f0 });
    st().deleteBone(b);
    expect(rig().map((x) => x.id)).toEqual([a]);
    expect(frame().pose?.[b]).toBeUndefined();
    expect(st().project!.frames[f1].pose?.[b]).toBeUndefined();
    st().undo();
    expect(rig()).toHaveLength(2);
  });

  it('setBoneParent move e rejeita ciclo/auto-pai/fantasma', () => {
    const a = st().addBone();
    const b = st().addBone(a, { x: 6, y: 4 });
    st().setBoneParent(b, null);
    expect(rig().find((x) => x.id === b)!.parentId).toBeNull();
    st().setBoneParent(a, b);
    expect(rig().find((x) => x.id === a)!.parentId).toBe(b);
    const pastLen = st().past.length;
    st().setBoneParent(b, a); // ciclo
    st().setBoneParent(a, a); // auto
    st().setBoneParent(a, 'fantasma');
    expect(rig().find((x) => x.id === b)!.parentId).toBeNull();
    expect(st().past.length).toBe(pastLen);
  });

  it('setBoneRest saneia e não empilha no-op', () => {
    const a = st().addBone();
    st().setBoneRest(a, { length: 999, rotation: 370 });
    expect(rig()[0]).toMatchObject({ length: 512, rotation: 10 });
    st().setBoneRest(a, { length: -5 });
    expect(rig()[0].length).toBe(0);
    const pastLen = st().past.length;
    st().setBoneRest(a, { length: 0 });
    expect(st().past.length).toBe(pastLen);
  });
});

describe('poses por frame', () => {
  it('poseBone escreve esparso; voltar ao repouso remove a entrada', () => {
    const a = st().addBone();
    st().poseBone(a, { rotation: 45 });
    expect(frame().pose).toEqual({ [a]: { x: 4, y: 4, rotation: 45 } });
    st().poseBone(a, { rotation: 0 });
    expect(frame().pose).toEqual({});
    st().undo();
    expect(frame().pose).toEqual({ [a]: { x: 4, y: 4, rotation: 45 } });
  });

  it('poseBoneLive N× não empilha; osso desconhecido é no-op', () => {
    const a = st().addBone();
    const pastLen = st().past.length;
    st().poseBoneLive(a, { x: 5 });
    st().poseBoneLive(a, { x: 6 });
    expect(st().past.length).toBe(pastLen);
    expect(frame().pose?.[a]?.x).toBe(6);
    st().poseBone('fantasma', { x: 1 });
    expect(st().past.length).toBe(pastLen);
  });

  it('poseToRest copia pose p/ repouso e limpa a entrada', () => {
    const a = st().addBone();
    st().poseBone(a, { x: 6, rotation: 30 });
    st().poseToRest(a);
    expect(rig()[0]).toMatchObject({ x: 6, rotation: 30 });
    expect(frame().pose?.[a]).toBeUndefined();
    st().undo();
    expect(rig()[0]).toMatchObject({ x: 4, rotation: 0 });
  });

  it('resetPose limpa o frame; copiar/colar leva entre frames', () => {
    const [, f1] = load();
    const a = st().addBone();
    st().poseBone(a, { rotation: 45 });
    st().copyPose();
    useStudio.setState({ currentFrameId: f1 });
    st().pastePose();
    expect(frame().pose).toEqual({ [a]: { x: 4, y: 4, rotation: 45 } });
    st().resetPose();
    expect(frame().pose ?? {}).toEqual({});
    const pastLen = st().past.length;
    st().resetPose();
    expect(st().past.length).toBe(pastLen);
  });

  it('duplicar frame carrega a pose', () => {
    const [f0] = load();
    const a = st().addBone();
    st().poseBone(a, { rotation: 45 });
    st().duplicateFrame(f0);
    expect(frame().pose).toEqual({ [a]: { x: 4, y: 4, rotation: 45 } });
    expect(frame().id).not.toBe(f0);
  });
});

describe('migração do rig', () => {
  it('legado ganha []; sujo é saneado; idempotente', () => {
    const legacy = JSON.parse(JSON.stringify(fixture())) as ProjectData;
    delete (legacy as unknown as Record<string, unknown>).rig;
    const once = migrateProject(legacy);
    expect(once.rig).toEqual([]);

    const dirty = JSON.parse(JSON.stringify(fixture())) as ProjectData;
    (dirty as unknown as Record<string, unknown>).rig = [
      { id: 'b1', name: '', parentId: 42, x: NaN, y: 1, rotation: 0, length: -3 },
      null,
      { noId: true },
    ];
    const clean = migrateProject(dirty);
    expect(clean.rig).toEqual([
      { id: 'b1', name: 'osso', parentId: null, x: 0, y: 1, rotation: 0, length: 0 },
    ]);
    expect(migrateProject(clean)).toBe(clean);
  });
});
