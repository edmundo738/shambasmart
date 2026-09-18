import {
  Anchor, Bone, BoxSelect, Brush, Circle, Crosshair, Eraser, FlipHorizontal2, FlipVertical2, Ghost, Grid3x3, PaintBucket, Pipette,
  Slash, Square,
} from 'lucide-react';
import { useStudio } from '../../store/studio';
import { ToolId } from '../../types';

const TOOLS: Array<{ id: ToolId; icon: React.ReactNode; label: string; hint: string }> = [
  { id: 'brush', icon: <Brush size={18} />, label: 'Pincel', hint: 'B' },
  { id: 'eraser', icon: <Eraser size={18} />, label: 'Borracha', hint: 'E' },
  { id: 'fill', icon: <PaintBucket size={18} />, label: 'Balde', hint: 'G' },
  { id: 'picker', icon: <Pipette size={18} />, label: 'Conta-gotas', hint: 'I' },
  { id: 'select', icon: <BoxSelect size={18} />, label: 'Selecionar', hint: 'M' },
  { id: 'meta', icon: <Anchor size={18} />, label: 'Âncoras', hint: 'T' },
  { id: 'bone', icon: <Bone size={18} />, label: 'Ossos', hint: 'N' },
  { id: 'line', icon: <Slash size={18} />, label: 'Linha', hint: 'L' },
  { id: 'rect', icon: <Square size={18} />, label: 'Retângulo', hint: 'R' },
  { id: 'ellipse', icon: <Circle size={18} />, label: 'Elipse', hint: 'O' },
];

export default function Toolbar() {
  const tool = useStudio((s) => s.tool);
  const setTool = useStudio((s) => s.setTool);
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
      {TOOLS.map((t) => (
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
