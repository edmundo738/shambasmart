import { BlendMode, Bone, DEFAULT_FRAME_MS, Frame, FrameAnchor, FrameHitbox, Layer, LayerKind, PlayMode, ProjectData, uid } from '../types';
import { clampMs, fpsToMs } from './timeline';
import { clampAnchor, normalizeHitbox } from './frameMeta';
import { emptyCells } from './pixels';

/**
 * Sistema de layers (FASE B): a unidade de trabalho é frame × layer = cel.
 * Composição é fundo→topo; render aplica opacidade por camada no canvas.
 */

export function createLayer(name: string, opacity = 100, parentId: string | null = null): Layer {
  return {
    id: uid('ly'), name, kind: 'raster', parentId, expanded: true,
    visible: true, locked: false, alphaLock: false, clipping: false, blendMode: 'normal', opacity,
  };
}

export function createGroup(name: string, opacity = 100, parentId: string | null = null): Layer {
  return {
    id: uid('ly'), name, kind: 'group', parentId, expanded: true,
    visible: true, locked: false, alphaLock: false, clipping: false, blendMode: 'normal', opacity,
  };
}

export function makeFrame(layerId: string, cells: string[], durationMs = DEFAULT_FRAME_MS): Frame {
  return { id: uid('fr'), cels: { [layerId]: cells }, durationMs: clampMs(durationMs), anchors: [], hitbox: null };
}

export function layerById(project: ProjectData, id: string | null): Layer | undefined {
  return project.layers.find((l) => l.id === id);
}

/** Garante uma cel (vazia se preciso) para cada layer do projeto. */
export function ensureFrameCels(project: ProjectData, frame: Frame): Frame {
  let changed = false;
  const cels = { ...frame.cels };
  for (const l of project.layers) {
    if (l.kind === 'group') continue;
    if (!cels[l.id]) {
      cels[l.id] = emptyCells(project.width, project.height);
      changed = true;
    }
  }
  return changed ? { ...frame, cels } : frame;
}

/** Blend modes do modelo para Canvas 2D. `add` é o nome pixel-art, Canvas chama-lhe lighter. */
export function canvasBlendMode(mode: BlendMode): GlobalCompositeOperation {
  if (mode === 'add') return 'lighter';
  if (mode === 'multiply' || mode === 'screen' || mode === 'overlay') return mode;
  return 'source-over';
}

export interface CompositeLayer {
  layer: Layer;
  cells: string[];
  opacity: number;
  blendMode: BlendMode;
  clipping: boolean;
}

/**
 * Pilha de composição: árvore de grupos achatada fundo→topo. Grupos acumulam
 * visibilidade/opacidade; clipping usa a máscara alfa da raster imediatamente
 * abaixo. O array continua compacto para os viewers antigos.
 */
export function compositeStack(project: ProjectData, frame: Frame): CompositeLayer[] {
  return stackFromLayers(project.layers, frame);
}

export function stackFromLayers(layers: Layer[], frame: Frame): CompositeLayer[] {
  // A composição também é defensiva contra JSON externo malformado: parent só
  // aponta para grupo existente e ciclos são quebrados no elo que os fecharia.
  const byId = new Map(layers.map((layer) => [layer.id, layer]));
  const parentOf = new Map<string, string | null>();
  for (const layer of layers) {
    const parent = byId.get(layer.parentId ?? '')?.kind === 'group' && layer.parentId !== layer.id
      ? layer.parentId : null;
    parentOf.set(layer.id, parent);
  }
  for (const layer of layers) {
    const seen = new Set<string>([layer.id]);
    let parent = parentOf.get(layer.id) ?? null;
    while (parent) {
      if (seen.has(parent)) {
        parentOf.set(layer.id, null);
        break;
      }
      seen.add(parent);
      parent = parentOf.get(parent) ?? null;
    }
  }
  const byParent = new Map<string | null, Layer[]>();
  for (const layer of layers) {
    const parent = parentOf.get(layer.id) ?? null;
    const list = byParent.get(parent) ?? [];
    list.push(layer);
    byParent.set(parent, list);
  }
  const out: CompositeLayer[] = [];
  const visit = (parentId: string | null, parentVisible: boolean, parentOpacity: number, parentBlend: BlendMode) => {
    for (const layer of byParent.get(parentId) ?? []) {
      const visible = parentVisible && layer.visible;
      if (!visible) continue;
      const opacity = parentOpacity * Math.max(0, Math.min(1, layer.opacity / 100));
      const blendMode = layer.blendMode !== 'normal' ? layer.blendMode : parentBlend;
      if (layer.kind === 'group') {
        visit(layer.id, visible, opacity, blendMode);
        continue;
      }
      const raw = frame.cels[layer.id] ?? [];
      const previous = out[out.length - 1];
      const cells = layer.clipping && previous
        ? raw.map((c, i) => c && previous.cells[i] ? c : '')
        : raw;
      out.push({ layer, cells, opacity: opacity * 100, blendMode, clipping: layer.clipping });
    }
  };
  visit(null, true, 1, 'normal');
  return out;
}

/** Pilha pronta para render (cells + opacidade + blend), compatível com SpriteView. */
export function celStack(layers: Layer[], frame: Frame): Array<{ cells: string[]; opacity: number; blendMode?: BlendMode; clipping?: boolean }> {
  return stackFromLayers(layers, frame).map(({ cells, opacity, blendMode, clipping }) => ({
    cells, opacity,
    ...(blendMode !== 'normal' ? { blendMode } : {}),
    ...(clipping ? { clipping } : {}),
  }));
}

/** Item de frame para os viewers (SpriteCanvas/AnimatedSprite). */
export function frameItem(
  layers: Layer[], frame: Frame,
): { id: string; layers: Array<{ cells: string[]; opacity: number; blendMode?: BlendMode; clipping?: boolean }> } {
  return { id: frame.id, layers: celStack(layers, frame) };
}

/**
 * Mescla chapada (topo vence, só visíveis). Usada por conta-gotas, onion skin,
 * thumbnails simples e motores procedurais. Opacidade é ignorada aqui — o render
 * real aplica alpha por camada no canvas.
 */
export function flattenCells(project: ProjectData, frame: Frame): string[] {
  const out = emptyCells(project.width, project.height);
  for (const { cells } of compositeStack(project, frame)) {
    for (let i = 0; i < out.length && i < cells.length; i++) {
      if (cells[i]) out[i] = cells[i];
    }
  }
  return out;
}

function normalizeLayer(raw: Partial<Layer>, index: number): Layer {
  const kind: LayerKind = raw.kind === 'group' ? 'group' : 'raster';
  const blendMode: BlendMode = raw.blendMode === 'multiply' || raw.blendMode === 'screen' || raw.blendMode === 'overlay' || raw.blendMode === 'add' ? raw.blendMode : 'normal';
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid('ly'),
    name: typeof raw.name === 'string' && raw.name ? raw.name.slice(0, 32) : `Camada ${index + 1}`,
    kind,
    parentId: typeof raw.parentId === 'string' ? raw.parentId : null,
    expanded: raw.expanded !== false,
    visible: raw.visible !== false,
    locked: raw.locked === true,
    alphaLock: raw.alphaLock === true,
    clipping: raw.clipping === true && kind === 'raster',
    blendMode,
    opacity: typeof raw.opacity === 'number' && Number.isFinite(raw.opacity) ? Math.max(0, Math.min(100, Math.round(raw.opacity))) : 100,
  };
}

function normalizeLayers(raw: Layer[]): Layer[] {
  const layers = raw.map((layer, index) => normalizeLayer(layer, index));
  const byId = new Map(layers.map((layer) => [layer.id, layer]));
  const parentOf = new Map<string, string | null>();
  for (const layer of layers) {
    parentOf.set(layer.id, byId.get(layer.parentId ?? '')?.kind === 'group' && layer.parentId !== layer.id
      ? layer.parentId : null);
  }
  for (const layer of layers) {
    const seen = new Set<string>([layer.id]);
    let parent = parentOf.get(layer.id) ?? null;
    while (parent) {
      if (seen.has(parent)) {
        parentOf.set(layer.id, null);
        break;
      }
      seen.add(parent);
      parent = parentOf.get(parent) ?? null;
    }
  }
  return layers.map((layer) => ({ ...layer, parentId: parentOf.get(layer.id) ?? null }));
}

/**
 * Migração idempotente: projetos antigos (1 camada chapada em `cells`) ganham
 * `layers: [Camada 1]` + `cels`; layers B1 ganham defaults de grupo/blend/alpha-lock.
 */
export function migrateProject(p: ProjectData): ProjectData {
  const raw = p as unknown as {
    layers?: Layer[];
    frames: Record<string, {
      id: string; cels?: Record<string, string[]>; cells?: string[]; durationMs?: number;
      anchors?: FrameAnchor[]; hitbox?: FrameHitbox | null;
    }>;
  };
  // fps da primeira ação que contém o frame -> preserva o timing de projetos legados
  const fpsOf = new Map<string, number>();
  for (const a of p.animations ?? []) {
    for (const fid of a.frameIds ?? []) {
      if (!fpsOf.has(fid)) fpsOf.set(fid, a.fps);
    }
  }
  const legacyMs = (id: string, v: number | undefined) =>
    typeof v === 'number' ? clampMs(v) : fpsOf.has(id) ? fpsToMs(fpsOf.get(id)!) : DEFAULT_FRAME_MS;
  const legacyMeta = (f: { anchors?: unknown; hitbox?: unknown }) => {
    const anchors: FrameAnchor[] = [];
    if (Array.isArray(f.anchors)) {
      for (const a of f.anchors as FrameAnchor[]) {
        if (!a || typeof a !== 'object') continue;
        anchors.push(clampAnchor({
          id: typeof a.id === 'string' && a.id ? a.id : uid('an'),
          name: typeof a.name === 'string' && a.name ? a.name.slice(0, 24) : 'ponto',
          x: a.x, y: a.y,
        }, p.width, p.height));
      }
    }
    const hb = f.hitbox as FrameHitbox | null | undefined;
    const hitbox = hb && typeof hb === 'object' ? normalizeHitbox(hb, p.width, p.height) : null;
    return { anchors, hitbox };
  };
  const metaDirty = (f: { anchors?: unknown; hitbox?: unknown }, meta: { anchors: FrameAnchor[]; hitbox: FrameHitbox | null }) =>
    f.anchors === undefined || f.hitbox === undefined
    || JSON.stringify(f.anchors) !== JSON.stringify(meta.anchors)
    || JSON.stringify(f.hitbox ?? null) !== JSON.stringify(meta.hitbox);
  let animsChanged = false;
  const animations = (p.animations ?? []).map((a) => {
    const mode = (a as { playMode?: PlayMode }).playMode;
    if (mode === 'loop' || mode === 'pingpong' || mode === 'reverse') return a;
    animsChanged = true;
    return { ...a, playMode: 'loop' as PlayMode };
  });
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  let rigChanged = false;
  let rig: Bone[];
  const rawRig = (p as { rig?: unknown }).rig;
  if (Array.isArray(rawRig)) {
    rig = [];
    for (const b of rawRig as Bone[]) {
      if (!b || typeof b !== 'object' || typeof b.id !== 'string' || !b.id) {
        rigChanged = true;
        continue;
      }
      const clean: Bone = {
        id: b.id,
        name: typeof b.name === 'string' && b.name ? b.name.slice(0, 24) : 'osso',
        parentId: typeof b.parentId === 'string' ? b.parentId : null,
        x: num(b.x), y: num(b.y), rotation: num(b.rotation), length: Math.max(0, num(b.length)),
      };
      rig.push(clean);
      if (JSON.stringify(b) !== JSON.stringify(clean)) rigChanged = true;
    }
  } else {
    rig = [];
    rigChanged = true;
  }
  if (raw.layers && raw.layers.length > 0) {
    const layers = normalizeLayers(raw.layers);
    const firstRasterId = layers.find((layer) => layer.kind === 'raster')?.id ?? layers[0].id;
    const layersChanged = JSON.stringify(layers) !== JSON.stringify(raw.layers);
    let changed = layersChanged;
    const frames: Record<string, Frame> = {};
    for (const [id, f] of Object.entries(raw.frames)) {
      if (f.cels) {
        const meta = legacyMeta(f);
        const ensured = ensureFrameCels({ ...p, layers }, { id, cels: f.cels, durationMs: legacyMs(id, f.durationMs), ...meta });
        frames[id] = ensured;
        if (ensured.cels !== f.cels || f.durationMs === undefined || metaDirty(f, meta)) changed = true;
      } else {
        frames[id] = { id, cels: { [firstRasterId]: f.cells ?? emptyCells(p.width, p.height) }, durationMs: legacyMs(id, f.durationMs), ...legacyMeta(f) };
        changed = true;
      }
    }
    if (!changed && !animsChanged && !rigChanged) return p;
    return { ...p, layers, frames, animations, rig };
  }
  const layer = createLayer('Camada 1');
  const frames: Record<string, Frame> = {};
  for (const [id, f] of Object.entries(raw.frames)) {
    frames[id] = {
      id,
      cels: { [layer.id]: f.cels ? (Object.values(f.cels)[0] ?? emptyCells(p.width, p.height)) : (f.cells ?? emptyCells(p.width, p.height)) },
      durationMs: legacyMs(id, f.durationMs),
      ...legacyMeta(f),
    };
  }
  return { ...p, layers: [layer], frames, animations, rig };
}
