import { useEffect, useRef } from 'react';
import { BlendMode, MIN_FRAME_MS, PlayMode, Variation } from '../types';
import { playbackOrder } from '../lib/timeline';
import { RenderOpts, renderCellsToCanvas, renderStackToCanvas } from '../lib/exporters';

export interface LayerStackItem {
  cells: string[];
  opacity: number;
  blendMode?: BlendMode;
  clipping?: boolean;
}

/** Item de frame: pixels chapados OU pilha de layers (composta com alpha). */
export interface SpriteFrameItem {
  id: string;
  cells?: string[];
  layers?: LayerStackItem[];
}

function renderItem(
  f: SpriteFrameItem, cells: string[] | undefined, layers: LayerStackItem[] | undefined,
  w: number, h: number, opts: RenderOpts,
): HTMLCanvasElement {
  const ly = layers ?? f.layers;
  if (ly) return renderStackToCanvas(ly, w, h, opts);
  return renderCellsToCanvas(cells ?? f.cells ?? [], w, h, opts);
}

interface SpriteCanvasProps {
  cells?: string[];
  layers?: LayerStackItem[];
  width: number;
  height: number;
  scale?: number;
  variation?: Variation | null;
  background?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Renderiza um frame estático */
export function SpriteCanvas({
  cells, layers, width, height, scale = 4, variation = null, background = '', className, style,
}: SpriteCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const dst = ref.current;
    if (!dst) return;
    const src = renderItem({ id: 'static' }, cells, layers, width, height, { scale, variation, background });
    dst.width = src.width;
    dst.height = src.height;
    const ctx = dst.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, dst.width, dst.height);
    ctx.drawImage(src, 0, 0);
  }, [cells, layers, width, height, scale, variation, background]);

  return <canvas ref={ref} className={`pixelated ${className ?? ''}`} style={style} />;
}

interface AnimatedSpriteProps {
  frames: SpriteFrameItem[];
  width: number;
  height: number;
  fps?: number;
  /** duração por frame em ms (tem prioridade sobre fps quando presente) */
  durationsMs?: number[];
  playMode?: PlayMode;
  scale?: number;
  variation?: Variation | null;
  background?: string;
  playing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Renderiza uma animação em loop */
export function AnimatedSprite({
  frames, width, height, fps = 8, durationsMs, playMode = 'loop', scale = 4, variation = null,
  background = '', playing = true, className, style,
}: AnimatedSpriteProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ frames, fps, durationsMs, playMode, scale, variation, background, playing, width, height });
  live.current = { frames, fps, durationsMs, playMode, scale, variation, background, playing, width, height };

  useEffect(() => {
    const dst = ref.current;
    if (!dst) return;
    const ctx = dst.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let index = 0;
    let orderKey = '';
    let order: number[] = [0];

    const draw = (i: number) => {
      const s = live.current;
      const f = s.frames[i % Math.max(1, s.frames.length)];
      if (!f) {
        ctx.clearRect(0, 0, dst.width, dst.height);
        return;
      }
      const src = renderItem(f, undefined, undefined, s.width, s.height, {
        scale: s.scale, variation: s.variation, background: s.background,
      });
      if (dst.width !== src.width || dst.height !== src.height) {
        dst.width = src.width;
        dst.height = src.height;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, dst.width, dst.height);
      ctx.drawImage(src, 0, 0);
    };

    order = playbackOrder(Math.max(1, live.current.frames.length), live.current.playMode ?? 'loop');
    orderKey = `${Math.max(1, live.current.frames.length)}:${live.current.playMode ?? 'loop'}`;
    draw(order[0] ?? 0);
    const tick = (now: number) => {
      const s = live.current;
      const dt = Math.min(100, now - last);
      last = now;
      const n = Math.max(1, s.frames.length);
      const key = `${n}:${s.playMode ?? 'loop'}`;
      if (key !== orderKey) {
        orderKey = key;
        order = playbackOrder(n, s.playMode ?? 'loop');
        if (index >= order.length) index = 0;
      }
      const m = order.length;
      if (s.playing && m > 1) {
        acc += dt;
        // passo por frame: consome o acumulado frame a frame (durações variadas OK)
        let advanced = false;
        let guard = 0;
        while (guard++ <= m + 1) {
          const raw = s.durationsMs?.[order[index % m]];
          const want = Number.isFinite(raw) && (raw as number) > 0 ? (raw as number) : 1000 / Math.max(1, s.fps);
          const step = Math.max(MIN_FRAME_MS, want);
          if (acc < step) break;
          acc -= step;
          index = (index + 1) % m;
          advanced = true;
        }
        if (advanced) draw(order[index]);
      } else if (index >= m) {
        index = 0;
        draw(order[0] ?? 0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // redesenha imediatamente quando props visuais mudam
    const redraw = () => draw(index % Math.max(1, live.current.frames.length));
    const t = setInterval(redraw, 500);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, []);

  // redesenho síncrono em mudança de frame atual (quando pausado)
  useEffect(() => {
    const dst = ref.current;
    if (!dst || playing) return;
    const f = frames[playbackOrder(frames.length, playMode)[0] ?? 0];
    if (!f) return;
    const src = renderItem(f, undefined, undefined, width, height, { scale, variation, background });
    dst.width = src.width;
    dst.height = src.height;
    const ctx = dst.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0);
  }, [frames, width, height, scale, variation, background, playing, playMode]);

  return <canvas ref={ref} className={`pixelated ${className ?? ''}`} style={style} />;
}
