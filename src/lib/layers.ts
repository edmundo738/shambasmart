import { Frame, Layer, ProjectData, uid } from '../types';
import { emptyCells } from './pixels';

/**
 * Sistema de layers (FASE B): a unidade de trabalho é frame × layer = cel.
 * Composição é fundo→topo; render aplica opacidade por camada no canvas.
 */

export function createLayer(name: string, opacity = 100): Layer {
  return { id: uid('ly'), name, visible: true, locked: false, opacity };
}

export function makeFrame(layerId: string, cells: string[]): Frame {
  return { id: uid('fr'), cels: { [layerId]: cells } };
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
    frames: Record<string, { id: string; cels?: Record<string, string[]>; cells?: string[] }>;
  };
  if (raw.layers && raw.layers.length > 0) {
    let changed = false;
    const frames: Record<string, Frame> = {};
    for (const [id, f] of Object.entries(raw.frames)) {
      if (f.cels) {
        const ensured = ensureFrameCels({ ...p, layers: raw.layers }, { id, cels: f.cels });
        frames[id] = ensured;
        if (ensured.cels !== f.cels) changed = true;
      } else {
        frames[id] = { id, cels: { [raw.layers[0].id]: f.cells ?? emptyCells(p.width, p.height) } };
        changed = true;
      }
    }
    if (!changed) return p;
    return { ...p, frames };
  }
  const layer = createLayer('Camada 1');
  const frames: Record<string, Frame> = {};
  for (const [id, f] of Object.entries(raw.frames)) {
    frames[id] = {
      id,
      cels: { [layer.id]: f.cels ? (Object.values(f.cels)[0] ?? emptyCells(p.width, p.height)) : (f.cells ?? emptyCells(p.width, p.height)) },
    };
  }
  return { ...p, layers: [layer], frames };
}
