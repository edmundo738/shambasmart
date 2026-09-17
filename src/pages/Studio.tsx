import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Clapperboard, Download, Palette as PaletteIcon, Shapes, ZoomIn, ZoomOut } from 'lucide-react';
import { useStudio } from '../store/studio';
import { useProjects } from '../store/projects';
import TopBar from '../components/studio/TopBar';
import Toolbar from '../components/studio/Toolbar';
import PixelCanvas from '../components/studio/PixelCanvas';
import Timeline from '../components/studio/Timeline';
import AnimationsPanel from '../components/studio/AnimationsPanel';
import VariationsPanel from '../components/studio/VariationsPanel';
import PalettePanel from '../components/studio/PalettePanel';
import PreviewPanel from '../components/studio/PreviewPanel';
import RecipeCard from '../components/studio/RecipeCard';
import MasterPanel from '../components/studio/MasterPanel';
import ExportModal from '../components/studio/ExportModal';
import { TEMPLATES } from '../lib/templates';

type LeftTab = 'anim' | 'var' | 'palette';

export default function Studio() {
  const { projectId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<LeftTab>('anim');
  const [exportOpen, setExportOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const project = useStudio((s) => s.project);
  const dirty = useStudio((s) => s.dirty);
  const zoom = useStudio((s) => s.zoom);
  const setZoom = useStudio((s) => s.setZoom);
  const markSaved = useStudio((s) => s.markSaved);
  const saveProject = useProjects((s) => s.saveProject);
  const loadProjectFull = useProjects((s) => s.loadProjectFull);

  /* ------------------------- carregar / criar projeto ------------------------ */
  useEffect(() => {
    const st = useStudio.getState();
    // já carregado e é o mesmo da URL
    if (st.project && projectId && st.project.id === projectId) {
      setReady(true);
      return;
    }
    if (projectId) {
      const full = loadProjectFull(projectId);
      if (full) {
        st.loadProject(full);
        setReady(true);
      } else {
        navigate('/projetos', { replace: true });
      }
      return;
    }
    const tpl = params.get('template');
    const name = params.get('name') || undefined;
    const w = Number(params.get('w')) || 32;
    const h = Number(params.get('h')) || 32;
    if (tpl && TEMPLATES.some((t) => t.id === tpl)) {
      st.projectFromTemplate(name || TEMPLATES.find((t) => t.id === tpl)!.name, tpl);
    } else {
      st.newEmptyProject(name || 'Meu sprite', w, h);
    }
    const created = useStudio.getState().project!;
    saveProject(created);
    markSaved();
    navigate(`/studio/${created.id}`, { replace: true });
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /* ------------------------------- autosave -------------------------------- */
  useEffect(() => {
    if (!ready || !dirty) return;
    const p = useStudio.getState().project;
    if (!p) return;
    const t = setTimeout(() => {
      saveProject({ ...p, updatedAt: Date.now() });
      markSaved();
    }, 900);
    return () => clearTimeout(t);
  }, [ready, dirty, project?.updatedAt, saveProject, markSaved, project]);

  /* ------------------------------ atalhos ---------------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      const st = useStudio.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        st.redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const p = st.project;
        if (p) {
          saveProject({ ...p, updatedAt: Date.now() });
          markSaved();
        }
        return;
      }
      switch (e.key.toLowerCase()) {
        case 'b': st.setTool('brush'); break;
        case 'e': st.setTool('eraser'); break;
        case 'g': st.setTool('fill'); break;
        case 'i': st.setTool('picker'); break;
        case 'l': st.setTool('line'); break;
        case 'r': st.setTool('rect'); break;
        case 'o': st.setTool('ellipse'); break;
        case 'x': st.toggleMirrorX(); break;
        case '[': st.setBrushSize(st.brushSize - 1); break;
        case ']': st.setBrushSize(st.brushSize + 1); break;
        case ' ': {
          e.preventDefault();
          st.setPlaying(!st.playing);
          break;
        }
        case 'arrowright':
        case 'arrowleft': {
          const p = st.project;
          const anim = p?.animations.find((a) => a.id === (st.currentAnimationId ?? p?.animations[0]?.id));
          if (!p || !anim || !anim.frameIds.length) break;
          e.preventDefault();
          const i = anim.frameIds.indexOf(st.currentFrameId ?? '');
          const n = anim.frameIds.length;
          const next = e.key.toLowerCase() === 'arrowright'
            ? anim.frameIds[(i + 1 + n) % n]
            : anim.frameIds[(i - 1 + n) % n];
          st.select(anim.id, next);
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveProject, markSaved]);

  if (!ready || !project) {
    return (
      <div className="flex h-full items-center justify-center bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <span className="grid h-12 w-12 animate-pulse grid-cols-2 overflow-hidden rounded-xl border border-ink-600">
            <span className="bg-pixel-500" /><span className="bg-forge-500" />
            <span className="bg-ember-500" /><span className="bg-[#ff4d6d]" />
          </span>
          <p className="text-sm text-slate-400">Carregando estúdio…</p>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: LeftTab; label: string; icon: React.ReactNode }> = [
    { id: 'anim', label: 'Ações', icon: <Clapperboard size={15} /> },
    { id: 'var', label: 'Variações', icon: <Shapes size={15} /> },
    { id: 'palette', label: 'Paleta', icon: <PaletteIcon size={15} /> },
  ];

  return (
    <div className="flex h-full flex-col bg-ink-950">
      <TopBar onExport={() => setExportOpen(true)} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:overflow-hidden">
        {/* rail de ferramentas */}
        <div className="flex shrink-0 justify-center lg:justify-start">
          <Toolbar />
        </div>

        {/* painel esquerdo */}
        <aside className="flex w-full shrink-0 flex-col rounded-xl border border-ink-700 bg-ink-900/50 lg:w-72">
          <div className="flex gap-1 border-b border-ink-700 p-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold ${
                  tab === t.id ? 'bg-ink-700 text-white' : 'text-slate-400 hover:bg-ink-800 hover:text-slate-200'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-3 lg:max-h-none">
            {tab === 'anim' && <AnimationsPanel />}
            {tab === 'var' && <VariationsPanel />}
            {tab === 'palette' && <PalettePanel />}
          </div>
        </aside>

        {/* centro: canvas + timeline */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="thin-scroll relative flex min-h-[320px] flex-1 items-center justify-center overflow-auto rounded-xl border border-ink-700 bg-ink-900/30 bg-[radial-gradient(circle_at_50%_40%,rgba(34,184,240,0.07),transparent_60%)] p-6">
            <PixelCanvas />
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-ink-600 bg-ink-950/90 px-2 py-1 shadow-xl">
              <button onClick={() => setZoom(zoom - 2)} className="rounded-full p-1.5 text-slate-400 hover:bg-ink-800 hover:text-white" title="Reduzir zoom">
                <ZoomOut size={14} />
              </button>
              <span className="w-12 text-center font-mono text-[11px] text-slate-300">{zoom * project.width}px</span>
              <button onClick={() => setZoom(zoom + 2)} className="rounded-full p-1.5 text-slate-400 hover:bg-ink-800 hover:text-white" title="Aumentar zoom">
                <ZoomIn size={14} />
              </button>
            </div>
            <div className="absolute right-3 top-3 hidden rounded-lg border border-ink-700 bg-ink-950/80 px-2.5 py-1.5 font-mono text-[10px] leading-relaxed text-slate-500 xl:block">
              <div><kbd className="text-slate-300">B E G I L R O</kbd> ferramentas</div>
              <div><kbd className="text-slate-300">Espaço</kbd> play · <kbd className="text-slate-300">←→</kbd> frames</div>
              <div><kbd className="text-slate-300">Ctrl+Z</kbd> desfazer · <kbd className="text-slate-300">Alt+clique</kbd> cor</div>
            </div>
          </div>
          <Timeline />
        </main>

        {/* painel direito */}
        <aside className="thin-scroll flex w-full shrink-0 flex-col gap-3 overflow-y-auto lg:w-80">
          <PreviewPanel />
          <RecipeCard />
          <MasterPanel />
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-ink-600 py-3 text-sm font-semibold text-slate-300 hover:border-pixel-500 hover:text-pixel-400"
          >
            <Download size={16} /> Exportar pack ZIP
          </button>
          <Link to="/projetos" className="pb-1 text-center text-xs text-slate-500 hover:text-slate-300">
            ← Voltar para meus projetos
          </Link>
        </aside>
      </div>

      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
    </div>
  );
}
