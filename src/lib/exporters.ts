import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import JSZip from 'jszip';
import {
  Animation, EnginePreset, Frame, ORIGINAL_VARIATION_ID, PlayMode, ProjectData, Variation,
} from '../types';
import { applyVariationToColor } from './color';
import { compositeStack } from './layers';
import { clampMs, durationsOf, fpsToMs, playbackOrder } from './timeline';

/* ------------------------------- render base ------------------------------ */

export interface RenderOpts {
  scale?: number;
  variation?: Variation | null;
  background?: string; // "" = transparente
}

export function renderCellsToCanvas(
  cells: string[], w: number, h: number, opts: RenderOpts = {},
): HTMLCanvasElement {
  const { scale = 1, variation = null, background = '' } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = applyVariationToColor(cells[y * w + x] ?? '', variation);
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

/** Compõe uma pilha pré-computada (cells + opacidade por camada). */
export function renderStackToCanvas(
  stack: Array<{ cells: string[]; opacity: number }>,
  w: number, h: number, opts: RenderOpts = {},
): HTMLCanvasElement {
  const { scale = 1, variation = null, background = '' } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  for (const { cells, opacity } of stack) {
    if (opacity <= 0) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity / 100));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = applyVariationToColor(cells[y * w + x] ?? '', variation);
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/** Compõe um frame camada por camada (fundo→topo), com alpha por layer. */
export function renderFrameToCanvas(
  project: ProjectData, frame: Frame, opts: RenderOpts = {},
): HTMLCanvasElement {
  const stack = compositeStack(project, frame).map(({ layer, cells }) => ({ cells, opacity: layer.opacity }));
  return renderStackToCanvas(stack, project.width, project.height, opts);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'asset';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar PNG'))), 'image/png');
  });
}

/* ------------------------------- spritesheet ------------------------------ */

export interface SheetOpts extends RenderOpts {
  columns?: number; // 0 = uma linha
  padding?: number;
}

export interface SheetRect { x: number; y: number; w: number; h: number }

export function buildSpritesheet(
  project: ProjectData, frames: Frame[], opts: SheetOpts = {},
): { canvas: HTMLCanvasElement; rects: SheetRect[] } {
  const { columns = 0, padding = 0, scale = 1, variation = null, background = '' } = opts;
  const w = project.width, h = project.height;
  const cols = columns > 0 ? columns : Math.max(1, frames.length);
  const rows = Math.max(1, Math.ceil(frames.length / cols));
  const fw = w * scale;
  const fh = h * scale;
  const canvas = document.createElement('canvas');
  canvas.width = cols * fw + (cols - 1) * padding;
  canvas.height = rows * fh + (rows - 1) * padding;
  const ctx = canvas.getContext('2d')!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const rects: SheetRect[] = [];
  frames.forEach((f, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ox = col * (fw + padding);
    const oy = row * (fh + padding);
    const tile = renderFrameToCanvas(project, f, { scale, variation });
    ctx.drawImage(tile, ox, oy);
    rects.push({ x: ox, y: oy, w: fw, h: fh });
  });
  return { canvas, rects };
}

/* -------------------------------- metadata -------------------------------- */

export function buildMetadata(
  engine: EnginePreset,
  imageFile: string,
  sheetW: number,
  sheetH: number,
  frameW: number,
  frameH: number,
  names: string[],
  rects: SheetRect[],
  fps: number,
  layers: Array<{ name: string; visible: boolean; opacity: number }> = [],
  durationsMs: number[] = [],
  playMode: PlayMode = 'loop',
): object {
  const dur = (i: number) => clampMs(durationsMs[i] ?? fpsToMs(fps));
  switch (engine) {
    case 'phaser': {
      const frames: Record<string, object> = {};
      names.forEach((n, i) => {
        const r = rects[i];
        frames[n] = {
          durationMs: dur(i),
          frame: { x: r.x, y: r.y, w: r.w, h: r.h },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: r.w, h: r.h },
          sourceSize: { w: frameW, h: frameH },
        };
      });
      return {
        frames,
        meta: { app: 'PixelForge Studio', version: '1.0', image: imageFile, format: 'RGBA8888', size: { w: sheetW, h: sheetH }, scale: 1, playMode, layers },
      };
    }
    case 'unity': {
      return {
        frames: names.map((n, i) => ({ name: n, fps, durationMs: dur(i), rect: { ...rects[i] } })),
        meta: { app: 'PixelForge Studio', image: imageFile, sheetSize: { w: sheetW, h: sheetH }, note: 'Importe como Sprite (Multiple) e fatie pela grade, ou use estes rects.', playMode, layers },
      };
    }
    case 'godot': {
      return {
        frames: names.map((n, i) => ({ name: n, durationMs: dur(i), ...rects[i] })),
        meta: { app: 'PixelForge Studio', image: imageFile, sheetSize: { w: sheetW, h: sheetH }, fps, note: 'Use AtlasTexture com estes region rects, ou AnimatedSprite2D com SpriteFrames.', playMode, layers },
      };
    }
    case 'gamemaker': {
      return {
        frames: names.map((n, i) => ({ name: n, durationMs: dur(i), ...rects[i] })),
        meta: { app: 'PixelForge Studio', image: imageFile, fps, note: 'Importe a strip na ordem dos frames (esquerda -> direita, cima -> baixo).', playMode, layers },
      };
    }
    default: {
      return {
        frames: names.map((n, i) => ({ name: n, durationMs: dur(i), ...rects[i] })),
        meta: { app: 'PixelForge Studio', image: imageFile, sheetSize: { w: sheetW, h: sheetH }, frameSize: { w: frameW, h: frameH }, fps, playMode, layers },
      };
    }
  }
}

/* ----------------------------------- GIF ---------------------------------- */

export function encodeGif(
  project: ProjectData, frames: Frame[], fps: number, scale: number, variation: Variation | null,
  playMode: PlayMode = 'loop',
): Uint8Array {
  const w = project.width, h = project.height;
  const gif = GIFEncoder();
  const seq = playbackOrder(frames.length, playMode).map((i) => frames[i]);
  const delays = seq.map((f) => clampMs(f.durationMs ?? fpsToMs(fps)));
  const datas: Uint8ClampedArray[] = seq.map((f) => {
    const c = renderFrameToCanvas(project, f, { scale, variation });
    return c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  });
  const width = w * scale;
  const height = h * scale;
  // paleta global a partir de todos os frames
  const total = new Uint8ClampedArray(datas[0].length * datas.length);
  datas.forEach((d, i) => total.set(d, i * d.length));
  let palette: number[][];
  try {
    palette = quantize(total, 255, { format: 'rgba4444', oneBitAlpha: true, clearAlpha: true });
  } catch {
    palette = quantize(total, 256);
  }
  let transparentIndex = palette.findIndex((p) => p.length > 3 && p[3] === 0);
  if (transparentIndex < 0) transparentIndex = 0;
  datas.forEach((data, i) => {
    let index: Uint8Array;
    try {
      index = applyPalette(data, palette, 'rgba4444');
    } catch {
      index = applyPalette(data, palette);
    }
    // força transparência onde o alpha original é 0
    for (let p = 0; p < index.length; p++) {
      if (data[p * 4 + 3] < 128) index[p] = transparentIndex;
    }
    gif.writeFrame(index, width, height, {
      palette,
      delay: delays[i],
      transparent: true,
      transparentIndex,
      repeat: i === 0 ? 0 : undefined,
    });
  });
  gif.finish();
  return gif.bytes();
}

/* ------------------------------ pack completo ----------------------------- */

export interface PackOpts {
  engine: EnginePreset;
  scale: number;
  columns: number;
  padding: number;
  includeJson: boolean;
  includeGif: boolean;
  includeSheet: boolean;
  includeSequence: boolean;
  background: string;
  onlyAnimationId?: string | null; // null = todas
}

function variationEntries(project: ProjectData): Array<{ id: string; name: string; v: Variation | null }> {
  return [
    { id: ORIGINAL_VARIATION_ID, name: 'original', v: null },
    ...project.variations.map((v) => ({ id: v.id, name: v.name, v })),
  ];
}

export async function buildPackZip(project: ProjectData, opts: PackOpts): Promise<Blob> {
  const zip = new JSZip();
  const root = slugify(project.name) || 'pack';
  const folder = zip.folder(root)!;
  const anims = opts.onlyAnimationId
    ? project.animations.filter((a) => a.id === opts.onlyAnimationId)
    : project.animations;
  const combos = variationEntries(project);

  const manifestAnims: object[] = [];

  for (const anim of anims) {
    const animSlug = slugify(anim.name);
    const frames = anim.frameIds
      .map((fid) => project.frames[fid])
      .filter((f): f is Frame => !!f);
    if (!frames.length) continue;

    for (const combo of combos) {
      const varSlug = slugify(combo.name);
      const base = `${animSlug}__${varSlug}`;
      const frameNames = frames.map((_, i) => `${base}_f${String(i).padStart(2, '0')}.png`);

      if (opts.includeSheet) {
        const { canvas, rects } = buildSpritesheet(project, frames, {
          columns: opts.columns, padding: opts.padding, scale: opts.scale,
          variation: combo.v, background: opts.background,
        });
        const png = await canvasToBlob(canvas);
        folder.file(`${base}.png`, png);
        if (opts.includeJson) {
          const meta = buildMetadata(
            opts.engine, `${base}.png`, canvas.width, canvas.height,
            project.width * opts.scale, project.height * opts.scale,
            frameNames, rects, anim.fps,
            project.layers.map((l) => ({ name: l.name, visible: l.visible, opacity: l.opacity })),
            durationsOf(anim, project.frames),
            anim.playMode ?? 'loop',
          );
          folder.file(`${base}.json`, JSON.stringify(meta, null, 2));
        }
      }

      if (opts.includeSequence) {
        const seqFolder = folder.folder(`${base}_frames`)!;
        for (let i = 0; i < frames.length; i++) {
          const c = renderFrameToCanvas(project, frames[i], {
            scale: opts.scale, variation: combo.v, background: opts.background,
          });
          seqFolder.file(frameNames[i], await canvasToBlob(c));
        }
      }

      if (opts.includeGif) {
        try {
          const gifScale = Math.max(1, Math.min(opts.scale, Math.floor(256 / Math.max(project.width, project.height)) || 1));
          const bytes = encodeGif(project, frames, anim.fps, gifScale, combo.v, anim.playMode ?? 'loop');
          folder.file(`${base}.gif`, bytes);
        } catch {
          /* ignora falha isolada de GIF */
        }
      }
    }

    manifestAnims.push({
      name: anim.name, fps: anim.fps, frames: frames.length,
      playMode: anim.playMode ?? 'loop',
      durationsMs: durationsOf(anim, project.frames),
      variations: combos.map((c) => c.name),
    });
  }

  folder.file('pack.json', JSON.stringify({
    project: project.name,
    app: 'PixelForge Studio',
    canvas: { w: project.width, h: project.height },
    scale: opts.scale,
    engine: opts.engine,
    animations: manifestAnims,
    naming: '<animacao>__<variacao>.<ext> e <animacao>__<variacao>_f<NN>.png por frame',
  }, null, 2));

  folder.file('LEIAME.txt',
    `${project.name} — asset pack gerado pelo PixelForge Studio\n` +
    `=====================================================\n\n` +
    `ESTRUTURA (bem sequenciada):\n` +
    `- <animacao>__<variacao>.png ........ spritesheet de cada combinação\n` +
    `- <animacao>__<variacao>.json ....... metadados (${opts.engine})\n` +
    `- <animacao>__<variacao>.gif ........ prévia animada\n` +
    `- <animacao>__<variacao>_frames/ .... frames individuais f00, f01, ...\n` +
    `- pack.json ......................... manifesto com fps e ordem dos frames\n\n` +
    `COMO USAR:\n` +
    `- Godot: importe o PNG e use AtlasTexture/AnimatedSprite2D seguindo o pack.json.\n` +
    `- Unity: importe como Sprite (Multiple) e fatie pela grade.\n` +
    `- Phaser: carregue o PNG + JSON com this.load.atlas().\n` +
    `- GameMaker: importe a strip na ordem dos frames.\n`);

  return zip.generateAsync({ type: 'blob' });
}

/** Exporta um único frame como PNG */
export async function downloadSingleFrame(
  project: ProjectData, frameId: string, variation: Variation | null, scale: number, background: string,
) {
  const frame = project.frames[frameId];
  if (!frame) return;
  const canvas = renderFrameToCanvas(project, frame, { scale, variation, background });
  downloadBlob(await canvasToBlob(canvas), `${slugify(project.name)}_frame.png`);
}
