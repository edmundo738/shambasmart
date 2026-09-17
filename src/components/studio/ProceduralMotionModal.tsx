import { useMemo, useState } from 'react';
import { Clapperboard, Wand2, X } from 'lucide-react';
import { useStudio } from '../../store/studio';
import { RETARGET_DEFS, RetargetId, generateRetargetFrames } from '../../lib/procgen/retarget';
import { AnimatedSprite, SpriteCanvas } from '../SpriteView';
import { Frame } from '../../types';

export default function ProceduralMotionModal({ onClose }: { onClose: () => void }) {
  const project = useStudio((s) => s.project);
  const currentFrameId = useStudio((s) => s.currentFrameId);
  const addAnimationWithFrames = useStudio((s) => s.addAnimationWithFrames);

  const [presetId, setPresetId] = useState<RetargetId>('respirar');
  const [frames, setFrames] = useState(4);
  const [intensity, setIntensity] = useState(0.65);
  const [name, setName] = useState('');

  const def = RETARGET_DEFS.find((d) => d.id === presetId)!;

  const source = project && currentFrameId ? project.frames[currentFrameId] : undefined;

  const preview: Frame[] = useMemo(() => {
    if (!project || !source) return [];
    const cells = generateRetargetFrames(source.cells, project.width, project.height, def, frames, intensity);
    return cells.map((c, i) => ({ id: `ret_${i}`, cells: c }));
  }, [project, source, def, frames, intensity]);

  if (!project || !source) return null;

  const create = () => {
    const finalName = (name.trim() || `${def.label}_auto`).slice(0, 24);
    addAnimationWithFrames(finalName, def.fps, preview.map((f) => f.cells));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto thin-scroll rounded-2xl border border-ink-600 bg-ink-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ember-500 to-fuchsia-500 text-ink-950">
            <Wand2 size={20} />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Movimento procedural</h2>
            <p className="text-xs text-slate-400">Gere uma animação a partir do frame atual</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-ink-800 hover:text-white"><X size={18} /></button>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
          {/* presets */}
          <div className="flex flex-col gap-1.5">
            {RETARGET_DEFS.map((d) => (
              <button
                key={d.id}
                onClick={() => { setPresetId(d.id); setFrames(d.frames); }}
                className={`rounded-xl border p-2.5 text-left transition-colors ${
                  presetId === d.id ? 'border-ember-400 bg-ember-500/10' : 'border-ink-700 hover:border-ink-600'
                }`}
              >
                <div className={`text-sm font-bold ${presetId === d.id ? 'text-ember-400' : 'text-white'}`}>{d.label}</div>
                <div className="text-[11px] text-slate-400">{d.desc}</div>
              </button>
            ))}
          </div>

          {/* prévia */}
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-xl border border-ink-700">
              <div className="checker flex items-center justify-center py-4">
                <AnimatedSprite frames={preview} width={project.width} height={project.height} fps={def.fps} scale={4} />
              </div>
              <div className="flex items-center gap-2 border-t border-ink-700 bg-ink-950 px-3 py-2">
                <span className="text-[11px] text-slate-500">fonte:</span>
                <SpriteCanvas cells={source.cells} width={project.width} height={project.height} scale={1} className="h-8 w-8 rounded border border-ink-700 object-contain" />
                <span className="ml-auto font-mono text-[11px] text-slate-400">{def.fps}fps · {frames}f</span>
              </div>
            </div>

            <label className="block text-xs text-slate-400">
              <span className="mb-1 flex justify-between"><span>Frames</span><span className="font-mono text-slate-200">{frames}</span></span>
              <input type="range" min={2} max={8} value={frames} onChange={(e) => setFrames(Number(e.target.value))} className="h-1 w-full cursor-pointer" />
            </label>
            <label className="block text-xs text-slate-400">
              <span className="mb-1 flex justify-between"><span>Intensidade</span><span className="font-mono text-slate-200">{Math.round(intensity * 100)}%</span></span>
              <input type="range" min={10} max={100} value={Math.round(intensity * 100)} onChange={(e) => setIntensity(Number(e.target.value) / 100)} className="h-1 w-full cursor-pointer" />
            </label>
            <label className="block text-xs text-slate-400">
              Nome da nova ação
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${def.label}_auto`}
                className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-white placeholder:text-slate-600"
              />
            </label>
            <button onClick={create} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ember-500 to-fuchsia-500 px-4 py-3 text-sm font-bold text-white hover:brightness-110">
              <Clapperboard size={16} /> Criar animação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
