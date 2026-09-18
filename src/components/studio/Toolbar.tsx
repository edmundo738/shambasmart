import {
  Anchor, Bone, BoxSelect, Brush, ChevronDown, Circle, Crosshair, Eraser, FlipHorizontal2, FlipVertical2, Ghost, Grid3x3,
  Hand, MousePointer2, MousePointerClick, PaintBucket, Pipette, Slash, Square,
} from 'lucide-react';
import { useState } from 'react';
import { useStudio } from '../../store/studio';
import { ToolId } from '../../types';

const TOOLS: Array<{ id: ToolId; icon: React.ReactNode; label: string; hint: string }> = [
  { id: 'brush', icon: <Brush size={18} />, label: 'Pincel', hint: 'B' },
  { id: 'eraser', icon: <Eraser size={18} />, label: 'Borracha', hint: 'E' },
  { id: 'fill', icon: <PaintBucket size={18} />, label: 'Balde', hint: 'G' },
  { id: 'picker', icon: <Pipette size={18} />, label: 'Conta-gotas', hint: 'I' },
  { id: 'select', icon: <BoxSelect size={18} />, label: 'Selecionar', hint: 'M' },
  { id: 'transform', icon: <MousePointer2 size={18} />, label: 'Mover / Objeto', hint: 'V' },
  { id: 'meta', icon: <Anchor size={18} />, label: 'Âncoras', hint: 'T' },
  { id: 'bone', icon: <Bone size={18} />, label: 'Ossos', hint: 'N' },
  { id: 'line', icon: <Slash size={18} />, label: 'Linha', hint: 'L' },
  { id: 'rect', icon: <Square size={18} />, label: 'Retângulo', hint: 'R' },
  { id: 'ellipse', icon: <Circle size={18} />, label: 'Elipse', hint: 'O' },
];

export default function Toolbar() {
  const tool = useStudio((s) => s.tool);
  const setTool = useStudio((s) => s.setTool);
  const transformMode = useStudio((s) => s.transformMode);
  const setTransformMode = useStudio((s) => s.setTransformMode);
  const [transformOpen, setTransformOpen] = useState(false);
  const brushSize = useStudio((s) => s.brushSize);
  const setBrushSize = useStudio((s) => s.setBrushSize);
  const mirrorX = useStudio((s) => s.mirrorX);
  const mirrorY = useStudio((s) => s.mirrorY);
  const toggleMirrorX = useStudio((s) => s.toggleMirrorX);
  const toggleMirrorY = useStudio((s) => s.toggleMirrorY);
  const showGrid = useStudio((s) => s.showGrid);
  const toggleGrid = useStudio((s) => s.toggleGrid);
  const pixelPerfect = useStudio((s) => s.pixelPerfect);
  const togglePixelPerfect = useStudio((s) => s.togglePixelPerfect);
  const onionSkin = useStudio((s) => s.onionSkin);
  const toggleOnion = useStudio((s) => s.toggleOnion);

  const btn = (active: boolean) =>
    `flex h-10 w-10 items-center justify-center rounded-md border transition-all ${
      active
        ? 'border-forge-400 bg-forge-500/25 text-forge-200 shadow-glow'
        : 'border-transparent text-slate-400 hover:border-ink-600 hover:bg-ink-800 hover:text-slate-100 active:translate-y-px'
    }`;

  return (
    <div className="pf-shadow flex w-14 flex-col items-center gap-1 rounded-xl border border-ink-700 bg-ink-900/90 p-2">
      {TOOLS.map((t) => t.id === 'transform' ? (
        <div key={t.id} className="relative">
          <button
            title={`${t.label} (${t.hint}) — abre modos`}
            onClick={() => { setTool('transform'); setTransformMode('move'); setTransformOpen((v) => !v); }}
            className={btn(tool === t.id)}
          >
            {t.icon}
            <ChevronDown size={9} className="absolute bottom-1 right-1 text-forge-300" />
          </button>
          {(transformOpen || tool === 'transform') && (
            <div className="absolute left-12 top-0 z-30 flex w-40 flex-col gap-1 rounded-lg border border-ink-600 bg-ink-950/95 p-1.5 shadow-2xl">
              {[
                ['move', 'Mover', <Hand size={14} />, 'V · clicar e arrastar'],
                ['object', 'Selecionar objeto', <MousePointerClick size={14} />, 'clique numa ilha opaca'],
                ['push', 'Empurrar', <MousePointer2 size={14} />, 'arrastar/nudge pixel-safe'],
              ].map(([mode, label, icon, hint]) => (
                <button key={mode as string} onClick={() => { setTool('transform'); setTransformMode(mode as 'move' | 'object' | 'push'); setTransformOpen(false); }} className={`flex items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] ${transformMode === mode ? 'bg-forge-500/20 text-forge-200' : 'text-slate-300 hover:bg-ink-800'}`}>
                  {icon}<span><b className="block">{label}</b><small className="text-[9px] text-slate-500">{hint}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button key={t.id} title={`${t.label} (${t.hint})`} onClick={() => setTool(t.id)} className={btn(tool === t.id)}>
          {t.icon}
        </button>
      ))}

      <div className="my-1 h-px w-8 bg-ink-700" />

      {/* tamanho do pincel */}
      <div className="flex flex-col items-center gap-1" title="Tamanho do pincel ([ ])">
        <span className="text-[10px] font-semibold text-slate-500">{brushSize}px</span>
        <div className="grid grid-cols-2 gap-1">
          {[1, 2, 3, 4, 6, 8].map((n) => (
            <button
              key={n}
              onClick={() => setBrushSize(n)}
              className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                brushSize === n ? 'border-pixel-500 bg-pixel-500/20' : 'border-ink-700 hover:bg-ink-800'
              }`}
            >
              <span
                className={`rounded-[2px] ${brushSize === n ? 'bg-pixel-400' : 'bg-slate-400'}`}
                style={{ width: 3 + n * 2.4, height: 3 + n * 2.4 }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="my-1 h-px w-8 bg-ink-700" />

      <button title="Espelhar horizontal (X)" onClick={toggleMirrorX} className={btn(mirrorX)}>
        <FlipHorizontal2 size={18} />
      </button>
      <button title="Espelhar vertical (Y)" onClick={toggleMirrorY} className={btn(mirrorY)}>
        <FlipVertical2 size={18} />
      </button>
      <button title="Mostrar grade" onClick={toggleGrid} className={btn(showGrid)}>
        <Grid3x3 size={18} />
      </button>
      <button title="Pixel-perfect 1px (P)" onClick={togglePixelPerfect} className={btn(pixelPerfect)}>
        <Crosshair size={18} />
      </button>
      <button title="Onion skin (ver frames vizinhos)" onClick={toggleOnion} className={btn(onionSkin)}>
        <Ghost size={18} />
      </button>
    </div>
  );
}
