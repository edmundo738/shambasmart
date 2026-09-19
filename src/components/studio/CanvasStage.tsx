import { useEffect, useRef, useState } from 'react';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useStudio } from '../../store/studio';
import { ToolId } from '../../types';
import { anchorFrac, centerScroll, clampZoom, fitZoom, keepAnchor, stepZoom } from '../../lib/viewport';
import { anchorOffset, CanvasAnchor, clampCanvasSize } from '../../lib/canvas';
import PixelCanvas from './PixelCanvas';

const TOOL_LABEL: Record<ToolId, string> = {
  brush: 'Pincel', eraser: 'Borracha', fill: 'Balde', picker: 'Conta-gotas',
  line: 'Linha', rect: 'Retângulo', ellipse: 'Elipse', select: 'Seleção',
  transform: 'Mover / Objeto', meta: 'Âncoras', bone: 'Osso',
};

type HandleId = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const HANDLE_ANCHOR: Record<HandleId, CanvasAnchor> = { e: 4, w: 6, s: 8, n: 2, se: 7, sw: 9, ne: 1, nw: 3 };
const HANDLE_POS: Record<HandleId, { left: string; top: string; cursor: string }> = {
  e: { left: '100%', top: '50%', cursor: 'ew-resize' },
  w: { left: '0%', top: '50%', cursor: 'ew-resize' },
  s: { left: '50%', top: '100%', cursor: 'ns-resize' },
  n: { left: '50%', top: '0%', cursor: 'ns-resize' },
  se: { left: '100%', top: '100%', cursor: 'nwse-resize' },
  nw: { left: '0%', top: '0%', cursor: 'nwse-resize' },
  sw: { left: '0%', top: '100%', cursor: 'nesw-resize' },
  ne: { left: '100%', top: '0%', cursor: 'nesw-resize' },
};

type Pending = { fx: number; fy: number; cx: number; cy: number } | { center: true };

/**
 * Palco do canvas (E1): rolagem, zoom-ancorado, pan e HUD.
 * O scroll pós-zoom é aplicado DEPOIS do React renderizar o novo tamanho
 * (ver efeito [zoom]) — por isso o `pending`.
 */
export default function CanvasStage() {
  const project = useStudio((s) => s.project);
  const zoom = useStudio((s) => s.zoom);
  const setZoom = useStudio((s) => s.setZoom);
  const panHeld = useStudio((s) => s.panHeld);
  const viewportRequest = useStudio((s) => s.viewportRequest);
  const clearViewport = useStudio((s) => s.clearViewport);
  const showCanvasHandles = useStudio((s) => s.showCanvasHandles);
  const resizeCanvas = useStudio((s) => s.resizeCanvas);
  const tool = useStudio((s) => s.tool);
  const pixelPerfect = useStudio((s) => s.pixelPerfect);
  const currentAnimationId = useStudio((s) => s.currentAnimationId);
  const currentFrameId = useStudio((s) => s.currentFrameId);
  const currentLayerId = useStudio((s) => s.currentLayerId);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const pending = useRef<Pending | null>(null);
  const panLast = useRef<{ x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [live, setLive] = useState<{ w: number; h: number; anchor: CanvasAnchor } | null>(null);
  const hDrag = useRef<{ id: HandleId; startX: number; startY: number; W: number; H: number } | null>(null);

  /* Aplica o scroll pendente após o novo zoom renderizar. */
  useEffect(() => {
    const el = scrollerRef.current;
    const p = pending.current;
    if (!el || !p) return;
    pending.current = null;
    if ('center' in p) {
      el.scrollLeft = centerScroll(el.clientWidth, el.scrollWidth);
      el.scrollTop = centerScroll(el.clientHeight, el.scrollHeight);
    } else {
      el.scrollLeft = keepAnchor(p.fx, el.clientWidth, el.scrollWidth, p.cx);
      el.scrollTop = keepAnchor(p.fy, el.clientHeight, el.scrollHeight, p.cy);
    }
  }, [zoom]);

  const zoomAt = (newZoom: number, cx: number, cy: number) => {
    const el = scrollerRef.current;
    const z = clampZoom(newZoom);
    if (!el || z === useStudio.getState().zoom) return;
    pending.current = {
      fx: anchorFrac(el.scrollLeft, cx, el.scrollWidth),
      fy: anchorFrac(el.scrollTop, cy, el.scrollHeight),
      cx, cy,
    };
    setZoom(z);
  };

  const zoomCenter = (newZoom: number) => {
    const z = clampZoom(newZoom);
    if (z === useStudio.getState().zoom) return;
    pending.current = { center: true };
    setZoom(z);
  };

  /* Ctrl+wheel = zoom ancorado no cursor (listener nativo: precisa preventDefault). */
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // scroll nativo
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(stepZoom(useStudio.getState().zoom, e.deltaY > 0 ? -1 : 1), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Comandos F / 1 / 2 vindos dos atalhos globais. */
  useEffect(() => {
    if (!viewportRequest || !project) return;
    const kind = viewportRequest.kind;
    clearViewport();
    const el = scrollerRef.current;
    if (!el) return;
    if (kind === 'fit') zoomCenter(fitZoom(el.clientWidth, el.clientHeight, project.width, project.height));
    else zoomCenter(kind === 'z100' ? 1 : 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportRequest]);

  /* Auto-fit ao abrir (ou trocar de) projeto. */
  const projId = project?.id;
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !project) return;
    zoomCenter(fitZoom(el.clientWidth, el.clientHeight, project.width, project.height));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projId]);

  /* Pan: botão-do-meio, H segurado, ou arrastar o fundo. */
  const onPanDown = (e: React.PointerEvent) => {
    const el = scrollerRef.current;
    if (!el) return;
    if (e.button === 1 || useStudio.getState().panHeld || (e.button === 0 && e.target === el)) {
      e.preventDefault();
      try { el.setPointerCapture?.(e.pointerId); } catch { /* já capturado */ }
      panLast.current = { x: e.clientX, y: e.clientY };
      setPanning(true);
    }
  };
  const onPanMove = (e: React.PointerEvent) => {
    const el = scrollerRef.current;
    const last = panLast.current;
    if (!el || !last) return;
    el.scrollLeft -= e.clientX - last.x;
    el.scrollTop -= e.clientY - last.y;
    panLast.current = { x: e.clientX, y: e.clientY };
  };
  const onPanUp = () => {
    panLast.current = null;
    setPanning(false);
  };

  /* Resize visual: arrastar borda/canto = resizeCanvas com a âncora oposta. */
  const handleDims = (d: { id: HandleId; startX: number; startY: number; W: number; H: number }, cx: number, cy: number) => {
    const dx = Math.round((cx - d.startX) / zoom);
    const dy = Math.round((cy - d.startY) / zoom);
    let W = d.W, H = d.H;
    if (d.id.includes('e')) W += dx;
    if (d.id.includes('w')) W -= dx;
    if (d.id.includes('s')) H += dy;
    if (d.id.includes('n')) H -= dy;
    return { w: clampCanvasSize(W), h: clampCanvasSize(H) };
  };
  const onHandleDown = (id: HandleId) => (e: React.PointerEvent) => {
    if (!project || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const d = { id, startX: e.clientX, startY: e.clientY, W: project.width, H: project.height };
    hDrag.current = d;
    setLive({ ...handleDims(d, e.clientX, e.clientY), anchor: HANDLE_ANCHOR[id] });
  };
  const onHandleMove = (e: React.PointerEvent) => {
    const d = hDrag.current;
    if (!d) return;
    setLive({ ...handleDims(d, e.clientX, e.clientY), anchor: HANDLE_ANCHOR[d.id] });
  };
  const onHandleUp = (e: React.PointerEvent) => {
    const d = hDrag.current;
    hDrag.current = null;
    if (!d) { setLive(null); return; }
    const { w, h } = handleDims(d, e.clientX, e.clientY);
    setLive(null);
    if (w !== d.W || h !== d.H) {
      resizeCanvas(w, h, HANDLE_ANCHOR[d.id]);
      useStudio.getState().requestViewport('fit');
    }
  };

  if (!project) return null;
  const anim = project.animations.find((a) => a.id === currentAnimationId) ?? project.animations[0];
  const frameIdx = anim && currentFrameId ? anim.frameIds.indexOf(currentFrameId) : -1;
  const layerName = project.layers.find((l) => l.id === currentLayerId)?.name ?? '—';
  const ghost = live ? anchorOffset(live.anchor, project.width, project.height, live.w, live.h) : null;

  return (
    <div
      ref={scrollerRef}
      onPointerDown={onPanDown}
      onPointerMove={onPanMove}
      onPointerUp={onPanUp}
      onPointerCancel={onPanUp}
      style={{ justifyContent: 'safe center', alignItems: 'safe center' }}
      className={`cabinet thin-scroll relative flex min-h-[320px] flex-1 items-center justify-center overflow-auto rounded-xl border border-ink-700 bg-ink-900/30 bg-[radial-gradient(circle_at_50%_40%,rgba(34,184,240,0.07),transparent_60%)] p-6 ${panning ? 'cursor-grabbing' : panHeld ? 'cursor-grab' : ''}`}
    >
      <div className="relative">
        <PixelCanvas />
        {showCanvasHandles && (
          <>
            <div
              className="absolute inset-0 rounded-lg border-2 border-dashed border-forge-400/70"
              style={{ zIndex: 5 }}
              onPointerDown={(e) => { if (e.button === 0) e.stopPropagation(); }}
            />
            {live && ghost && (
              <div
                className="pointer-events-none absolute rounded-[2px] border-2 border-pixel-400"
                style={{
                  zIndex: 6, left: -ghost.dx * zoom, top: -ghost.dy * zoom,
                  width: live.w * zoom, height: live.h * zoom,
                }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink-950/90 px-2 py-0.5 font-mono text-[11px] text-pixel-300">
                  {live.w}×{live.h}
                </div>
              </div>
            )}
            {(Object.keys(HANDLE_POS) as HandleId[]).map((id) => (
              <div
                key={id}
                onPointerDown={onHandleDown(id)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={() => { hDrag.current = null; setLive(null); }}
                className="absolute h-3 w-3 rounded-[3px] border border-ink-950 bg-forge-400 shadow"
                style={{
                  zIndex: 10, left: HANDLE_POS[id].left, top: HANDLE_POS[id].top,
                  cursor: HANDLE_POS[id].cursor, transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* pill de zoom */}
      <div className="pixel-corners-sm absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 border-2 border-ink-600 bg-ink-950/90 px-2 py-1 shadow-xl">
        <button onClick={() => zoomCenter(stepZoom(zoom, -1))} className="rounded-full p-1.5 text-slate-400 hover:bg-ink-800 hover:text-white" title="Afastar (escada de zoom)">
          <ZoomOut size={14} />
        </button>
        <button onClick={() => zoomCenter(fitZoom(scrollerRef.current?.clientWidth ?? 800, scrollerRef.current?.clientHeight ?? 600, project.width, project.height))} className="w-14 text-center font-mono text-[11px] text-slate-300 hover:text-white" title="Ajustar à tela (F)">
          {zoom * 100}%
        </button>
        <button onClick={() => zoomCenter(stepZoom(zoom, 1))} className="rounded-full p-1.5 text-slate-400 hover:bg-ink-800 hover:text-white" title="Aproximar (escada de zoom)">
          <ZoomIn size={14} />
        </button>
        <button onClick={() => useStudio.getState().requestViewport('fit')} className="rounded-full p-1.5 text-slate-400 hover:bg-ink-800 hover:text-white" title="Ajustar à tela (F)">
          <Maximize size={14} />
        </button>
      </div>

      {/* HUD mínima */}
      <div className="absolute bottom-3 left-3 hidden rounded-md border border-ink-700 bg-ink-950/80 px-2 py-1 font-mono text-[10px] text-slate-500 md:block">
        <button onClick={() => useStudio.getState().setCanvasDialogOpen(true)} title="Tamanho do canvas (C)" className="text-slate-300 hover:text-white">{project.width}×{project.height}</button>
        {' · '}{zoom * 100}%
        {' · '}F{frameIdx + 1}/{anim?.frameIds.length ?? 0}
        {' · '}{layerName}
        {' · '}{TOOL_LABEL[tool]}
        {' · '}PP:{pixelPerfect ? <span className="text-pixel-400">on</span> : 'off'}
      </div>

      {/* atalhos */}
      <div className="pf-shadow-sm absolute right-3 top-3 hidden rounded-lg border border-ink-700 bg-ink-950/80 px-2.5 py-1.5 font-mono text-[10px] leading-relaxed text-slate-500 xl:block">
        <div className="pf-eyebrow mb-1 text-[9px] text-forge-400">▸ atalhos</div>
        <div><kbd className="text-slate-300">B E G I M T N L R O</kbd> ferramentas</div>
        <div><kbd className="text-slate-300">C</kbd> canvas · <kbd className="text-slate-300">H</kbd> pan · <kbd className="text-slate-300">F</kbd> ajustar · <kbd className="text-slate-300">1/2</kbd> 100/200%</div>
        <div><kbd className="text-slate-300">Ctrl+scroll</kbd> zoom-no-cursor · <kbd className="text-slate-300">meio</kbd> pan</div>
        <div><kbd className="text-slate-300">Espaço</kbd> play · <kbd className="text-slate-300">←→</kbd> frames</div>
        <div><kbd className="text-slate-300">Ctrl+C/X/V</kbd> copiar/colar frame</div>
        <div><kbd className="text-slate-300">Ctrl+Z</kbd> desfazer · <kbd className="text-slate-300">Alt+clique</kbd> cor</div>
      </div>
    </div>
  );
}
