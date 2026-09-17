import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Cloud, Download, FlaskConical, Redo2, Undo2, User as UserIcon } from 'lucide-react';
import { useStudio } from '../../store/studio';
import { useAuth } from '../../store/auth';
import AuthModal from '../AuthModal';

export default function TopBar({ onExport }: { onExport: () => void }) {
  const project = useStudio((s) => s.project);
  const renameProject = useStudio((s) => s.renameProject);
  const dirty = useStudio((s) => s.dirty);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const canUndo = useStudio((s) => s.past.length > 0);
  const canRedo = useStudio((s) => s.future.length > 0);
  const user = useAuth((s) => s.user);
  const [authOpen, setAuthOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink-700 bg-ink-900/90 px-3 backdrop-blur">
      <Link to="/projetos" title="Meus projetos" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-ink-800 hover:text-white">
        <ArrowLeft size={18} />
      </Link>
      <Link to="/" className="flex items-center gap-2">
        <span className="grid h-8 w-8 grid-cols-2 overflow-hidden rounded-lg border border-ink-600">
          <span className="bg-pixel-500" /><span className="bg-forge-500" />
          <span className="bg-ember-500" /><span className="bg-[#ff4d6d]" />
        </span>
        <span className="hidden font-display text-sm font-bold text-white sm:block">PixelForge</span>
      </Link>

      <div className="mx-1 h-6 w-px bg-ink-700" />

      {project && (
        editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { renameProject(draft || project.name); setEditing(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { renameProject(draft || project.name); setEditing(false); }
              if (e.key === 'Escape') setEditing(false);
            }}
            className="w-48 rounded-md border border-forge-500 bg-ink-950 px-2 py-1 text-sm font-semibold text-white"
          />
        ) : (
          <button
            onClick={() => { setDraft(project.name); setEditing(true); }}
            title="Renomear projeto"
            className="max-w-[220px] truncate rounded-md px-2 py-1 text-sm font-semibold text-white hover:bg-ink-800"
          >
            {project.name}
          </button>
        )
      )}

      <span className="hidden items-center gap-1.5 rounded-full bg-ink-800 px-2.5 py-1 text-[11px] text-slate-400 sm:flex">
        {dirty ? (
          <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember-400" /> editando…</>
        ) : (
          <><Cloud size={12} className="text-pixel-400" /> salvo</>
        )}
      </span>

      <div className="flex-1" />

      <button onClick={undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-ink-800 hover:text-white disabled:opacity-30">
        <Undo2 size={17} />
      </button>
      <button onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Y)" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-ink-800 hover:text-white disabled:opacity-30">
        <Redo2 size={17} />
      </button>

      <Link to="/lab" title="Laboratório Procedural — gerar personagens e movimentos" className="flex h-9 w-9 items-center justify-center rounded-lg text-pixel-400 hover:bg-ink-800">
        <FlaskConical size={17} />
      </Link>

      {user ? (
        <span className="hidden items-center gap-1.5 rounded-full border border-ink-600 bg-ink-800 px-3 py-1.5 text-xs font-semibold text-slate-200 md:flex" title={user.email}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-forge-500 to-pixel-500 text-[10px] font-bold text-ink-950">
            {user.name.charAt(0).toUpperCase()}
          </span>
          {user.name}
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${user.plan === 'free' ? 'bg-ink-700 text-slate-300' : 'bg-pixel-500/20 text-pixel-400'}`}>
            {user.plan}
          </span>
        </span>
      ) : (
        <button onClick={() => setAuthOpen(true)} className="hidden items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-forge-500 hover:text-white md:flex">
          <UserIcon size={14} /> Entrar
        </button>
      )}

      <button
        onClick={onExport}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-forge-500 to-pixel-500 px-4 py-2 text-sm font-bold text-ink-950 hover:brightness-110"
      >
        <Download size={16} /> <span className="hidden sm:inline">Exportar pack</span><span className="sm:hidden">ZIP</span>
      </button>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </header>
  );
}

export function SavedTick() {
  return (
    <span className="flex items-center gap-1 text-[11px] text-pixel-400">
      <Check size={12} /> salvo
    </span>
  );
}
