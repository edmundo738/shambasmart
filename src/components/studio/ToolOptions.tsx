import { Circle, Gauge, PenLine, Square, Stamp, X } from 'lucide-react';
import { useStudio } from '../../store/studio';

/**
 * Barra de opções contextual (E2): só aparece p/ ferramentas com opções.
 * Pincel/borracha: forma, estabilizador, pressão, captura custom.
 * Formas: preenchimento, cantos, dicas de modificadores.
 */
export default function ToolOptions() {
  const tool = useStudio((s) => s.tool);
  const brushShape = useStudio((s) => s.brushShape);
  const setBrushShape = useStudio((s) => s.setBrushShape);
  const customBrush = useStudio((s) => s.customBrush);
  const captureBrushFromSelection = useStudio((s) => s.captureBrushFromSelection);
  const clearCustomBrush = useStudio((s) => s.clearCustomBrush);
  const selection = useStudio((s) => s.selection);
  const stabilizer = useStudio((s) => s.stabilizer);
  const setStabilizer = useStudio((s) => s.setStabilizer);
  const pressureSize = useStudio((s) => s.pressureSize);
  const togglePressureSize = useStudio((s) => s.togglePressureSize);
  const secondaryColor = useStudio((s) => s.secondaryColor);
  const setSecondaryColor = useStudio((s) => s.setSecondaryColor);
  const ditherPattern = useStudio((s) => s.ditherPattern);
  const setDitherPattern = useStudio((s) => s.setDitherPattern);
  const ditherStrength = useStudio((s) => s.ditherStrength);
  const setDitherStrength = useStudio((s) => s.setDitherStrength);
  const rectFilled = useStudio((s) => s.rectFilled);
  const toggleRectFilled = useStudio((s) => s.toggleRectFilled);
  const ellipseFilled = useStudio((s) => s.ellipseFilled);
  const toggleEllipseFilled = useStudio((s) => s.toggleEllipseFilled);
  const cornerRadius = useStudio((s) => s.cornerRadius);
  const setCornerRadius = useStudio((s) => s.setCornerRadius);
  const selectionShape = useStudio((s) => s.selectionShape);
  const setSelectionShape = useStudio((s) => s.setSelectionShape);
  const transformMode = useStudio((s) => s.transformMode);
  const setTransformMode = useStudio((s) => s.setTransformMode);
  const rotateSelection = useStudio((s) => s.rotateSelection);
  const scaleSelection = useStudio((s) => s.scaleSelection);

  if (tool !== 'brush' && tool !== 'eraser' && tool !== 'line' && tool !== 'rect' && tool !== 'ellipse' && tool !== 'select' && tool !== 'transform') {
    return null;
  }

  const seg = (active: boolean) =>
    `flex h-7 w-7 items-center justify-center rounded-md border ${active ? 'border-forge-400 bg-forge-500/25 text-forge-200' : 'border-ink-700 text-slate-400 hover:bg-ink-800 hover:text-slate-200'}`;
  const label = 'font-display text-[11px] font-bold uppercase tracking-wider text-slate-400';
  const hint = 'font-mono text-[10px] text-slate-500';

  return (
    <div className="thin-scroll flex h-10 shrink-0 items-center gap-3 overflow-x-auto border-b border-ink-700 bg-ink-900/80 px-3">
      {(tool === 'brush' || tool === 'eraser') && (
        <>
          <span className={label}>{tool === 'brush' ? 'Pincel' : 'Borracha'}</span>
          <div className="flex gap-1">
            <button onClick={() => setBrushShape('square')} title="Pincel quadrado" className={seg(brushShape === 'square')}>
              <Square size={14} />
            </button>
            <button onClick={() => setBrushShape('circle')} title="Pincel redondo" className={seg(brushShape === 'circle')}>
              <Circle size={14} />
            </button>
            <button
              onClick={() => (customBrush ? setBrushShape('custom') : captureBrushFromSelection())}
              title={customBrush ? `Carimbo custom ${customBrush.w}×${customBrush.h}` : 'Capturar seleção como carimbo (selecione algo primeiro)'}
              className={seg(brushShape === 'custom')}
            >
              <Stamp size={14} />
            </button>
          </div>
          {brushShape === 'custom' && customBrush && (
            <button onClick={clearCustomBrush} title="Descartar carimbo custom" className="flex items-center gap-1 rounded-md border border-ink-700 px-1.5 py-1 font-mono text-[10px] text-slate-400 hover:text-white">
              {customBrush.w}×{customBrush.h} <X size={11} />
            </button>
          )}
          {brushShape !== 'custom' && (
            <button
              onClick={captureBrushFromSelection}
              disabled={!selection}
              title="Captura a seleção (pixels opacos da camada atual) como carimbo"
              className="rounded-md border border-ink-700 px-2 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-forge-500 disabled:opacity-40"
            >
              Capturar seleção
            </button>
          )}
          <label className="flex items-center gap-1.5 text-[11px] text-slate-400" title="Estabilizador: média móvel do traço (0 = desligado)">
            <Gauge size={13} /> {stabilizer}
            <input type="range" min={0} max={8} value={stabilizer} onChange={(e) => setStabilizer(Number(e.target.value))} className="w-20" />
          </label>
          <button onClick={togglePressureSize} title="Tamanho pela pressão da caneta (mouse não muda)" className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold ${pressureSize ? 'border-forge-500/50 bg-forge-500/10 text-forge-300' : 'border-ink-700 text-slate-400'}`}>
            <PenLine size={13} /> Pressão
          </button>
          {tool === 'brush' && (
            <>
              <label className="flex items-center gap-1 text-[11px] text-slate-400" title="Segunda cor do dithering">
                2ª <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-6 w-6 cursor-pointer rounded border border-ink-700 bg-transparent" />
              </label>
              <select value={ditherPattern} onChange={(e) => setDitherPattern(e.target.value as 'solid' | 'checker' | 'bayer2' | 'bayer4')} title="Padrão de dithering" className="h-7 rounded-md border border-ink-700 bg-ink-950 px-1.5 text-[10px] text-slate-300">
                <option value="solid">Sólido</option>
                <option value="checker">Checker</option>
                <option value="bayer2">Bayer 2×2</option>
                <option value="bayer4">Bayer 4×4</option>
              </select>
              {ditherPattern !== 'solid' && <input type="range" min={5} max={95} value={Math.round(ditherStrength * 100)} onChange={(e) => setDitherStrength(Number(e.target.value) / 100)} title="Densidade do dithering" className="w-16" />}
            </>
          )}
        </>
      )}

      {tool === 'select' && (
        <>
          <span className={label}>Seleção</span>
          <div className="flex gap-1">
            {([
              ['rect', 'Retângulo'], ['ellipse', 'Elipse'], ['lasso', 'Laço livre'], ['wand', 'Varinha'],
            ] as const).map(([shape, name]) => (
              <button key={shape} onClick={() => setSelectionShape(shape)} className={`rounded-md border px-2 py-1.5 text-[11px] font-semibold ${selectionShape === shape ? 'border-forge-400 bg-forge-500/25 text-forge-200' : 'border-ink-700 text-slate-400 hover:bg-ink-800 hover:text-white'}`} title={name}>
                {name}
              </button>
            ))}
          </div>
          <span className={hint}>arrastar = máscara · <kbd className="text-slate-300">Shift</kbd> move 8px · <kbd className="text-slate-300">Esc</kbd> cancela</span>
        </>
      )}

      {tool === 'transform' && (
        <>
          <span className={label}>Seta</span>
          <div className="flex gap-1">
            {([
              ['move', 'Mover'], ['object', 'Objeto'], ['push', 'Empurrar'],
            ] as const).map(([mode, name]) => (
              <button key={mode} onClick={() => setTransformMode(mode)} className={`rounded-md border px-2 py-1.5 text-[11px] font-semibold ${transformMode === mode ? 'border-forge-400 bg-forge-500/25 text-forge-200' : 'border-ink-700 text-slate-400 hover:bg-ink-800 hover:text-white'}`} title={name}>
                {name}
              </button>
            ))}
          </div>
          <div className="flex gap-1 border-l border-ink-700 pl-2">
            <button disabled={!selection} onClick={() => rotateSelection(false)} className="rounded-md border border-ink-700 px-2 py-1.5 text-[11px] text-slate-300 hover:bg-ink-800 disabled:opacity-40" title="Rodar 90 graus anti-horário">↶ 90°</button>
            <button disabled={!selection} onClick={() => rotateSelection(true)} className="rounded-md border border-ink-700 px-2 py-1.5 text-[11px] text-slate-300 hover:bg-ink-800 disabled:opacity-40" title="Rodar 90 graus horário">↷ 90°</button>
            <button disabled={!selection} onClick={() => scaleSelection(2)} className="rounded-md border border-ink-700 px-2 py-1.5 text-[11px] text-slate-300 hover:bg-ink-800 disabled:opacity-40" title="Escala nearest 2×">2×</button>
            <button disabled={!selection} onClick={() => scaleSelection(0.5)} className="rounded-md border border-ink-700 px-2 py-1.5 text-[11px] text-slate-300 hover:bg-ink-800 disabled:opacity-40" title="Escala nearest ½">½×</button>
          </div>
          <span className={hint}>clique+arraste objecto · sem blur</span>
        </>
      )}

      {tool === 'line' && (
        <>
          <span className={label}>Linha</span>
          <span className={hint}><kbd className="text-slate-300">Shift</kbd> ângulo 45° · <kbd className="text-slate-300">Alt+clique</kbd> conta-gotas</span>
        </>
      )}

      {tool === 'rect' && (
        <>
          <span className={label}>Retângulo</span>
          <div className="flex overflow-hidden rounded-md border border-ink-700 text-[11px] font-semibold">
            <button onClick={() => rectFilled && toggleRectFilled()} className={`px-2.5 py-1.5 ${!rectFilled ? 'bg-ink-700 text-white' : 'text-slate-400 hover:text-white'}`}>Contorno</button>
            <button onClick={() => !rectFilled && toggleRectFilled()} className={`px-2.5 py-1.5 ${rectFilled ? 'bg-ink-700 text-white' : 'text-slate-400 hover:text-white'}`}>Cheio</button>
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-slate-400" title="Raio dos cantos (0 = reto)">
            Cantos {cornerRadius}
            <input type="range" min={0} max={8} value={cornerRadius} onChange={(e) => setCornerRadius(Number(e.target.value))} className="w-20" />
          </label>
          <span className={hint}><kbd className="text-slate-300">Shift</kbd> quadrado · <kbd className="text-slate-300">Alt</kbd> do centro</span>
        </>
      )}

      {tool === 'ellipse' && (
        <>
          <span className={label}>Elipse</span>
          <div className="flex overflow-hidden rounded-md border border-ink-700 text-[11px] font-semibold">
            <button onClick={() => ellipseFilled && toggleEllipseFilled()} className={`px-2.5 py-1.5 ${!ellipseFilled ? 'bg-ink-700 text-white' : 'text-slate-400 hover:text-white'}`}>Contorno</button>
            <button onClick={() => !ellipseFilled && toggleEllipseFilled()} className={`px-2.5 py-1.5 ${ellipseFilled ? 'bg-ink-700 text-white' : 'text-slate-400 hover:text-white'}`}>Cheia</button>
          </div>
          <span className={hint}><kbd className="text-slate-300">Shift</kbd> círculo · <kbd className="text-slate-300">Alt</kbd> do centro</span>
        </>
      )}
    </div>
  );
}
