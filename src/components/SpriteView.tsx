import { useEffect, useRef } from 'react';
import { Frame, Variation } from '../types';
import { renderCellsToCanvas } from '../lib/exporters';

interface SpriteCanvasProps {
  cells: string[];
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
  cells, width, height, scale = 4, variation = null, background = '', className, style,
}: SpriteCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const dst = ref.current;
    if (!dst) return;
    const src = renderCellsToCanvas(cells, width, height, { scale, variation, background });
    dst.width = src.width;
    dst.height = src.height;
    const ctx = dst.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, dst.width, dst.height);
    ctx.drawImage(src, 0, 0);
  }, [cells, width, height, scale, variation, background]);

  return <canvas ref={ref} className={`pixelated ${className ?? ''}`} style={style} />;
}

interface AnimatedSpriteProps {
  frames: Frame[];
  width: number;
  height: number;
  fps?: number;
  scale?: number;
  variation?: Variation | null;
  background?: string;
  playing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Renderiza uma animação em loop */
export function AnimatedSprite({
  frames, width, height, fps = 8, scale = 4, variation = null,
  background = '', playing = true, className, style,
}: AnimatedSpriteProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ frames, fps, scale, variation, background, playing, width, height });
  live.current = { frames, fps, scale, variation, background, playing, width, height };

  useEffect(() => {
    const dst = ref.current;
    if (!dst) return;
    const ctx = dst.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let index = 0;

    const draw = (i: number) => {
      const s = live.current;
      const f = s.frames[i % Math.max(1, s.frames.length)];
      if (!f) {
        ctx.clearRect(0, 0, dst.width, dst.height);
        return;
      }
      const src = renderCellsToCanvas(f.cells, s.width, s.height, {
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

    draw(0);
    const tick = (now: number) => {
      const s = live.current;
      const dt = Math.min(100, now - last);
      last = now;
      const n = Math.max(1, s.frames.length);
      if (s.playing && n > 1) {
        acc += dt;
        const step = 1000 / Math.max(1, s.fps);
        if (acc >= step) {
          const adv = Math.floor(acc / step);
          acc %= step;
          index = (index + adv) % n;
          draw(index);
        }
      } else if (index >= n) {
        index = 0;
        draw(0);
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
    const f = frames[0];
    if (!f) return;
    const src = renderCellsToCanvas(f.cells, width, height, { scale, variation, background });
    dst.width = src.width;
    dst.height = src.height;
    const ctx = dst.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0);
  }, [frames, width, height, scale, variation, background, playing]);

  return <canvas ref={ref} className={`pixelated ${className ?? ''}`} style={style} />;
}
