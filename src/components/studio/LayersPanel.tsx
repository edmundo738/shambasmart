import { useState } from 'react';
import {
  ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, Folder, FolderOpen, Lock, LockOpen, Plus, Trash2,
} from 'lucide-react';
import { useStudio } from '../../store/studio';
import { BlendMode, Layer } from '../../types';

const BLENDS: Array<[BlendMode, string]> = [
  ['normal', 'Normal'], ['multiply', 'Multiply'], ['screen', 'Screen'], ['overlay', 'Overlay'], ['add', 'Adicionar'],
];

/** Painel E5: árvore raster/grupo + alpha lock, clipping e blend real no renderer. */
export default function LayersPanel() {
  const project = useStudio((s) => s.project);
  const currentLayerId = useStudio((s) => s.currentLayerId);
  const selectLayer = useStudio((s) => s.selectLayer);
  const addLayer = useStudio((s) => s.addLayer);
  const addGroup = useStudio((s) => s.addGroup);
  const renameLayer = useStudio((s) => s.renameLayer);
  const deleteLayer = useStudio((s) => s.deleteLayer);
  const moveLayer = useStudio((s) => s.moveLayer);
  const toggleLayerVis = useStudio((s) => s.toggleLayerVis);
  const toggleLayerLock = useStudio((s) => s.toggleLayerLock);
  const setLayerOpacity = useStudio((s) => s.setLayerOpacity);
  const setLayerBlendMode = useStudio((s) => s.setLayerBlendMode);
  const toggleLayerAlphaLock = useStudio((s) => s.toggleLayerAlphaLock);
  const toggleLayerClipping = useStudio((s) => s.toggleLayerClipping);
  const toggleLayerExpanded = useStudio((s) => s.toggleLayerExpanded);
  const setLayerParent = useStudio((s) => s.setLayerParent);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  if (!project) return null;
  const groups = project.layers.filter((l) => l.kind === 'group');
  const children = new Map<string | null, Layer[]>();
  for (const l of project.layers) {
    const parent = l.parentId && groups.some((g) => g.id === l.parentId) ? l.parentId : null;
    const list = children.get(parent) ?? [];
    list.push(l);
    children.set(parent, list);
  }
  const selected = project.layers.find((l) => l.id === currentLayerId) ?? project.layers[project.layers.length - 1];
  const commitRename = () => {
    if (editingId && draft.trim()) renameLayer(editingId, draft);
    setEditingId(null); setDraft('');
  };
  const iconBtn = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-ink-700 hover:text-slate-100 disabled:opacity-30';
  const siblings = (l: Layer) => project.layers.filter((q) => q.parentId === l.parentId);

  const renderTree = (parentId: string | null, depth = 0): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];
    // array = fundo→topo; painel = topo→fundo
    for (const l of [...(children.get(parentId) ?? [])].reverse()) {
      const active = l.id === selected?.id;
      const editing = editingId === l.id;
      const sib = siblings(l);
      const pos = sib.findIndex((q) => q.id === l.id);
      const canUp = pos < sib.length - 1;
      const canDown = pos > 0;
      rows.push(
        <div key={l.id}>
          <div className={`flex items-center gap-1 rounded-lg border p-1 transition-colors ${active ? 'border-forge-500 bg-forge-500/10' : 'border-ink-700 bg-ink-950 hover:border-ink-600'}`} style={{ marginLeft: depth * 12 }}>
            {l.kind === 'group' ? (
              <button onClick={() => toggleLayerExpanded(l.id)} title={l.expanded ? 'Recolher grupo' : 'Expandir grupo'} className={iconBtn}>
                {l.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : <span className="w-7" />}
            <button onClick={() => toggleLayerVis(l.id)} title={l.visible ? 'Ocultar' : 'Mostrar'} className={iconBtn}>
              {l.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-slate-600" />}
            </button>
            <button onClick={() => selectLayer(l.id)} onDoubleClick={() => { setEditingId(l.id); setDraft(l.name); }} title="Selecionar (duplo-clique renomeia)" className="flex min-w-0 flex-1 items-center gap-1 truncate rounded px-1 py-1 text-left text-xs font-semibold text-slate-200">
              {l.kind === 'group' ? (l.expanded ? <FolderOpen size={14} className="shrink-0 text-forge-300" /> : <Folder size={14} className="shrink-0 text-forge-300" />) : <span className="ml-1 h-2.5 w-2.5 shrink-0 rounded-[2px] border border-slate-500" />}
              {editing ? <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commitRename} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditingId(null); setDraft(''); } }} onClick={(e) => e.stopPropagation()} className="w-full rounded border border-forge-500 bg-ink-950 px-1 py-0.5 text-xs text-white outline-none" /> : <span className={`truncate ${l.visible ? '' : 'text-slate-500'}`}>{l.name}</span>}
            </button>
            {l.alphaLock && <span title="Alpha lock" className="font-mono text-[10px] font-bold text-forge-300">α</span>}
            {l.clipping && <span title="Clipping mask" className="font-mono text-[10px] font-bold text-pixel-300">↗</span>}
            {l.locked && <Lock size={12} className="shrink-0 text-ember-400" />}
            <span className="shrink-0 font-mono text-[10px] text-slate-600">{l.opacity}%</span>
          </div>

          {active && selected && (
            <div className="mt-1 flex flex-col gap-1 rounded-lg border border-ink-800 bg-ink-950 p-1.5" style={{ marginLeft: depth * 12 }}>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleLayerLock(l.id)} title={l.locked ? 'Destravar' : 'Travar'} className={iconBtn}>{l.locked ? <Lock size={14} className="text-ember-400" /> : <LockOpen size={14} />}</button>
                {l.kind === 'raster' && <button onClick={() => toggleLayerAlphaLock(l.id)} title={l.alphaLock ? 'Desligar alpha lock' : 'Alpha lock: pintar só pixels existentes'} className={`flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-bold ${l.alphaLock ? 'bg-forge-500/25 text-forge-200' : 'text-slate-400 hover:bg-ink-700'}`}>α</button>}
                {l.kind === 'raster' && <button onClick={() => toggleLayerClipping(l.id)} title={l.clipping ? 'Desligar clipping' : 'Clipping: limitar à layer abaixo'} className={`flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-bold ${l.clipping ? 'bg-pixel-500/25 text-pixel-200' : 'text-slate-400 hover:bg-ink-700'}`}>↗</button>}
                <select value={l.blendMode} onChange={(e) => setLayerBlendMode(l.id, e.target.value as BlendMode)} title="Blend mode" className="h-7 min-w-0 flex-1 rounded border border-ink-700 bg-ink-950 px-1 text-[10px] text-slate-300">
                  {BLENDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-8 text-[10px] text-slate-500">Opac.</span>
                <input type="range" min={0} max={100} value={l.opacity} onChange={(e) => setLayerOpacity(l.id, Number(e.target.value))} className="h-1 min-w-0 flex-1 cursor-pointer" />
                <button onClick={() => moveLayer(l.id, 1)} title="Subir" disabled={!canUp} className={iconBtn}><ChevronUp size={14} /></button>
                <button onClick={() => moveLayer(l.id, -1)} title="Descer" disabled={!canDown} className={iconBtn}><ChevronDown size={14} /></button>
                <button onClick={() => deleteLayer(l.id)} title="Excluir (grupo remove filhos)" disabled={project.layers.length <= 1} className={iconBtn}><Trash2 size={14} /></button>
              </div>
              <label className="flex items-center gap-2 text-[10px] text-slate-500">Grupo pai
                <select value={l.parentId ?? ''} onChange={(e) => setLayerParent(l.id, e.target.value || null)} className="h-6 min-w-0 flex-1 rounded border border-ink-700 bg-ink-950 px-1 text-[10px] text-slate-300">
                  <option value="">Raiz</option>
                  {groups.filter((g) => g.id !== l.id).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </label>
            </div>
          )}
          {l.kind === 'group' && l.expanded && renderTree(l.id, depth + 1)}
        </div>,
      );
    }
    return rows;
  };

  return (
    <div className="pf-shadow flex flex-col gap-2 rounded-xl border border-ink-700 bg-ink-900/90 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-200">Camadas</span>
        <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">{project.layers.length}</span>
        <div className="flex-1" />
        <button onClick={() => addLayer()} title="Nova layer (entra no grupo selecionado)" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-ink-700 hover:text-pixel-400"><Plus size={15} /></button>
        <button onClick={() => addGroup()} title="Novo grupo" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-ink-700 hover:text-forge-300"><Folder size={15} /></button>
      </div>
      <div className="thin-scroll flex max-h-64 flex-col gap-1 overflow-y-auto pr-0.5">{renderTree(null)}</div>
      {selected?.kind === 'group' && <p className="rounded-lg border border-forge-500/30 bg-forge-500/10 p-2 text-[11px] text-forge-300">Grupo selecionado: o botão + cria uma layer dentro dele.</p>}
      {selected?.locked && <p className="rounded-lg border border-ember-500/40 bg-ember-500/10 p-2 text-[11px] text-ember-400">Layer travada — destrave para pintar ou limpar.</p>}
    </div>
  );
}
