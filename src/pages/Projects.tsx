import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock, Copy, FlaskConical, FolderOpen, Layers, Plus, Shapes, Sparkles, Trash2, User as UserIcon,
} from 'lucide-react';
import { ProjectMeta, useProjects } from '../store/projects';
import { useAuth } from '../store/auth';
import { TEMPLATES } from '../lib/templates';
import { AnimatedSprite } from '../components/SpriteView';
import AuthModal from '../components/AuthModal';
import { PlanCards } from '../components/PricingModal';

function TemplateCard({ id }: { id: string }) {
  const tpl = TEMPLATES.find((t) => t.id === id)!;
  const built = useMemo(() => tpl.build(), [tpl]);
  const anim = built.animations[0];
  const frames = anim.frameIds.map((fid) => built.frames[fid]).filter(Boolean);
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/studio?template=${tpl.id}&name=${encodeURIComponent(tpl.name)}`)}
      className="group overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/60 text-left transition-all hover:-translate-y-0.5 hover:border-forge-500 hover:shadow-glow"
    >
      <div className="checker flex h-36 items-center justify-center">
        <AnimatedSprite frames={frames} width={32} height={32} fps={anim.fps} scale={4} className="transition-transform group-hover:scale-110" />
      </div>
      <div className="p-3">
        <div className="text-sm font-bold text-white">{tpl.name}</div>
        <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">{tpl.description}</div>
        <div className="mt-2 flex gap-1">
          {built.animations.map((a) => (
            <span key={a.id} className="rounded-full bg-ink-800 px-2 py-0.5 font-mono text-[10px] text-forge-300">
              {a.name}·{a.frameIds.length}f
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function ProjectRow({ meta }: { meta: ProjectMeta }) {
  const navigate = useNavigate();
  const duplicateProject = useProjects((s) => s.duplicateProject);
  const deleteProject = useProjects((s) => s.deleteProject);
  const renameProject = useProjects((s) => s.renameProject);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(meta.name);
  const [confirmDel, setConfirmDel] = useState(false);

  const date = new Date(meta.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-ink-700 bg-ink-900/60 p-3 transition-colors hover:border-ink-600">
      <button onClick={() => navigate(`/studio/${meta.id}`)} className="checker h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-ink-700">
        {meta.thumb ? (
          <img src={meta.thumb} alt={meta.name} className="pixelated h-full w-full object-contain" />
        ) : (
          <span className="flex h-full items-center justify-center text-slate-600"><FolderOpen size={22} /></span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { if (draft.trim()) renameProject(meta.id, draft.trim()); setEditing(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) { renameProject(meta.id, draft.trim()); setEditing(false); }
              if (e.key === 'Escape') setEditing(false);
            }}
            className="w-full max-w-xs rounded-md border border-forge-500 bg-ink-950 px-2 py-1 text-sm font-bold text-white"
          />
        ) : (
          <button onClick={() => { setDraft(meta.name); setEditing(true); }} title="Renomear" className="truncate text-left text-sm font-bold text-white hover:text-forge-300">
            {meta.name}
          </button>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
          <span>{meta.width}×{meta.height}px</span>
          <span className="flex items-center gap-1"><Layers size={11} /> {meta.animations} ações · {meta.frames} frames</span>
          <span className="flex items-center gap-1"><Shapes size={11} /> {meta.variations} variações</span>
          <span className="flex items-center gap-1"><Clock size={11} /> {date}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {confirmDel ? (
          <>
            <button onClick={() => deleteProject(meta.id)} className="rounded-lg bg-red-500/20 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/30">
              Confirmar
            </button>
            <button onClick={() => setConfirmDel(false)} className="rounded-lg px-2 py-2 text-xs text-slate-400 hover:text-white">
              Não
            </button>
          </>
        ) : (
          <>
            <button onClick={() => duplicateProject(meta.id)} title="Duplicar" className="rounded-lg p-2 text-slate-400 hover:bg-ink-800 hover:text-white"><Copy size={16} /></button>
            <button onClick={() => setConfirmDel(true)} title="Excluir" className="rounded-lg p-2 text-slate-400 hover:bg-ink-800 hover:text-red-400"><Trash2 size={16} /></button>
            <button onClick={() => navigate(`/studio/${meta.id}`)} className="ml-1 rounded-lg bg-gradient-to-r from-forge-500 to-pixel-500 px-4 py-2 text-xs font-bold text-ink-950 hover:brightness-110">
              Abrir
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Projects() {
  const metas = useProjects((s) => s.metas);
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [name, setName] = useState('');
  const [size, setSize] = useState(32);

  const createBlank = () => {
    navigate(`/studio?name=${encodeURIComponent(name.trim() || 'Meu sprite')}&w=${size}&h=${size}`);
  };

  return (
    <div className="min-h-full bg-ink-950">
      {/* header */}
      <header className="sticky top-0 z-20 border-b border-ink-700 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 grid-cols-2 overflow-hidden rounded-lg border border-ink-600">
              <span className="bg-pixel-500" /><span className="bg-forge-500" />
              <span className="bg-ember-500" /><span className="bg-[#ff4d6d]" />
            </span>
            <span className="font-display text-base font-bold text-white">PixelForge <span className="text-slate-500">Studio</span></span>
          </Link>
          <div className="flex-1" />
          <Link to="/gerador" className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-forge-500 to-pixel-500 px-3 py-2 text-xs font-bold text-ink-950 hover:brightness-110">
            <Sparkles size={14} /> Gerador de Sprites
          </Link>
          <Link to="/lab" className="flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-pixel-500">
            <FlaskConical size={14} /> Lab
          </Link>
          {user ? (
            <span className="flex items-center gap-2 rounded-full border border-ink-600 bg-ink-900 px-3 py-1.5 text-xs font-semibold text-slate-200">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-forge-500 to-pixel-500 text-[10px] font-bold text-ink-950">
                {user.name.charAt(0).toUpperCase()}
              </span>
              {user.name}
              <span className="rounded-full bg-ink-700 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-300">{user.plan}</span>
            </span>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-forge-500 hover:text-white">
              <UserIcon size={14} /> Entrar
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        {/* criar do zero */}
        <section className="mt-8">
          <h1 className="font-display text-2xl font-bold text-white">Criar novo sprite</h1>
          <p className="mt-1 text-sm text-slate-400">Comece do zero ou de um modelo animado pronto.</p>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-ink-700 bg-ink-900/60 p-4 sm:flex-row sm:items-end">
            <label className="block flex-1 text-xs text-slate-400">
              Nome do sprite
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createBlank()}
                placeholder="Ex.: heroi_floresta"
                className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
              />
            </label>
            <div className="text-xs text-slate-400">
              <span className="mb-1 block">Tamanho do canvas</span>
              <div className="flex gap-1">
                {[16, 24, 32, 48, 64].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`rounded-lg px-3 py-2.5 font-mono text-xs ${size === s ? 'bg-forge-500/20 text-forge-300 ring-1 ring-forge-500' : 'bg-ink-950 text-slate-400 hover:text-white'}`}
                  >
                    {s}²
                  </button>
                ))}
              </div>
            </div>
            <button onClick={createBlank} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-forge-500 to-pixel-500 px-6 py-2.5 text-sm font-bold text-ink-950 hover:brightness-110">
              <Plus size={16} /> Criar em branco
            </button>
          </div>
        </section>

        {/* templates */}
        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Sparkles size={18} className="text-ember-400" /> Modelos animados prontos
          </h2>
          <p className="mt-1 text-sm text-slate-400">Cada modelo já vem com ações sequenciadas — edite, crie variações e exporte o pack.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map((t) => <TemplateCard key={t.id} id={t.id} />)}
          </div>
        </section>

        {/* salvos */}
        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-white">Meus projetos <span className="text-slate-500">({metas.length})</span></h2>
          <p className="mt-1 text-sm text-slate-400">Salvos automaticamente neste navegador.</p>
          <div className="mt-4 flex flex-col gap-3">
            {metas.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink-600 p-8 text-center text-sm text-slate-500">
                Nenhum projeto ainda. Crie um sprite em branco ou escolha um modelo acima.
              </div>
            )}
            {metas.map((m) => <ProjectRow key={m.id} meta={m} />)}
          </div>
        </section>

        {/* planos */}
        <section className="mt-14">
          <h2 className="text-center font-display text-xl font-bold text-white">Planos para cada fase do seu jogo</h2>
          <p className="mt-1 text-center text-sm text-slate-400">Comece grátis. Escale quando o pack crescer.</p>
          <div className="mt-6"><PlanCards /></div>
        </section>
      </main>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
