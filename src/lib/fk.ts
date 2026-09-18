/** Cinemática direta (FK) do esqueleto-guia: matemática pura, à prova de ciclos. */
import { Bone, BonePose, FramePose } from '../types';

export interface WorldBone {
  id: string;
  name: string;
  parentId: string | null;
  length: number;
  depth: number;
  /** junta em coords de mundo (float; arredondar p/ render pixel-snapped) */
  jx: number;
  jy: number;
  tipX: number;
  tipY: number;
  /** rotação acumulada em graus */
  worldRot: number;
  /** true quando o vínculo com o pai foi quebrado (ciclo ou auto-pai) */
  broken: boolean;
}

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/** Normaliza graus p/ (-180, 180]. */
export function normalizeDeg(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

function localOf(b: Bone, pose?: FramePose): BonePose {
  const p = pose?.[b.id];
  if (p && typeof p === 'object') {
    return { x: num(p.x), y: num(p.y), rotation: num(p.rotation) };
  }
  return { x: num(b.x), y: num(b.y), rotation: num(b.rotation) };
}

function resolveOne(b: Bone, local: BonePose, parent: WorldBone | undefined, broken: boolean): WorldBone {
  const length = Math.max(0, num(b.length));
  let jx: number, jy: number, worldRot: number, depth: number;
  if (!parent) {
    jx = local.x;
    jy = local.y;
    worldRot = local.rotation;
    depth = 0;
  } else {
    const rad = (parent.worldRot * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    jx = parent.jx + local.x * cos - local.y * sin;
    jy = parent.jy + local.x * sin + local.y * cos;
    worldRot = parent.worldRot + local.rotation;
    depth = parent.depth + 1;
  }
  const trad = (worldRot * Math.PI) / 180;
  return {
    id: b.id, name: b.name, parentId: parent ? b.parentId : null, length, depth,
    jx, jy,
    tipX: jx + length * Math.cos(trad),
    tipY: jy + length * Math.sin(trad),
    worldRot, broken,
  };
}

/**
 * Resolve o mundo de todos os ossos (ordem de entrada preservada).
 * Pai ausente vira raiz; ciclo/auto-pai quebra o vínculo (broken) de forma determinística.
 */
export function solveFK(bones: Bone[], pose?: FramePose): WorldBone[] {
  const byId = new Map(bones.map((b) => [b.id, b]));
  const out = new Map<string, WorldBone>();
  let pending = [...bones];
  let guard = 0;
  while (pending.length && guard++ <= bones.length + 1) {
    const next: Bone[] = [];
    let progressed = false;
    for (const b of pending) {
      const p = b.parentId ? out.get(b.parentId) : undefined;
      if (b.parentId && byId.has(b.parentId) && !p && b.parentId !== b.id) {
        next.push(b); // pai ainda não resolvido
        continue;
      }
      const broken = !!b.parentId && (b.parentId === b.id || (!p && byId.has(b.parentId)));
      out.set(b.id, resolveOne(b, localOf(b, pose), p, broken));
      progressed = true;
    }
    if (!progressed && next.length) {
      // ciclo puro: força o primeiro como raiz p/ destravar (determinístico)
      const b = next.shift()!;
      out.set(b.id, resolveOne(b, localOf(b, pose), undefined, true));
      progressed = true;
    }
    pending = next;
    if (!progressed) break;
  }
  return bones.map((b) => out.get(b.id)!).filter(Boolean);
}

/** Arredonda junta/tip p/ pixels inteiros (render pixel-snapped). */
export function snapWorldBone(w: WorldBone): WorldBone {
  return { ...w, jx: Math.round(w.jx), jy: Math.round(w.jy), tipX: Math.round(w.tipX), tipY: Math.round(w.tipY) };
}

/** true se ligar `id` sob `newParentId` criaria ciclo (inclui auto-pai). */
export function wouldCycle(bones: Bone[], id: string, newParentId: string | null): boolean {
  if (!newParentId) return false;
  if (newParentId === id) return true;
  const byId = new Map(bones.map((b) => [b.id, b]));
  let cur: string | null = newParentId;
  let guard = 0;
  while (cur && guard++ <= bones.length + 1) {
    if (cur === id) return true;
    cur = byId.get(cur)?.parentId ?? null;
  }
  return false;
}

/** Profundidade p/ indentação (à prova de ciclos). */
export function boneDepth(bones: Bone[], id: string): number {
  const byId = new Map(bones.map((b) => [b.id, b]));
  let depth = 0;
  let cur = byId.get(id)?.parentId ?? null;
  let guard = 0;
  const seen = new Set<string>([id]);
  while (cur && !seen.has(cur) && guard++ <= bones.length + 1) {
    seen.add(cur);
    depth++;
    cur = byId.get(cur)?.parentId ?? null;
  }
  return depth;
}

/** Descendentes de `id` (p/ excluir do seletor de pai). */
export function boneDescendants(bones: Bone[], id: string): Set<string> {
  const kids = new Map<string, string[]>();
  for (const b of bones) {
    if (b.parentId) {
      const list = kids.get(b.parentId) ?? [];
      list.push(b.id);
      kids.set(b.parentId, list);
    }
  }
  const out = new Set<string>();
  const stack = [...(kids.get(id) ?? [])];
  while (stack.length) {
    const c = stack.pop()!;
    if (out.has(c)) continue;
    out.add(c);
    stack.push(...(kids.get(c) ?? []));
  }
  return out;
}

/** Mundo -> local sob `parentId` (raiz = identidade). Base do arrasto de juntas. */
export function worldToLocal(
  bones: Bone[], pose: FramePose | undefined, parentId: string | null, wx: number, wy: number,
): { x: number; y: number } {
  if (!parentId) return { x: round2(wx), y: round2(wy) };
  const parent = solveFK(bones, pose).find((w) => w.id === parentId);
  if (!parent) return { x: round2(wx), y: round2(wy) };
  const rad = (-parent.worldRot * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx = wx - parent.jx, dy = wy - parent.jy;
  return { x: round2(dx * cos - dy * sin), y: round2(dx * sin + dy * cos) };
}

/** Ângulo em graus do vetor junta->cursor. Base do giro pelo corpo. */
export function angleTo(jx: number, jy: number, wx: number, wy: number): number {
  return (Math.atan2(wy - jy, wx - jx) * 180) / Math.PI;
}

/** Distância ponto->segmento (picking do corpo do osso). */
export function distToSegment(
  px: number, py: number, ax: number, ay: number, bx: number, by: number,
): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Clona pose (profunda) ou preserva ausência. */
export function clonePose(pose: FramePose | undefined): FramePose | undefined {
  if (!pose || typeof pose !== 'object') return undefined;
  const out: FramePose = {};
  for (const [k, v] of Object.entries(pose)) {
    if (v && typeof v === 'object') out[k] = { x: num(v.x), y: num(v.y), rotation: num(v.rotation) };
  }
  return out;
}
