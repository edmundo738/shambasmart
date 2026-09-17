import { useState } from 'react';
import { Anchor, Eye, EyeOff, Focus, Plus, Trash2, X } from 'lucide-react';
import { useStudio } from '../../store/studio';

/** Editor de âncoras + hitbox do frame atual (metadados p/ o jogo). */
export default function MetaPanel() {
  const project = useStudio((s) => s.project);
  const currentFrameId = useStudio((s) => s.currentFrameId);
  const showMeta = useStudio((s) => s.showMeta);
  const toggleShowMeta = useStudio((s) => s.toggleShowMeta);
  const addAnchor = useStudio((s) => s.addAnchor);
  const renameAnchor = useStudio((s) => s.renameAnchor);
  const moveAnchor = useStudio((s) => s.moveAnchor);
  const deleteAnchor = useStudio((s) => s.deleteAnchor);
  const setHitbox = useStudio((s) => s.setHitbox);
  const autoFitHitbox = useStudio((s) => s.autoFitHitbox);
  const [editing, setEditing] = useState<string | null>(null);

  if (!project) return null;
  const frame = currentFrameId ? project.frames[currentFrameId] : undefined;
  if (!frame) return null;
  const anchors = frame.anchors ?? [];
  const hb = frame.hitbox ?? null;

  const num = (value: number, commit: (v: number) => void, title: string, min = 0, max = 4096) => (
    <input
      key={`${currentFrameId}:${title}:${value}`}
      type="number"
      min={min}
      max={max}
      defaultValue={value}
      title={title}
      onBlur={(e) => commit(Number(e.target.value))}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className="w-12 rounded-md border border-ink-700 bg-ink-950 px-1.5 py-0.5 font-mono text-[11px] text-slate-200"
    />
  );

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ink-700 bg-ink-900/80 p-3">
      <div className="flex items-center gap-2">
        <Anchor size={15} className="text-amber-300" />
        <span className="text-sm font-semibold text-slate-200">Âncoras e hitbox</span>
        <div className="flex-1" />
        <button
          onClick={toggleShowMeta}
          title={showMeta ? 'Ocultar no canvas' : 'Mostrar no canvas'}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-ink-700 hover:text-slate-100"
        >
          {showMeta ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        <button
          onClick={() => addAnchor()}
          title="Adicionar âncora no centro"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-ink-700 hover:text-amber-300"
        >
          <Plus size={15} />
        </button>
      </div>

      {anchors.length === 0 && (
        <p className="rounded-lg border border-dashed border-ink-700 px-2 py-1.5 text-center text-[11px] text-slate-500">
          Sem âncoras neste frame. Use a ferramenta <strong className="text-slate-300">T</strong> e clique no canvas.
        </p>
      )}
      {anchors.map((a) => (
        <div key={a.id} className="flex items-center gap-1.5 rounded-lg border border-ink-800 bg-ink-950/60 px-2 py-1">
          <span className="h-2 w-2 shrink-0 rotate-45 bg-amber-300" />
          {editing === a.id ? (
            <input
              autoFocus
              defaultValue={a.name}
              maxLength={24}
              onBlur={(e) => { renameAnchor(a.id, e.target.value || a.name); setEditing(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="min-w-0 flex-1 rounded border border-ink-600 bg-ink-900 px-1 py-0.5 text-xs text-slate-200"
            />
          ) : (
            <button
              onDoubleClick={() => setEditing(a.id)}
              title="Duplo clique renomeia"
              className="min-w-0 flex-1 truncate text-left text-xs text-slate-300 hover:text-amber-200"
            >
              {a.name}
            </button>
          )}
          {num(a.x, (v) => moveAnchor(a.id, v, a.y), 'X da âncora', 0, project.width - 1)}
          {num(a.y, (v) => moveAnchor(a.id, a.x, v), 'Y da âncora', 0, project.height - 1)}
          <button
            onClick={() => deleteAnchor(a.id)}
            title="Excluir âncora"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-ink-800 hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-1.5 rounded-lg border border-ink-800 bg-ink-950/60 px-2 py-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-[2px] border-2 border-green-400" />
        <span className="text-xs text-slate-300">Hitbox</span>
        <div className="flex-1" />
        {hb ? (
          <>
            {num(hb.x, (v) => setHitbox({ ...hb, x: v }), 'X da hitbox')}
            {num(hb.y, (v) => setHitbox({ ...hb, y: v }), 'Y da hitbox')}
            {num(hb.w, (v) => setHitbox({ ...hb, w: v }), 'Largura', 1)}
            {num(hb.h, (v) => setHitbox({ ...hb, h: v }), 'Altura', 1)}
            <button
              onClick={() => setHitbox(null)}
              title="Remover hitbox"
              className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-ink-800 hover:text-red-400"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <span className="text-[11px] text-slate-500">sem colisão</span>
        )}
        <button
          onClick={autoFitHitbox}
          title="Ajustar à bbox dos pixels opacos"
          className="flex h-6 items-center gap-1 rounded-md border border-ink-700 px-1.5 text-[11px] text-slate-400 hover:bg-ink-800 hover:text-green-300"
        >
          <Focus size={12} /> Auto
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Âncoras e hitbox saem no JSON do export, por frame.
      </p>
    </div>
  );
}
