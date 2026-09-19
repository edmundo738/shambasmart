import { useState } from 'react';
import { Clapperboard, Copy, Plus, Trash2, Wand2 } from 'lucide-react';
import { useStudio } from '../../store/studio';
import ProceduralMotionModal from './ProceduralMotionModal';

const SUGGESTIONS = ['idle', 'andar', 'correr', 'pular', 'cair', 'ataque', 'dano', 'morte', 'defesa', 'coletar', 'voar', 'nadar'];

export default function AnimationsPanel() {
  const project = useStudio((s) => s.project);
  const currentAnimationId = useStudio((s) => s.currentAnimationId);
  const currentFrameId = useStudio((s) => s.currentFrameId);
  const select = useStudio((s) => s.select);
  const addAnimation = useStudio((s) => s.addAnimation);
  const renameAnimation = useStudio((s) => s.renameAnimation);
  const deleteAnimation = useStudio((s) => s.deleteAnimation);
  const duplicateAnimation = useStudio((s) => s.duplicateAnimation);
  const setAnimFps = useStudio((s) => s.setAnimFps);
  const [editing, setEditing] = useState<string | null>(null);
  const [motionOpen, setMotionOpen] = useState(false);
  const [draft, setDraft] = useState('');

  if (!project) return null;

  return (
    <div className="flex flex-col gap-2">
      {motionOpen && <ProceduralMotionModal onClose={() => setMotionOpen(false)} />}
      <p className="text-[11px] leading-relaxed text-slate-500">
        Cada <strong className="text-slate-300">ação</strong> tem sua própria sequência de frames. As variações se aplicam a todas de uma vez.
      </p>

      <div className="flex flex-col gap-1.5">
        {project.animations.map((a) => {
          const active = a.id === currentAnimationId;
          return (
            <div
              key={a.id}
              className={`group rounded-lg border p-2 transition-colors ${
                active ? 'border-forge-500/60 bg-forge-500/10' : 'border-ink-700 bg-ink-900/60 hover:border-ink-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <button onClick={() => select(a.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <Clapperboard size={15} className={active ? 'text-forge-300' : 'text-slate-500'} />
                  {editing === a.id ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => { renameAnimation(a.id, draft); setEditing(null); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { renameAnimation(a.id, draft); setEditing(null); }
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded border border-forge-500 bg-ink-950 px-1 py-0.5 text-sm text-slate-100"
                    />
                  ) : (
                    <span
                      className="truncate text-sm font-semibold text-slate-100"
                      onDoubleClick={() => { setEditing(a.id); setDraft(a.name); }}
                      title="Duplo clique para renomear"
                    >
                      {a.name}
                    </span>
                  )}
                </button>
                <span className="shrink-0 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                  {a.frameIds.length}f
                </span>
                <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                  <button title="Duplicar ação" onClick={() => duplicateAnimation(a.id)} className="rounded p-1 text-slate-400 hover:bg-ink-700 hover:text-slate-100"><Copy size={13} /></button>
                  <button title="Excluir ação" onClick={() => deleteAnimation(a.id)} disabled={project.animations.length <= 1} className="rounded p-1 text-slate-400 hover:bg-ink-700 hover:text-red-400 disabled:opacity-30"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-2 pl-6">
                <span className="text-[11px] text-slate-500">FPS</span>
                <input
                  type="range" min={1} max={24} value={a.fps}
                  onChange={(e) => setAnimFps(a.id, Number(e.target.value))}
                  className="h-1 flex-1 cursor-pointer"
                />
                <span className="w-5 font-mono text-[11px] text-slate-300">{a.fps}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => addAnimation()}
        className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-600 py-2 text-sm font-medium text-slate-400 hover:border-pixel-500 hover:text-pixel-400"
      >
        <Plus size={15} /> Nova ação
      </button>
      <button
        onClick={() => setMotionOpen(true)}
        disabled={!currentFrameId}
        title="Gerar animação procedural a partir do frame atual"
        className="flex items-center justify-center gap-2 rounded-lg border border-ember-400/40 bg-ember-500/10 py-2 text-sm font-semibold text-ember-400 hover:bg-ember-500/20 disabled:opacity-40"
      >
        <Wand2 size={15} /> Auto-movimento
      </button>

      <div>
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sugestões</span>
        <div className="flex flex-wrap gap-1">
          {SUGGESTIONS.filter((s) => !project.animations.some((a) => a.name === s)).slice(0, 8).map((s) => (
            <button
              key={s}
              onClick={() => addAnimation(s)}
              className="rounded-full border border-ink-700 px-2.5 py-1 text-[11px] text-slate-400 hover:border-forge-500 hover:text-forge-300"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
