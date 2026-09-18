/**
 * Matemática da viewport do canvas (E1) — 100% pura e determinística.
 *
 * Princípios:
 * - zoom é sempre INTEIRO: 1 célula = N px de tela exatos (pixel-crisp);
 * - zoom-no-cursor: o ponto sob o cursor permanece estável (fração do conteúdo);
 * - fit: maior zoom inteiro que cabe, com respiro.
 */

/** Degraus de zoom (Aseprite-style). */
export const ZOOM_LADDER = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 64;
const FALLBACK_ZOOM = 12;

export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return FALLBACK_ZOOM;
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(z)));
}

/** Próximo degrau da escada (dir=+1 aproxima, −1 afasta). */
export function stepZoom(zoom: number, dir: 1 | -1): number {
  const z = clampZoom(zoom);
  if (dir > 0) {
    for (const s of ZOOM_LADDER) if (s > z) return s;
    return ZOOM_MAX;
  }
  for (let i = ZOOM_LADDER.length - 1; i >= 0; i--) {
    if (ZOOM_LADDER[i] < z) return ZOOM_LADDER[i];
  }
  return ZOOM_MIN;
}

/** Maior zoom inteiro que cabe o sprite na viewport (com respiro `padding`). */
export function fitZoom(
  viewW: number, viewH: number, spriteW: number, spriteH: number, padding = 48,
): number {
  const availW = Math.max(1, viewW - padding * 2);
  const availH = Math.max(1, viewH - padding * 2);
  const z = Math.floor(Math.min(availW / Math.max(1, spriteW), availH / Math.max(1, spriteH)));
  return clampZoom(z < 1 ? 1 : z);
}

/**
 * Fração 0..1 do ponto sob o cursor dentro do conteúdo rolável.
 * `scroll` = scrollLeft/Top atual, `cursorInView` = offset do cursor na viewport.
 */
export function anchorFrac(scroll: number, cursorInView: number, content: number): number {
  if (!Number.isFinite(scroll) || !Number.isFinite(cursorInView)) return 0.5;
  if (content <= 0) return 0.5;
  return (scroll + cursorInView) / content;
}

/**
 * Novo scroll que mantém a âncora estável depois da troca de zoom.
 * `frac` veio de `anchorFrac` ANTES; `newContent`/`viewSize` são DEPOIS.
 */
export function keepAnchor(frac: number, viewSize: number, newContent: number, cursorInView: number): number {
  const f = Number.isFinite(frac) ? frac : 0.5;
  const max = Math.max(0, newContent - viewSize);
  const target = f * newContent - cursorInView;
  if (!Number.isFinite(target)) return Math.min(Math.max(0, max / 2), max);
  return Math.max(0, Math.min(max, target));
}

/** Scroll que centraliza o conteúdo (para fit / 100% / 200%). */
export function centerScroll(viewSize: number, content: number): number {
  return Math.max(0, (content - viewSize) / 2);
}

/**
 * Cadeia viewport->célula (pura): scroll + offset na viewport -> célula ou null.
 * O componente mede o retângulo; a matemática mora aqui.
 */
export function cellFromView(
  scroll: number, viewOffset: number, contentSize: number, docSize: number,
): number | null {
  if (!Number.isFinite(scroll) || !Number.isFinite(viewOffset)) return null;
  if (contentSize <= 0 || docSize <= 0) return null;
  const cell = Math.floor(((scroll + viewOffset) / contentSize) * docSize);
  if (cell < 0 || cell >= docSize) return null;
  return cell;
}
