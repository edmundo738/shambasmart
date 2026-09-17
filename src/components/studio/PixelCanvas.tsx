import { useCallback, useEffect, useRef } from 'react';
import { useStudio } from '../../store/studio';
import {
  brushIndices, ellipsePoints, emptyCells, floodFill, idx, inBounds, linePoints, mirrorPoints,
  pixelPerfectStep, rectPoints,
} from '../../lib/pixels';
import { compositeStack, flattenCells } from '../../lib/layers';

export default function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    drawing: boolean; startX: number; startY: number; erase: boolean;
    lastX: number; lastY: number; lastKey: string;
    trail: Array<[number, number]>; orig: string[] | null;
  } | null>(null);

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

    // onion skin (frame anterior mesclado, em vermelho fantasma)
    if (onionSkin && prevFrame && prevFrame.id !== frame.id) {
      const prev = flattenCells(project, prevFrame);
      ctx.globalAlpha = 0.32;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (prev[y * w + x]) {
            ctx.fillStyle = '#ff4d6d';
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // pixels do frame, camada por camada (com opacidade)
    for (const { layer, cells } of compositeStack(project, frame)) {
      if (layer.opacity <= 0) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity / 100));
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const c = cells[y * w + x];
          if (!c) continue;
          ctx.fillStyle = c;
          ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
        }
      }
    }
    ctx.globalAlpha = 1;

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

  /** Traço com interpolação (sem falhas), pixel-perfect e dedupe de eventos. */
  const applyStrokeTo = useCallback((x: number, y: number, erase: boolean) => {
    const d = drag.current;
    const st = useStudio.getState();
    const p = st.project;
    if (!d || !p) return;
    // interpola o segmento entre o último ponto e o atual: traço rápido não falha
    const seg = linePoints(d.lastX, d.lastY, x, y);
    d.lastX = x;
    d.lastY = y;
    const color = erase ? '' : st.color;
    const usePP = st.pixelPerfect && st.brushSize === 1 && !st.mirrorX && !st.mirrorY && d.orig !== null;

    if (usePP) {
      let trail = d.trail;
      const patches: Array<[number, string]> = [];
      for (const pt of seg) {
        const step = pixelPerfectStep(trail, pt);
        trail = step.trail;
        for (const [ux, uy] of step.unpaint) {
          if (inBounds(ux, uy, p.width, p.height)) {
            patches.push([idx(ux, uy, p.width), d.orig![idx(ux, uy, p.width)]]);
          }
        }
        for (const [px, py] of step.paint) {
          if (inBounds(px, py, p.width, p.height)) patches.push([idx(px, py, p.width), color]);
        }
      }
      d.trail = trail;
      if (!patches.length) return;
      const key = patches.map(([i, c]) => `${i}:${c}`).join(',');
      if (key === d.lastKey) return;
      d.lastKey = key;
      st.paintPatch(patches);
      return;
    }

    const indices = new Set<number>();
    for (const [sx, sy] of seg) {
      for (const [mx, my] of mirrorPoints(sx, sy, p.width, p.height, st.mirrorX, st.mirrorY)) {
        for (const i of brushIndices(mx, my, st.brushSize, p.width, p.height)) indices.add(i);
      }
    }
    if (!indices.size) return;
    const key = `${erase ? 'e' : color}|${[...indices].sort((a, b) => a - b).join(',')}`;
    if (key === d.lastKey) return;
    d.lastKey = key;
    st.paint([...indices], erase ? null : st.color);
  }, []);

  const drawOverlayShape = useCallback((x1: number, y1: number, filled: boolean) => {
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
    else if (st.tool === 'rect') pts = rectPoints(d.startX, d.startY, x1, y1, filled);
    else if (st.tool === 'ellipse') {
      const cx = (d.startX + x1) / 2;
      const cy = (d.startY + y1) / 2;
      pts = ellipsePoints(cx, cy, Math.abs(x1 - d.startX) / 2, Math.abs(y1 - d.startY) / 2, filled);
    }
    ctx.fillStyle = st.color;
    ctx.globalAlpha = 0.75;
    // preview idêntico ao resultado: com espelho aplicado
    for (const [x, y] of pts) {
      for (const [mx, my] of mirrorPoints(x, y, p.width, p.height, st.mirrorX, st.mirrorY)) {
        if (inBounds(mx, my, p.width, p.height)) ctx.fillRect(mx * st.zoom, my * st.zoom, st.zoom, st.zoom);
      }
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

    // conta-gotas: ferramenta própria ou Alt pressionado (lê o composto)
    if (st.tool === 'picker' || e.altKey) {
      const c = flattenCells(project, frame)[idx(x, y, project.width)];
      if (c) st.setColor(c);
      return;
    }

    const erase = e.button === 2 || st.tool === 'eraser';
    const layer = project.layers.find((l) => l.id === st.currentLayerId) ?? project.layers[project.layers.length - 1];
    if (layer?.locked) return; // camada travada: sem pintura
    const cel = frame.cels[layer.id] ?? emptyCells(project.width, project.height);

    if (st.tool === 'fill') {
      const changed = floodFill(cel, project.width, project.height, x, y, erase ? '' : st.color);
      // só empilha undo se algo realmente mudou
      if (changed.length) {
        st.beginStroke();
        st.paint(changed, erase ? null : st.color);
      }
      return;
    }

    if (st.tool === 'line' || st.tool === 'rect' || st.tool === 'ellipse') {
      drag.current = { drawing: true, startX: x, startY: y, erase, lastX: x, lastY: y, lastKey: '', trail: [], orig: null };
      drawOverlayShape(x, y, e.shiftKey);
      return;
    }

    st.beginStroke();
    // snapshot grátis: paint() é imutável, então a referência congela o pré-traço
    drag.current = { drawing: true, startX: x, startY: y, erase, lastX: x, lastY: y, lastKey: '', trail: [], orig: cel };
    applyStrokeTo(x, y, erase);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d?.drawing) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    const st = useStudio.getState();
    const [x, y] = cell;
    if (st.tool === 'line' || st.tool === 'rect' || st.tool === 'ellipse') {
      drawOverlayShape(x, y, e.shiftKey);
      return;
    }
    applyStrokeTo(x, y, d.erase);
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
