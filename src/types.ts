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

export interface Frame {
  id: string;
  /** cel por layer: layerId -> pixels (frame × layer = cel) */
  cels: Record<string, Cell[]>;
}

export interface Animation {
  id: string;
  name: string;
  fps: number;
  frameIds: string[];
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

export type ToolId = 'brush' | 'eraser' | 'fill' | 'picker' | 'line' | 'rect' | 'ellipse';

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
