import { describe, expect, it } from 'vitest';
import {
  anchorOffset, clampCanvasSize, countOutside, flipCellsH, flipCellsV, flipHitboxH, flipHitboxV,
  flipHMap, flipSelH, flipVMap, mapAnchor, projectContentBounds, resizeCells, scaleCellsNN,
  scaleHitbox, scaleMap, scaleSel, transformPose, transformRest, translateHitbox, translateMap,
  translateSel,
} from '../../src/lib/canvas';
import { solveFK } from '../../src/lib/fk';
import { Bone, FramePose, ProjectData } from '../../src/types';

describe('clampCanvasSize', () => {
  it('prende em 1..512 e arredonda', () => {
    expect(clampCanvasSize(32.6)).toBe(33);
    expect(clampCanvasSize(0)).toBe(1);
    expect(clampCanvasSize(9999)).toBe(512);
    expect(clampCanvasSize(NaN)).toBe(32);
  });
});

describe('anchorOffset (numpad y-down)', () => {
  it('centro (5) divide o delta', () => {
    expect(anchorOffset(5, 32, 32, 64, 64)).toEqual({ dx: 16, dy: 16 });
    expect(anchorOffset(5, 64, 64, 32, 32)).toEqual({ dx: -16, dy: -16 });
  });
  it('cantos fixam o conteúdo', () => {
    expect(anchorOffset(7, 32, 32, 64, 64)).toEqual({ dx: 0, dy: 0 }); // topo-esq
    expect(anchorOffset(3, 32, 32, 64, 64)).toEqual({ dx: 32, dy: 32 }); // base-dir
    expect(anchorOffset(9, 32, 32, 64, 32)).toEqual({ dx: 32, dy: 0 }); // topo-dir
  });
  it('delta ímpar arredonda p/ cima no centro', () => {
    expect(anchorOffset(5, 32, 32, 33, 33)).toEqual({ dx: 1, dy: 1 });
  });
});

describe('resizeCells', () => {
  const cells = ['a', 'b', 'c', 'd']; // 2x2
  it('expande com a âncora deslocando o conteúdo', () => {
    expect(resizeCells(cells, 2, 2, 4, 4, 1, 1)).toEqual([
      '', '', '', '',
      '', 'a', 'b', '',
      '', 'c', 'd', '',
      '', '', '', '',
    ]);
  });
  it('encolhe cortando fora da janela', () => {
    expect(resizeCells(cells, 2, 2, 1, 1, 0, 0)).toEqual(['a']);
    expect(resizeCells(cells, 2, 2, 1, 1, -1, -1)).toEqual(['d']);
  });
});

describe('scaleCellsNN', () => {
  it('dobra cada pixel em bloco 2x2', () => {
    expect(scaleCellsNN(['a', 'b', 'c', 'd'], 2, 2, 4, 4)).toEqual([
      'a', 'a', 'b', 'b',
      'a', 'a', 'b', 'b',
      'c', 'c', 'd', 'd',
      'c', 'c', 'd', 'd',
    ]);
  });
  it('reduz pegando o topo-esquerda de cada bloco', () => {
    const big = scaleCellsNN(['a', 'b', 'c', 'd'], 2, 2, 4, 4);
    expect(scaleCellsNN(big, 4, 4, 2, 2)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('fatores não-uniformes e fracionários', () => {
    expect(scaleCellsNN(['a', 'b', 'c', 'd'], 2, 2, 4, 2)).toEqual(['a', 'a', 'b', 'b', 'c', 'c', 'd', 'd']);
    expect(scaleCellsNN(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'], 3, 3, 2, 2)).toEqual(['a', 'b', 'd', 'e']);
  });
});

describe('flipCells', () => {
  it('espelha H e V', () => {
    expect(flipCellsH(['a', 'b', 'c', 'd'], 2, 2)).toEqual(['b', 'a', 'd', 'c']);
    expect(flipCellsV(['a', 'b', 'c', 'd'], 2, 2)).toEqual(['c', 'd', 'a', 'b']);
  });
  it('flip duplo = identidade', () => {
    const cells = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(flipCellsH(flipCellsH(cells, 3, 2), 3, 2)).toEqual(cells);
    expect(flipCellsV(flipCellsV(cells, 3, 2), 3, 2)).toEqual(cells);
  });
});

function proj(celsByFrame: Record<string, string[]>, w = 8, h = 8): ProjectData {
  const frames: ProjectData['frames'] = {};
  for (const [fid, cels] of Object.entries(celsByFrame)) {
    frames[fid] = { id: fid, cels: { l1: cels }, durationMs: 100, anchors: [], hitbox: null };
  }
  return {
    id: 'p', name: 't', width: w, height: h,
    layers: [{ id: 'l1', name: 'L', visible: true, locked: false, opacity: 100 }],
    frames, animations: [], variations: [], palette: [], rig: [], createdAt: 0, updatedAt: 0,
  };
}

describe('projectContentBounds', () => {
  it('une frames e retorna null se vazio', () => {
    const e = new Array(64).fill('');
    const a = [...e]; a[3 * 8 + 2] = '#fff'; // (2,3)
    const b = [...e]; b[1 * 8 + 5] = '#fff'; // (5,1)
    expect(projectContentBounds(proj({ f1: a, f2: b }))).toEqual({ x: 2, y: 1, w: 4, h: 3 });
    expect(projectContentBounds(proj({ f1: e }))).toBeNull();
  });
});

describe('countOutside', () => {
  it('conta opacos fora do ret', () => {
    const cells = ['a', '', '', 'b', '', 'c', '', '', '']; // 3x3
    expect(countOutside(cells, 3, 3, { x: 0, y: 0, w: 2, h: 2 })).toBe(1); // só 'c' em (2,1)
  });
});

describe('metadados', () => {
  it('âncora: translate/scale/flip exatos', () => {
    const a = { id: 'a', name: 'p', x: 1, y: 2 };
    expect(mapAnchor(a, translateMap(2, 3))).toMatchObject({ x: 3, y: 5 });
    expect(mapAnchor(a, scaleMap(2, 3))).toMatchObject({ x: 2, y: 6 });
    expect(mapAnchor(a, flipHMap(8))).toMatchObject({ x: 6, y: 2 });
  });
  it('hitbox flipH: {x:1,w:2} em W=8 vira {x:5,w:2}', () => {
    expect(flipHitboxH({ x: 1, y: 2, w: 2, h: 2 }, 8)).toEqual({ x: 5, y: 2, w: 2, h: 2 });
    expect(flipHitboxV({ x: 1, y: 2, w: 2, h: 2 }, 8)).toEqual({ x: 1, y: 4, w: 2, h: 2 });
  });
  it('hitbox translate/scale', () => {
    expect(translateHitbox({ x: 1, y: 1, w: 2, h: 3 }, 2, -1)).toEqual({ x: 3, y: 0, w: 2, h: 3 });
    expect(scaleHitbox({ x: 1, y: 1, w: 2, h: 2 }, 2, 2)).toEqual({ x: 2, y: 2, w: 4, h: 4 });
  });
  it('seleção flip/translate/scale (inclusiva)', () => {
    expect(flipSelH({ x0: 1, y0: 2, x1: 2, y1: 3 }, 8)).toEqual({ x0: 5, y0: 2, x1: 6, y1: 3 });
    expect(translateSel({ x0: 1, y0: 1, x1: 2, y1: 2 }, -1, 1)).toEqual({ x0: 0, y0: 2, x1: 1, y1: 3 });
    expect(scaleSel({ x0: 1, y0: 1, x1: 2, y1: 2 }, 2, 2)).toEqual({ x0: 2, y0: 2, x1: 5, y1: 5 });
  });
});

const rig2: Bone[] = [
  { id: 'root', name: 'root', parentId: null, x: 1, y: 3, rotation: 0, length: 2 },
  { id: 'tip', name: 'tip', parentId: 'root', x: 2, y: 0, rotation: 0, length: 1 },
];

describe('transformRest', () => {
  it('translate desloca raiz, preserva filho local e comprimentos', () => {
    const out = transformRest(rig2, translateMap(10, -2));
    expect(out[0]).toMatchObject({ x: 11, y: 1, rotation: 0, length: 2 });
    expect(out[1]).toMatchObject({ x: 2, y: 0, rotation: 0, length: 1 });
  });
  it('flipH espelha posição e rotação (mundo preservado)', () => {
    const out = transformRest(rig2, flipHMap(8));
    expect(out[0].x).toBeCloseTo(6, 8);
    expect(out[0].rotation).toBeCloseTo(-180, 8); // +X vira -X (normalizado p/ -180)
    expect(out[0].length).toBeCloseTo(2, 8);
    const w = solveFK(out);
    expect(w[0].jx).toBeCloseTo(6, 8);
    expect(w[0].tipX).toBeCloseTo(4, 8); // tip antigo (3,3) -> (4,3)
  });
  it('scale uniforme multiplica posição e comprimento, mantém ângulo', () => {
    const out = transformRest(rig2, scaleMap(2, 2));
    expect(out[0]).toMatchObject({ x: 2, y: 6, rotation: 0, length: 4 });
    expect(out[1]).toMatchObject({ x: 4, y: 0, rotation: 0, length: 2 });
  });
  it('scale não-uniforme re-solve o ângulo (diagonal 45° + scale(2,1) = atan2(1,2))', () => {
    const diag: Bone[] = [{ id: 'd', name: 'd', parentId: null, x: 0, y: 0, rotation: 45, length: Math.SQRT2 }];
    const out = transformRest(diag, scaleMap(2, 1));
    expect(out[0].rotation).toBeCloseTo((Math.atan2(1, 2) * 180) / Math.PI, 8);
    expect(out[0].length).toBe(2.24); // sqrt(5), arredondado em 2 casas
  });
});

describe('transformPose', () => {
  const pose: FramePose = { tip: { x: 2, y: 0, rotation: 90 } };
  it('translate preserva locais do filho e a esparsidade', () => {
    const newRig = transformRest(rig2, translateMap(5, 5));
    const out = transformPose(rig2, newRig, pose, translateMap(5, 5));
    expect(Object.keys(out)).toEqual(['tip']);
    expect(out.tip.x).toBeCloseTo(2, 8);
    expect(out.tip.rotation).toBeCloseTo(90, 8);
  });
  it('flip preserva o MUNDO (junta nova = espelho da junta antiga)', () => {
    const map = flipHMap(8);
    const newRig = transformRest(rig2, map);
    const out = transformPose(rig2, newRig, pose, map);
    const oldW = solveFK(rig2, pose);
    const newW = solveFK(newRig, out);
    for (const w of oldW) {
      const n = newW.find((q) => q.id === w.id)!;
      const [ex, ey] = map(w.jx, w.jy);
      expect(n.jx).toBeCloseTo(ex, 8);
      expect(n.jy).toBeCloseTo(ey, 8);
    }
  });
  it('scale preserva o MUNDO', () => {
    const map = scaleMap(2, 3);
    const newRig = transformRest(rig2, map);
    const out = transformPose(rig2, newRig, pose, map);
    const oldW = solveFK(rig2, pose);
    const newW = solveFK(newRig, out);
    for (const w of oldW) {
      const n = newW.find((q) => q.id === w.id)!;
      const [ex, ey] = map(w.jx, w.jy);
      expect(n.jx).toBeCloseTo(ex, 6);
      expect(n.jy).toBeCloseTo(ey, 6);
    }
  });
  it('descendente de osso posado entra na pose (correção > esparsidade)', () => {
    const rig3: Bone[] = [...rig2, { id: 'leaf', name: 'leaf', parentId: 'tip', x: 1, y: 0, rotation: 0, length: 1 }];
    const newRig = transformRest(rig3, flipHMap(8));
    const out = transformPose(rig3, newRig, pose, flipHMap(8));
    expect(Object.keys(out).sort()).toEqual(['leaf', 'tip']);
  });
});
