import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, ClipboardCopy, ClipboardPaste, Copy, Eraser, Film, Pause, Play, Plus, Scissors,
  StepBack, StepForward, Timer, Trash2,
} from 'lucide-react';
import { useStudio } from '../../store/studio';
import { SpriteCanvas } from '../SpriteView';
import { celStack } from '../../lib/layers';
import { frameMs } from '../../lib/timeline';
import { MAX_FRAME_MS, MIN_FRAME_MS } from '../../types';

export default function Timeline() {
  const project = useStudio((s) => s.project);
  const currentAnimationId = useStudio((s) => s.currentAnimationId);
  const currentFrameId = useStudio((s) => s.currentFrameId);
  const select = useStudio((s) => s.select);
  const addFrame = useStudio((s) => s.addFrame);
  const duplicateFrame = useStudio((s) => s.duplicateFrame);
  const deleteFrame = useStudio((s) => s.deleteFrame);
  const moveFrame = useStudio((s) => s.moveFrame);
  const moveFrameTo = useStudio((s) => s.moveFrameTo);
  const stepFrame = useStudio((s) => s.stepFrame);
  const setFrameDuration = useStudio((s) => s.setFrameDuration);
  const copyFrame = useStudio((s) => s.copyFrame);
  const cutFrame = useStudio((s) => s.cutFrame);
  const pasteFrame = useStudio((s) => s.pasteFrame);
  const frameClipboard = useStudio((s) => s.frameClipboard);
  const clearFrame = useStudio((s) => s.clearFrame);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const playing = useStudio((s) => s.playing);
  const setPlaying = useStudio((s) => s.setPlaying);
  const setAnimFps = useStudio((s) => s.setAnimFps);

  if (!project) return null;
  const anim = project.animations.find((a) => a.id === currentAnimationId) ?? project.animations[0];
  if (!anim) return null;
  const currentFrame = currentFrameId ? project.frames[currentFrameId] : undefined;

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
        <button onClick={() => stepFrame(-1)} className={iconBtn} title="Frame anterior (←)"><StepBack size={15} /></button>
        <button onClick={() => setPlaying(!playing)} className={iconBtn} title={playing ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button onClick={() => stepFrame(1)} className={iconBtn} title="Próximo frame (→)"><StepForward size={15} /></button>
        {currentFrame && currentFrameId && (
          <label className="flex items-center gap-1 text-xs text-slate-400" title="Duração do frame atual (ms)">
            <Timer size={13} className="text-slate-500" />
            <input
              key={`${currentFrameId}:${currentFrame.durationMs}`}
              type="number" min={MIN_FRAME_MS} max={MAX_FRAME_MS} step={10}
              defaultValue={currentFrame.durationMs}
              onBlur={(e) => setFrameDuration(currentFrameId, Number(e.target.value))}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="w-14 rounded-md border border-ink-700 bg-ink-950 px-1.5 py-0.5 font-mono text-slate-200"
            />
            <span className="text-slate-500">ms</span>
          </label>
        )}
        <label className="flex items-center gap-2 text-xs text-slate-400" title="FPS base: aplica 1000/fps ms em TODOS os frames da ação">
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
              draggable
              onDragStart={() => setDragId(fid)}
              onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
              onDrop={() => { if (dragId) moveFrameTo(dragId, i); setDragId(null); setDragOver(null); }}
              onDragEnd={() => { setDragId(null); setDragOver(null); }}
              className={`group relative shrink-0 cursor-grab rounded-lg border-2 p-1 transition-colors active:cursor-grabbing ${
                dragOver === i && dragId !== fid
                  ? 'border-pixel-400 bg-pixel-500/10'
                  : active ? 'border-forge-500 bg-forge-500/10 shadow-glow' : 'border-ink-700 bg-ink-950 hover:border-ink-600'
              } ${dragId === fid ? 'opacity-40' : ''}`}
            >
              <button onClick={() => select(anim.id, fid)} title={`Frame ${i}`}>
                <SpriteCanvas layers={celStack(project.layers, f)} width={project.width} height={project.height} scale={2} className="h-16 w-16 rounded object-contain" />
              </button>
              <div className={`mt-0.5 text-center font-mono text-[10px] ${active ? 'text-forge-300' : 'text-slate-500'}`}>
                f{String(i).padStart(2, '0')}{active ? ` · ${frameMs(f)}ms` : ''}
              </div>
              {active && (
                <div className="absolute -top-2 left-1/2 flex -translate-x-1/2 translate-y-[-100%] items-center gap-0.5 rounded-lg border border-ink-600 bg-ink-950/95 p-1 shadow-xl">
                  <button className={iconBtn} title="Mover para esquerda" onClick={() => moveFrame(fid, -1)} disabled={i === 0}><ArrowLeft size={13} /></button>
                  <button className={iconBtn} title="Mover para direita" onClick={() => moveFrame(fid, 1)} disabled={i === anim.frameIds.length - 1}><ArrowRight size={13} /></button>
                  <button className={iconBtn} title="Duplicar" onClick={() => duplicateFrame(fid)}><Copy size={13} /></button>
                  <button className={iconBtn} title="Recortar (Ctrl+X)" onClick={() => cutFrame(fid)} disabled={anim.frameIds.length <= 1}><Scissors size={13} /></button>
                  <button className={iconBtn} title="Copiar (Ctrl+C)" onClick={() => copyFrame(fid)}><ClipboardCopy size={13} /></button>
                  <button className={iconBtn} title="Colar após o atual (Ctrl+V)" onClick={pasteFrame} disabled={!frameClipboard?.length}><ClipboardPaste size={13} /></button>
                  <button className={iconBtn} title="Limpar camada atual" onClick={() => clearFrame(fid)}><Eraser size={13} /></button>
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
