import { useState } from 'react';
import {
  ChevronDown, ChevronUp, Eye, EyeOff, Lock, LockOpen, Plus, Trash2,
} from 'lucide-react';
import { useStudio } from '../../store/studio';

export default function LayersPanel() {
  const project = useStudio((s) => s.project);
  const currentLayerId = useStudio((s) => s.currentLayerId);
  const selectLayer = useStudio((s) => s.selectLayer);
  const addLayer = useStudio((s) => s.addLayer);
  const renameLayer = useStudio((s) => s.renameLayer);
  const deleteLayer = useStudio((s) => s.deleteLayer);
  const moveLayer = useStudio((s) => s.moveLayer);
  const toggleLayerVis = useStudio((s) => s.toggleLayerVis);
  const toggleLayerLock = useStudio((s) => s.toggleLayerLock);
  const setLayerOpacity = useStudio((s) => s.setLayerOpacity);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  if (!project) return null;
  const ordered = [...project.layers].reverse(); // topo primeiro
  const selected = project.layers.find((l) => l.id === currentLayerId) ?? project.layers[project.layers.length - 1];

  const commitRename = () => {
    if (editingId && draft.trim()) renameLayer(editingId, draft);
    setEditingId(null);
    setDraft('');
  };

  const iconBtn = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-ink-700 hover:text-slate-100 disabled:opacity-30';

  return (
    <div className="pf-shadow flex flex-col gap-2 rounded-xl border border-ink-700 bg-ink-900/90 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-200">Camadas</span>
        <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
          {project.layers.length}
        </span>
        <div className="flex-1" />
        <button onClick={() => addLayer()} title="Nova camada (no topo)" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-ink-700 hover:text-pixel-400">
          <Plus size={15} />
        </button>
      </div>

      <div className="thin-scroll flex max-h-52 flex-col gap-1 overflow-y-auto pr-0.5">
        {ordered.map((l, i) => {
          const active = l.id === selected?.id;
          const editing = editingId === l.id;
          return (
            <div key={l.id}>
              <div
                className={`flex items-center gap-1 rounded-lg border p-1 transition-colors ${
                  active ? 'border-forge-500 bg-forge-500/10' : 'border-ink-700 bg-ink-950 hover:border-ink-600'
                }`}
              >
                <button onClick={() => toggleLayerVis(l.id)} title={l.visible ? 'Ocultar' : 'Mostrar'} className={iconBtn}>
                  {l.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-slate-600" />}
                </button>
                <button
                  onClick={() => selectLayer(l.id)}
                  onDoubleClick={() => { setEditingId(l.id); setDraft(l.name); }}
                  title="Selecionar (duplo-clique renomeia)"
                  className="min-w-0 flex-1 truncate rounded px-1 py-1 text-left text-xs font-semibold text-slate-200"
                >
                  {editing ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') { setEditingId(null); setDraft(''); }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded border border-forge-500 bg-ink-950 px-1 py-0.5 text-xs text-white outline-none"
                    />
                  ) : (
                    <span className={l.visible ? '' : 'text-slate-500'}>{l.name}</span>
                  )}
                </button>
                {l.locked && <Lock size={12} className="shrink-0 text-ember-400" />}
                <span className="shrink-0 font-mono text-[10px] text-slate-600">{l.opacity}%</span>
              </div>

              {active && selected && (
                <div className="mt-1 flex items-center gap-1 rounded-lg border border-ink-800 bg-ink-950 p-1.5">
                  <button onClick={() => toggleLayerLock(l.id)} title={l.locked ? 'Destravar' : 'Travar (protege de pintura)'} className={iconBtn}>
                    {l.locked ? <Lock size={14} className="text-ember-400" /> : <LockOpen size={14} />}
                  </button>
                  <input
                    type="range" min={0} max={100} value={l.opacity}
                    onChange={(e) => setLayerOpacity(l.id, Number(e.target.value))}
                    title={`Opacidade ${l.opacity}%`}
                    className="h-1 min-w-0 flex-1 cursor-pointer"
                  />
                  <button onClick={() => moveLayer(l.id, 1)} title="Subir" disabled={i === 0} className={iconBtn}>
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => moveLayer(l.id, -1)} title="Descer" disabled={i === ordered.length - 1} className={iconBtn}>
                    <ChevronDown size={14} />
                  </button>
                  <button onClick={() => deleteLayer(l.id)} title="Excluir camada" disabled={project.layers.length <= 1} className={iconBtn}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected?.locked && (
        <p className="rounded-lg border border-ember-500/40 bg-ember-500/10 p-2 text-[11px] text-ember-400">
          Camada travada — destrave para pintar ou limpar.
        </p>
      )}
    </div>
  );
}
