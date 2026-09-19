import { useEffect, useRef, useState } from 'react';
import { Download, Pipette, Plus, Trash2, Upload, Wand2 } from 'lucide-react';
import { useStudio } from '../../store/studio';
import { STARTER_PALETTES } from '../../lib/templates';
import { parseGpl, serializeGpl } from '../../lib/palette';
import { countColors } from '../../lib/pixels';
import { flattenCells } from '../../lib/layers';
import { normalizeHex } from '../../lib/color';
import { buildColorRamp, buildShadeRamp } from '../../lib/colorTools';

export default function PalettePanel() {
  const project = useStudio((s) => s.project);
  const color = useStudio((s) => s.color);
  const secondaryColor = useStudio((s) => s.secondaryColor);
  const setColor = useStudio((s) => s.setColor);
  const setSecondaryColor = useStudio((s) => s.setSecondaryColor);
  const setPaletteSlot = useStudio((s) => s.setPaletteSlot);
  const addPaletteColor = useStudio((s) => s.addPaletteColor);
  const addPaletteColors = useStudio((s) => s.addPaletteColors);
  const removePaletteColor = useStudio((s) => s.removePaletteColor);
  const shadeSelection = useStudio((s) => s.shadeSelection);
  const selection = useStudio((s) => s.selection);
  const loadPalette = useStudio((s) => s.loadPalette);
  const currentFrameId = useStudio((s) => s.currentFrameId);
  const [editing, setEditing] = useState<number | null>(null);
  const [hexDraft, setHexDraft] = useState(color);
  const [rampEnd, setRampEnd] = useState('#ffd23f');
  const [rampSteps, setRampSteps] = useState(5);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setHexDraft(color), [color]);

  if (!project) return null;

  const commitHex = () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hexDraft)) setColor(hexDraft);
    else setHexDraft(color);
  };

  const importGpl = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const pal = parseGpl(String(reader.result ?? ''));
        if (pal.colors.length) loadPalette(pal.colors);
      } catch {
        /* .gpl inválido: ignora sem quebrar a sessão */
      }
    };
    reader.readAsText(file);
  };

  const exportGpl = () => {
    const blob = new Blob([serializeGpl(project.name || 'paleta', project.palette)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || 'paleta'}.gpl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const extractFromFrame = () => {
    const f = currentFrameId ? project.frames[currentFrameId] : undefined;
    if (!f) return;
    const top = countColors(flattenCells(project, f)).slice(0, 16).map((c) => normalizeHex(c.color));
    if (top.length) loadPalette(top);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* cores ativas */}
      <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cores de desenho</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-forge-500/50 bg-forge-500/5 p-2" title="Cor principal: clique esquerdo">
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-white/60" style={{ background: color }}>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold text-forge-300">Principal</span>
              <span className="block truncate font-mono text-[10px] text-slate-400">{color}</span>
            </span>
          </label>
          <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-ink-700 bg-ink-950/40 p-2" title="Cor secundária: clique direito na paleta ou use aqui">
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-slate-500" style={{ background: secondaryColor }}>
              <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold text-slate-400">Secundária</span>
              <span className="block truncate font-mono text-[10px] text-slate-500">{secondaryColor}</span>
            </span>
          </label>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            aria-label="Hexadecimal da cor principal"
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={commitHex}
            onKeyDown={(e) => { if (e.key === 'Enter') commitHex(); }}
            className="min-w-0 flex-1 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-xs text-slate-200"
          />
          <button onClick={() => addPaletteColor(color)} title="Adicionar cor principal à paleta" className="flex h-8 w-8 items-center justify-center rounded-md border border-ink-700 text-slate-400 hover:bg-ink-800 hover:text-pixel-400">
            <Plus size={14} />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Clique esquerdo usa a cor principal · clique direito escolhe a secundária.</p>
      </div>

      {/* E4: rampas perceptuais + sombreamento real na seleção */}
      <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rampas OKLab</div>
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded border border-ink-700" style={{ background: color }} title="Início: cor atual" />
          <span className="text-slate-600">→</span>
          <label className="h-7 w-7 cursor-pointer rounded border border-ink-700" style={{ background: rampEnd }} title="Fim da rampa">
            <input type="color" value={rampEnd} onChange={(e) => setRampEnd(e.target.value)} className="h-full w-full cursor-pointer opacity-0" />
          </label>
          <label className="flex flex-1 items-center gap-2 text-[10px] text-slate-400">
            {rampSteps} passos
            <input type="range" min={2} max={12} value={rampSteps} onChange={(e) => setRampSteps(Number(e.target.value))} className="w-full" />
          </label>
        </div>
        <div className="mt-2 flex h-6 overflow-hidden rounded border border-ink-700">
          {buildColorRamp(color, rampEnd, rampSteps).map((c, i) => <span key={`${c}-${i}`} className="flex-1" style={{ background: c }} />)}
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={() => addPaletteColors(buildColorRamp(color, rampEnd, rampSteps))} className="flex-1 rounded-md border border-forge-500/40 px-2 py-1.5 text-[11px] font-semibold text-forge-300 hover:bg-forge-500/10">Adicionar rampa</button>
          <button onClick={() => addPaletteColors(buildShadeRamp(color, rampSteps))} className="flex-1 rounded-md border border-ink-700 px-2 py-1.5 text-[11px] text-slate-300 hover:bg-ink-800">Adicionar sombra</button>
        </div>
        <div className="mt-2 flex items-center gap-2 border-t border-ink-800 pt-2">
          <span className="text-[10px] text-slate-500">Na seleção:</span>
          <button disabled={!selection} onClick={() => shadeSelection(-0.12)} className="rounded border border-ink-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-ink-800 disabled:opacity-40">Escurecer</button>
          <button disabled={!selection} onClick={() => shadeSelection(0.12)} className="rounded border border-ink-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-ink-800 disabled:opacity-40">Iluminar</button>
        </div>
      </div>

      {/* paleta do projeto */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Paleta do sprite ({project.palette.length})
          </span>
          <button
            onClick={extractFromFrame}
            title="Extrair cores do frame atual"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-ink-800 hover:text-forge-300"
          >
            <Wand2 size={12} /> Extrair
          </button>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {project.palette.map((c, i) => (
            <div key={`${c}-${i}`} className="group relative">
              <button
                onClick={() => setColor(c)}
                onContextMenu={(e) => { e.preventDefault(); setSecondaryColor(c); }}
                onDoubleClick={() => setEditing(i)}
                title={`${c} — esquerdo: principal · direito: secundária · duplo clique: editar`}
                className={`h-8 w-full rounded-md border-2 transition-transform hover:scale-110 ${
                  normalizeHex(color) === normalizeHex(c) ? 'border-white' : 'border-ink-700'
                }`}
                style={{ background: c }}
              />
              {editing === i ? (
                <input
                  type="color"
                  value={normalizeHex(c)}
                  autoFocus
                  onChange={(e) => setPaletteSlot(i, e.target.value)}
                  onBlur={() => setEditing(null)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              ) : (
                <button
                  onClick={() => removePaletteColor(i)}
                  title="Remover"
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                >
                  <Trash2 size={9} />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
          <Pipette size={11} /> Segure <kbd className="rounded bg-ink-800 px-1 font-mono">Alt</kbd> + clique no canvas para capturar uma cor.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-ink-700 px-2 py-1.5 text-[11px] text-slate-400 hover:bg-ink-800 hover:text-slate-200"
          >
            <Upload size={12} /> Importar .gpl
          </button>
          <button
            onClick={exportGpl}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-ink-700 px-2 py-1.5 text-[11px] text-slate-400 hover:bg-ink-800 hover:text-slate-200"
          >
            <Download size={12} /> Exportar .gpl
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".gpl"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importGpl(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* presets */}
      <div>
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Paletas clássicas
        </span>
        <div className="flex flex-col gap-2">
          {STARTER_PALETTES.map((p) => (
            <button
              key={p.name}
              onClick={() => loadPalette(p.colors)}
              className="group rounded-lg border border-ink-700 bg-ink-900/60 p-2 text-left hover:border-forge-600"
            >
              <div className="mb-1.5 text-xs font-semibold text-slate-300 group-hover:text-forge-300">{p.name}</div>
              <div className="flex gap-0.5">
                {p.colors.map((c) => (
                  <span key={c} className="h-4 flex-1 rounded-[3px]" style={{ background: c }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
