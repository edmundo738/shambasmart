import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Clapperboard, Download, Palette as PaletteIcon, Shapes } from 'lucide-react';
import { useStudio } from '../store/studio';
import { useProjects } from '../store/projects';
import TopBar from '../components/studio/TopBar';
import Toolbar from '../components/studio/Toolbar';
import CanvasStage from '../components/studio/CanvasStage';
import ToolOptions from '../components/studio/ToolOptions';
import Timeline from '../components/studio/Timeline';
import AnimationsPanel from '../components/studio/AnimationsPanel';
import VariationsPanel from '../components/studio/VariationsPanel';
import PalettePanel from '../components/studio/PalettePanel';
import PreviewPanel from '../components/studio/PreviewPanel';
import { ProjectionPanel } from '../components/studio/ProjectionPanel';
import CommandPalette from '../components/studio/CommandPalette';
import RecipeCard from '../components/studio/RecipeCard';
import MasterPanel from '../components/studio/MasterPanel';
import LayersPanel from '../components/studio/LayersPanel';
import MetaPanel from '../components/studio/MetaPanel';
import BonesPanel from '../components/studio/BonesPanel';
import ExportModal from '../components/studio/ExportModal';
import CanvasSizeModal from '../components/studio/CanvasSizeModal';
import { TEMPLATES } from '../lib/templates';

type LeftTab = 'anim' | 'var' | 'palette';

export default function Studio() {
  const { projectId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<LeftTab>('anim');
  const [exportOpen, setExportOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const project = useStudio((s) => s.project);
  const dirty = useStudio((s) => s.dirty);
  const markSaved = useStudio((s) => s.markSaved);
  const canvasDialogOpen = useStudio((s) => s.canvasDialogOpen);
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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      if (e.defaultPrevented) return; // PixelCanvas já tratou (ex.: Esc cancela arrasto)
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
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v'].includes(e.key.toLowerCase())) {
        const k = e.key.toLowerCase();
        const fid = st.currentFrameId;
        if (k === 'v' && st.frameClipboard?.length) {
          e.preventDefault();
          st.pasteFrame();
        } else if (fid && (k === 'c' || k === 'x')) {
          e.preventDefault();
          if (k === 'c') st.copyFrame(fid);
          else st.cutFrame(fid);
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
        case 'm': st.setTool('select'); break;
        case 't': st.setTool('meta'); break;
        case 'n': st.setTool('bone'); break;
        case 'f': st.requestViewport('fit'); break;
        case '1': st.requestViewport('z100'); break;
        case '2': st.requestViewport('z200'); break;
        case 'h': if (!e.repeat) st.setPanHeld(true); break;
        case 'c': st.setCanvasDialogOpen(true); break;
        case 'p': st.togglePixelPerfect(); break;
        case 'x': st.toggleMirrorX(); break;
        case 'y': st.toggleMirrorY(); break;
        case '[': st.setBrushSize(st.brushSize - 1); break;
        case ']': st.setBrushSize(st.brushSize + 1); break;
        case ' ': {
          e.preventDefault();
          st.setPlaying(!st.playing);
          break;
        }
        case 'delete':
        case 'backspace': {
          if ((st.tool === 'select' || st.tool === 'transform') && st.selection) {
            e.preventDefault();
            st.deleteSelection();
          }
          break;
        }
        case 'escape': {
          if (st.showCanvasHandles) { st.setShowCanvasHandles(false); break; }
          if (st.selection) st.setSelection(null);
          break;
        }
        case 'arrowup':
        case 'arrowdown':
        case 'arrowright':
        case 'arrowleft': {
          if ((st.tool === 'select' || st.tool === 'transform') && st.selection) {
            e.preventDefault();
            const step = e.shiftKey ? 8 : 1;
            const k = e.key.toLowerCase();
            st.moveSelection(
              k === 'arrowright' ? step : k === 'arrowleft' ? -step : 0,
              k === 'arrowdown' ? step : k === 'arrowup' ? -step : 0,
            );
            break;
          }
          if (e.key.toLowerCase() === 'arrowup' || e.key.toLowerCase() === 'arrowdown') break;
          e.preventDefault();
          st.stepFrame(e.key.toLowerCase() === 'arrowright' ? 1 : -1);
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    const off = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'h') useStudio.getState().setPanHeld(false); };
    const blur = () => useStudio.getState().setPanHeld(false);
    window.addEventListener('keyup', off);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', off);
      window.removeEventListener('blur', blur);
    };
  }, [saveProject, markSaved]);

  if (!ready || !project) {
    return (
      <div className="flex h-full items-center justify-center bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <span className="grid h-12 w-12 animate-pulse grid-cols-2 overflow-hidden rounded-xl border border-ink-600">
            <span className="bg-pixel-500" /><span className="bg-forge-500" />
            <span className="bg-ember-500" /><span className="bg-[#ff4d6d]" />
          </span>
          <p className="pf-title text-[10px] text-slate-300">CARREGANDO<span className="animate-blink text-pixel-400">_</span></p>
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
      <TopBar onExport={() => setExportOpen(true)} onCommand={() => setCommandOpen(true)} />
      <ToolOptions />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:overflow-hidden">
        {/* rail de ferramentas */}
        <div className="flex shrink-0 justify-center lg:justify-start">
          <Toolbar />
        </div>

        {/* painel esquerdo */}
        <aside className="pf-shadow flex w-full shrink-0 flex-col rounded-xl border border-ink-700 bg-ink-900/50 lg:w-72">
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
                    <CanvasStage />
          <Timeline />
        </main>

        {/* painel direito */}
        <aside className="thin-scroll flex w-full shrink-0 flex-col gap-3 overflow-y-auto lg:w-80">
          <ProjectionPanel />
          <LayersPanel />
          <MetaPanel />
          <BonesPanel />
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
      {canvasDialogOpen && <CanvasSizeModal />}
      {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} />}
    </div>
  );
}
