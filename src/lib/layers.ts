import { DEFAULT_FRAME_MS, Frame, FrameAnchor, FrameHitbox, Layer, PlayMode, ProjectData, uid } from '../types';
import { clampMs, fpsToMs } from './timeline';
import { clampAnchor, normalizeHitbox } from './frameMeta';
import { emptyCells } from './pixels';

/**
 * Sistema de layers (FASE B): a unidade de trabalho é frame × layer = cel.
 * Composição é fundo→topo; render aplica opacidade por camada no canvas.
 */

export function createLayer(name: string, opacity = 100): Layer {
  return { id: uid('ly'), name, visible: true, locked: false, opacity };
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
    if (!cels[l.id]) {
      cels[l.id] = emptyCells(project.width, project.height);
      changed = true;
    }
  }
  return changed ? { ...frame, cels } : frame;
}

/** Pilha de composição: só visíveis, fundo→topo. */
export function compositeStack(
  project: ProjectData, frame: Frame,
): Array<{ layer: Layer; cells: string[] }> {
  return stackFromLayers(project.layers, frame);
}

export function stackFromLayers(
  layers: Layer[], frame: Frame,
): Array<{ layer: Layer; cells: string[] }> {
  const out: Array<{ layer: Layer; cells: string[] }> = [];
  for (const layer of layers) {
    if (!layer.visible) continue;
    out.push({ layer, cells: frame.cels[layer.id] ?? [] });
  }
  return out;
}

/** Pilha pronta para render (cells + opacidade), sem metadados. */
export function celStack(layers: Layer[], frame: Frame): Array<{ cells: string[]; opacity: number }> {
  return stackFromLayers(layers, frame).map(({ layer, cells }) => ({ cells, opacity: layer.opacity }));
}

/** Item de frame para os viewers (SpriteCanvas/AnimatedSprite). */
export function frameItem(
  layers: Layer[], frame: Frame,
): { id: string; layers: Array<{ cells: string[]; opacity: number }> } {
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

/**
 * Migração idempotente: projetos antigos (1 camada chapada em `cells`) ganham
 * `layers: [Camada 1]` + `cels`. Projetos novos passam intactos.
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
  if (raw.layers && raw.layers.length > 0) {
    let changed = false;
    const frames: Record<string, Frame> = {};
    for (const [id, f] of Object.entries(raw.frames)) {
      if (f.cels) {
        const meta = legacyMeta(f);
        const ensured = ensureFrameCels({ ...p, layers: raw.layers }, { id, cels: f.cels, durationMs: legacyMs(id, f.durationMs), ...meta });
        frames[id] = ensured;
        if (ensured.cels !== f.cels || f.durationMs === undefined || metaDirty(f, meta)) changed = true;
      } else {
        frames[id] = { id, cels: { [raw.layers[0].id]: f.cells ?? emptyCells(p.width, p.height) }, durationMs: legacyMs(id, f.durationMs), ...legacyMeta(f) };
        changed = true;
      }
    }
    if (!changed && !animsChanged) return p;
    return { ...p, frames, animations };
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
  return { ...p, layers: [layer], frames, animations };
}
