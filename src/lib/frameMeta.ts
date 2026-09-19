/** Âncoras + hitbox por frame: matemática pura (clamp, bbox, picking). */
import { Frame, FrameAnchor, FrameHitbox } from '../types';

const clampInt = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Number.isFinite(v) ? Math.round(v) : lo));

/** Prende uma âncora aos limites do canvas. */
export function clampAnchor(a: FrameAnchor, w: number, h: number): FrameAnchor {
  return { ...a, x: clampInt(a.x, 0, w - 1), y: clampInt(a.y, 0, h - 1) };
}

/** Normaliza hitbox: inteiros, w/h >= 1, contida no canvas. */
export function normalizeHitbox(b: FrameHitbox, w: number, h: number): FrameHitbox {
  const bw = Math.max(1, Math.round(b.w) || 1);
  const bh = Math.max(1, Math.round(b.h) || 1);
  const x = clampInt(b.x, 0, Math.max(0, w - bw));
  const y = clampInt(b.y, 0, Math.max(0, h - bh));
  return { x, y, w: Math.min(bw, w), h: Math.min(bh, h) };
}

/**
 * BBox exata dos pixels opacos (composto chapado). null quando vazio.
 * Base do auto-fit: determinístico, sem heurística.
 */
export function opaqueBBox(cells: string[], w: number, h: number): FrameHitbox | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (cells[y * w + x]) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Ponto dentro da hitbox (bordas inclusivas). */
export function pointInHitbox(x: number, y: number, b: FrameHitbox): boolean {
  return x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h;
}

/**
 * Picking de âncora: a mais próxima do ponto dentro do raio (em pixels de canvas).
 * Raio padrão 2px (generoso p/ mira, exato p/ não ambíguo).
 */
export function pickAnchor(anchors: FrameAnchor[], x: number, y: number, radius = 2): FrameAnchor | null {
  let best: FrameAnchor | null = null;
  let bestD = radius + 0.001;
  for (const a of anchors) {
    const d = Math.hypot(a.x - x, a.y - y);
    if (d <= radius && d < bestD) {
      best = a;
      bestD = d;
    }
  }
  return best;
}

/** Clona metadados de um frame (usado por duplicar/copiar/colar). */
export function cloneFrameMeta(f: Frame | undefined): { anchors: FrameAnchor[]; hitbox: FrameHitbox | null } {
  return {
    anchors: (f?.anchors ?? []).map((a) => ({ ...a })),
    hitbox: f?.hitbox ? { ...f.hitbox } : null,
  };
}
