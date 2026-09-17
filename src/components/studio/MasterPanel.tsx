import { useMemo, useState } from 'react';
import {
  BadgeCheck, Bone, Check, Clapperboard, Copy, Plus, TriangleAlert,
} from 'lucide-react';
import { useStudio } from '../../store/studio';
import { AnimatedSprite } from '../SpriteView';
import { ENGINE_VERSION } from '../../lib/core/engine';
import { compareFrames, fromRecipe, serializeMaster } from '../../lib/core/assetMaster';
import { skeletonById } from '../../lib/core/skeletons';
import {
  MotionDef, motionsForManual, motionsForRecipe, renderRecipe, resolveMotion,
} from '../../lib/core/motionLibrary';

const ENGINE_CHIP: Record<string, string> = {
  rig: 'bg-pixel-500/15 text-pixel-400',
  retarget: 'bg-forge-500/15 text-forge-300',
  procedural: 'bg-ember-500/15 text-ember-400',
};
const ENGINE_LABEL: Record<string, string> = { rig: 'RIG', retarget: 'IMG', procedural: 'PROC' };

export default function MasterPanel() {
  const project = useStudio((s) => s.project);
  const addAnimationWithFrames = useStudio((s) => s.addAnimationWithFrames);
  const [motionId, setMotionId] = useState<string | null>(null);
  const [verify, setVerify] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState('');

  const master = useMemo(
    () => (project?.recipe ? fromRecipe(project.recipe, project.name, project.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project?.id, project?.recipe],
  );
  const motions: MotionDef[] = useMemo(
    () => (project?.recipe ? motionsForRecipe(project.recipe) : motionsForManual()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project?.id, project?.recipe],
  );
  const selected = motions.find((m) => m.id === motionId) ?? null;
  const preview = useMemo(() => {
    if (!selected || !project) return null;
    try {
      const first = project.animations[0];
      const fid = first?.frameIds[0];
      const base = fid ? project.frames[fid]?.cells : undefined;
      return resolveMotion(project.recipe ?? null, selected, base, project.width);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, project?.id]);

  if (!project) return null;
  const skel = master ? skeletonById(master.skeleton) : undefined;

  const runVerify = () => {
    if (!project.recipe) return;
    const rendered = renderRecipe(project.recipe);
    const expected = rendered.actions.flatMap((a) => a.frames);
    const actual: string[][] = [];
    for (const anim of project.animations) {
      for (const fid of anim.frameIds) {
        const f = project.frames[fid];
        if (f) actual.push(f.cells);
      }
    }
    const c = compareFrames(expected, actual);
    if (c.mismatched === 0 && c.extraExpected === 0 && c.extraActual === 0) {
      setVerify({ ok: true, text: `Determinístico — ${c.matched}/${c.compared} frames idênticos (engine ${ENGINE_VERSION}).` });
    } else {
      const parts: string[] = [];
      if (c.mismatched > 0) parts.push(`${c.mismatched} editados`);
      if (c.extraActual > 0) parts.push(`${c.extraActual} novos`);
      if (c.extraExpected > 0) parts.push(`${c.extraExpected} removidos`);
      setVerify({ ok: false, text: `Divergiu do Master: ${parts.join(' · ')}. Edição manual preservada — o Master continua intacto.` });
    }
  };

  const copyJson = async () => {
    if (!master) return;
    try {
      await navigator.clipboard.writeText(serializeMaster(master));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  };

  const addSelected = () => {
    if (!selected || !preview) return;
    addAnimationWithFrames(preview.label, preview.fps, preview.frames);
    setAdded(`"${preview.label}" adicionada à timeline!`);
    setTimeout(() => setAdded(''), 3000);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Asset Master */}
      <div className="flex flex-col gap-2 rounded-xl border border-ink-700 bg-ink-900/80 p-3">
        <div className="flex items-center gap-2">
          <BadgeCheck size={15} className="text-forge-300" />
          <span className="text-sm font-semibold text-slate-200">Asset Master</span>
          <div className="flex-1" />
          <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">eng {ENGINE_VERSION}</span>
        </div>
        {master && skel ? (
          <>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Bone size={13} className="shrink-0 text-slate-500" />
              <span className="truncate">{skel.label} · {skel.bones.length} ossos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-slate-500">fingerprint</span>
              <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] font-bold text-pixel-400">{master.fingerprint}</span>
            </div>
            {verify && (
              <div className={`flex items-start gap-1.5 rounded-lg border p-2 text-[11px] leading-snug ${verify.ok ? 'border-pixel-500/40 bg-pixel-500/10 text-pixel-400' : 'border-ember-500/40 bg-ember-500/10 text-ember-400'}`}>
                {verify.ok ? <Check size={13} className="mt-0.5 shrink-0" /> : <TriangleAlert size={13} className="mt-0.5 shrink-0" />}
                {verify.text}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={runVerify} className="flex flex-1 items-center justify-center rounded-lg border border-pixel-500/50 bg-pixel-500/10 px-2 py-1.5 text-xs font-bold text-pixel-400 hover:bg-pixel-500/20">
                Verificar
              </button>
              <button onClick={copyJson} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-ink-600 px-2 py-1.5 text-xs font-semibold text-slate-300 hover:border-ink-500 hover:text-white">
                {copied ? <Check size={13} className="text-pixel-400" /> : <Copy size={13} />}
                {copied ? 'Copiado!' : 'Master JSON'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-[11px] leading-relaxed text-slate-500">
            Asset manual — sem Master. Os movimentos image-space abaixo funcionam em qualquer pixel.
          </p>
        )}
      </div>

      {/* Motion Library */}
      <div className="flex flex-col gap-2 rounded-xl border border-ink-700 bg-ink-900/80 p-3">
        <div className="flex items-center gap-2">
          <Clapperboard size={15} className="text-ember-400" />
          <span className="text-sm font-semibold text-slate-200">Motion Library</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          {master && skel ? `Movimentos do esqueleto ${skel.label}. Clique para prévia.` : 'Movimentos image-space. Clique para prévia.'}
        </p>
        <div className="thin-scroll flex max-h-44 flex-col gap-1 overflow-y-auto pr-0.5">
          {motions.map((m) => (
            <button
              key={m.id}
              onClick={() => setMotionId(m.id === motionId ? null : m.id)}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left ${m.id === motionId ? 'border-forge-500 bg-forge-500/10' : 'border-ink-800 hover:border-ink-600'}`}
            >
              <span className={`rounded px-1 py-0.5 font-mono text-[9px] font-bold ${ENGINE_CHIP[m.engine]}`}>{ENGINE_LABEL[m.engine]}</span>
              <span className="flex-1 truncate text-xs font-semibold text-slate-200">{m.label}</span>
              <span className="font-mono text-[10px] text-slate-600">{m.frames}f · {m.fps}fps</span>
            </button>
          ))}
        </div>
        {selected && preview && (
          <div className="flex flex-col gap-2 rounded-lg border border-ink-700 bg-ink-950 p-2">
            <div className="checker flex items-center justify-center rounded-lg py-2">
              <AnimatedSprite
                frames={preview.frames.map((cells, i) => ({ id: `mv${i}`, cells }))}
                width={project.width} height={project.height} fps={preview.fps} scale={3}
              />
            </div>
            <button onClick={addSelected} className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-forge-500 to-pixel-500 px-2 py-2 text-xs font-bold text-ink-950 hover:brightness-110">
              <Plus size={14} /> Adicionar “{preview.label}” ao projeto
            </button>
          </div>
        )}
        {added && <div className="rounded-lg border border-pixel-500/40 bg-pixel-500/10 p-2 text-[11px] text-pixel-400">{added}</div>}
      </div>
    </div>
  );
}
