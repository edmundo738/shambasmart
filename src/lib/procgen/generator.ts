import { Rng } from './rng';
import { Rig, rasterize } from './rig';
import { BODY_TYPES, BodyType, MoodId, buildBody, characterName, scaleNodes } from './bodies';
import { ActionId, MotionParams, samplePose } from './motions';

export type RigGroup = 'biped' | 'blob' | 'quad';

export interface CharSpec {
  seed: number;
  body: BodyType;
  group: RigGroup;
  name: string;
  rig: Rig;
  swatches: string[];
  traits: string[];
  motion: { wave: 'sine' | 'tri'; blinkAt: number };
}

export interface ActionDef {
  id: ActionId;
  label: string;
  desc: string;
  frames: number;
  fps: number;
}

export const ACTION_DEFS: ActionDef[] = [
  { id: 'idle', label: 'idle', desc: 'Respiração, flutuação e piscadas', frames: 4, fps: 6 },
  { id: 'walk', label: 'andar', desc: 'Ciclo de marcha (trote no quadrúpede)', frames: 4, fps: 8 },
  { id: 'run', label: 'correr', desc: 'Marcha rápida com fase aérea', frames: 4, fps: 10 },
  { id: 'jump', label: 'pular', desc: 'Agacha → estica → aterrissa', frames: 6, fps: 9 },
  { id: 'attack', label: 'ataque', desc: 'Carrega → golpe + efeito', frames: 5, fps: 12 },
  { id: 'dance', label: 'dança', desc: 'Quique lateral comemorativo', frames: 6, fps: 8 },
];

export function groupOf(body: BodyType): RigGroup {
  if (body === 'slime' || body === 'ghost') return 'blob';
  if (body === 'critter') return 'quad';
  return 'biped';
}

export interface GenOptions {
  seed: number;
  body: BodyType | 'random';
  mood: MoodId;
  size: number;
  outline: boolean;
}

export function generateCharacter(opts: GenOptions): CharSpec {
  const rng = new Rng(opts.seed);
  const body: BodyType = opts.body === 'random'
    ? rng.pick(BODY_TYPES).id
    : opts.body;
  const built = buildBody(rng, body, opts.mood);
  const k = opts.size / 32;
  const rig: Rig = {
    nodes: scaleNodes(built.nodes, k),
    w: opts.size,
    h: opts.size,
    outline: opts.outline ? built.palette.outline : null,
  };
  return {
    seed: opts.seed,
    body,
    group: groupOf(body),
    name: characterName(rng, body),
    rig,
    swatches: built.swatches,
    traits: built.traits,
    motion: {
      wave: body === 'robot' ? 'tri' : 'sine',
      blinkAt: rng.range(0.3, 0.6),
    },
  };
}

/** Gera os frames de uma ação amostrando o rig no tempo */
export function generateActionFrames(
  spec: CharSpec,
  action: ActionId,
  frameCount: number,
  params: MotionParams,
): string[][] {
  const out: string[][] = [];
  const n = Math.max(1, frameCount);
  for (let i = 0; i < n; i++) {
    const pose = samplePose(spec, action, i / n, params);
    out.push(rasterize(spec.rig, pose));
  }
  return out;
}

/** Um frame único (para miniaturas e candidatos) */
export function poseSingle(
  spec: CharSpec, action: ActionId, t: number, params: MotionParams,
): string[] {
  return rasterize(spec.rig, samplePose(spec, action, t, params));
}
