import { useRef, useState } from 'react';
import { Download, Pipette, Plus, Trash2, Upload, Wand2 } from 'lucide-react';
import { useStudio } from '../../store/studio';
import { STARTER_PALETTES } from '../../lib/templates';
import { parseGpl, serializeGpl } from '../../lib/palette';
import { countColors } from '../../lib/pixels';
import { flattenCells } from '../../lib/layers';
import { normalizeHex } from '../../lib/color';

export default function PalettePanel() {
  const project = useStudio((s) => s.project);
  const color = useStudio((s) => s.color);
  const setColor = useStudio((s) => s.setColor);
  const setPaletteSlot = useStudio((s) => s.setPaletteSlot);
  const addPaletteColor = useStudio((s) => s.addPaletteColor);
  const removePaletteColor = useStudio((s) => s.removePaletteColor);
  const loadPalette = useStudio((s) => s.loadPalette);
  const currentFrameId = useStudio((s) => s.currentFrameId);
  const [editing, setEditing] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!project) return null;

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
      {/* cor atual */}
      <div className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/60 p-3">
        <label
          className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-ink-600"
          style={{ background: color }}
          title="Escolher cor"
        >
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="absolute inset-0 h-full w-full opacity-0"
          />
        </label>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cor atual</div>
          <div className="flex items-center gap-2">
            <input
              value={color}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) setColor(v);
              }}
              className="w-20 rounded-md border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-xs text-slate-200"
            />
            <button
              onClick={() => addPaletteColor(color)}
              title="Adicionar à paleta"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-ink-700 text-slate-400 hover:bg-ink-800 hover:text-pixel-400"
            >
              <Plus size={14} />
            </button>
          </div>
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
                onDoubleClick={() => setEditing(i)}
                title={`${c} — duplo clique edita`}
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
