import { create } from 'zustand';
import {
  Animation, Frame, Layer, ORIGINAL_VARIATION_ID, ProjectData, ToolId, Variation, uid,
} from '../types';
import { emptyCells } from '../lib/pixels';
import { createLayer, makeFrame, migrateProject } from '../lib/layers';
import { normalizeHex } from '../lib/color';
import { TEMPLATES } from '../lib/templates';

interface HistorySnap {
  frames: Record<string, Frame>;
  animations: Animation[];
  layers: Layer[];
}

function snap(project: ProjectData): HistorySnap {
  return {
    frames: JSON.parse(JSON.stringify(project.frames)),
    animations: JSON.parse(JSON.stringify(project.animations)),
    layers: JSON.parse(JSON.stringify(project.layers)),
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

interface StudioState {
  project: ProjectData | null;
  tool: ToolId;
  color: string;
  brushSize: number;
  pixelPerfect: boolean;
  mirrorX: boolean;
  mirrorY: boolean;
  showGrid: boolean;
  onionSkin: boolean;
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
  setBrushSize: (n: number) => void;
  togglePixelPerfect: () => void;
  toggleMirrorX: () => void;
  toggleMirrorY: () => void;
  toggleGrid: () => void;
  toggleOnion: () => void;
  setZoom: (z: number) => void;
  setPlaying: (b: boolean) => void;
  select: (animId: string | null, frameId?: string | null) => void;
  setVariation: (id: string) => void;

  // camadas
  selectLayer: (id: string) => void;
  addLayer: (name?: string) => void;
  renameLayer: (id: string, name: string) => void;
  deleteLayer: (id: string) => void;
  moveLayer: (id: string, dir: -1 | 1) => void;
  toggleLayerVis: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;

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
  clearFrame: (id: string) => void;

  // animações
  addAnimation: (name?: string) => void;
  renameAnimation: (id: string, name: string) => void;
  deleteAnimation: (id: string) => void;
  duplicateAnimation: (id: string) => void;
  addAnimationWithFrames: (name: string, fps: number, framesCells: string[][]) => void;
  setAnimFps: (id: string, fps: number) => void;

  // variações
  addVariation: (name?: string) => string;
  updateVariation: (id: string, patch: Partial<Variation>) => void;
  deleteVariation: (id: string) => void;
  autoVariations: () => void;

  // paleta
  setPaletteSlot: (i: number, color: string) => void;
  addPaletteColor: (color: string) => void;
  removePaletteColor: (i: number) => void;
  loadPalette: (colors: string[]) => void;

  // histórico
  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 60;

function pushHistory(state: StudioState): Partial<StudioState> {
  if (!state.project) return {};
  const past = [...state.past, snap(state.project)];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { past, future: [], dirty: true };
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
  brushSize: 1,
  pixelPerfect: true,
  mirrorX: false,
  mirrorY: false,
  showGrid: true,
  onionSkin: true,
  zoom: 12,
  playing: true,
  currentAnimationId: null,
  currentFrameId: null,
  currentLayerId: null,
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
    variationId: ORIGINAL_VARIATION_ID,
    past: [],
    future: [],
    dirty: false,
    playing: true,
    });
  },

  newEmptyProject: (name, w, h) => {
    const layer = createLayer('Camada 1');
    const frame: Frame = makeFrame(layer.id, emptyCells(w, h));
    const anim: Animation = { id: uid('an'), name: 'idle', fps: 8, frameIds: [frame.id] };
    const now = Date.now();
    const project: ProjectData = {
      id: uid('pj'), name, width: w, height: h,
      layers: [layer],
      frames: { [frame.id]: frame },
      animations: [anim],
      variations: [],
      palette: ['#10131d', '#ffffff', '#ff4d6d', '#ff8a00', '#ffd23f', '#8ee000', '#3fd65f', '#22b8f0'],
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
  setBrushSize: (brushSize) => set({ brushSize: Math.max(1, Math.min(8, brushSize)) }),
  togglePixelPerfect: () => set((s) => ({ pixelPerfect: !s.pixelPerfect })),
  toggleMirrorX: () => set((s) => ({ mirrorX: !s.mirrorX })),
  toggleMirrorY: () => set((s) => ({ mirrorY: !s.mirrorY })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleOnion: () => set((s) => ({ onionSkin: !s.onionSkin })),
  setZoom: (zoom) => set({ zoom: Math.max(4, Math.min(32, zoom)) }),
  setPlaying: (playing) => set({ playing }),

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

  addLayer: (name) => set((s) => {
    if (!s.project) return {};
    const hist = pushHistory(s);
    const layer = createLayer(name || `Camada ${s.project.layers.length + 1}`);
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
    const hist = pushHistory(s);
    const layers = s.project.layers.filter((l) => l.id !== id);
    const frames: Record<string, Frame> = {};
    for (const [fid, f] of Object.entries(s.project.frames)) {
      const cels = { ...f.cels };
      delete cels[id];
      frames[fid] = { ...f, cels };
    }
    return {
      ...hist,
      project: { ...s.project, layers, frames, updatedAt: Date.now() },
      currentLayerId: s.currentLayerId === id ? layers[layers.length - 1].id : s.currentLayerId,
    };
  }),

  moveLayer: (id, dir) => set((s) => {
    if (!s.project) return {};
    const i = s.project.layers.findIndex((l) => l.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= s.project.layers.length) return {};
    const hist = pushHistory(s);
    const layers = [...s.project.layers];
    [layers[i], layers[j]] = [layers[j], layers[i]];
    return { ...hist, project: { ...s.project, layers, updatedAt: Date.now() } };
  }),

  // visibilidade, lock e opacidade são estado de vista (como grade/onion): sem undo
  toggleLayerVis: (id) => set((s) => {
    if (!s.project) return {};
    return {
      project: {
        ...s.project,
        layers: s.project.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
        updatedAt: Date.now(),
      },
      dirty: true,
    };
  }),

  toggleLayerLock: (id) => set((s) => {
    if (!s.project) return {};
    return {
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
    return {
      project: {
        ...s.project,
        layers: s.project.layers.map((l) => (l.id === id ? { ...l, opacity: Math.max(0, Math.min(100, Math.round(opacity))) } : l)),
        updatedAt: Date.now(),
      },
      dirty: true,
    };
  }),

  beginStroke: () => set((s) => pushHistory(s)),

  paint: (indices, color) => set((s) => {
    if (!s.project || !s.currentFrameId) return {};
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.locked) return {};
    const frame = s.project.frames[s.currentFrameId];
    if (!frame) return {};
    const cells = [...(frame.cels[layer.id] ?? emptyCells(s.project.width, s.project.height))];
    const value = color === null ? '' : normalizeHex(color);
    for (const i of indices) cells[i] = value;
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
    if (layer.locked) return {};
    const frame = s.project.frames[s.currentFrameId];
    if (!frame) return {};
    const cells = [...(frame.cels[layer.id] ?? emptyCells(s.project.width, s.project.height))];
    for (const [i, c] of patches) cells[i] = c ? normalizeHex(c) : '';
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
    if (!s.project) return;
    set(pushHistory(s));
    get().paint(indices, color);
  },

  addFrame: () => set((s) => {
    if (!s.project) return {};
    const anim = currentAnim(s.project, s.currentAnimationId);
    if (!anim) return {};
    const hist = pushHistory(s);
    const frame: Frame = { id: uid('fr'), cels: emptyCels(s.project) };
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
    const frame: Frame = { id: uid('fr'), cels: cloneCels(src, s.project) };
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
    const currentFrameId = s.currentFrameId === id ? frameIds[Math.max(0, frameIds.indexOf(id) - 0)] ?? frameIds[0] : s.currentFrameId;
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

  clearFrame: (id) => set((s) => {
    if (!s.project || !s.project.frames[id]) return {};
    const layer = currentLayer(s.project, s.currentLayerId);
    if (layer.locked) return {};
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
    const frame: Frame = { id: uid('fr'), cels: emptyCels(s.project) };
    const count = s.project.animations.length + 1;
    const anim: Animation = { id: uid('an'), name: name || `acao_${count}`, fps: 8, frameIds: [frame.id] };
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
    return {
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
      const copy: Frame = { id: uid('fr'), cels: cloneCels(f, s.project!) };
      frames[copy.id] = copy;
      return copy.id;
    });
    const anim: Animation = { id: uid('an'), name: `${src.name}_copia`, fps: src.fps, frameIds };
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
    const target = s.project.layers.find((l) => l.id === s.currentLayerId && !l.locked)
      ?? s.project.layers.find((l) => !l.locked)
      ?? s.project.layers[0];
    const frameIds = framesCells.map((cells) => {
      const cels = emptyCels(s.project!);
      if (target) cels[target.id] = [...cells];
      const f: Frame = { id: uid('fr'), cels };
      frames[f.id] = f;
      return f.id;
    });
    const existing = new Set(s.project.animations.map((a) => a.name));
    let finalName = name.trim().slice(0, 24) || 'auto';
    let k = 2;
    while (existing.has(finalName)) finalName = `${name.trim().slice(0, 20)}_${k++}`;
    const anim: Animation = { id: uid('an'), name: finalName, fps: Math.max(1, Math.min(60, fps)), frameIds };
    return {
      ...hist,
      project: { ...s.project, frames, animations: [...s.project.animations, anim], updatedAt: Date.now() },
      currentAnimationId: anim.id,
      currentFrameId: frameIds[0] ?? null,
    };
  }),

  setAnimFps: (id, fps) => set((s) => {
    if (!s.project) return {};
    return {
      project: {
        ...s.project,
        animations: s.project.animations.map((a) => (a.id === id ? { ...a, fps: Math.max(1, Math.min(60, fps)) } : a)),
        updatedAt: Date.now(),
      },
      dirty: true,
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
      project: { ...s.project, variations: [...s.project.variations, v], updatedAt: Date.now() },
      variationId: v.id,
      dirty: true,
    });
    return v.id;
  },

  updateVariation: (id, patch) => set((s) => {
    if (!s.project) return {};
    if (patch.name !== undefined && !patch.name.trim()) return {};
    return {
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
    return {
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
      project: { ...s.project, variations: [...s.project.variations, ...fresh], updatedAt: Date.now() },
      variationId: fresh[0].id,
      dirty: true,
    });
  },

  setPaletteSlot: (i, color) => set((s) => {
    if (!s.project) return {};
    const palette = [...s.project.palette];
    palette[i] = normalizeHex(color);
    return { project: { ...s.project, palette, updatedAt: Date.now() }, dirty: true };
  }),

  addPaletteColor: (color) => set((s) => {
    if (!s.project) return {};
    const c = normalizeHex(color);
    if (s.project.palette.includes(c)) return {};
    return { project: { ...s.project, palette: [...s.project.palette, c], updatedAt: Date.now() }, dirty: true };
  }),

  removePaletteColor: (i) => set((s) => {
    if (!s.project) return {};
    const palette = s.project.palette.filter((_, k) => k !== i);
    return { project: { ...s.project, palette, updatedAt: Date.now() }, dirty: true };
  }),

  loadPalette: (colors) => set((s) => {
    if (!s.project) return {};
    return { project: { ...s.project, palette: colors.map(normalizeHex), updatedAt: Date.now() }, dirty: true };
  }),

  undo: () => set((s) => {
    if (!s.project || !s.past.length) return {};
    const prev = s.past[s.past.length - 1];
    const past = s.past.slice(0, -1);
    const future = [snap(s.project), ...s.future].slice(0, HISTORY_LIMIT);
    const frames = restoreFrames(prev);
    const animations = restoreAnims(prev);
    const layers = restoreLayers(prev);
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
      project: { ...s.project, frames, animations, layers, updatedAt: Date.now() },
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
      project: { ...s.project, frames, animations, layers, updatedAt: Date.now() },
      currentAnimationId, currentFrameId, currentLayerId, dirty: true,
    };
  }),
}));
