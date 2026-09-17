/** Célula: "" = transparente, ou cor hexadecimal "#rrggbb" */
export type Cell = string;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
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
  recipe?: AssetRecipe;
  bundle?: string;
  createdAt: number;
  updatedAt: number;
}

export type ToolId = 'brush' | 'eraser' | 'fill' | 'picker' | 'line' | 'rect' | 'ellipse' | 'select' | 'meta';

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
