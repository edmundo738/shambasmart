import { useEffect, useMemo, useState } from 'react';
import { FlipHorizontal2, FlipVertical2, Move3d, Scissors, X } from 'lucide-react';
import { useStudio } from '../../store/studio';
import {
  anchorOffset, CanvasAnchor, clampCanvasSize, countOutside, projectContentBounds,
} from '../../lib/canvas';

const PRESETS = [16, 24, 32, 48, 64, 96, 128, 256];
/** Numpad y-down: 7 8 9 / 4 5 6 / 1 2 3. */
const ANCHORS: CanvasAnchor[] = [7, 8, 9, 4, 5, 6, 1, 2, 3];

/**
 * Diálogo de canvas (E1+): tamanho com âncora, cortar no conteúdo,
 * dimensionar (nearest), espelhar, grade. Tudo com undo único. Abre via `C`
 * ou clicando no tamanho no HUD — nada de painel permanente (menos UI).
 */
export default function CanvasSizeModal() {
  const open = useStudio((s) => s.canvasDialogOpen);
  const setOpen = useStudio((s) => s.setCanvasDialogOpen);
  const project = useStudio((s) => s.project);
  const resizeCanvas = useStudio((s) => s.resizeCanvas);
  const trimCanvas = useStudio((s) => s.trimCanvas);
  const scaleSprite = useStudio((s) => s.scaleSprite);
  const flipCanvas = useStudio((s) => s.flipCanvas);
  const setShowHandles = useStudio((s) => s.setShowCanvasHandles);
  const showGrid = useStudio((s) => s.showGrid);
  const toggleGrid = useStudio((s) => s.toggleGrid);
  const gridSize = useStudio((s) => s.gridSize);
  const setGridSize = useStudio((s) => s.setGridSize);

  const [w, setW] = useState(32);
  const [h, setH] = useState(32);
  const [anchor, setAnchor] = useState<CanvasAnchor>(5);
  const [pad, setPad] = useState(4);
  const [sw, setSw] = useState(32);
  const [sh, setSh] = useState(32);

  useEffect(() => {
    if (open && project) {
      setW(project.width); setH(project.height);
      setSw(project.width); setSh(project.height);
      setAnchor(5);
    }
  }, [open, project]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        useStudio.getState().setCanvasDialogOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open ]);

  const bounds = useMemo(() => (project ? projectContentBounds(project) : null), [project]);

  /** Pixels opacos que o novo tamanho destruiria (todas as cels). */
  const clipped = useMemo(() => {
    if (!project) return 0;
    const newW = clampCanvasSize(w), newH = clampCanvasSize(h);
    if (newW >= project.width && newH >= project.height) return 0;
    const { dx, dy } = anchorOffset(anchor, project.width, project.height, newW, newH);
    const rect = { x: -dx, y: -dy, w: newW, h: newH };
    let n = 0;
    for (const f of Object.values(project.frames)) {
      for (const l of project.layers) {
        const cel = f.cels[l.id];
        if (cel) n += countOutside(cel, project.width, project.height, rect);
      }
    }
    return n;
  }, [project, w, h, anchor]);

  if (!open || !project) return null;

  const applyAndFit = (fn: () => void) => {
    fn();
    setOpen(false);
    useStudio.getState().requestViewport('fit');
  };

  const num = 'w-20 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-xs text-white';
  const sec = 'pf-eyebrow mb-2 text-[10px] text-forge-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
      <div
        className="cabinet thin-scroll max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-ink-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-white">Canvas</h2>
          <button onClick={() => setOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-ink-800 hover:text-white" title="Fechar (Esc)">
            <X size={16} />
          </button>
        </div>
        <p className="mb-4 font-mono text-[11px] text-slate-500">
          {project.width}×{project.height}px
          {bounds ? <> · conteúdo ({bounds.x},{bounds.y}) {bounds.w}×{bounds.h}</> : ' · vazio'}
        </p>

        {/* tamanho + âncora */}
        <div className={sec}>▸ tamanho do canvas</div>
        <div className="mb-2 flex items-center gap-2">
          <input type="number" value={w} min={1} max={512} onChange={(e) => setW(Number(e.target.value))} className={num} aria-label="Largura" />
          <span className="text-slate-500">×</span>
          <input type="number" value={h} min={1} max={512} onChange={(e) => setH(Number(e.target.value))} className={num} aria-label="Altura" />
          <span className="font-mono text-[11px] text-slate-500">px</span>
        </div>
        <div className="mb-3 flex flex-wrap gap-1">
          {PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => { setW(s); setH(s); }}
              className={`pixel-corners-sm px-2 py-1 font-mono text-[11px] font-bold ${w === s && h === s ? 'bg-forge-500/20 text-forge-300 ring-1 ring-forge-500' : 'bg-ink-950 text-slate-400 hover:text-white'}`}
            >
              {s}²
            </button>
          ))}
        </div>
        <div className="mb-3 flex items-center gap-3">
          <div className="grid grid-cols-3 gap-0.5" title="Âncora: onde o conteúdo fica no novo tamanho">
            {ANCHORS.map((a) => (
              <button
                key={a}
                onClick={() => setAnchor(a)}
                title={`Âncora ${a}`}
                className={`h-6 w-6 rounded-[3px] border ${anchor === a ? 'border-forge-400 bg-forge-500/40' : 'border-ink-700 bg-ink-950 hover:border-ink-500'}`}
              />
            ))}
          </div>
          <div className="font-mono text-[11px] leading-relaxed text-slate-500">
            <div>→ {clampCanvasSize(w)}×{clampCanvasSize(h)}px</div>
            {clipped > 0 ? (
              <div className="font-bold text-red-400">⚠ corta {clipped} px</div>
            ) : (
              <div className="text-slate-600">nada é cortado</div>
            )}
          </div>
        </div>
        <button
          onClick={() => applyAndFit(() => resizeCanvas(w, h, anchor))}
          disabled={clampCanvasSize(w) === project.width && clampCanvasSize(h) === project.height}
          className="btn-arcade pixel-corners-sm w-full bg-gradient-to-r from-forge-500 to-pixel-500 px-4 py-2 text-xs font-bold text-ink-950 disabled:opacity-40"
        >
          Aplicar tamanho
        </button>

        {/* cortar / dimensionar / espelhar */}
        <div className={`${sec} mt-5`}>▸ conteúdo</div>
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={() => applyAndFit(() => trimCanvas(pad))}
            disabled={!bounds}
            title="Redimensiona para o bbox opaco + respiro"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-forge-500 disabled:opacity-40"
          >
            <Scissors size={14} /> Cortar no conteúdo
          </button>
          <input type="number" value={pad} min={0} max={64} onChange={(e) => setPad(Number(e.target.value))} className={`${num} w-16`} title="Respiro (padding) em px" aria-label="Respiro" />
        </div>
        <div className="mb-2 flex items-center gap-2">
          <input type="number" value={sw} min={1} max={512} onChange={(e) => setSw(Number(e.target.value))} className={num} aria-label="Largura da escala" />
          <span className="text-slate-500">×</span>
          <input type="number" value={sh} min={1} max={512} onChange={(e) => setSh(Number(e.target.value))} className={num} aria-label="Altura da escala" />
          <button
            onClick={() => applyAndFit(() => scaleSprite(sw, sh))}
            disabled={clampCanvasSize(sw) === project.width && clampCanvasSize(sh) === project.height}
            title="Redimensiona os pixels (nearest-neighbor, sem blur)"
            className="flex-1 rounded-lg border border-ink-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-forge-500 disabled:opacity-40"
          >
            Dimensionar
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => flipCanvas('h')} title="Espelha tudo (pixels, rig, metas)" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-forge-500">
            <FlipHorizontal2 size={14} /> Espelhar H
          </button>
          <button onClick={() => flipCanvas('v')} title="Espelha tudo (pixels, rig, metas)" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-forge-500">
            <FlipVertical2 size={14} /> Espelhar V
          </button>
        </div>

        {/* exibição */}
        <div className={`${sec} mt-5`}>▸ exibição</div>
        <div className="flex items-center gap-2">
          <button onClick={toggleGrid} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${showGrid ? 'border-forge-500/50 bg-forge-500/10 text-forge-300' : 'border-ink-600 text-slate-400'}`}>
            Grade {showGrid ? 'on' : 'off'}
          </button>
          <div className="flex gap-1">
            {([1, 2, 4, 8] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGridSize(g)}
                title={`Grade a cada ${g}px (maior a cada ${g * 8}px)`}
                className={`pixel-corners-sm px-2.5 py-2 font-mono text-[11px] font-bold ${gridSize === g ? 'bg-forge-500/20 text-forge-300 ring-1 ring-forge-500' : 'bg-ink-950 text-slate-400 hover:text-white'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setOpen(false); useStudio.getState().setShowCanvasHandles(true); }}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-600 py-2.5 text-xs font-semibold text-slate-300 hover:border-pixel-500 hover:text-pixel-400"
        >
          <Move3d size={14} /> Ajustar bordas no canvas (Esc sai)
        </button>
      </div>
    </div>
  );
}
