import { create } from 'zustand';
import {
  Animation, BlendMode, Bone, BonePose, Cell, Frame, FrameAnchor, FrameHitbox, FramePose, Layer, ORIGINAL_VARIATION_ID, PlayMode,
  ProjectData, SelRect, SelectionShape, ToolId, TransformMode, Variation, uid,
} from '../types';
import { emptyCells } from '../lib/pixels';
import {
  maskBounds, moveMasked, objectMask, rectMask, rotateMasked, scaleMasked, SelectionMask,
} from '../lib/selection';
import { clampMs, fpsToMs, frameMs, moveIdTo } from '../lib/timeline';
import { clampAnchor, cloneFrameMeta, normalizeHitbox, opaqueBBox } from '../lib/frameMeta';
import { clonePose, normalizeDeg, solveFK, worldToLocal, wouldCycle } from '../lib/fk';
import { createGroup, createLayer, flattenCells, makeFrame, migrateProject } from '../lib/layers';
import { normalizeHex } from '../lib/color';
import { DitherPattern, shadeColor } from '../lib/colorTools';
import { clampZoom } from '../lib/viewport';
import {
  anchorOffset, CanvasAnchor, clampCanvasSize, clampSelRect, flipCellsH, flipCellsV, flipHitboxH,
  flipHitboxV, flipHMap, flipSelH, flipSelV, flipVMap, mapAnchor, PointMap, projectContentBounds,
  resizeCells, scaleCellsNN, scaleHitbox, scaleMap, scaleSel, transformPose, transformRest,
  translateHitbox, translateMap, translateSel,
} from '../lib/canvas';
import { TEMPLATES } from '../lib/templates';

interface HistorySnap {
  frames: Record<string, Frame>;
  animations: Animation[];
  layers: Layer[];
  palette: string[];
  variations: Variation[];
  rig: Bone[];
}

function snap(project: ProjectData): HistorySnap {
  return {
    frames: JSON.parse(JSON.stringify(project.frames)),
    animations: JSON.parse(JSON.stringify(project.animations)),
    layers: JSON.parse(JSON.stringify(project.layers)),
    palette: [...project.palette],
    variations: JSON.parse(JSON.stringify(project.variations)),
    rig: JSON.parse(JSON.stringify(project.rig ?? [])),
  };
}

function restoreFrames(s: HistorySnap): Record<string, Frame> {
  return JSON.parse(JSON.stringify(s.frames));
}
function restoreAnims(s: HistorySnap): Animation[] {
  return JSON.parse(JSON.stringify(s.animations));
}
function restoreLayers(s: HistorySnap): Layer[] {
  return JSON.parse(JSON.stringify(s.layers));
}
function restorePalette(s: HistorySnap): string[] {
  return [...s.palette];
}
function restoreVariations(s: HistorySnap): Variation[] {
  return JSON.parse(JSON.stringify(s.variations));
}
function restoreRig(s: HistorySnap): Bone[] {
  return JSON.parse(JSON.stringify(s.rig ?? []));
}

interface StudioState {
  project: ProjectData | null;
  tool: ToolId;
  color: string;
  secondaryColor: string;
  ditherPattern: DitherPattern;
  ditherStrength: number;
  brushSize: number;
  pixelPerfect: boolean;
  mirrorX: boolean;
  mirrorY: boolean;
  showGrid: boolean;
  onionSkin: boolean;
  onionPrev: number;
  onionNext: number;
  onionOpacity: number;
  onionTintPrev: string;
  onionTintNext: string;
  zoom: number;
  playing: boolean;
  currentAnimationId: string | null;
  currentFrameId: string | null;
  currentLayerId: string | null;
  variationId: string;
  past: HistorySnap[];
  future: HistorySnap[];
  dirty: boolean;

  // projeto
  loadProject: (p: ProjectData) => void;
  newEmptyProject: (name: string, w: number, h: number) => void;
  projectFromTemplate: (name: string, templateId: string) => void;
  renameProject: (name: string) => void;
  markSaved: () => void;

  // seleção / ferramentas
  setTool: (t: ToolId) => void;
  setColor: (c: string) => void;
  setSecondaryColor: (c: string) => void;
  setDitherPattern: (pattern: DitherPattern) => void;
  setDitherStrength: (n: number) => void;
  setBrushSize: (n: number) => void;
  togglePixelPerfect: () => void;
  toggleMirrorX: () => void;
  toggleMirrorY: () => void;
  toggleGrid: () => void;
  toggleOnion: () => void;
  setOnionPrev: (n: number) => void;
  setOnionNext: (n: number) => void;
  setOnionOpacity: (n: number) => void;
  setOnionTintPrev: (c: string) => void;
  setOnionTintNext: (c: string) => void;
  setZoom: (z: number) => void;
  viewportRequest: { kind: 'fit' | 'z100' | 'z200'; n: number } | null;
  requestViewport: (kind: 'fit' | 'z100' | 'z200') => void;
  clearViewport: () => void;
  panHeld: boolean;
  setPanHeld: (b: boolean) => void;
  resizeCanvas: (w: number, h: number, anchor: CanvasAnchor) => void;
  trimCanvas: (padding: number) => void;
  scaleSprite: (w: number, h: number) => void;
  flipCanvas: (axis: 'h' | 'v') => void;
  canvasDialogOpen: boolean;
  setCanvasDialogOpen: (b: boolean) => void;
  showCanvasHandles: boolean;
  setShowCanvasHandles: (b: boolean) => void;
  gridSize: 1 | 2 | 4 | 8;
  setGridSize: (n: 1 | 2 | 4 | 8) => void;
  brushShape: 'square' | 'circle' | 'custom';
  setBrushShape: (s: 'square' | 'circle' | 'custom') => void;
  customBrush: { w: number; h: number; mask: boolean[] } | null;
  captureBrushFromSelection: () => void;
  clearCustomBrush: () => void;
  stabilizer: number;
  setStabilizer: (n: number) => void;
  pressureSize: boolean;
  togglePressureSize: () => void;
  rectFilled: boolean;
  toggleRectFilled: () => void;
  ellipseFilled: boolean;
  toggleEllipseFilled: () => void;
  cornerRadius: number;
  setCornerRadius: (n: number) => void;
  setPlaying: (b: boolean) => void;
  select: (animId: string | null, frameId?: string | null) => void;
  setVariation: (id: string) => void;

  // camadas
  selectLayer: (id: string) => void;
  addLayer: (name?: string, parentId?: string | null) => void;
  addGroup: (name?: string, parentId?: string | null) => void;
  renameLayer: (id: string, name: string) => void;
  deleteLayer: (id: string) => void;
  moveLayer: (id: string, dir: -1 | 1) => void;
  toggleLayerVis: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, mode: BlendMode) => void;
  toggleLayerAlphaLock: (id: string) => void;
  toggleLayerClipping: (id: string) => void;
  toggleLayerExpanded: (id: string) => void;
  setLayerParent: (id: string, parentId: string | null) => void;

  // seleção + transformação pixel-safe (E3)
  selection: SelRect | null;
  selectionMask: SelectionMask | null;
  selectionShape: SelectionShape;
  setSelection: (r: SelRect | null) => void;
  setSelectionMask: (mask: SelectionMask | null, shape?: SelectionShape) => void;
  setSelectionShape: (shape: SelectionShape) => void;
  moveSelection: (dx: number, dy: number) => void;
  moveSelectionLive: (dx: number, dy: number) => void;
  deleteSelection: () => void;
  rotateSelection: (clockwise: boolean) => void;
  scaleSelection: (factor: number) => void;
  selectObjectAt: (x: number, y: number) => void;
  pushObject: (dx: number, dy: number) => void;
  transformMode: TransformMode;
  setTransformMode: (mode: TransformMode) => void;

  // pintura
  beginStroke: () => void;
  paint: (indices: number[], color: string | null) => void;
  paintPatch: (patches: Array<[number, string]>) => void;
  drawShape: (indices: number[], color: string) => void;

  // frames
  addFrame: () => void;
  duplicateFrame: (id: string) => void;
  deleteFrame: (id: string) => void;
  moveFrame: (id: string, dir: -1 | 1) => void;
  moveFrameTo: (id: string, toIndex: number) => void;
  stepFrame: (dir: -1 | 1) => void;
  setFrameDuration: (id: string, ms: number) => void;
  frameClipboard: Frame[] | null;
  copyFrame: (id: string) => void;
  cutFrame: (id: string) => void;
  pasteFrame: () => void;

  // âncoras + hitbox (frame atual)
  addAnchor: (name?: string) => void;
  addAnchorAt: (x: number, y: number, name?: string) => void;
  renameAnchor: (anchorId: string, name: string) => void;
  moveAnchor: (anchorId: string, x: number, y: number) => void;
  moveAnchorLive: (anchorId: string, x: number, y: number) => void;
  deleteAnchor: (anchorId: string) => void;
  setHitbox: (box: FrameHitbox | null) => void;
  setHitboxLive: (box: FrameHitbox | null) => void;
  autoFitHitbox: () => void;
  showMeta: boolean;
  toggleShowMeta: () => void;

  // esqueleto (rig) + poses
  addBone: (parentId?: string | null, at?: { x: number; y: number }) => string;
  renameBone: (id: string, name: string) => void;
  deleteBone: (id: string) => void;
  setBoneParent: (id: string, parentId: string | null) => void;
  setBoneRest: (id: string, patch: Partial<{ x: number; y: number; rotation: number; length: number }>) => void;
  poseBone: (id: string, patch: Partial<BonePose>) => void;
  poseBoneLive: (id: string, patch: Partial<BonePose>) => void;
  poseToRest: (id: string) => void;
  resetPose: () => void;
  copyPose: () => void;
  pastePose: () => void;
  poseClipboard: FramePose | null;
  selectedBoneId: string | null;
  selectBone: (id: string | null) => void;
  showRig: boolean;
  toggleShowRig: () => void;
  clearFrame: (id: string) => void;

  // animações
  addAnimation: (name?: string) => void;
  renameAnimation: (id: string, name: string) => void;
  deleteAnimation: (id: string) => void;
  duplicateAnimation: (id: string) => void;
  addAnimationWithFrames: (name: string, fps: number, framesCells: string[][]) => void;
  setAnimFps: (id: string, fps: number) => void;
  setPlayMode: (id: string, mode: PlayMode) => void;

  // variações
  addVariation: (name?: string) => string;
  updateVariation: (id: string, patch: Partial<Variation>) => void;
  deleteVariation: (id: string) => void;
  autoVariations: () => void;

  // paleta
  setPaletteSlot: (i: number, color: string) => void;
  addPaletteColor: (color: string) => void;
  addPaletteColors: (colors: string[]) => void;
  removePaletteColor: (i: number) => void;
  shadeSelection: (amount: number) => void;
  loadPalette: (colors: string[]) => void;

  // histórico
  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 60;

/** Reaplica pixels + âncoras + hitbox + rig + seleção sob um remapeamento (undo único). */
function applyCanvasRemap(
  s: StudioState, p: ProjectData, newW: number, newH: number,
  celFn: (cells: Cell[]) => Cell[], pointMap: PointMap,
  hbFn: (b: FrameHitbox) => FrameHitbox, selFn: (r: SelRect) => SelRect,
): Partial<StudioState> {
  const hist = pushHistory(s);
  const rig = p.rig ?? [];
  const newRig = transformRest(rig, pointMap);
  const frames: Record<string, Frame> = {};
  for (const [fid, f] of Object.entries(p.frames)) {
    const cels: Record<string, Cell[]> = {};
    for (const l of p.layers) cels[l.id] = celFn(f.cels[l.id] ?? emptyCells(p.width, p.height));
    frames[fid] = {
      ...f,
      cels,
      anchors: f.anchors.map((a) => mapAnchor(a, pointMap)),
      hitbox: f.hitbox ? hbFn(f.hitbox) : null,
      pose: f.pose ? transformPose(rig, newRig, f.pose, pointMap) : undefined,
    };
    if (!frames[fid].pose) delete frames[fid].pose;
  }
  return {
    ...hist,
    project: { ...p, width: newW, height: newH, frames, rig: newRig, updatedAt: Date.now() },
    selection: s.selection ? clampSelRect(selFn(s.selection), newW, newH) : null,
    // remapeamentos de canvas mudam o buffer; a seleção é vista, não é dado persistido.
    selectionMask: null,
    selectionShape: 'rect',
  };
}

function pushHistory(state: StudioState): Partial<StudioState> {
  if (!state.project) return {};
  const past = [...state.past, snap(state.project)];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { past, future: [], dirty: true };
}

let lastLiveHist = 0;
/** Histórico coalescido p/ controles contínuos (cor, variação, FPS): 1 entrada por janela. */
function pushHistoryLive(s: StudioState, windowMs = 1200): Partial<StudioState> {
  const now = Date.now();
  if (now - lastLiveHist < windowMs) return { dirty: true };
  lastLiveHist = now;
  return pushHistory(s);
}

function applyMove(
  s: StudioState, project: ProjectData, selection: SelRect,
  hist: Partial<StudioState>, dx: number, dy: number,
): Partial<StudioState> {
  const layer = currentLayer(project, s.currentLayerId);
  const frame = project.frames[s.currentFrameId ?? ''];
  if (!frame) return {};
  const cel = frame.cels[layer.id] ?? emptyCells(project.width, project.height);
  const mask = s.selectionMask ?? rectMask(project.width, project.height, selection);
  const moved = moveMasked(cel, project.width, project.height, mask, dx, dy);
  return {
    ...hist,
    project: {
      ...project,
      frames: { ...project.frames, [frame.id]: { ...frame, cels: { ...frame.cels, [layer.id]: moved.cells } } },
      updatedAt: Date.now(),
    },
    selection: { x0: selection.x0 + dx, y0: selection.y0 + dy, x1: selection.x1 + dx, y1: selection.y1 + dy },
    selectionMask: moved.mask,
    dirty: true,
  };
}

function patchFrameMeta(
  project: ProjectData, frameId: string,
  patch: { anchors?: FrameAnchor[]; hitbox?: FrameHitbox | null; pose?: FramePose },
  hist: Partial<StudioState>,
): Partial<StudioState> {
  const frame = project.frames[frameId];
  if (!frame) return {};
  return {
    ...hist,
    project: {
      ...project,
      frames: { ...project.frames, [frameId]: { ...frame, ...patch } },
      updatedAt: Date.now(),
    },
    dirty: true,
  };
}

function patchPose(
  project: ProjectData, frameId: string, boneId: string, patch: Partial<BonePose>,
  hist: Partial<StudioState>,
): Partial<StudioState> {
  const frame = project.frames[frameId];
  const bone = (project.rig ?? []).find((b) => b.id === boneId);
  if (!frame || !bone) return {};
  const cur = frame.pose?.[boneId] ?? { x: bone.x, y: bone.y, rotation: bone.rotation };
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const next: BonePose = {
    x: patch.x !== undefined && Number.isFinite(patch.x) ? r2(patch.x) : cur.x,
    y: patch.y !== undefined && Number.isFinite(patch.y) ? r2(patch.y) : cur.y,
    rotation: patch.rotation !== undefined && Number.isFinite(patch.rotation)
      ? normalizeDeg(patch.rotation) : cur.rotation,
  };
  const isRest = next.x === bone.x && next.y === bone.y && normalizeDeg(next.rotation) === normalizeDeg(bone.rotation);
  const had = frame.pose?.[boneId];
  if (isRest && !had) return {};
  if (had && had.x === next.x && had.y === next.y && had.rotation === next.rotation) return {};
  const pose = { ...(frame.pose ?? {}) };
  if (isRest) delete pose[boneId];
  else pose[boneId] = next;
  return patchFrameMeta(project, frameId, { pose }, hist);
}

function currentAnim(project: ProjectData, animId: string | null): Animation | undefined {
  return project.animations.find((a) => a.id === animId) ?? project.animations[0];
}

function currentLayer(project: ProjectData, layerId: string | null): Layer {
  return project.layers.find((l) => l.id === layerId)
    ?? project.layers[project.layers.length - 1]
    ?? createLayer('Camada 1');
}

function emptyCels(project: ProjectData): Record<string, string[]> {
  const cels: Record<string, string[]> = {};
  for (const l of project.layers) cels[l.id] = emptyCells(project.width, project.height);
  return cels;
}

function cloneCels(frame: Frame | undefined, project: ProjectData): Record<string, string[]> {
  const cels: Record<string, string[]> = {};
  for (const l of project.layers) {
    cels[l.id] = frame?.cels[l.id] ? [...frame.cels[l.id]] : emptyCells(project.width, project.height);
  }
  return cels;
}

export const useStudio = create<StudioState>((set, get) => ({
  project: null,
  tool: 'brush',
  color: '#ff4d6d',
  secondaryColor: '#10131d',
  ditherPattern: 'solid',
  ditherStrength: 0.5,
  brushSize: 1,
  pixelPerfect: true,
  mirrorX: false,
  mirrorY: false,
  showGrid: true,
  onionSkin: true,
  onionPrev: 1,
  onionNext: 0,
  onionOpacity: 32,
  onionTintPrev: '#ff4d6d',
  onionTintNext: '#22b8f0',
  showMeta: true,
  poseClipboard: null,
  selectedBoneId: null,
  showRig: true,
  zoom: 12,
  viewportRequest: null,
  panHeld: false,
  canvasDialogOpen: false,
  showCanvasHandles: false,
  gridSize: 1,
  brushShape: 'square',
  customBrush: null,
  stabilizer: 0,
  pressureSize: true,
  rectFilled: false,
  ellipseFilled: false,
  cornerRadius: 2,
  playing: true,
  currentAnimationId: null,
  currentFrameId: null,
  currentLayerId: null,
  selection: null,
  selectionMask: null,
  selectionShape: 'rect',
  transformMode: 'move',
  frameClipboard: null,
  variationId: ORIGINAL_VARIATION_ID,
  past: [],
  future: [],
  dirty: false,

  loadProject: (p) => {
    const project = migrateProject(p);
    return set({
    project,
    currentAnimationId: project.animations[0]?.id ?? null,
    currentFrameId: project.animations[0]?.frameIds[0] ?? null,
    currentLayerId: project.layers[project.layers.length - 1]?.id ?? null,
    selection: null,
    selectionMask: null,
    selectionShape: 'rect',
    transformMode: 'move',
    frameClipboard: null,
    poseClipboard: null,
    selectedBoneId: null,
    variationId: ORIGINAL_VARIATION_ID,
    past: [],
    future: [],
    dirty: false,
    playing: true,
    });
  },

  newEmptyProject: (name, w, h) => {
    const layer = createLayer('Camada 1');
    const frame: Frame = makeFrame(layer.id, emptyCells(w, h), fpsToMs(8));
    const anim: Animation = { id: uid('an'), name: 'idle', fps: 8, frameIds: [frame.id], playMode: 'loop' };
    const now = Date.now();
    const project: ProjectData = {
      id: uid('pj'), name, width: w, height: h,
      layers: [layer],
      frames: { [frame.id]: frame },
      animations: [anim],
      variations: [],
      palette: ['#10131d', '#ffffff', '#ff4d6d', '#ff8a00', '#ffd23f', '#8ee000', '#3fd65f', '#22b8f0'],
      rig: [],
      createdAt: now, updatedAt: now,
    };
    get().loadProject(project);
  },

  projectFromTemplate: (name, templateId) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
    const built = tpl.build();
    const now = Date.now();
    const project: ProjectData = {
      id: uid('pj'), name: name || tpl.name, width: 32, height: 32,
      layers: built.layers,
      frames: built.frames,
      animations: built.animations,
      variations: [],
      palette: built.palette,
      rig: [],
      createdAt: now, updatedAt: now,
    };
    get().loadProject(project);
  },

  renameProject: (name) => set((s) => s.project
    ? { project: { ...s.project, name, updatedAt: Date.now() }, dirty: true }
    : {}),
  markSaved: () => set({ dirty: false }),

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color: normalizeHex(color) }),
  setSecondaryColor: (secondaryColor) => set({ secondaryColor: normalizeHex(secondaryColor) }),
  setDitherPattern: (ditherPattern) => set({ ditherPattern }),
  setDitherStrength: (ditherStrength) => set({ ditherStrength: Math.max(0.05, Math.min(0.95, ditherStrength)) }),
  setBrushSize: (brushSize) => set({ brushSize: Math.max(1, Math.min(8, brushSize)) }),
  togglePixelPerfect: () => set((s) => ({ pixelPerfect: !s.pixelPerfect })),
  toggleMirrorX: () => set((s) => ({ mirrorX: !s.mirrorX })),
  toggleMirrorY: () => set((s) => ({ mirrorY: !s.mirrorY })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleOnion: () => set((s) => ({ onionSkin: !s.onionSkin })),
  toggleShowMeta: () => set((s) => ({ showMeta: !s.showMeta })),
  selectBone: (id) => set({ selectedBoneId: id }),
  toggleShowRig: () => set((s) => ({ showRig: !s.showRig })),
  setOnionPrev: (n) => set({ onionPrev: Math.max(0, Math.min(3, Math.round(n))) }),
  setOnionNext: (n) => set({ onionNext: Math.max(0, Math.min(3, Math.round(n))) }),
  setOnionOpacity: (n) => set({ onionOpacity: Math.max(5, Math.min(80, Math.round(n))) }),
  setOnionTintPrev: (c) => set({ onionTintPrev: c }),
  setOnionTintNext: (c) => set({ onionTintNext: c }),
  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
  requestViewport: (kind) => set((s) => ({ viewportRequest: { kind, n: (s.viewportRequest?.n ?? 0) + 1 } })),
  clearViewport: () => set({ viewportRequest: null }),
  setPanHeld: (panHeld) => set({ panHeld }),
  setPlaying: (playing) => set({ playing }),

  // canvas (E1+): uma operação = pixels + meta + rig + seleção, com undo único
  resizeCanvas: (w, h, anchor) => set((s) => {
    const p = s.project;
    if (!p) return {};
    const newW = clampCanvasSize(w), newH = clampCanvasSize(h);
    if (newW === p.width && newH === p.height) return {};
    const { dx, dy } = anchorOffset(anchor, p.width, p.height, newW, newH);
    return applyCanvasRemap(s, p, newW, newH,
      (c) => resizeCells(c, p.width, p.height, newW, newH, dx, dy),
      translateMap(dx, dy),
      (b) => translateHitbox(b, dx, dy),
      (r) => translateSel(r, dx, dy));
  }),
  trimCanvas: (padding) => set((s) => {
    const p = s.project;
    if (!p) return {};
    const b = projectContentBounds(p);
    if (!b) return {};
    const pad = Math.max(0, Math.min(64, Math.round(padding)));
    const newW = clampCanvasSize(b.w + pad * 2), newH = clampCanvasSize(b.h + pad * 2);
    if (newW === p.width && newH === p.height) return {};
    // conteúdo em (pad,pad); se o clamp estourou, centraliza o conteúdo
    const dx = newW >= b.w + pad * 2 ? pad - b.x : Math.round((newW - b.w) / 2) - b.x;
    const dy = newH >= b.h + pad * 2 ? pad - b.y : Math.round((newH - b.h) / 2) - b.y;
    return applyCanvasRemap(s, p, newW, newH,
      (c) => resizeCells(c, p.width, p.height, newW, newH, dx, dy),
      translateMap(dx, dy),
      (hb) => translateHitbox(hb, dx, dy),
      (r) => translateSel(r, dx, dy));
  }),
  scaleSprite: (w, h) => set((s) => {
    const p = s.project;
    if (!p) return {};
    const newW = clampCanvasSize(w), newH = clampCanvasSize(h);
    if (newW === p.width && newH === p.height) return {};
    const sx = newW / p.width, sy = newH / p.height;
    return applyCanvasRemap(s, p, newW, newH,
      (c) => scaleCellsNN(c, p.width, p.height, newW, newH),
      scaleMap(sx, sy),
      (b) => scaleHitbox(b, sx, sy),
      (r) => scaleSel(r, sx, sy));
  }),
  flipCanvas: (axis) => set((s) => {
    const p = s.project;
    if (!p) return {};
    return axis === 'h'
      ? applyCanvasRemap(s, p, p.width, p.height, (c) => flipCellsH(c, p.width, p.height),
        flipHMap(p.width), (b) => flipHitboxH(b, p.width), (r) => flipSelH(r, p.width))
      : applyCanvasRemap(s, p, p.width, p.height, (c) => flipCellsV(c, p.width, p.height),
        flipVMap(p.height), (b) => flipHitboxV(b, p.height), (r) => flipSelV(r, p.height));
  }),
  setCanvasDialogOpen: (canvasDialogOpen) => set({ canvasDialogOpen }),
  setShowCanvasHandles: (showCanvasHandles) => set({ showCanvasHandles }),
  setGridSize: (gridSize) => set({ gridSize }),
  setBrushShape: (brushShape) => set({ brushShape }),
  captureBrushFromSelection: () => set((s) => {
    const p = s.project;
    const sel = s.selection;
    const f = s.currentFrameId ? p?.frames[s.currentFrameId] : undefined;
    if (!p || !sel || !f) return {};
    const x0 = Math.min(sel.x0, sel.x1), y0 = Math.min(sel.y0, sel.y1);
    const w = Math.min(64, Math.max(sel.x0, sel.x1) - x0 + 1);
    const h = Math.min(64, Math.max(sel.y0, sel.y1) - y0 + 1);
    const cel = f.cels[s.currentLayerId ?? ''] ?? emptyCells(p.width, p.height);
    const mask: boolean[] = [];
    let any = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = x0 + x, py = y0 + y;
        const selected = !s.selectionMask || (px >= 0 && py >= 0 && px < p.width && py < p.height && !!s.selectionMask[py * p.width + px]);
        const op = selected && px >= 0 && py >= 0 && px < p.width && py < p.height && !!cel[py * p.width + px];
        mask.push(op);
        if (op) any = true;
      }
    }
    if (!any) return {};
    return { customBrush: { w, h, mask }, brushShape: 'custom' };
  }),
  clearCustomBrush: () => set((s) => ({ customBrush: null, brushShape: s.brushShape === 'custom' ? 'square' : s.brushShape })),
  setStabilizer: (stabilizer) => set({ stabilizer: Math.max(0, Math.min(8, Math.round(stabilizer))) }),
  togglePressureSize: () => set((s) => ({ pressureSize: !s.pressureSize })),
  toggleRectFilled: () => set((s) => ({ rectFilled: !s.rectFilled })),
  toggleEllipseFilled: () => set((s) => ({ ellipseFilled: !s.ellipseFilled })),
  setCornerRadius: (cornerRadius) => set({ cornerRadius: Math.max(0, Math.min(8, Math.round(cornerRadius))) }),

  select: (animId, frameId) => set((s) => {
    if (!s.project) return {};
    const anim = animId ? s.project.animations.find((a) => a.id === animId) : currentAnim(s.project, s.currentAnimationId);
    if (!anim) return {};
    const fid = frameId !== undefined ? frameId : s.currentFrameId;
    const validFrame = fid && anim.frameIds.includes(fid) ? fid : anim.frameIds[0] ?? null;
    return { currentAnimationId: anim.id, currentFrameId: validFrame };
  }),
  setVariation: (variationId) => set({ variationId }),

  selectLayer: (id) => set((s) => {
    if (!s.project || !s.project.layers.some((l) => l.id === id)) return {};
    return { currentLayerId: id };
  }),

  addLayer: (name, parentId) => set((s) => {
    if (!s.project) return {};
    const hist = pushHistory(s);
    const selected = s.project.layers.find((l) => l.id === s.currentLayerId);
    const parent = parentId !== undefined ? parentId : selected?.kind === 'group' ? selected.id : selected?.parentId ?? null;
    const layer = createLayer(name || `Camada ${s.project.layers.length + 1}`, 100, parent);
    const frames: Record<string, Frame> = {};
    for (const [fid, f] of Object.entries(s.project.frames)) {
      frames[fid] = { ...f, cels: { ...f.cels, [layer.id]: emptyCells(s.project!.width, s.project!.height) } };
    }
    return {
      ...hist,
      project: { ...s.project, layers: [...s.project.layers, layer], frames, updatedAt: Date.now() },
      currentLayerId: layer.id,
    };
  }),

  addGroup: (name, parentId) => set((s) => {
    if (!s.project) return {};
    const hist = pushHistory(s);
    const selected = s.project.layers.find((l) => l.id === s.currentLayerId);
    const parent = parentId !== undefined ? parentId : selected?.kind === 'group' ? selected.id : selected?.parentId ?? null;
    const group = createGroup(name || `Grupo ${s.project.layers.length + 1}`, 100, parent);
    return {
      ...hist,
      project: { ...s.project, layers: [...s.project.layers, group], updatedAt: Date.now() },
      currentLayerId: group.id,
    };
  }),

  renameLayer: (id, name) => set((s) => {
    if (!s.project || !name.trim()) return {};
    if (!s.project.layers.some((l) => l.id === id)) return {};
    const hist = pushHistory(s);
    return {
      ...hist,
      project: {
        ...s.project,
        layers: s.project.layers.map((l) => (l.id === id ? { ...l, name: name.trim().slice(0, 24) } : l)),
        updatedAt: Date.now(),
      },
    };
  }),

  deleteLayer: (id) => set((s) => {
    if (!s.project || s.project.layers.length <= 1) return {};
    if (!s.project.layers.some((l) => l.id === id)) return {};
    const removed = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const l of s.project.layers) if (l.parentId && removed.has(l.parentId) && !removed.has(l.id)) { removed.add(l.id); changed = true; }
    }
    const layers = s.project.layers.filter((l) => !removed.has(l.id));
    if (!layers.length) return {};
    const hist = pushHistory(s);
    const frames: Record<string, Frame> = {};
    for (const [fid, f] of Object.entries(s.project.frames)) {
      const cels = { ...f.cels };
      for (const rid of removed) delete cels[rid];
      frames[fid] = { ...f, cels };
    }
    const nextLayer = layers[layers.length - 1];
    return {
      ...hist,
      project: { ...s.project, layers, frames, updatedAt: Date.now() },
      currentLayerId: s.currentLayerId && removed.has(s.currentLayerId) ? nextLayer?.id ?? null : s.currentLayerId,
    };
  }),

  moveLayer: (id, dir) => set((s) => {
    if (!s.project) return {};
    const layer = s.project.layers.find((l) => l.id === id);
    if (!layer) return {};
    const siblings = s.project.layers.map((l, i) => ({ l, i })).filter(({ l }) => l.parentId === layer.parentId);
    const pos = siblings.findIndex(({ l }) => l.id === id);
    const target = pos + dir;
    if (pos < 0 || target < 0 || target >= siblings.length) return {};
    const hist = pushHistory(s);
    const layers = [...s.project.layers];
    const a = siblings[pos].i, b = siblings[target].i;
    [layers[a], layers[b]] = [layers[b], layers[a]];
    return { ...hist, project: { ...s.project, layers, updatedAt: Date.now() } };
  }),

  toggleLayerVis: (id) => set((s) => {
    if (!s.project || !s.project.layers.some((l) => l.id === id)) return {};
    const hist = pushHistory(s);
    return {
      ...hist,
      project: {
        ...s.project,
        layers: s.project.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
        updatedAt: Date.now(),
      },
      dirty: true,
    };
  }),

  toggleLayerLock: (id) => set((s) => {
    if (!s.project || !s.project.layers.some((l) => l.id === id)) return {};
    const hist = pushHistory(s);
    return {
      ...hist,
      project: {
        ...s.project,
        layers: s.project.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
        updatedAt: Date.now(),
      },
      dirty: true,
    };
  }),

  setLayerOpacity: (id, opacity) => set((s) => {
    if (!s.project) return {};
    const next = Math.max(0, Math.min(100, Math.round(opacity)));
    const layer = s.project.layers.find((l) => l.id === id);
    if (!layer || layer.opacity === next) return {};
    const hist = pushHistory(s);
    return {
      ...hist,
      project: {
        ...s.project,
        layers: s.project.layers.map((l) => (l.id === id ? { ...l, opacity: next } : l)),
        updatedAt: Date.now(),
      },
      dirty: true,
    };
  }),

  setLayerBlendMode: (id, blendMode) => set((s) => {
    if (!s.project) return {};
    const layer = s.project.layers.find((l) => l.id === id);
    if (!layer || layer.blendMode === blendMode) return {};
    const hist = pushHistory(s);
    return { ...hist, project: { ...s.project, layers: s.project.layers.map((l) => l.id === id ? { ...l, blendMode } : l), updatedAt: Date.now() } };
  }),

  toggleLayerAlphaLock: (id) => set((s) => {
    if (!s.project) return {};
    const layer = s.project.layers.find((l) => l.id === id);
    if (!layer || layer.kind === 'group') return {};
    const hist = pushHistory(s);
    return { ...hist, project: { ...s.project, layers: s.project.layers.map((l) => l.id === id ? { ...l, alphaLock: !l.alphaLock } : l), updatedAt: Date.now() } };
  }),

  toggleLayerClipping: (id) => set((s) => {
    if (!s.project) return {};
    const layer = s.project.layers.find((l) => l.id === id);
    if (!layer || layer.kind === 'group') return {};
    const hist = pushHistory(s);
    return { ...hist, project: { ...s.project, layers: s.project.layers.map((l) => l.id === id ? { ...l, clipping: !l.clipping } : l), updatedAt: Date.now() } };
  }),

  toggleLayerExpanded: (id) => set((s) => {
    if (!s.project) return {};
    const layer = s.project.layers.find((l) => l.id === id);
    if (!layer || layer.kind !== 'group') return {};
    return { project: { ...s.project, layers: s.project.layers.map((l) => l.id === id ? { ...l, expanded: !l.expanded } : l), updatedAt: Date.now() }, dirty: true };
  }),

  setLayerParent: (id, parentId) => set((s) => {
    if (!s.project || id === parentId) return {};
    const layer = s.project.layers.find((l) => l.id === id);
    const parent = parentId ? s.project.layers.find((l) => l.id === parentId) : undefined;
    if (!layer || (parentId && (!parent || parent.kind !== 'group'))) return {};
    const descendants = new Set<string>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const l of s.project.layers) if (l.parentId && (l.parentId === id || descendants.has(l.parentId)) && !descendants.has(l.id)) { descendants.add(l.id); changed = true; }
    }
    if (parentId && descendants.has(parentId)) return {};
    const hist = pushHistory(s);
    return { ...hist, project: { ...s.project, layers: s.project.layers.map((l) => l.id === id ? { ...l, parentId } : l), updatedAt: Date.now() } };
  }),

  setSelection: (selection) => set((s) => ({
    selection,
    selectionMask: selection && s.project ? rectMask(s.project.width, s.project.height, selection) : null,
    selectionShape: 'rect',
  })),

  setSelectionMask: (mask, shape = 'rect') => set((s) => {
    if (!mask || !s.project) return { selection: null, selectionMask: null, selectionShape: shape };
    return { selection: maskBounds(mask, s.project.width, s.project.height), selectionMask: mask, selectionShape: shape };
  }),

  setSelectionShape: (selectionShape) => set({ selectionShape }),
  setTransformMode: (transformMode) => set({ transformMode }),

  selectObjectAt: (x, y) => set((s) => {
    if (!s.project || !s.currentFrameId) return {};
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.kind === 'group') return {};
    const frame = s.project.frames[s.currentFrameId];
    if (!frame) return {};
    const cel = frame.cels[layer.id] ?? emptyCells(s.project.width, s.project.height);
    const mask = objectMask(cel, s.project.width, s.project.height, x, y);
    return { selection: maskBounds(mask, s.project.width, s.project.height), selectionMask: mask, selectionShape: 'wand' };
  }),

  moveSelection: (dx, dy) => set((s) => {
    if (!s.project || !s.selection || (!dx && !dy)) return {};
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.locked || layer.kind === 'group') return {};
    return applyMove(s, s.project, s.selection, pushHistory(s), dx, dy);
  }),

  moveSelectionLive: (dx, dy) => set((s) => {
    if (!s.project || !s.selection || (!dx && !dy)) return {};
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.locked || layer.kind === 'group') return {};
    return applyMove(s, s.project, s.selection, {}, dx, dy);
  }),

  deleteSelection: () => set((s) => {
    if (!s.project || !s.selection) return {};
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.locked || layer.kind === 'group') return {};
    const hist = pushHistory(s);
    const { width: w, height: h } = s.project;
    const mask = s.selectionMask ?? rectMask(w, h, s.selection);
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!frame) return {};
    const cells = [...(frame.cels[layer.id] ?? emptyCells(w, h))];
    for (let i = 0; i < mask.length && i < cells.length; i++) if (mask[i]) cells[i] = '';
    return {
      ...hist,
      project: {
        ...s.project,
        frames: { ...s.project.frames, [frame.id]: { ...frame, cels: { ...frame.cels, [layer.id]: cells } } },
        updatedAt: Date.now(),
      },
      dirty: true,
    };
  }),

  rotateSelection: (clockwise) => set((s) => {
    if (!s.project || !s.selection) return {};
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.locked || layer.kind === 'group') return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!frame) return {};
    const mask = s.selectionMask ?? rectMask(s.project.width, s.project.height, s.selection);
    const cel = frame.cels[layer.id] ?? emptyCells(s.project.width, s.project.height);
    const out = rotateMasked(cel, s.project.width, s.project.height, mask, s.selection, clockwise);
    return {
      ...pushHistory(s),
      project: { ...s.project, frames: { ...s.project.frames, [frame.id]: { ...frame, cels: { ...frame.cels, [layer.id]: out.cells } } }, updatedAt: Date.now() },
      selection: out.rect, selectionMask: out.mask, dirty: true,
    };
  }),

  scaleSelection: (factor) => set((s) => {
    if (!s.project || !s.selection || !Number.isFinite(factor) || factor <= 0) return {};
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.locked || layer.kind === 'group') return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!frame) return {};
    const mask = s.selectionMask ?? rectMask(s.project.width, s.project.height, s.selection);
    const cel = frame.cels[layer.id] ?? emptyCells(s.project.width, s.project.height);
    const out = scaleMasked(cel, s.project.width, s.project.height, mask, s.selection, factor);
    return {
      ...pushHistory(s),
      project: { ...s.project, frames: { ...s.project.frames, [frame.id]: { ...frame, cels: { ...frame.cels, [layer.id]: out.cells } } }, updatedAt: Date.now() },
      selection: out.rect, selectionMask: out.mask, dirty: true,
    };
  }),

  pushObject: (dx, dy) => set((s) => {
    if (!s.selection || (!dx && !dy)) return {};
    const layer = s.project ? currentLayer(s.project, s.currentLayerId) : null;
    if (!s.project || !layer || layer.locked) return {};
    return applyMove(s, s.project, s.selection, pushHistory(s), dx, dy);
  }),

  beginStroke: () => set((s) => pushHistory(s)),

  paint: (indices, color) => set((s) => {
    if (!s.project || !s.currentFrameId) return {};
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.locked || layer.kind === 'group') return {};
    const frame = s.project.frames[s.currentFrameId];
    if (!frame) return {};
    const cells = [...(frame.cels[layer.id] ?? emptyCells(s.project.width, s.project.height))];
    const value = color === null ? '' : normalizeHex(color);
    let changed = false;
    for (const i of indices) {
      if (i < 0 || i >= cells.length || (layer.alphaLock && !cells[i])) continue;
      if (cells[i] !== value) { cells[i] = value; changed = true; }
    }
    if (!changed) return {};
    return {
      project: {
        ...s.project,
        frames: { ...s.project.frames, [frame.id]: { ...frame, cels: { ...frame.cels, [layer.id]: cells } } },
        updatedAt: Date.now(),
      },
      dirty: true,
    };
  }),

  paintPatch: (patches) => set((s) => {
    if (!s.project || !s.currentFrameId || !patches.length) return {};
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.locked || layer.kind === 'group') return {};
    const frame = s.project.frames[s.currentFrameId];
    if (!frame) return {};
    const cells = [...(frame.cels[layer.id] ?? emptyCells(s.project.width, s.project.height))];
    let changed = false;
    for (const [i, c] of patches) {
      if (i < 0 || i >= cells.length || (layer.alphaLock && !cells[i])) continue;
      const next = c ? normalizeHex(c) : '';
      if (cells[i] !== next) { cells[i] = next; changed = true; }
    }
    if (!changed) return {};
    return {
      project: {
        ...s.project,
        frames: { ...s.project.frames, [frame.id]: { ...frame, cels: { ...frame.cels, [layer.id]: cells } } },
        updatedAt: Date.now(),
      },
      dirty: true,
    };
  }),

  drawShape: (indices, color) => {
    const s = get();
    if (!s.project || !s.currentFrameId) return;
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.locked || layer.kind === 'group') return;
    const frame = s.project.frames[s.currentFrameId];
    if (!frame) return;
    const cells = frame.cels[layer.id] ?? emptyCells(s.project.width, s.project.height);
    const value = color === null ? '' : normalizeHex(color);
    const canChange = indices.some((i) => i >= 0 && i < cells.length && (!layer.alphaLock || !!cells[i]) && cells[i] !== value);
    if (!canChange) return;
    set(pushHistory(s));
    get().paint(indices, color);
  },

  addFrame: () => set((s) => {
    if (!s.project) return {};
    const anim = currentAnim(s.project, s.currentAnimationId);
    if (!anim) return {};
    const hist = pushHistory(s);
    const frame: Frame = { id: uid('fr'), cels: emptyCels(s.project), durationMs: fpsToMs(anim.fps), anchors: [], hitbox: null };
    const curIdx = s.currentFrameId ? anim.frameIds.indexOf(s.currentFrameId) : anim.frameIds.length - 1;
    const frameIds = [...anim.frameIds];
    frameIds.splice(curIdx + 1, 0, frame.id);
    const animations = s.project.animations.map((a) => (a.id === anim.id ? { ...a, frameIds } : a));
    return {
      ...hist,
      project: {
        ...s.project,
        frames: { ...s.project.frames, [frame.id]: frame },
        animations,
        updatedAt: Date.now(),
      },
      currentFrameId: frame.id,
    };
  }),

  duplicateFrame: (id) => set((s) => {
    if (!s.project) return {};
    const anim = currentAnim(s.project, s.currentAnimationId);
    const src = s.project.frames[id];
    if (!anim || !src || !anim.frameIds.includes(id)) return {};
    const hist = pushHistory(s);
    const frame: Frame = { id: uid('fr'), cels: cloneCels(src, s.project), durationMs: frameMs(src), ...cloneFrameMeta(src), pose: clonePose(src.pose) };
    const frameIds = [...anim.frameIds];
    frameIds.splice(frameIds.indexOf(id) + 1, 0, frame.id);
    const animations = s.project.animations.map((a) => (a.id === anim.id ? { ...a, frameIds } : a));
    return {
      ...hist,
      project: { ...s.project, frames: { ...s.project.frames, [frame.id]: frame }, animations, updatedAt: Date.now() },
      currentFrameId: frame.id,
    };
  }),

  deleteFrame: (id) => set((s) => {
    if (!s.project) return {};
    const anim = currentAnim(s.project, s.currentAnimationId);
    if (!anim || !anim.frameIds.includes(id) || anim.frameIds.length <= 1) return {};
    const hist = pushHistory(s);
    const frameIds = anim.frameIds.filter((f) => f !== id);
    const animations = s.project.animations.map((a) => (a.id === anim.id ? { ...a, frameIds } : a));
    const frames = { ...s.project.frames };
    // remove o frame se não for usado por outra animação
    const stillUsed = animations.some((a) => a.frameIds.includes(id));
    if (!stillUsed) delete frames[id];
    const delIdx = anim.frameIds.indexOf(id);
    const currentFrameId = s.currentFrameId === id ? frameIds[Math.min(delIdx, frameIds.length - 1)] : s.currentFrameId;
    return {
      ...hist,
      project: { ...s.project, frames, animations, updatedAt: Date.now() },
      currentFrameId,
    };
  }),

  moveFrame: (id, dir) => set((s) => {
    if (!s.project) return {};
    const anim = currentAnim(s.project, s.currentAnimationId);
    if (!anim) return {};
    const i = anim.frameIds.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= anim.frameIds.length) return {};
    const hist = pushHistory(s);
    const frameIds = [...anim.frameIds];
    [frameIds[i], frameIds[j]] = [frameIds[j], frameIds[i]];
    const animations = s.project.animations.map((a) => (a.id === anim.id ? { ...a, frameIds } : a));
    return { ...hist, project: { ...s.project, animations, updatedAt: Date.now() } };
  }),

  moveFrameTo: (id, toIndex) => set((s) => {
    if (!s.project) return {};
    const anim = currentAnim(s.project, s.currentAnimationId);
    if (!anim || !anim.frameIds.includes(id)) return {};
    const frameIds = moveIdTo(anim.frameIds, id, toIndex);
    if (frameIds.join() === anim.frameIds.join()) return {}; // sem mudança: sem undo
    const hist = pushHistory(s);
    const animations = s.project.animations.map((a) => (a.id === anim.id ? { ...a, frameIds } : a));
    return { ...hist, project: { ...s.project, animations, updatedAt: Date.now() } };
  }),

  stepFrame: (dir) => set((s) => {
    const anim = s.project ? currentAnim(s.project, s.currentAnimationId) : undefined;
    if (!s.project || !anim || !anim.frameIds.length) return {};
    const i = anim.frameIds.indexOf(s.currentFrameId ?? '');
    const n = anim.frameIds.length;
    const next = anim.frameIds[((i < 0 ? 0 : i + dir) % n + n) % n];
    return { currentAnimationId: anim.id, currentFrameId: next };
  }),

  setFrameDuration: (id, ms) => set((s) => {
    if (!s.project) return {};
    const frame = s.project.frames[id];
    const value = clampMs(ms);
    if (!frame || frame.durationMs === value) return {};
    const hist = pushHistory(s);
    return {
      ...hist,
      project: {
        ...s.project,
        frames: { ...s.project.frames, [id]: { ...frame, durationMs: value } },
        updatedAt: Date.now(),
      },
    };
  }),

  copyFrame: (id) => set((s) => {
    if (!s.project) return {};
    const f = s.project.frames[id];
    if (!f) return {};
    return { frameClipboard: [{ ...f, cels: cloneCels(f, s.project), durationMs: frameMs(f) }] };
  }),

  cutFrame: (id) => set((s) => {
    if (!s.project) return {};
    const anim = currentAnim(s.project, s.currentAnimationId);
    const f = s.project.frames[id];
    if (!anim || !f || !anim.frameIds.includes(id) || anim.frameIds.length <= 1) return {};
    const hist = pushHistory(s);
    const frameIds = anim.frameIds.filter((fid) => fid !== id);
    const animations = s.project.animations.map((a) => (a.id === anim.id ? { ...a, frameIds } : a));
    const frames = { ...s.project.frames };
    if (!animations.some((a) => a.frameIds.includes(id))) delete frames[id];
    const idx = anim.frameIds.indexOf(id);
    return {
      ...hist,
      frameClipboard: [{ ...f, cels: cloneCels(f, s.project), durationMs: frameMs(f) }],
      project: { ...s.project, frames, animations, updatedAt: Date.now() },
      currentFrameId: s.currentFrameId === id ? frameIds[Math.min(idx, frameIds.length - 1)] : s.currentFrameId,
    };
  }),

  pasteFrame: () => set((s) => {
    if (!s.project || !s.frameClipboard?.length) return {};
    const anim = currentAnim(s.project, s.currentAnimationId);
    if (!anim) return {};
    const hist = pushHistory(s);
    const frames = { ...s.project.frames };
    const frameIds = [...anim.frameIds];
    const curIdx = s.currentFrameId ? frameIds.indexOf(s.currentFrameId) : frameIds.length - 1;
    const pasted = s.frameClipboard.map((f) => {
      const copy: Frame = { id: uid('fr'), cels: cloneCels(f, s.project!), durationMs: frameMs(f), ...cloneFrameMeta(f), pose: clonePose(f?.pose) };
      frames[copy.id] = copy;
      return copy.id;
    });
    frameIds.splice(curIdx + 1, 0, ...pasted);
    const animations = s.project.animations.map((a) => (a.id === anim.id ? { ...a, frameIds } : a));
    return {
      ...hist,
      project: { ...s.project, frames, animations, updatedAt: Date.now() },
      currentFrameId: pasted[0],
    };
  }),

  addAnchor: (name) => {
    const s = get();
    if (!s.project) return;
    get().addAnchorAt(Math.floor(s.project.width / 2), Math.floor(s.project.height / 2), name);
  },

  addAnchorAt: (x, y, name) => set((s) => {
    if (!s.project) return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!frame) return {};
    const hist = pushHistory(s);
    const n = frame.anchors.length + 1;
    const anchor = clampAnchor({
      id: uid('an'),
      name: (name?.trim() || `ponto_${n}`).slice(0, 24),
      x, y,
    }, s.project.width, s.project.height);
    return patchFrameMeta(s.project, frame.id, { anchors: [...frame.anchors, anchor] }, hist);
  }),

  renameAnchor: (anchorId, name) => set((s) => {
    if (!s.project || !name.trim()) return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!frame || !frame.anchors.some((a) => a.id === anchorId)) return {};
    const hist = pushHistory(s);
    return patchFrameMeta(s.project, frame.id, {
      anchors: frame.anchors.map((a) => (a.id === anchorId ? { ...a, name: name.trim().slice(0, 24) } : a)),
    }, hist);
  }),

  moveAnchor: (anchorId, x, y) => set((s) => {
    if (!s.project) return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    const cur = frame?.anchors.find((a) => a.id === anchorId);
    if (!frame || !cur) return {};
    const next = clampAnchor({ ...cur, x, y }, s.project.width, s.project.height);
    if (next.x === cur.x && next.y === cur.y) return {};
    return patchFrameMeta(s.project, frame.id, {
      anchors: frame.anchors.map((a) => (a.id === anchorId ? next : a)),
    }, pushHistory(s));
  }),

  moveAnchorLive: (anchorId, x, y) => set((s) => {
    if (!s.project) return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    const cur = frame?.anchors.find((a) => a.id === anchorId);
    if (!frame || !cur) return {};
    const next = clampAnchor({ ...cur, x, y }, s.project.width, s.project.height);
    if (next.x === cur.x && next.y === cur.y) return {};
    return patchFrameMeta(s.project, frame.id, {
      anchors: frame.anchors.map((a) => (a.id === anchorId ? next : a)),
    }, {});
  }),

  deleteAnchor: (anchorId) => set((s) => {
    if (!s.project) return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!frame || !frame.anchors.some((a) => a.id === anchorId)) return {};
    return patchFrameMeta(s.project, frame.id, {
      anchors: frame.anchors.filter((a) => a.id !== anchorId),
    }, pushHistory(s));
  }),

  setHitbox: (box) => set((s) => {
    if (!s.project) return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!frame) return {};
    const next = box ? normalizeHitbox(box, s.project.width, s.project.height) : null;
    if (JSON.stringify(frame.hitbox ?? null) === JSON.stringify(next)) return {};
    return patchFrameMeta(s.project, frame.id, { hitbox: next }, pushHistory(s));
  }),

  setHitboxLive: (box) => set((s) => {
    if (!s.project) return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!frame) return {};
    const next = box ? normalizeHitbox(box, s.project.width, s.project.height) : null;
    if (JSON.stringify(frame.hitbox ?? null) === JSON.stringify(next)) return {};
    return patchFrameMeta(s.project, frame.id, { hitbox: next }, {});
  }),

  autoFitHitbox: () => set((s) => {
    if (!s.project) return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!frame) return {};
    const box = opaqueBBox(flattenCells(s.project, frame), s.project.width, s.project.height);
    if (!box) return {}; // frame vazio: nada a ajustar
    if (JSON.stringify(frame.hitbox ?? null) === JSON.stringify(box)) return {};
    return patchFrameMeta(s.project, frame.id, { hitbox: box }, pushHistory(s));
  }),

  addBone: (parentId = null, at) => {
    const s = get();
    if (!s.project) return '';
    const rig = s.project.rig ?? [];
    const px = at?.x ?? Math.floor(s.project.width / 2);
    const py = at?.y ?? Math.floor(s.project.height / 2);
    const world = solveFK(rig, undefined);
    const pj = parentId ? world.find((w) => w.id === parentId) : undefined;
    const local = worldToLocal(rig, undefined, pj ? parentId : null, px, py);
    const len = pj
      ? Math.min(128, Math.max(2, Math.round(Math.hypot(px - pj.jx, py - pj.jy))))
      : 12;
    const bone: Bone = {
      id: uid('bn'), name: `osso_${rig.length + 1}`,
      parentId: pj && parentId ? parentId : null,
      x: local.x, y: local.y, rotation: 0, length: len,
    };
    set({
      ...pushHistory(s),
      project: { ...s.project, rig: [...rig, bone], updatedAt: Date.now() },
      selectedBoneId: bone.id,
    });
    return bone.id;
  },

  renameBone: (id, name) => set((s) => {
    if (!s.project || !name.trim()) return {};
    const rig = s.project.rig ?? [];
    if (!rig.some((b) => b.id === id)) return {};
    const hist = pushHistory(s);
    return {
      ...hist,
      project: {
        ...s.project,
        rig: rig.map((b) => (b.id === id ? { ...b, name: name.trim().slice(0, 24) } : b)),
        updatedAt: Date.now(),
      },
    };
  }),

  deleteBone: (id) => set((s) => {
    if (!s.project) return {};
    const rig = s.project.rig ?? [];
    const dead = rig.find((b) => b.id === id);
    if (!dead) return {};
    const hist = pushHistory(s);
    const next = rig.filter((b) => b.id !== id)
      .map((b) => (b.parentId === id ? { ...b, parentId: dead.parentId } : b));
    const frames = { ...s.project.frames };
    for (const [fid, f] of Object.entries(frames)) {
      if (f.pose && f.pose[id]) {
        const pose = { ...f.pose };
        delete pose[id];
        frames[fid] = { ...f, pose };
      }
    }
    return {
      ...hist,
      project: { ...s.project, rig: next, frames, updatedAt: Date.now() },
      selectedBoneId: s.selectedBoneId === id ? null : s.selectedBoneId,
    };
  }),

  setBoneParent: (id, parentId) => set((s) => {
    if (!s.project) return {};
    const rig = s.project.rig ?? [];
    const bone = rig.find((b) => b.id === id);
    if (!bone || bone.parentId === parentId) return {};
    if (parentId && !rig.some((b) => b.id === parentId)) return {};
    if (wouldCycle(rig, id, parentId)) return {};
    const hist = pushHistory(s);
    return {
      ...hist,
      project: {
        ...s.project,
        rig: rig.map((b) => (b.id === id ? { ...b, parentId } : b)),
        updatedAt: Date.now(),
      },
    };
  }),

  setBoneRest: (id, patch) => set((s) => {
    if (!s.project) return {};
    const rig = s.project.rig ?? [];
    const bone = rig.find((b) => b.id === id);
    if (!bone) return {};
    const r2 = (v: number) => Math.round(v * 100) / 100;
    const next: Bone = {
      ...bone,
      x: patch.x !== undefined && Number.isFinite(patch.x) ? r2(patch.x) : bone.x,
      y: patch.y !== undefined && Number.isFinite(patch.y) ? r2(patch.y) : bone.y,
      rotation: patch.rotation !== undefined && Number.isFinite(patch.rotation)
        ? normalizeDeg(patch.rotation) : bone.rotation,
      length: patch.length !== undefined && Number.isFinite(patch.length)
        ? Math.min(512, Math.max(0, r2(patch.length))) : bone.length,
    };
    if (next.x === bone.x && next.y === bone.y && next.rotation === bone.rotation && next.length === bone.length) return {};
    const hist = pushHistory(s);
    return {
      ...hist,
      project: {
        ...s.project,
        rig: rig.map((b) => (b.id === id ? next : b)),
        updatedAt: Date.now(),
      },
    };
  }),

  poseBone: (id, patch) => set((s) => {
    if (!s.project) return {};
    return patchPose(s.project, s.currentFrameId ?? '', id, patch, pushHistory(s));
  }),

  poseBoneLive: (id, patch) => set((s) => {
    if (!s.project) return {};
    return patchPose(s.project, s.currentFrameId ?? '', id, patch, {});
  }),

  poseToRest: (id) => set((s) => {
    if (!s.project) return {};
    const bone = (s.project.rig ?? []).find((b) => b.id === id);
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!bone || !frame) return {};
    const eff = frame.pose?.[id] ?? { x: bone.x, y: bone.y, rotation: bone.rotation };
    if (eff.x === bone.x && eff.y === bone.y && eff.rotation === bone.rotation && !frame.pose?.[id]) return {};
    const hist = pushHistory(s);
    const rig = (s.project.rig ?? []).map((b) => (
      b.id === id ? { ...b, x: eff.x, y: eff.y, rotation: eff.rotation } : b
    ));
    const pose = { ...(frame.pose ?? {}) };
    delete pose[id];
    return {
      ...hist,
      project: {
        ...s.project, rig,
        frames: { ...s.project.frames, [frame.id]: { ...frame, pose } },
        updatedAt: Date.now(),
      },
    };
  }),

  resetPose: () => set((s) => {
    if (!s.project) return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!frame || !frame.pose || !Object.keys(frame.pose).length) return {};
    const hist = pushHistory(s);
    const { pose: _drop, ...rest } = frame;
    void _drop;
    return {
      ...hist,
      project: {
        ...s.project,
        frames: { ...s.project.frames, [frame.id]: rest },
        updatedAt: Date.now(),
      },
    };
  }),

  copyPose: () => set((s) => {
    const f = s.project?.frames[s.currentFrameId ?? ''];
    return { poseClipboard: clonePose(f?.pose) ?? null };
  }),

  pastePose: () => set((s) => {
    if (!s.project || !s.poseClipboard) return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!frame) return {};
    const next = clonePose(s.poseClipboard) ?? {};
    if (JSON.stringify(frame.pose ?? {}) === JSON.stringify(next)) return {};
    const hist = pushHistory(s);
    return {
      ...hist,
      project: {
        ...s.project,
        frames: { ...s.project.frames, [frame.id]: { ...frame, pose: next } },
        updatedAt: Date.now(),
      },
    };
  }),

  clearFrame: (id) => set((s) => {
    if (!s.project || !s.project.frames[id]) return {};
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.locked || layer.kind === 'group') return {};
    const hist = pushHistory(s);
    const frame = s.project.frames[id];
    const cels = { ...frame.cels, [layer.id]: emptyCells(s.project.width, s.project.height) };
    return {
      ...hist,
      project: {
        ...s.project,
        frames: { ...s.project.frames, [id]: { ...frame, cels } },
        updatedAt: Date.now(),
      },
    };
  }),

  addAnimation: (name) => set((s) => {
    if (!s.project) return {};
    const hist = pushHistory(s);
    const frame: Frame = { id: uid('fr'), cels: emptyCels(s.project), durationMs: fpsToMs(8), anchors: [], hitbox: null };
    const count = s.project.animations.length + 1;
    const anim: Animation = { id: uid('an'), name: name || `acao_${count}`, fps: 8, frameIds: [frame.id], playMode: 'loop' };
    return {
      ...hist,
      project: {
        ...s.project,
        frames: { ...s.project.frames, [frame.id]: frame },
        animations: [...s.project.animations, anim],
        updatedAt: Date.now(),
      },
      currentAnimationId: anim.id,
      currentFrameId: frame.id,
    };
  }),

  renameAnimation: (id, name) => set((s) => {
    if (!s.project || !name.trim()) return {};
    const hist = pushHistory(s);
    return {
      ...hist,
      project: {
        ...s.project,
        animations: s.project.animations.map((a) => (a.id === id ? { ...a, name: name.trim().slice(0, 24) } : a)),
        updatedAt: Date.now(),
      },
      dirty: true,
    };
  }),

  deleteAnimation: (id) => set((s) => {
    if (!s.project || s.project.animations.length <= 1) return {};
    const hist = pushHistory(s);
    const animations = s.project.animations.filter((a) => a.id !== id);
    const used = new Set(animations.flatMap((a) => a.frameIds));
    const frames: Record<string, Frame> = {};
    for (const [fid, f] of Object.entries(s.project.frames)) if (used.has(fid)) frames[fid] = f;
    const first = animations[0];
    return {
      ...hist,
      project: { ...s.project, frames, animations, updatedAt: Date.now() },
      currentAnimationId: first.id,
      currentFrameId: first.frameIds[0] ?? null,
    };
  }),

  duplicateAnimation: (id) => set((s) => {
    if (!s.project) return {};
    const src = s.project.animations.find((a) => a.id === id);
    if (!src) return {};
    const hist = pushHistory(s);
    const frames = { ...s.project.frames };
    const frameIds = src.frameIds.map((fid) => {
      const f = frames[fid];
      const copy: Frame = { id: uid('fr'), cels: cloneCels(f, s.project!), durationMs: frameMs(f), ...cloneFrameMeta(f), pose: clonePose(f?.pose) };
      frames[copy.id] = copy;
      return copy.id;
    });
    const anim: Animation = { id: uid('an'), name: `${src.name}_copia`, fps: src.fps, frameIds, playMode: src.playMode ?? 'loop' };
    return {
      ...hist,
      project: { ...s.project, frames, animations: [...s.project.animations, anim], updatedAt: Date.now() },
      currentAnimationId: anim.id,
      currentFrameId: frameIds[0] ?? null,
    };
  }),

  addAnimationWithFrames: (name, fps, framesCells) => set((s) => {
    if (!s.project || !framesCells.length) return {};
    const hist = pushHistory(s);
    const frames = { ...s.project.frames };
    const target = s.project.layers.find((l) => l.id === s.currentLayerId && l.kind === 'raster' && !l.locked)
      ?? s.project.layers.find((l) => l.kind === 'raster' && !l.locked)
      ?? s.project.layers.find((l) => l.kind === 'raster');
    const frameIds = framesCells.map((cells) => {
      const cels = emptyCels(s.project!);
      if (target) cels[target.id] = [...cells];
      const f: Frame = { id: uid('fr'), cels, durationMs: fpsToMs(fps), anchors: [], hitbox: null };
      frames[f.id] = f;
      return f.id;
    });
    const existing = new Set(s.project.animations.map((a) => a.name));
    let finalName = name.trim().slice(0, 24) || 'auto';
    let k = 2;
    while (existing.has(finalName)) finalName = `${name.trim().slice(0, 20)}_${k++}`;
    const anim: Animation = { id: uid('an'), name: finalName, fps: Math.max(1, Math.min(60, fps)), frameIds, playMode: 'loop' };
    return {
      ...hist,
      project: { ...s.project, frames, animations: [...s.project.animations, anim], updatedAt: Date.now() },
      currentAnimationId: anim.id,
      currentFrameId: frameIds[0] ?? null,
    };
  }),

  setAnimFps: (id, fps) => set((s) => {
    if (!s.project) return {};
    const anim = s.project.animations.find((a) => a.id === id);
    if (!anim) return {};
    const value = Math.max(1, Math.min(60, Math.round(fps)));
    const ms = fpsToMs(value);
    const hist = pushHistoryLive(s);
    const frames = { ...s.project.frames };
    for (const fid of anim.frameIds) {
      const f = frames[fid];
      if (f) frames[fid] = { ...f, durationMs: ms };
    }
    return {
      ...hist,
      project: {
        ...s.project,
        frames,
        animations: s.project.animations.map((a) => (a.id === id ? { ...a, fps: value } : a)),
        updatedAt: Date.now(),
      },
      dirty: true,
    };
  }),

  setPlayMode: (id, mode) => set((s) => {
    if (!s.project) return {};
    const anim = s.project.animations.find((a) => a.id === id);
    if (!anim || anim.playMode === mode) return {};
    const hist = pushHistory(s);
    return {
      ...hist,
      project: {
        ...s.project,
        animations: s.project.animations.map((a) => (a.id === id ? { ...a, playMode: mode } : a)),
        updatedAt: Date.now(),
      },
    };
  }),

  addVariation: (name) => {
    const s = get();
    if (!s.project) return '';
    const v: Variation = {
      id: uid('vr'),
      name: name || `var_${s.project.variations.length + 1}`,
      mapping: {},
      hue: 0, sat: 0, light: 0,
    };
    set({
      ...pushHistory(s),
      project: { ...s.project, variations: [...s.project.variations, v], updatedAt: Date.now() },
      variationId: v.id,
    });
    return v.id;
  },

  updateVariation: (id, patch) => set((s) => {
    if (!s.project) return {};
    if (patch.name !== undefined && !patch.name.trim()) return {};
    const hist = pushHistoryLive(s);
    return {
      ...hist,
      project: {
        ...s.project,
        variations: s.project.variations.map((v) => (v.id === id ? { ...v, ...patch } : v)),
        updatedAt: Date.now(),
      },
      dirty: true,
    };
  }),

  deleteVariation: (id) => set((s) => {
    if (!s.project) return {};
    const hist = pushHistory(s);
    return {
      ...hist,
      project: { ...s.project, variations: s.project.variations.filter((v) => v.id !== id), updatedAt: Date.now() },
      variationId: s.variationId === id ? ORIGINAL_VARIATION_ID : s.variationId,
      dirty: true,
    };
  }),

  autoVariations: () => {
    const s = get();
    if (!s.project) return;
    const presets = [
      { name: 'sombra', hue: 0, sat: -10, light: -22 },
      { name: 'gelo', hue: 140, sat: 10, light: 8 },
      { name: 'veneno', hue: 90, sat: 25, light: -5 },
      { name: 'ouro', hue: -45, sat: 20, light: 6 },
      { name: 'brasas', hue: -110, sat: 30, light: 0 },
    ];
    const existing = new Set(s.project.variations.map((v) => v.name));
    const fresh = presets
      .filter((p) => !existing.has(p.name))
      .map((p) => ({ id: uid('vr'), name: p.name, mapping: {}, hue: p.hue, sat: p.sat, light: p.light }));
    if (!fresh.length) return;
    set({
      ...pushHistory(s),
      project: { ...s.project, variations: [...s.project.variations, ...fresh], updatedAt: Date.now() },
      variationId: fresh[0].id,
    });
  },

  setPaletteSlot: (i, color) => set((s) => {
    if (!s.project) return {};
    const hist = pushHistoryLive(s);
    const palette = [...s.project.palette];
    palette[i] = normalizeHex(color);
    return { ...hist, project: { ...s.project, palette, updatedAt: Date.now() } };
  }),

  addPaletteColor: (color) => set((s) => {
    if (!s.project) return {};
    const c = normalizeHex(color);
    if (s.project.palette.includes(c)) return {};
    const hist = pushHistory(s);
    return { ...hist, project: { ...s.project, palette: [...s.project.palette, c], updatedAt: Date.now() } };
  }),

  addPaletteColors: (colors) => set((s) => {
    if (!s.project) return {};
    const palette = [...s.project.palette];
    for (const c of colors.map(normalizeHex)) if (!palette.includes(c)) palette.push(c);
    if (palette.length === s.project.palette.length) return {};
    return { ...pushHistory(s), project: { ...s.project, palette, updatedAt: Date.now() } };
  }),

  shadeSelection: (amount) => set((s) => {
    if (!s.project || !s.selection || !Number.isFinite(amount) || !amount) return {};
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.locked || layer.kind === 'group') return {};
    const frame = s.project.frames[s.currentFrameId ?? ''];
    if (!frame) return {};
    const mask = s.selectionMask ?? rectMask(s.project.width, s.project.height, s.selection);
    const cells = [...(frame.cels[layer.id] ?? emptyCells(s.project.width, s.project.height))];
    const palette = [...s.project.palette];
    let changed = false;
    for (let i = 0; i < cells.length && i < mask.length; i++) {
      if (!mask[i] || !cells[i]) continue;
      const next = shadeColor(cells[i], amount);
      if (next === cells[i]) continue;
      cells[i] = next;
      if (!palette.includes(next)) palette.push(next);
      changed = true;
    }
    if (!changed) return {};
    return {
      ...pushHistory(s),
      project: { ...s.project, palette, frames: { ...s.project.frames, [frame.id]: { ...frame, cels: { ...frame.cels, [layer.id]: cells } } }, updatedAt: Date.now() },
      dirty: true,
    };
  }),

  removePaletteColor: (i) => set((s) => {
    if (!s.project) return {};
    const hist = pushHistory(s);
    const palette = s.project.palette.filter((_, k) => k !== i);
    return { ...hist, project: { ...s.project, palette, updatedAt: Date.now() } };
  }),

  loadPalette: (colors) => set((s) => {
    if (!s.project) return {};
    const hist = pushHistory(s);
    return { ...hist, project: { ...s.project, palette: colors.map(normalizeHex), updatedAt: Date.now() } };
  }),

  undo: () => set((s) => {
    if (!s.project || !s.past.length) return {};
    const prev = s.past[s.past.length - 1];
    const past = s.past.slice(0, -1);
    const future = [snap(s.project), ...s.future].slice(0, HISTORY_LIMIT);
    const frames = restoreFrames(prev);
    const animations = restoreAnims(prev);
    const layers = restoreLayers(prev);
    const palette = restorePalette(prev);
    const variations = restoreVariations(prev);
    const rig = restoreRig(prev);
    // revalida seleção
    let { currentAnimationId, currentFrameId } = s;
    if (!animations.some((a) => a.id === currentAnimationId)) {
      currentAnimationId = animations[0]?.id ?? null;
      currentFrameId = animations[0]?.frameIds[0] ?? null;
    } else {
      const anim = animations.find((a) => a.id === currentAnimationId)!;
      if (!currentFrameId || !anim.frameIds.includes(currentFrameId)) {
        currentFrameId = anim.frameIds[0] ?? null;
      }
    }
    let currentLayerId = s.currentLayerId;
    if (!layers.some((l) => l.id === currentLayerId)) {
      currentLayerId = layers[layers.length - 1]?.id ?? null;
    }
    return {
      past, future,
      project: { ...s.project, frames, animations, layers, palette, variations, rig, updatedAt: Date.now() },
      currentAnimationId, currentFrameId, currentLayerId, dirty: true,
    };
  }),

  redo: () => set((s) => {
    if (!s.project || !s.future.length) return {};
    const [next, ...future] = s.future;
    const past = [...s.past, snap(s.project)].slice(-HISTORY_LIMIT);
    const frames = restoreFrames(next);
    const animations = restoreAnims(next);
    const layers = restoreLayers(next);
    const palette = restorePalette(next);
    const variations = restoreVariations(next);
    const rig = restoreRig(next);
    let { currentAnimationId, currentFrameId } = s;
    if (!animations.some((a) => a.id === currentAnimationId)) {
      currentAnimationId = animations[0]?.id ?? null;
      currentFrameId = animations[0]?.frameIds[0] ?? null;
    } else {
      const anim = animations.find((a) => a.id === currentAnimationId)!;
      if (!currentFrameId || !anim.frameIds.includes(currentFrameId)) {
        currentFrameId = anim.frameIds[0] ?? null;
      }
    }
    let currentLayerId = s.currentLayerId;
    if (!layers.some((l) => l.id === currentLayerId)) {
      currentLayerId = layers[layers.length - 1]?.id ?? null;
    }
    return {
      past, future,
      project: { ...s.project, frames, animations, layers, palette, variations, rig, updatedAt: Date.now() },
      currentAnimationId, currentFrameId, currentLayerId, dirty: true,
    };
  }),
}));
