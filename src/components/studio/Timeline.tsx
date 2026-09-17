import { ArrowLeft, ArrowRight, Copy, Eraser, Film, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { useStudio } from '../../store/studio';
import { SpriteCanvas } from '../SpriteView';

export default function Timeline() {
  const project = useStudio((s) => s.project);
  const currentAnimationId = useStudio((s) => s.currentAnimationId);
  const currentFrameId = useStudio((s) => s.currentFrameId);
  const select = useStudio((s) => s.select);
  const addFrame = useStudio((s) => s.addFrame);
  const duplicateFrame = useStudio((s) => s.duplicateFrame);
  const deleteFrame = useStudio((s) => s.deleteFrame);
  const moveFrame = useStudio((s) => s.moveFrame);
  const clearFrame = useStudio((s) => s.clearFrame);
  const playing = useStudio((s) => s.playing);
  const setPlaying = useStudio((s) => s.setPlaying);
  const setAnimFps = useStudio((s) => s.setAnimFps);

  if (!project) return null;
  const anim = project.animations.find((a) => a.id === currentAnimationId) ?? project.animations[0];
  if (!anim) return null;

  const iconBtn = 'flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-ink-700 hover:text-slate-100 disabled:opacity-30';

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ink-700 bg-ink-900/80 p-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Film size={16} className="text-forge-400" />
          {anim.name}
          <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
            {anim.frameIds.length} frames
          </span>
        </div>
        <div className="flex-1" />
        <button onClick={() => setPlaying(!playing)} className={iconBtn} title={playing ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          FPS
          <input
            type="range" min={1} max={24} value={anim.fps}
            onChange={(e) => setAnimFps(anim.id, Number(e.target.value))}
            className="h-1 w-24 cursor-pointer"
          />
          <span className="w-6 font-mono text-slate-200">{anim.fps}</span>
        </label>
      </div>

      <div className="thin-scroll flex items-stretch gap-2 overflow-x-auto pb-1">
        {anim.frameIds.map((fid, i) => {
          const f = project.frames[fid];
          if (!f) return null;
          const active = fid === currentFrameId;
          return (
            <div
              key={fid}
              className={`group relative shrink-0 rounded-lg border-2 p-1 transition-colors ${
                active ? 'border-forge-500 bg-forge-500/10 shadow-glow' : 'border-ink-700 bg-ink-950 hover:border-ink-600'
              }`}
            >
              <button onClick={() => select(anim.id, fid)} title={`Frame ${i}`}>
                <SpriteCanvas cells={f.cells} width={project.width} height={project.height} scale={2} className="h-16 w-16 rounded object-contain" />
              </button>
              <div className={`mt-0.5 text-center font-mono text-[10px] ${active ? 'text-forge-300' : 'text-slate-500'}`}>
                f{String(i).padStart(2, '0')}
              </div>
              {active && (
                <div className="absolute -top-2 left-1/2 flex -translate-x-1/2 translate-y-[-100%] items-center gap-0.5 rounded-lg border border-ink-600 bg-ink-950/95 p-1 shadow-xl">
                  <button className={iconBtn} title="Mover para esquerda" onClick={() => moveFrame(fid, -1)} disabled={i === 0}><ArrowLeft size={13} /></button>
                  <button className={iconBtn} title="Mover para direita" onClick={() => moveFrame(fid, 1)} disabled={i === anim.frameIds.length - 1}><ArrowRight size={13} /></button>
                  <button className={iconBtn} title="Duplicar" onClick={() => duplicateFrame(fid)}><Copy size={13} /></button>
                  <button className={iconBtn} title="Limpar pixels" onClick={() => clearFrame(fid)}><Eraser size={13} /></button>
                  <button className={iconBtn} title="Excluir frame" onClick={() => deleteFrame(fid)} disabled={anim.frameIds.length <= 1}><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={addFrame}
          title="Adicionar frame vazio após o atual"
          className="flex w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink-600 text-slate-500 hover:border-pixel-500 hover:text-pixel-400"
        >
          <Plus size={20} />
          <span className="text-[10px] font-medium">Novo frame</span>
        </button>
      </div>
    </div>
  );
}
