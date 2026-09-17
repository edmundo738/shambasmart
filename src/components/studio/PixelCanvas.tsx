import { useCallback, useEffect, useRef } from 'react';
import { useStudio } from '../../store/studio';
import {
  brushIndices, ellipsePoints, floodFill, idx, inBounds, linePoints, mirrorPoints, rectPoints,
} from '../../lib/pixels';

export default function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ drawing: boolean; startX: number; startY: number; erase: boolean } | null>(null);

  const project = useStudio((s) => s.project);
  const currentAnimationId = useStudio((s) => s.currentAnimationId);
  const currentFrameId = useStudio((s) => s.currentFrameId);
  const tool = useStudio((s) => s.tool);
  const color = useStudio((s) => s.color);
  const brushSize = useStudio((s) => s.brushSize);
  const mirrorX = useStudio((s) => s.mirrorX);
  const mirrorY = useStudio((s) => s.mirrorY);
  const showGrid = useStudio((s) => s.showGrid);
  const onionSkin = useStudio((s) => s.onionSkin);
  const zoom = useStudio((s) => s.zoom);

  const anim = project?.animations.find((a) => a.id === currentAnimationId) ?? project?.animations[0];
  const frame = currentFrameId ? project?.frames[currentFrameId] : undefined;
  const frameIndex = anim && currentFrameId ? anim.frameIds.indexOf(currentFrameId) : -1;
  const prevFrame = project && anim && frameIndex > 0 ? project.frames[anim.frameIds[frameIndex - 1]] : undefined;

  /* ------------------------------- render -------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !project || !frame) return;
    const { width: w, height: h } = project;
    canvas.width = w * zoom;
    canvas.height = h * zoom;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // onion skin (frame anterior em vermelho fantasma)
    if (onionSkin && prevFrame && prevFrame.id !== frame.id) {
      ctx.globalAlpha = 0.32;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (prevFrame.cells[y * w + x]) {
            ctx.fillStyle = '#ff4d6d';
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // pixels do frame
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = frame.cells[y * w + x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }

    // grade
    if (showGrid && zoom >= 6) {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x++) {
        ctx.moveTo(x * zoom + 0.5, 0);
        ctx.lineTo(x * zoom + 0.5, h * zoom);
      }
      for (let y = 0; y <= h; y++) {
        ctx.moveTo(0, y * zoom + 0.5);
        ctx.lineTo(w * zoom, y * zoom + 0.5);
      }
      ctx.stroke();
    }
  }, [project, frame, prevFrame, zoom, showGrid, onionSkin]);

  const cellFromEvent = useCallback((e: React.PointerEvent): [number, number] | null => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * project.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * project.height);
    if (!inBounds(x, y, project.width, project.height)) return null;
    return [x, y];
  }, [project]);

  const expandMirror = useCallback((x: number, y: number): number[] => {
    const st = useStudio.getState();
    const p = st.project;
    if (!p) return [];
    const pts = mirrorPoints(x, y, p.width, p.height, st.mirrorX, st.mirrorY);
    const out = new Set<number>();
    for (const [mx, my] of pts) {
      for (const i of brushIndices(mx, my, st.brushSize, p.width, p.height)) out.add(i);
    }
    return [...out];
  }, []);

  const applyPaint = useCallback((x: number, y: number, erase: boolean) => {
    const st = useStudio.getState();
    st.paint(expandMirror(x, y), erase ? null : st.color);
  }, [expandMirror]);

  const drawOverlayShape = useCallback((x1: number, y1: number) => {
    const d = drag.current;
    const overlay = overlayRef.current;
    const st = useStudio.getState();
    const p = st.project;
    if (!d || !overlay || !p) return;
    overlay.width = p.width * st.zoom;
    overlay.height = p.height * st.zoom;
    const ctx = overlay.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    let pts: Array<[number, number]> = [];
    if (st.tool === 'line') pts = linePoints(d.startX, d.startY, x1, y1);
    else if (st.tool === 'rect') pts = rectPoints(d.startX, d.startY, x1, y1, false);
    else if (st.tool === 'ellipse') {
      const cx = (d.startX + x1) / 2;
      const cy = (d.startY + y1) / 2;
      pts = ellipsePoints(cx, cy, Math.abs(x1 - d.startX) / 2, Math.abs(y1 - d.startY) / 2, false);
    }
    ctx.fillStyle = st.color;
    ctx.globalAlpha = 0.75;
    for (const [x, y] of pts) {
      if (inBounds(x, y, p.width, p.height)) ctx.fillRect(x * st.zoom, y * st.zoom, st.zoom, st.zoom);
    }
    ctx.globalAlpha = 1;
  }, []);

  const clearOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  }, []);

  /* ------------------------------ interações ------------------------------ */
  const onPointerDown = (e: React.PointerEvent) => {
    const cell = cellFromEvent(e);
    if (!cell || !project || !frame) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const st = useStudio.getState();
    const [x, y] = cell;

    // conta-gotas: ferramenta própria ou Alt pressionado
    if (st.tool === 'picker' || e.altKey) {
      const c = frame.cells[idx(x, y, project.width)];
      if (c) st.setColor(c);
      return;
    }

    const erase = e.button === 2 || st.tool === 'eraser';

    if (st.tool === 'fill') {
      st.beginStroke();
      const changed = floodFill(frame.cells, project.width, project.height, x, y, erase ? '' : st.color);
      if (changed.length) st.paint(changed, erase ? null : st.color);
      return;
    }

    if (st.tool === 'line' || st.tool === 'rect' || st.tool === 'ellipse') {
      drag.current = { drawing: true, startX: x, startY: y, erase };
      drawOverlayShape(x, y);
      return;
    }

    st.beginStroke();
    drag.current = { drawing: true, startX: x, startY: y, erase };
    applyPaint(x, y, erase);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d?.drawing) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    const st = useStudio.getState();
    const [x, y] = cell;
    if (st.tool === 'line' || st.tool === 'rect' || st.tool === 'ellipse') {
      drawOverlayShape(x, y);
      return;
    }
    applyPaint(x, y, d.erase);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d?.drawing) return;
    drag.current = null;
    const st = useStudio.getState();
    if (st.tool === 'line' || st.tool === 'rect' || st.tool === 'ellipse') {
      const cell = cellFromEvent(e);
      clearOverlay();
      if (!cell || !project) return;
      const [x1, y1] = cell;
      let pts: Array<[number, number]> = [];
      if (st.tool === 'line') pts = linePoints(d.startX, d.startY, x1, y1);
      else if (st.tool === 'rect') pts = rectPoints(d.startX, d.startY, x1, y1, e.shiftKey);
      else {
        const cx = (d.startX + x1) / 2;
        const cy = (d.startY + y1) / 2;
        pts = ellipsePoints(cx, cy, Math.abs(x1 - d.startX) / 2, Math.abs(y1 - d.startY) / 2, e.shiftKey);
      }
      const indices = new Set<number>();
      for (const [x, y] of pts) {
        if (!inBounds(x, y, project.width, project.height)) continue;
        for (const [mx, my] of mirrorPoints(x, y, project.width, project.height, st.mirrorX, st.mirrorY)) {
          indices.add(idx(mx, my, project.width));
        }
      }
      if (indices.size) st.drawShape([...indices], d.erase ? '' : st.color);
    }
  };

  if (!project || !frame) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Nenhum frame selecionado
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        className="pixelated checker cursor-crosshair rounded-lg border border-ink-600 shadow-2xl"
        style={{ width: project.width * zoom, height: project.height * zoom }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          if (drag.current && (tool === 'line' || tool === 'rect' || tool === 'ellipse')) {
            // mantém o rastro; finaliza no pointerup global
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
      <canvas
        ref={overlayRef}
        className="pixelated pointer-events-none absolute left-0 top-0 rounded-lg"
        style={{ width: project.width * zoom, height: project.height * zoom }}
      />
    </div>
  );
}
