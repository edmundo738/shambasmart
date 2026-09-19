import { AssetRecipe } from '../../types';
import { ENGINE_VERSION, MASTER_KIND, fingerprint } from './engine';
import { SkeletonId, skeletonById, skeletonForRecipe } from './skeletons';

/**
 * Asset Master (§2 da spec): a fonte da verdade.
 * PNG, GIF e spritesheets são renders derivados deste documento.
 * Mesma seed + mesma receita + mesma versão do engine = mesmo asset.
 */
export interface AssetMaster {
  kind: typeof MASTER_KIND;
  engine: string;
  assetId: string;
  name: string;
  createdAt: number;
  seed: number;
  skeleton: SkeletonId;
  recipe: AssetRecipe;
  motions: string[];
  fingerprint: string;
}

function computeFingerprint(m: Omit<AssetMaster, 'fingerprint' | 'kind' | 'assetId' | 'name' | 'createdAt'>): string {
  return fingerprint({ engine: m.engine, seed: m.seed, skeleton: m.skeleton, recipe: m.recipe, motions: m.motions });
}

export function createMaster(input: {
  assetId: string;
  name: string;
  recipe: AssetRecipe;
  motions?: string[];
  createdAt?: number;
}): AssetMaster {
  const base = {
    kind: MASTER_KIND as typeof MASTER_KIND,
    engine: ENGINE_VERSION,
    assetId: input.assetId,
    name: input.name,
    createdAt: input.createdAt ?? Date.now(),
    seed: input.recipe.seed,
    skeleton: skeletonForRecipe(input.recipe),
    recipe: input.recipe,
    motions: input.motions ?? input.recipe.actions.map((a) => a.id),
  };
  return { ...base, fingerprint: computeFingerprint(base) };
}

/** Todo projeto gerado pelo Gerador/Biblioteca já tem receita → já tem Master. */
export function fromRecipe(recipe: AssetRecipe, name = 'Asset', assetId = 'master'): AssetMaster {
  return createMaster({ assetId, name, recipe });
}

export function serializeMaster(m: AssetMaster): string {
  return JSON.stringify(m, null, 2);
}

export interface ParsedMaster {
  master: AssetMaster;
  /** o JSON foi gerado por outra versão do engine (pixels podem divergir) */
  engineMismatch: boolean;
  /** o fingerprint confere com o conteúdo (integridade) */
  fingerprintOk: boolean;
}

/** Reabre um Master serializado, validando estrutura e integridade. */
export function parseMaster(json: string): ParsedMaster {
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    throw new Error('JSON inválido.');
  }
  if (!obj || typeof obj !== 'object') throw new Error('Documento vazio.');
  const m = obj as Record<string, unknown>;
  if (m.kind !== MASTER_KIND) throw new Error('Não é um Asset Master PixelForge.');
  const r = m.recipe as AssetRecipe | undefined;
  if (!r || typeof r !== 'object') throw new Error('Master sem receita.');
  for (const f of ['version', 'kind', 'seed', 'subtype', 'style', 'size']) {
    if ((r as unknown as Record<string, unknown>)[f] === undefined) {
      throw new Error(`Receita incompleta: falta "${f}".`);
    }
  }
  if (!skeletonById(m.skeleton as string)) throw new Error(`Esqueleto desconhecido: ${m.skeleton}.`);
  const master = m as unknown as AssetMaster;
  const expected = computeFingerprint(master);
  return {
    master,
    engineMismatch: master.engine !== ENGINE_VERSION,
    fingerprintOk: master.fingerprint === expected,
  };
}

/* ------------------------- verificação de frames ------------------------- */

export interface CompareResult {
  compared: number;
  matched: number;
  mismatched: number;
  extraExpected: number;
  extraActual: number;
}

/** Compara frames esperados (regenerados) com os atuais do projeto. */
export function compareFrames(expected: string[][], actual: string[][]): CompareResult {
  const n = Math.min(expected.length, actual.length);
  let matched = 0;
  for (let i = 0; i < n; i++) {
    if (expected[i].length === actual[i].length && expected[i].every((c, k) => c === actual[i][k])) matched++;
  }
  return {
    compared: n,
    matched,
    mismatched: n - matched,
    extraExpected: expected.length - n,
    extraActual: actual.length - n,
  };
}
