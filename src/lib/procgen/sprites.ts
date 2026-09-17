import { Rng } from './rng';
import { ACTION_DEFS, generateActionFrames, generateCharacter } from './generator';
import { generateWeapon, weaponFrames, WEAPON_TYPES, WeaponType } from './weapons';
import { generateItem, itemFrames, ITEM_TYPES, ItemType } from './items';
import { generateFx, FX_TYPES, FxType } from './fx';
import { StyleId, makeStyle } from './styles';
import { MoodId } from './bodies';
import { ActionId } from './motions';
import { shiftColor } from '../color';
import { AssetRecipe } from '../../types';

export type SpriteKind = 'personagem' | 'criatura' | 'arma' | 'item' | 'efeito';

export const SPRITE_KINDS: Array<{ id: SpriteKind; label: string; desc: string }> = [
  { id: 'personagem', label: 'Personagem', desc: 'Heróis, NPCs e vilões' },
  { id: 'criatura', label: 'Criatura', desc: 'Monstros, slimes e bichos' },
  { id: 'arma', label: 'Arma', desc: 'Espadas, arcos e cajados' },
  { id: 'item', label: 'Item', desc: 'Poções, moedas e tesouros' },
  { id: 'efeito', label: 'Efeito', desc: 'Explosões, magias e cortes' },
];

export interface SpriteAction {
  id: string;
  label: string;
  fps: number;
  frames: string[][];
}

export interface GeneratedSprite {
  kind: SpriteKind;
  name: string;
  traits: string[];
  palette: string[];
  size: number;
  actions: SpriteAction[];
  recipe: AssetRecipe;
}

export interface SpriteRequest {
  kind: SpriteKind;
  seed: number;
  style: StyleId;
  size: number;
  outline: boolean;
  /** id específico ou 'random' */
  subtype: string;
  hueShift: number;
  actions: Array<{ id: string; frames: number }>;
  energy: number;
  amplitude: number;
  bounce: number;
}

const STYLE_MOOD: Record<StyleId, MoodId> = {
  fantasia: 'random',
  scifi: 'oceano',
  fofo: 'doce',
  sombrio: 'sombra',
  retro: 'areia',
  natureza: 'floresta',
};

function shiftCells(cells: string[], dh: number): string[] {
  if (!dh) return cells;
  return cells.map((c) => (c ? shiftColor(c, dh, 0, 0) : ''));
}

export function generateSprite(req: SpriteRequest): GeneratedSprite {
  const styleRng = new Rng(req.seed ^ 0x51f7);
  const styleSpec = makeStyle(styleRng, req.style);
  const outlineColor = req.outline ? styleSpec.outline : null;

  const recipe: AssetRecipe = {
    version: 1,
    kind: req.kind,
    seed: req.seed,
    subtype: req.subtype,
    style: req.style,
    size: req.size,
    outline: req.outline,
    hueShift: req.hueShift,
    actions: [],
    motion: { energy: req.energy, amplitude: req.amplitude, bounce: req.bounce },
  };

  // Personagens e criaturas usam o rig hierárquico do Lab
  if (req.kind === 'personagem' || req.kind === 'criatura') {
    const pool = req.kind === 'personagem'
      ? ['humanoid', 'robot'] as const
      : ['slime', 'ghost', 'critter'] as const;
    const body = (req.subtype === 'random' ? new Rng(req.seed ^ 0x1234).pick([...pool]) : req.subtype) as 'humanoid' | 'robot' | 'slime' | 'ghost' | 'critter';
    const spec = generateCharacter({
      seed: req.seed, body, mood: STYLE_MOOD[req.style], size: req.size, outline: req.outline,
    });
    const actions: SpriteAction[] = req.actions.map((a) => {
      const def = ACTION_DEFS.find((d) => d.id === a.id) ?? ACTION_DEFS[0];
      const frames = generateActionFrames(spec, def.id as ActionId, a.frames, {
        energy: req.energy, amplitude: req.amplitude, bounce: req.bounce,
      }).map((c) => shiftCells(c, req.hueShift));
      recipe.actions.push({ id: def.id, frames: a.frames, fps: def.fps });
      return { id: def.id, label: def.label, fps: def.fps, frames };
    });
    return {
      kind: req.kind, name: spec.name, traits: spec.traits,
      palette: spec.swatches.map((c) => (req.hueShift ? shiftColor(c, req.hueShift, 0, 0) : c)),
      size: req.size, actions, recipe,
    };
  }

  // Armas
  if (req.kind === 'arma') {
    const type = (req.subtype === 'random' ? 'random' : req.subtype) as WeaponType | 'random';
    const build = generateWeapon(req.seed, type, styleSpec, req.size, req.outline);
    const defs = [
      { id: 'idle', label: 'flutuar', fps: 6 },
      { id: 'brilho', label: 'brilho', fps: 10 },
    ];
    const actions: SpriteAction[] = req.actions
      .map((a) => {
        const def = defs.find((d) => d.id === a.id);
        if (!def) return null;
        const frames = weaponFrames(build, def.id as 'idle' | 'brilho', a.frames)
          .map((c) => shiftCells(c, req.hueShift));
        recipe.actions.push({ id: def.id, frames: a.frames, fps: def.fps });
        return { ...def, frames };
      })
      .filter((a): a is SpriteAction => !!a);
    return {
      kind: req.kind, name: build.name, traits: build.traits,
      palette: build.palette.map((c) => (req.hueShift ? shiftColor(c, req.hueShift, 0, 0) : c)),
      size: req.size, actions, recipe,
    };
  }

  // Itens
  if (req.kind === 'item') {
    const type = (req.subtype === 'random' ? 'random' : req.subtype) as ItemType | 'random';
    const build = generateItem(req.seed, type, styleSpec, req.size, req.outline);
    const defs = [
      { id: 'idle', label: 'flutuar', fps: 6 },
      { id: 'brilho', label: 'brilho', fps: 8 },
    ];
    const actions: SpriteAction[] = req.actions
      .map((a) => {
        const def = defs.find((d) => d.id === a.id);
        if (!def) return null;
        const frames = itemFrames(build, def.id as 'idle' | 'brilho', a.frames, outlineColor)
          .map((c) => shiftCells(c, req.hueShift));
        recipe.actions.push({ id: def.id, frames: a.frames, fps: def.fps });
        return { ...def, frames };
      })
      .filter((a): a is SpriteAction => !!a);
    return {
      kind: req.kind, name: build.name, traits: build.traits,
      palette: build.palette.map((c) => (req.hueShift ? shiftColor(c, req.hueShift, 0, 0) : c)),
      size: req.size, actions, recipe,
    };
  }

  // Efeitos
  const type = (req.subtype === 'random' ? 'random' : req.subtype) as FxType | 'random';
  const first = req.actions[0] ?? { id: 'tocar', frames: 6 };
  const build = generateFx(req.seed, type, styleSpec, req.size, first.frames, false);
  const frames = build.frames.map((c) => shiftCells(c, req.hueShift));
  recipe.actions.push({ id: 'tocar', frames: first.frames, fps: build.fps });
  return {
    kind: req.kind, name: build.name, traits: build.traits,
    palette: build.palette.map((c) => (req.hueShift ? shiftColor(c, req.hueShift, 0, 0) : c)),
    size: req.size,
    actions: [{ id: 'tocar', label: 'efeito', fps: build.fps, frames }],
    recipe,
  };
}

/** Subtipos disponíveis por categoria (para os pills da UI) */
export function subtypesFor(kind: SpriteKind): Array<{ id: string; label: string }> {
  if (kind === 'personagem') {
    return [
      { id: 'random', label: 'Aleatório' },
      { id: 'humanoid', label: 'Humanoide' },
      { id: 'robot', label: 'Robô' },
    ];
  }
  if (kind === 'criatura') {
    return [
      { id: 'random', label: 'Aleatório' },
      { id: 'slime', label: 'Slime' },
      { id: 'ghost', label: 'Fantasma' },
      { id: 'critter', label: 'Fera' },
    ];
  }
  if (kind === 'arma') return [{ id: 'random', label: 'Aleatória' }, ...WEAPON_TYPES];
  if (kind === 'item') return [{ id: 'random', label: 'Aleatório' }, ...ITEM_TYPES];
  return [{ id: 'random', label: 'Aleatório' }, ...FX_TYPES];
}

/** Ações padrão por categoria */
export function defaultActionsFor(kind: SpriteKind): Array<{ id: string; label: string; frames: number; fps: number }> {
  if (kind === 'personagem' || kind === 'criatura') {
    return ACTION_DEFS.map((d) => ({ id: d.id, label: d.label, frames: d.frames, fps: d.fps }));
  }
  if (kind === 'arma') {
    return [
      { id: 'idle', label: 'flutuar', frames: 4, fps: 6 },
      { id: 'brilho', label: 'brilho', frames: 6, fps: 10 },
    ];
  }
  if (kind === 'item') {
    return [
      { id: 'idle', label: 'flutuar', frames: 4, fps: 6 },
      { id: 'brilho', label: 'brilho', frames: 4, fps: 8 },
    ];
  }
  return [{ id: 'tocar', label: 'efeito', frames: 6, fps: 12 }];
}
