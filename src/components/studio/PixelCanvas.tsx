import { useCallback, useEffect, useRef } from 'react';
import { useStudio } from '../../store/studio';
import { SelRect } from '../../types';

function normSel(r: SelRect): SelRect {
  return { x0: Math.min(r.x0, r.x1), y0: Math.min(r.y0, r.y1), x1: Math.max(r.x0, r.x1), y1: Math.max(r.y0, r.y1) };
}
function pointInSel(x: number, y: number, r: SelRect): boolean {
  const n = normSel(r);
  return x >= n.x0 && x <= n.x1 && y >= n.y0 && y <= n.y1;
}
import {
  brushIndices, ellipsePoints, emptyCells, floodFill, idx, inBounds, linePoints, mirrorPoints,
  pixelPerfectStep, rectPoints,
} from '../../lib/pixels';
import { compositeStack, flattenCells } from '../../lib/layers';
import { pickAnchor, pointInHitbox } from '../../lib/frameMeta';
import { angleTo, distToSegment, normalizeDeg, snapWorldBone, solveFK, worldToLocal, WorldBone } from '../../lib/fk';

export default function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    drawing: boolean; startX: number; startY: number; erase: boolean;
    lastX: number; lastY: number; lastKey: string;
    trail: Array<[number, number]>; orig: string[] | null;
    mode: 'paint' | 'shape' | 'marquee' | 'move' | 'anchor' | 'hitbox' | 'metadraw' | 'bonepose' | 'bonerot';
    moved: boolean; base: SelRect | null;
    anchorId: string | null; hbDX: number; hbDY: number; hbResize: boolean; boneId: string | null;
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
  const onionPrev = useStudio((s) => s.onionPrev);
  const onionNext = useStudio((s) => s.onionNext);
  const onionOpacity = useStudio((s) => s.onionOpacity);
  const onionTintPrev = useStudio((s) => s.onionTintPrev);
  const onionTintNext = useStudio((s) => s.onionTintNext);
  const zoom = useStudio((s) => s.zoom);
  const selection = useStudio((s) => s.selection);
  const showMeta = useStudio((s) => s.showMeta);
  const showRig = useStudio((s) => s.showRig);
  const selectedBoneId = useStudio((s) => s.selectedBoneId);
  const panHeld = useStudio((s) => s.panHeld);

  const anim = project?.animations.find((a) => a.id === currentAnimationId) ?? project?.animations[0];
  const frame = currentFrameId ? project?.frames[currentFrameId] : undefined;
  const frameIndex = anim && currentFrameId ? anim.frameIds.indexOf(currentFrameId) : -1;

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

    // onion skin: N anteriores + N posteriores, tintas e alpha configuráveis (falloff linear)
    if (onionSkin && anim) {
      const base = onionOpacity / 100;
      const ghost = (fid: string | undefined, tint: string, count: number, k: number) => {
        const gf = fid ? project.frames[fid] : undefined;
        if (!gf || gf.id === frame.id || count <= 0) return;
        const flat = flattenCells(project, gf);
        ctx.globalAlpha = base * ((count - k + 1) / count);
        ctx.fillStyle = tint;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (flat[y * w + x]) ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }
      };
      for (let k = 1; k <= onionPrev; k++) ghost(anim.frameIds[frameIndex - k], onionTintPrev, onionPrev, k);
      for (let k = 1; k <= onionNext; k++) ghost(anim.frameIds[frameIndex + k], onionTintNext, onionNext, k);
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
  }, [project, frame, frameIndex, currentAnimationId, zoom, showGrid, onionSkin, onionPrev, onionNext, onionOpacity, onionTintPrev, onionTintNext]);

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

  /** Marching ants da seleção (duplo tracejado preto/branco). */
  const drawAnts = useCallback((offset: number) => {
    const overlay = overlayRef.current;
    const st = useStudio.getState();
    const sel = st.selection;
    const pr = st.project;
    if (!overlay || !pr || !sel) return;
    overlay.width = pr.width * st.zoom;
    overlay.height = pr.height * st.zoom;
    const ctx = overlay.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const n = normSel(sel);
    const x0 = Math.max(0, n.x0) * st.zoom;
    const y0 = Math.max(0, n.y0) * st.zoom;
    const x1 = (Math.min(pr.width - 1, n.x1) + 1) * st.zoom;
    const y1 = (Math.min(pr.height - 1, n.y1) + 1) * st.zoom;
    if (x1 <= x0 || y1 <= y0) return;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -offset;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
    ctx.lineDashOffset = -offset + 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
    ctx.setLineDash([]);
  }, []);

  /** Laço elástico durante o arrasto do marquee. */
  const drawMarqueeLive = useCallback((ax: number, ay: number, bx: number, by: number) => {
    const overlay = overlayRef.current;
    const st = useStudio.getState();
    const pr = st.project;
    if (!overlay || !pr) return;
    overlay.width = pr.width * st.zoom;
    overlay.height = pr.height * st.zoom;
    const ctx = overlay.getContext('2d')!;
    const n = normSel({ x0: ax, y0: ay, x1: bx, y1: by });
    const x0 = n.x0 * st.zoom, y0 = n.y0 * st.zoom;
    const rw = (n.x1 - n.x0 + 1) * st.zoom, rh = (n.y1 - n.y0 + 1) * st.zoom;
    ctx.fillStyle = 'rgba(99,102,241,0.15)';
    ctx.fillRect(x0, y0, rw, rh);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, rw - 1, rh - 1);
    ctx.setLineDash([]);
  }, []);

  /** Metadados do frame atual: hitbox tracejada + âncoras com nome. */
  const drawMeta = useCallback(() => {
    const overlay = overlayRef.current;
    const st = useStudio.getState();
    const pr = st.project;
    const f = st.currentFrameId ? pr?.frames[st.currentFrameId] : undefined;
    if (!overlay || !pr || !f || !st.showMeta) return;
    if (!overlay.width) {
      overlay.width = pr.width * st.zoom;
      overlay.height = pr.height * st.zoom;
    }
    const ctx = overlay.getContext('2d')!;
    const z = st.zoom;
    if (f.hitbox) {
      const b = f.hitbox;
      ctx.save();
      ctx.strokeStyle = '#3fd65f';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(b.x * z + 0.5, b.y * z + 0.5, b.w * z - 1, b.h * z - 1);
      ctx.setLineDash([]);
      ctx.fillStyle = '#3fd65f';
      const hs = Math.max(5, Math.min(9, z));
      ctx.fillRect((b.x + b.w) * z - hs, (b.y + b.h) * z - hs, hs, hs);
      ctx.restore();
    }
    ctx.font = '10px monospace';
    ctx.textBaseline = 'middle';
    for (const a of f.anchors) {
      const cx = (a.x + 0.5) * z, cy = (a.y + 0.5) * z;
      const r = Math.max(3, z * 0.32);
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000';
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.fillRect(cx - 0.5, cy - 0.5, 1, 1);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(a.name, cx + r + 3, cy);
      ctx.fillStyle = '#ffd23f';
      ctx.fillText(a.name, cx + r + 3, cy);
    }
  }, []);

  /** Esqueleto-guia pixel-snapped + poses-fantasma dos vizinhos (tintas do onion). */
  const drawRig = useCallback(() => {
    const overlay = overlayRef.current;
    const st = useStudio.getState();
    const pr = st.project;
    const f = st.currentFrameId ? pr?.frames[st.currentFrameId] : undefined;
    const rig = pr?.rig ?? [];
    if (!overlay || !pr || !f || !st.showRig || !rig.length) return;
    if (!overlay.width) {
      overlay.width = pr.width * st.zoom;
      overlay.height = pr.height * st.zoom;
    }
    const ctx = overlay.getContext('2d')!;
    const z = st.zoom;
    const paint = (pose: typeof f.pose, color: string, joint: string, alpha: number, selectedId: string | null) => {
      const world = solveFK(rig, pose).map(snapWorldBone);
      ctx.globalAlpha = alpha;
      for (const w of world) {
        const sel = selectedId === w.id;
        ctx.fillStyle = sel ? '#ff8a00' : color;
        for (const [lx, ly] of linePoints(w.jx, w.jy, w.tipX, w.tipY)) {
          ctx.fillRect(lx * z, ly * z, z, z);
        }
        ctx.fillStyle = sel ? '#ff8a00' : joint;
        const s = Math.max(3, Math.round(z * 0.3));
        ctx.fillRect((w.jx + 0.5) * z - s / 2, (w.jy + 0.5) * z - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    };
    const anim = pr.animations.find((a) => a.id === (st.currentAnimationId ?? pr.animations[0]?.id));
    if (anim && st.onionSkin) {
      const idx = anim.frameIds.indexOf(st.currentFrameId ?? '');
      const base = st.onionOpacity / 100;
      for (let k = 1; k <= st.onionPrev; k++) {
        const gf = idx - k >= 0 ? pr.frames[anim.frameIds[idx - k]] : undefined;
        if (gf && gf.pose && gf.id !== f.id) {
          paint(gf.pose, st.onionTintPrev, st.onionTintPrev, base * ((st.onionPrev - k + 1) / st.onionPrev), null);
        }
      }
      for (let k = 1; k <= st.onionNext; k++) {
        const gf = idx + k < anim.frameIds.length ? pr.frames[anim.frameIds[idx + k]] : undefined;
        if (gf && gf.pose && gf.id !== f.id) {
          paint(gf.pose, st.onionTintNext, st.onionTintNext, base * ((st.onionNext - k + 1) / st.onionNext), null);
        }
      }
    }
    paint(f.pose, '#22d3ee', '#ffffff', 1, st.selectedBoneId);
  }, []);

  const drawDecor = useCallback(() => {
    drawAnts(0);
    drawMeta();
    drawRig();
  }, [drawAnts, drawMeta, drawRig]);

  /* Overlay: ants (+ meta) estáticas sempre; ants animadas com a ferramenta select. */
  useEffect(() => {
    if (!selection) {
      if (!drag.current?.drawing) {
        clearOverlay();
        drawMeta();
      }
      return;
    }
    drawDecor();
    if (tool !== 'select') return;
    let off = 0;
    const t = setInterval(() => { off = (off + 2) % 16; drawAnts(off); drawMeta(); drawRig(); }, 120);
    return () => clearInterval(t);
  }, [selection, zoom, tool, frame, showMeta, showRig, selectedBoneId, clearOverlay, drawAnts, drawMeta, drawRig, drawDecor]);

  /* Esc durante marquee/arrasto: cancela (arrasto reverte pixels + retângulo). */
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const d = drag.current;
      if (!d || (d.mode !== 'move' && d.mode !== 'marquee' && d.mode !== 'anchor' && d.mode !== 'hitbox' && d.mode !== 'metadraw' && d.mode !== 'bonepose' && d.mode !== 'bonerot')) return;
      e.preventDefault();
      e.stopPropagation();
      const st = useStudio.getState();
      if ((d.mode === 'move' || d.mode === 'anchor' || d.mode === 'hitbox' || d.mode === 'bonepose' || d.mode === 'bonerot') && d.moved) st.undo();
      if (d.mode === 'move') st.setSelection(d.base ? { ...d.base } : null);
      else if (d.mode === 'marquee') st.setSelection(null);
      drag.current = null;
      clearOverlay();
      drawDecor();
    };
    window.addEventListener('keydown', onEsc, true);
    return () => window.removeEventListener('keydown', onEsc, true);
  }, [clearOverlay, drawDecor]);

  /* ------------------------------ interações ------------------------------ */
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || useStudio.getState().panHeld) return; // pan: tratado pelo CanvasStage
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

    if (st.tool === 'select') {
      const sel = st.selection;
      if (sel && pointInSel(x, y, sel)) {
        const layer = project.layers.find((l) => l.id === st.currentLayerId) ?? project.layers[project.layers.length - 1];
        if (layer?.locked) return;
        st.beginStroke(); // baseline: arrasto inteiro = 1 undo
        drag.current = {
          drawing: true, startX: x, startY: y, erase: false, lastX: x, lastY: y,
          lastKey: '', trail: [], orig: null, mode: 'move', moved: false, base: { ...sel }, anchorId: null, hbDX: 0, hbDY: 0, hbResize: false, boneId: null,
        };
      } else {
        st.setSelection(null);
        drag.current = {
          drawing: true, startX: x, startY: y, erase: false, lastX: x, lastY: y,
          lastKey: '', trail: [], orig: null, mode: 'marquee', moved: false, base: null, anchorId: null, hbDX: 0, hbDY: 0, hbResize: false, boneId: null,
        };
      }
      return;
    }

    if (st.tool === 'meta') {
      const hit = pickAnchor(frame.anchors ?? [], x, y);
      if (hit) {
        st.beginStroke();
        drag.current = {
          drawing: true, startX: x, startY: y, erase: false, lastX: x, lastY: y,
          lastKey: '', trail: [], orig: null, mode: 'anchor', moved: false, base: null,
          anchorId: hit.id, hbDX: 0, hbDY: 0, hbResize: false, boneId: null,
        };
        return;
      }
      const hb = frame.hitbox;
      if (hb && Math.abs(x - (hb.x + hb.w - 1)) <= 1 && Math.abs(y - (hb.y + hb.h - 1)) <= 1) {
        st.beginStroke(); // redimensiona pelo canto SE
        drag.current = {
          drawing: true, startX: x, startY: y, erase: false, lastX: x, lastY: y,
          lastKey: '', trail: [], orig: null, mode: 'hitbox', moved: false, base: null,
          anchorId: null, hbDX: 0, hbDY: 0, hbResize: true, boneId: null,
        };
        return;
      }
      if (hb && pointInHitbox(x, y, hb)) {
        st.beginStroke(); // move a caixa
        drag.current = {
          drawing: true, startX: x, startY: y, erase: false, lastX: x, lastY: y,
          lastKey: '', trail: [], orig: null, mode: 'hitbox', moved: false, base: null,
          anchorId: null, hbDX: x - hb.x, hbDY: y - hb.y, hbResize: false, boneId: null,
        };
        return;
      }
      // vazio: clique cria âncora, arrasto desenha hitbox
      drag.current = {
        drawing: true, startX: x, startY: y, erase: false, lastX: x, lastY: y,
        lastKey: '', trail: [], orig: null, mode: 'metadraw', moved: false, base: null,
        anchorId: null, hbDX: 0, hbDY: 0, hbResize: false, boneId: null,
      };
      return;
    }

    if (st.tool === 'bone') {
      const rig = project.rig ?? [];
      const world = solveFK(rig, frame.pose);
      let joint: WorldBone | null = null;
      let best = 2.001;
      for (const w of world) {
        const d = Math.hypot(w.jx - x, w.jy - y);
        if (d <= 2 && d < best) { joint = w; best = d; }
      }
      if (joint) {
        st.selectBone(joint.id);
        st.beginStroke();
        drag.current = {
          drawing: true, startX: x, startY: y, erase: false, lastX: x, lastY: y,
          lastKey: '', trail: [], orig: null, mode: 'bonepose', moved: false, base: null,
          anchorId: null, hbDX: 0, hbDY: 0, hbResize: false, boneId: joint.id,
        };
        return;
      }
      let body: WorldBone | null = null;
      let bestB = 1.6;
      for (const w of world) {
        const d = distToSegment(x, y, w.jx, w.jy, w.tipX, w.tipY);
        if (d < bestB) { body = w; bestB = d; }
      }
      if (body) {
        st.selectBone(body.id);
        st.beginStroke();
        drag.current = {
          drawing: true, startX: x, startY: y, erase: false, lastX: x, lastY: y,
          lastKey: '', trail: [], orig: null, mode: 'bonerot', moved: false, base: null,
          anchorId: null, hbDX: 0, hbDY: 0, hbResize: false, boneId: body.id,
        };
        return;
      }
      // vazio: cria osso (filho do selecionado ou raiz) no ponto
      const sel = st.selectedBoneId && rig.some((b) => b.id === st.selectedBoneId) ? st.selectedBoneId : null;
      st.addBone(sel, { x, y });
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
      drag.current = { drawing: true, startX: x, startY: y, erase, lastX: x, lastY: y, lastKey: '', trail: [], orig: null, mode: 'shape', moved: false, base: null, anchorId: null, hbDX: 0, hbDY: 0, hbResize: false, boneId: null };
      drawOverlayShape(x, y, e.shiftKey);
      return;
    }

    st.beginStroke();
    // snapshot grátis: paint() é imutável, então a referência congela o pré-traço
    drag.current = { drawing: true, startX: x, startY: y, erase, lastX: x, lastY: y, lastKey: '', trail: [], orig: cel, mode: 'paint', moved: false, base: null, anchorId: null, hbDX: 0, hbDY: 0, hbResize: false, boneId: null };
    applyStrokeTo(x, y, erase);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d?.drawing) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    const st = useStudio.getState();
    const [x, y] = cell;
    if (d.mode === 'bonepose' && d.boneId) {
      const pr = st.project;
      const bone = pr?.rig.find((b) => b.id === d.boneId);
      if (pr && bone) {
        const f = pr.frames[st.currentFrameId ?? ''];
        st.poseBoneLive(d.boneId, worldToLocal(pr.rig, f?.pose, bone.parentId, x, y));
        d.moved = true;
      }
      return;
    }
    if (d.mode === 'bonerot' && d.boneId) {
      const pr = st.project;
      if (pr) {
        const f = pr.frames[st.currentFrameId ?? ''];
        const world = solveFK(pr.rig, f?.pose);
        const w = world.find((b) => b.id === d.boneId);
        if (w) {
          const parentRot = w.parentId ? world.find((q) => q.id === w.parentId)?.worldRot ?? 0 : 0;
          st.poseBoneLive(d.boneId, { rotation: normalizeDeg(angleTo(w.jx, w.jy, x, y) - parentRot) });
          d.moved = true;
        }
      }
      return;
    }
    if (d.mode === 'anchor' && d.anchorId) {
      st.moveAnchorLive(d.anchorId, x, y);
      d.lastX = x; d.lastY = y; d.moved = true;
      return;
    }
    if (d.mode === 'hitbox') {
      const f = st.project?.frames[st.currentFrameId ?? ''];
      const hb = f?.hitbox;
      if (hb) {
        if (d.hbResize) st.setHitboxLive({ x: hb.x, y: hb.y, w: x - hb.x + 1, h: y - hb.y + 1 });
        else st.setHitboxLive({ x: x - d.hbDX, y: y - d.hbDY, w: hb.w, h: hb.h });
        d.moved = true;
      }
      return;
    }
    if (d.mode === 'metadraw') {
      drawMarqueeLive(d.startX, d.startY, x, y);
      d.moved = x !== d.startX || y !== d.startY;
      return;
    }
    if (d.mode === 'marquee') {
      drawMarqueeLive(d.startX, d.startY, x, y);
      d.moved = x !== d.startX || y !== d.startY;
      return;
    }
    if (d.mode === 'move') {
      const dx = x - d.lastX, dy = y - d.lastY;
      if (dx || dy) {
        st.moveSelectionLive(dx, dy);
        d.lastX = x; d.lastY = y; d.moved = true;
      }
      return;
    }
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
    if (d.mode === 'anchor' || d.mode === 'hitbox' || d.mode === 'bonepose' || d.mode === 'bonerot') return; // undo único via beginStroke
    if (d.mode === 'metadraw') {
      const cell = cellFromEvent(e);
      clearOverlay();
      drawDecor();
      if (!cell || !project) return;
      const [x1, y1] = cell;
      if (x1 === d.startX && y1 === d.startY) st.addAnchorAt(x1, y1);
      else {
        const n = normSel({ x0: d.startX, y0: d.startY, x1, y1 });
        st.setHitbox({ x: n.x0, y: n.y0, w: n.x1 - n.x0 + 1, h: n.y1 - n.y0 + 1 });
      }
      return;
    }
    if (d.mode === 'marquee') {
      const cell = cellFromEvent(e);
      clearOverlay();
      if (cell && project) {
        const [x1, y1] = cell;
        if (x1 === d.startX && y1 === d.startY) st.setSelection(null);
        else st.setSelection(normSel({ x0: d.startX, y0: d.startY, x1, y1 }));
      }
      return;
    }
    if (d.mode === 'move') return; // undo único já garantido pelo beginStroke do down
    if (st.tool === 'line' || st.tool === 'rect' || st.tool === 'ellipse') {
      const cell = cellFromEvent(e);
      clearOverlay();
      drawDecor(); // restaura ants + meta por baixo do preview da forma
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
        className={`pixelated checker rounded-lg border border-ink-600 shadow-2xl ${panHeld ? "cursor-grab" : "cursor-crosshair"}`}
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
