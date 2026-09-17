import { AssetRecipe } from '../../types';
import { ActionId } from '../procgen/motions';
import { ACTION_DEFS } from '../procgen/generator';
import {
  RETARGET_DEFS, RetargetDef, RetargetId, generateRetargetFrames,
} from '../procgen/retarget';
import {
  GeneratedSprite, SpriteKind, generateSprite,
} from '../procgen/sprites';
import { StyleId } from '../procgen/styles';
import { SkeletonId, skeletonForRecipe } from './skeletons';

/**
 * Motion Library (§7/§8 da spec): o movimento pertence ao ESQUELETO,
 * não ao personagem. Cada entrada resolve para frames reais através
 * dos motores existentes (rig hierárquico, retarget image-space ou
 * procedural de objetos).
 */
export type MotionEngine = 'rig' | 'retarget' | 'procedural';

export interface MotionDef {
  id: string;
  label: string;
  desc: string;
  engine: MotionEngine;
  /** referência no motor: ActionId | RetargetId | action procedural */
  ref: string;
  frames: number;
  fps: number;
  intensity: number;
}

/** Os 6 movimentos do rig, vindos do motor real (sem duplicar dados). */
export const RIG_MOTIONS: MotionDef[] = ACTION_DEFS.map((d) => ({
  id: `rig:${d.id}`,
  label: d.label,
  desc: d.desc,
  engine: 'rig',
  ref: d.id,
  frames: d.frames,
  fps: d.fps,
  intensity: 0.6,
}));

/** Os 7 presets image-space, vindos do motor real. Funcionam em QUALQUER pixel. */
export const RETARGET_MOTIONS: MotionDef[] = RETARGET_DEFS.map((d) => ({
  id: `retarget:${d.id}`,
  label: d.label,
  desc: d.desc,
  engine: 'retarget',
  ref: d.id,
  frames: d.frames,
  fps: d.fps,
  intensity: 0.7,
}));

const OBJECT_MOTIONS: Record<string, MotionDef[]> = {
  arma: [
    { id: 'proc:idle', label: 'flutuar', desc: 'Levitação suave', engine: 'procedural', ref: 'idle', frames: 4, fps: 6, intensity: 0.6 },
    { id: 'proc:brilho', label: 'brilho', desc: 'Luz varrendo o metal', engine: 'procedural', ref: 'brilho', frames: 6, fps: 10, intensity: 0.6 },
  ],
  item: [
    { id: 'proc:idle', label: 'flutuar', desc: 'Levitação suave', engine: 'procedural', ref: 'idle', frames: 4, fps: 6, intensity: 0.6 },
    { id: 'proc:brilho', label: 'brilho', desc: 'Faíscas cintilantes', engine: 'procedural', ref: 'brilho', frames: 4, fps: 8, intensity: 0.6 },
  ],
  efeito: [
    { id: 'proc:tocar', label: 'efeito', desc: 'Toca o efeito uma vez', engine: 'procedural', ref: 'tocar', frames: 6, fps: 12, intensity: 0.6 },
  ],
};

/** Catálogo completo de movimentos para uma receita (rig/procedural + retarget). */
export function motionsForRecipe(r: AssetRecipe): MotionDef[] {
  const skel: SkeletonId = skeletonForRecipe(r);
  const structural = skel === 'object'
    ? (OBJECT_MOTIONS[r.kind] ?? OBJECT_MOTIONS.item)
    : RIG_MOTIONS;
  return [...structural, ...RETARGET_MOTIONS];
}

/** Movimentos aplicáveis a um asset manual (sem receita): só image-space. */
export function motionsForManual(): MotionDef[] {
  return RETARGET_MOTIONS;
}

/* ------------------------------ resolução ------------------------------ */

export interface SpriteRequestLike {
  kind: SpriteKind;
  seed: number;
  style: StyleId;
  size: number;
  outline: boolean;
  subtype: string;
  hueShift: number;
  actions: Array<{ id: string; frames: number }>;
  energy: number;
  amplitude: number;
  bounce: number;
}

export function requestFromRecipe(r: AssetRecipe, actions?: Array<{ id: string; frames: number }>): SpriteRequestLike {
  return {
    kind: r.kind as SpriteKind,
    seed: r.seed,
    style: r.style as StyleId,
    size: r.size,
    outline: r.outline,
    subtype: r.subtype,
    hueShift: r.hueShift,
    actions: actions ?? r.actions,
    energy: r.motion?.energy ?? 0.6,
    amplitude: r.motion?.amplitude ?? 0.6,
    bounce: r.motion?.bounce ?? 0.6,
  };
}

/** Renderiza o asset inteiro a partir da receita (o Master como fonte da verdade). */
export function renderRecipe(r: AssetRecipe): GeneratedSprite {
  return generateSprite(requestFromRecipe(r));
}

export interface ResolvedMotion {
  label: string;
  fps: number;
  frames: string[][];
}

/**
 * Resolve UM movimento para frames reais.
 * - rig/procedural: regenera via motor procedural (determinístico pela receita)
 * - retarget: aplica o preset sobre `sourceCells` (frame atual do usuário)
 */
export function resolveMotion(
  r: AssetRecipe | null, motion: MotionDef, sourceCells?: string[], size?: number,
): ResolvedMotion {
  if (motion.engine === 'retarget') {
    const def = RETARGET_DEFS.find((d) => d.id === (motion.ref as RetargetId)) as RetargetDef;
    let base = sourceCells;
    let w = size ?? 32;
    if (!base && r) {
      const rendered = renderRecipe(r);
      base = rendered.actions[0]?.frames[0];
      w = rendered.size;
    }
    if (!base) throw new Error('Movimento image-space precisa de um frame base.');
    return {
      label: motion.label,
      fps: motion.fps,
      frames: generateRetargetFrames(base, w, w, def, motion.frames, motion.intensity),
    };
  }
  if (!r) throw new Error('Movimento estrutural precisa da receita do asset.');
  const rendered = generateSprite(requestFromRecipe(r, [{ id: motion.ref as ActionId as string, frames: motion.frames }]));
  const action = rendered.actions[0];
  if (!action) throw new Error(`Motor não resolveu o movimento ${motion.id}.`);
  return { label: action.label, fps: action.fps, frames: action.frames };
}
