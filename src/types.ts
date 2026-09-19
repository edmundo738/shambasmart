/** Célula: "" = transparente, ou cor hexadecimal "#rrggbb" */
export type Cell = string;

export type LayerKind = 'raster' | 'group';
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'add';

export interface Layer {
  id: string;
  name: string;
  kind: LayerKind;
  /** Ordem visual: parentId aponta para uma layer kind=group; null = raiz. */
  parentId: string | null;
  /** Grupo aberto no painel (não altera a renderização). */
  expanded: boolean;
  visible: boolean;
  locked: boolean;
  alphaLock: boolean;
  /** Clipping: máscara pela layer raster imediatamente abaixo. */
  clipping: boolean;
  blendMode: BlendMode;
  /** 0..100 */
  opacity: number;
}

/** Ponto nomeado no frame (pivô, mão, ponta da arma...): coordenadas inteiras de pixel. */
export interface FrameAnchor {
  id: string;
  name: string;
  x: number;
  y: number;
}

/** Caixa de colisão do frame: origem + tamanho em pixels (w/h >= 1). */
export interface FrameHitbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Osso do esqueleto-guia (repouso). x/y = posição local relativa à junta do pai
 * (raízes usam coords do canvas); rotation em graus; corpo vai da junta ao tip (+X local).
 */
export interface Bone {
  id: string;
  name: string;
  parentId: string | null;
  x: number;
  y: number;
  rotation: number;
  length: number;
}

/** Pose de um osso num frame: local absoluto (x, y, rotação). */
export interface BonePose {
  x: number;
  y: number;
  rotation: number;
}

/** Pose do frame: esparsa — só ossos que diferem do repouso. */
export type FramePose = Record<string, BonePose>;

export interface Frame {
  id: string;
  /** cel por layer: layerId -> pixels (frame × layer = cel) */
  cels: Record<string, Cell[]>;
  /** duração do frame em ms — fonte da verdade do timing (playback, preview, GIF) */
  durationMs: number;
  /** âncoras do frame (vazio = sem pontos) */
  anchors: FrameAnchor[];
  /** hitbox do frame (null = sem colisão) */
  hitbox: FrameHitbox | null;
  /** pose do esqueleto neste frame (ausente = repouso) */
  pose?: FramePose;
}

/** Timing padrão (100ms = 10fps) e limites do editor. */
export const DEFAULT_FRAME_MS = 100;
export const MIN_FRAME_MS = 20;
export const MAX_FRAME_MS = 2000;

/** Modo de reprodução da ação: loop, ping-pong (vai-e-volta) ou reverso. */
export type PlayMode = 'loop' | 'pingpong' | 'reverse';

export interface Animation {
  id: string;
  name: string;
  fps: number;
  frameIds: string[];
  playMode: PlayMode;
}

export interface Variation {
  id: string;
  name: string;
  /** remapeamento cor original -> nova cor */
  mapping: Record<string, string>;
  /** ajustes globais HSL aplicados após o remapeamento */
  hue: number; // -180..180
  sat: number; // -100..100
  light: number; // -100..100
}

export interface AssetRecipe {
  version: 1;
  kind: string;
  seed: number;
  subtype: string;
  style: string;
  size: number;
  outline: boolean;
  hueShift: number;
  actions: Array<{ id: string; frames: number; fps: number }>;
  motion?: { energy: number; amplitude: number; bounce: number };
}

export interface ProjectData {
  id: string;
  name: string;
  width: number;
  height: number;
  /** ordem: índice 0 = fundo */
  layers: Layer[];
  frames: Record<string, Frame>;
  animations: Animation[];
  variations: Variation[];
  palette: string[];
  /** esqueleto-guia do projeto (FK); vazio = sem rig */
  rig: Bone[];
  recipe?: AssetRecipe;
  bundle?: string;
  createdAt: number;
  updatedAt: number;
}

export type ToolId = 'brush' | 'eraser' | 'fill' | 'picker' | 'line' | 'rect' | 'ellipse' | 'select' | 'transform' | 'meta' | 'bone';

/** Geometria da seleção E3; máscaras continuam pixel-perfect e têm bbox para mover/transformar. */
export type SelectionShape = 'rect' | 'ellipse' | 'lasso' | 'wand';
export type TransformMode = 'move' | 'object' | 'push';

/** Seleção retangular (coordenadas inclusivas, normalizadas: x0<=x1, y0<=y1). */
export interface SelRect {
  x0: number; y0: number; x1: number; y1: number;
}

export type EnginePreset = 'generic' | 'phaser' | 'godot' | 'unity' | 'gamemaker';

export interface ExportOptions {
  scope: 'animation' | 'pack';
  format: 'spritesheet' | 'sequence' | 'gif' | 'single';
  engine: EnginePreset;
  scale: number;
  columns: number;
  padding: number;
  includeJson: boolean;
  background: string; // "" = transparente
}

export const ORIGINAL_VARIATION_ID = '__original__';

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
