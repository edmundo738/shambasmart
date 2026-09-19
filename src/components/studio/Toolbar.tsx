import {
  Anchor, Bone, BoxSelect, Brush, Circle, Crosshair, Eraser, FlipHorizontal2, FlipVertical2, Ghost, Grid3x3,
  MousePointer2, PaintBucket, Pipette, Slash, Square,
} from 'lucide-react';
import { useStudio } from '../../store/studio';
import { ToolId } from '../../types';

type ToolDef = { id: ToolId; icon: React.ReactNode; label: string; hint: string };

const TOOL_GROUPS: Array<{ label: string; tools: ToolDef[] }> = [
  {
    label: 'Desenho',
    tools: [
      { id: 'brush', icon: <Brush size={17} />, label: 'Pincel', hint: 'B' },
      { id: 'eraser', icon: <Eraser size={17} />, label: 'Borracha', hint: 'E' },
      { id: 'fill', icon: <PaintBucket size={17} />, label: 'Balde', hint: 'G' },
      { id: 'picker', icon: <Pipette size={17} />, label: 'Conta-gotas', hint: 'I' },
    ],
  },
  {
    label: 'Edição',
    tools: [
      { id: 'select', icon: <BoxSelect size={17} />, label: 'Seleção', hint: 'M' },
      { id: 'transform', icon: <MousePointer2 size={17} />, label: 'Cursor: mover, objeto ou empurrar', hint: 'V' },
    ],
  },
  {
    label: 'Formas',
    tools: [
      { id: 'line', icon: <Slash size={17} />, label: 'Linha', hint: 'L' },
      { id: 'rect', icon: <Square size={17} />, label: 'Retângulo', hint: 'R' },
      { id: 'ellipse', icon: <Circle size={17} />, label: 'Elipse', hint: 'O' },
    ],
  },
  {
    label: 'Guia',
    tools: [
      { id: 'meta', icon: <Anchor size={17} />, label: 'Âncoras e hitbox', hint: 'T' },
      { id: 'bone', icon: <Bone size={17} />, label: 'Ossos', hint: 'N' },
    ],
  },
];

export default function Toolbar() {
  const tool = useStudio((s) => s.tool);
  const setTool = useStudio((s) => s.setTool);
  const setTransformMode = useStudio((s) => s.setTransformMode);
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

  const buttonClass = (active: boolean) =>
    `group relative flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-colors ${
      active
        ? 'border-forge-400 bg-forge-500/15 text-forge-200'
        : 'border-transparent text-slate-400 hover:border-ink-600 hover:bg-ink-800 hover:text-slate-100'
    }`;

  const choose = (id: ToolId) => {
    setTool(id);
    if (id === 'transform') setTransformMode('move');
  };

  return (
    <div role="toolbar" aria-label="Ferramentas do editor" className="flex w-14 flex-col items-center gap-1 rounded-lg border border-ink-700 bg-ink-900 p-2">
      {TOOL_GROUPS.map((group, groupIndex) => (
        <div key={group.label} className="flex w-full flex-col items-center gap-1">
          {groupIndex > 0 && <div className="my-1 h-px w-7 bg-ink-700" aria-hidden />}
          <span className="sr-only">{group.label}</span>
          {group.tools.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={`${t.label} (${t.hint})`}
              title={`${t.label} (${t.hint})`}
              onClick={() => choose(t.id)}
              className={buttonClass(tool === t.id)}
            >
              {t.icon}
              <span className="pointer-events-none absolute left-11 z-40 hidden whitespace-nowrap rounded-md border border-ink-600 bg-ink-950 px-2 py-1 text-[11px] font-medium text-slate-200 shadow-lg group-hover:block">
                {t.label} <kbd className="ml-1 text-[10px] text-slate-500">{t.hint}</kbd>
              </span>
            </button>
          ))}
        </div>
      ))}

      <div className="my-1 h-px w-7 bg-ink-700" aria-hidden />
      <div className="flex flex-col items-center gap-1" title="Tamanho do pincel ([ ])">
        <span className="text-[10px] font-semibold text-slate-500">{brushSize}px</span>
        <div className="grid grid-cols-2 gap-1">
          {[1, 2, 3, 4, 6, 8].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Pincel ${n} pixels`}
              onClick={() => setBrushSize(n)}
              className={`flex h-6 w-6 items-center justify-center rounded border ${
                brushSize === n ? 'border-pixel-500 bg-pixel-500/15' : 'border-ink-700 hover:bg-ink-800'
              }`}
            >
              <span className={`rounded-[2px] ${brushSize === n ? 'bg-pixel-400' : 'bg-slate-400'}`} style={{ width: 3 + n * 2.4, height: 3 + n * 2.4 }} />
            </button>
          ))}
        </div>
      </div>

      <div className="my-1 h-px w-7 bg-ink-700" aria-hidden />
      <button type="button" title="Espelhar horizontal (X)" aria-label="Espelhar horizontal" onClick={toggleMirrorX} className={buttonClass(mirrorX)}><FlipHorizontal2 size={17} /></button>
      <button type="button" title="Espelhar vertical (Y)" aria-label="Espelhar vertical" onClick={toggleMirrorY} className={buttonClass(mirrorY)}><FlipVertical2 size={17} /></button>
      <button type="button" title="Mostrar grade" aria-label="Mostrar grade" onClick={toggleGrid} className={buttonClass(showGrid)}><Grid3x3 size={17} /></button>
      <button type="button" title="Pixel perfeito (P)" aria-label="Pixel perfeito" onClick={togglePixelPerfect} className={buttonClass(pixelPerfect)}><Crosshair size={17} /></button>
      <button type="button" title="Onion skin" aria-label="Onion skin" onClick={toggleOnion} className={buttonClass(onionSkin)}><Ghost size={17} /></button>
    </div>
  );
}
