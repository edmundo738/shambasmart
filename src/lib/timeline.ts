/** Núcleo determinístico da timeline: timing, durações e reordenação (puros). */
import { Animation, DEFAULT_FRAME_MS, Frame, MAX_FRAME_MS, MIN_FRAME_MS } from '../types';

/** fps -> ms por frame (arredondado, dentro dos limites do editor). */
export function fpsToMs(fps: number): number {
  return clampMs(Math.round(1000 / Math.max(1, fps)));
}

/** ms -> fps equivalente (arredondado, mínimo 1). */
export function msToFps(ms: number): number {
  return Math.max(1, Math.round(1000 / Math.max(1, ms)));
}

/** Prende uma duração aos limites do editor; NaN/Infinity viram o padrão. */
export function clampMs(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_FRAME_MS;
  return Math.min(MAX_FRAME_MS, Math.max(MIN_FRAME_MS, Math.round(ms)));
}

/** Duração efetiva de um frame (legados sem campo caem no padrão). */
export function frameMs(frame: Frame | undefined): number {
  return clampMs(frame?.durationMs ?? DEFAULT_FRAME_MS);
}

/** Durações na ordem da ação (frames ausentes viram padrão, nunca quebram). */
export function durationsOf(anim: Animation, frames: Record<string, Frame>): number[] {
  return anim.frameIds.map((fid) => frameMs(frames[fid]));
}

/** Duração total da ação em ms. */
export function totalDurationMs(anim: Animation, frames: Record<string, Frame>): number {
  return durationsOf(anim, frames).reduce((a, b) => a + b, 0);
}

/**
 * Índice do frame no instante t (ms, loop). Matemática do playback,
 * compartilhada por preview/export — testável sem rAF.
 */
export function frameIndexAtTime(durationsMs: number[], t: number): number {
  if (!durationsMs.length) return 0;
  const total = durationsMs.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let rem = ((t % total) + total) % total;
  for (let i = 0; i < durationsMs.length; i++) {
    rem -= Math.max(1, durationsMs[i]);
    if (rem < 0) return i;
  }
  return durationsMs.length - 1;
}

/** Reordena ids movendo `id` para `toIndex` (puro; fora do intervalo = prende). */
export function moveIdTo(ids: string[], id: string, toIndex: number): string[] {
  const from = ids.indexOf(id);
  if (from < 0) return [...ids];
  const next = [...ids];
  next.splice(from, 1);
  next.splice(Math.min(next.length, Math.max(0, toIndex)), 0, id);
  return next;
}
