import { AssetRecipe } from '../../types';
import { Rng } from '../procgen/rng';

/**
 * Biblioteca de Esqueletos (§6 da spec): estrutura + movimento.
 * O esqueleto NÃO contém o desenho — ele resolve para os motores reais
 * (rig hierárquico do Lab) através de rigGroup/bodies.
 */
export type SkeletonId = 'human_standard' | 'quadruped' | 'blob' | 'object';

export interface BoneDef {
  id: string;
  parent: string | null;
  label: string;
}

export interface SkeletonDef {
  id: SkeletonId;
  label: string;
  desc: string;
  bones: BoneDef[];
  /** grupo do rig real; null = objeto estático (sem articulações) */
  rigGroup: 'biped' | 'quad' | 'blob' | null;
  /** corpos do gerador que este esqueleto veste */
  bodies: string[];
}

function bones(list: Array<[string, string | null, string]>): BoneDef[] {
  return list.map(([id, parent, label]) => ({ id, parent, label }));
}

export const SKELETONS: SkeletonDef[] = [
  {
    id: 'human_standard',
    label: 'Humanoide Padrão',
    desc: 'Bípede: cabeça, tronco, 2 braços, 2 pernas',
    rigGroup: 'biped',
    bodies: ['humanoid', 'robot'],
    bones: bones([
      ['root', null, 'Raiz'],
      ['pelvis', 'root', 'Pelve'],
      ['spine', 'pelvis', 'Coluna'],
      ['chest', 'spine', 'Peito'],
      ['neck', 'chest', 'Pescoço'],
      ['head', 'neck', 'Cabeça'],
      ['shoulder.L', 'chest', 'Ombro E'],
      ['upper_arm.L', 'shoulder.L', 'Braço E'],
      ['lower_arm.L', 'upper_arm.L', 'Antebraço E'],
      ['hand.L', 'lower_arm.L', 'Mão E'],
      ['shoulder.R', 'chest', 'Ombro D'],
      ['upper_arm.R', 'shoulder.R', 'Braço D'],
      ['lower_arm.R', 'upper_arm.R', 'Antebraço D'],
      ['hand.R', 'lower_arm.R', 'Mão D'],
      ['upper_leg.L', 'pelvis', 'Coxa E'],
      ['lower_leg.L', 'upper_leg.L', 'Canela E'],
      ['foot.L', 'lower_leg.L', 'Pé E'],
      ['upper_leg.R', 'pelvis', 'Coxa D'],
      ['lower_leg.R', 'upper_leg.R', 'Canela D'],
      ['foot.R', 'lower_leg.R', 'Pé D'],
    ]),
  },
  {
    id: 'quadruped',
    label: 'Quadrúpede',
    desc: 'Feras de 4 patas com cauda articulada',
    rigGroup: 'quad',
    bodies: ['critter'],
    bones: bones([
      ['root', null, 'Raiz'],
      ['spine_01', 'root', 'Coluna traseira'],
      ['spine_02', 'spine_01', 'Coluna dianteira'],
      ['neck', 'spine_02', 'Pescoço'],
      ['head', 'neck', 'Cabeça'],
      ['front_leg.L', 'spine_02', 'Pata dianteira E'],
      ['front_leg.R', 'spine_02', 'Pata dianteira D'],
      ['rear_leg.L', 'spine_01', 'Pata traseira E'],
      ['rear_leg.R', 'spine_01', 'Pata traseira D'],
      ['tail_01', 'spine_01', 'Cauda 1'],
      ['tail_02', 'tail_01', 'Cauda 2'],
      ['tail_03', 'tail_02', 'Cauda 3'],
    ]),
  },
  {
    id: 'blob',
    label: 'Gosma / Flutuante',
    desc: 'Corpo único deformável, sem membros (slimes, fantasmas)',
    rigGroup: 'blob',
    bodies: ['slime', 'ghost'],
    bones: bones([
      ['root', null, 'Raiz'],
      ['core', 'root', 'Núcleo'],
      ['crown', 'core', 'Topo'],
    ]),
  },
  {
    id: 'object',
    label: 'Objeto',
    desc: 'Armas, itens e efeitos: corpo único, movimento procedural',
    rigGroup: null,
    bodies: ['weapon', 'item', 'fx'],
    bones: bones([['root', null, 'Raiz']]),
  },
];

export function skeletonById(id: string): SkeletonDef | undefined {
  return SKELETONS.find((s) => s.id === id);
}

/** Resolve 'random' exatamente como o gerador (mesma seed → mesmo corpo). */
function resolveBody(kind: string, subtype: string, seed: number): string {
  if (subtype !== 'random') return subtype;
  const pool = kind === 'personagem' ? ['humanoid', 'robot'] : ['slime', 'ghost', 'critter'];
  return new Rng(seed ^ 0x1234).pick(pool);
}

/** Descobre o esqueleto a partir da receita. Determinístico. */
export function skeletonForRecipe(r: AssetRecipe): SkeletonId {
  if (r.kind === 'arma' || r.kind === 'item' || r.kind === 'efeito') return 'object';
  const body = resolveBody(r.kind, r.subtype, r.seed);
  if (body === 'critter') return 'quadruped';
  if (body === 'slime' || body === 'ghost') return 'blob';
  return 'human_standard';
}
