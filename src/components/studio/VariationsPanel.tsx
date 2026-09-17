import { useMemo, useState } from 'react';
import { Dices, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useStudio } from '../../store/studio';
import { ORIGINAL_VARIATION_ID, Variation } from '../../types';
import { countColors } from '../../lib/pixels';
import { normalizeHex } from '../../lib/color';
import { AnimatedSprite } from '../SpriteView';

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      <span className="w-20 shrink-0">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-1 flex-1 cursor-pointer" />
      <span className="w-8 text-right font-mono text-slate-200">{value}</span>
    </label>
  );
}

export default function VariationsPanel() {
  const project = useStudio((s) => s.project);
  const currentAnimationId = useStudio((s) => s.currentAnimationId);
  const currentFrameId = useStudio((s) => s.currentFrameId);
  const variationId = useStudio((s) => s.variationId);
  const setVariation = useStudio((s) => s.setVariation);
  const addVariation = useStudio((s) => s.addVariation);
  const updateVariation = useStudio((s) => s.updateVariation);
  const deleteVariation = useStudio((s) => s.deleteVariation);
  const autoVariations = useStudio((s) => s.autoVariations);
  const [showMapping, setShowMapping] = useState(true);

  const animFrames = useMemo(() => {
    if (!project) return [];
    const anim = project.animations.find((a) => a.id === currentAnimationId) ?? project.animations[0];
    if (!anim) return [];
    return anim.frameIds.map((fid) => project.frames[fid]).filter(Boolean);
  }, [project, currentAnimationId]);

  const topColors = useMemo(() => {
    if (!project || !currentFrameId) return [];
    const f = project.frames[currentFrameId];
    if (!f) return [];
    return countColors(f.cells).slice(0, 12);
  }, [project, currentFrameId]);

  if (!project) return null;
  const selected: Variation | null = project.variations.find((v) => v.id === variationId) ?? null;

  const setMapping = (from: string, to: string) => {
    if (!selected) return;
    const key = normalizeHex(from);
    const mapping = { ...selected.mapping };
    if (normalizeHex(to) === key) delete mapping[key];
    else mapping[key] = normalizeHex(to);
    updateVariation(selected.id, { mapping });
  };

  const row = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-lg border p-1.5 text-left transition-colors ${
      active ? 'border-pixel-500/60 bg-pixel-500/10' : 'border-ink-700 bg-ink-900/60 hover:border-ink-600'
    }`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] leading-relaxed text-slate-500">
        <strong className="text-slate-300">Um modelo, infinitas skins.</strong> Variações não-destrutivas aplicadas a todas as ações do pack.
      </p>

      {/* original */}
      <button onClick={() => setVariation(ORIGINAL_VARIATION_ID)} className={row(variationId === ORIGINAL_VARIATION_ID)}>
        <span className="checker h-10 w-10 shrink-0 overflow-hidden rounded-md border border-ink-700">
          <AnimatedSprite frames={animFrames} width={project.width} height={project.height} fps={8} scale={1} className="h-full w-full object-contain" />
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-200">Original</span>
        <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-slate-400">base</span>
      </button>

      {/* variações */}
      {project.variations.map((v) => (
        <div key={v.id} className={`${row(v.id === variationId)} group`}>
          <button onClick={() => setVariation(v.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="checker h-10 w-10 shrink-0 overflow-hidden rounded-md border border-ink-700">
              <AnimatedSprite frames={animFrames} width={project.width} height={project.height} fps={8} scale={1} variation={v} className="h-full w-full object-contain" />
            </span>
            <span className="truncate text-sm font-semibold text-slate-200">{v.name}</span>
          </button>
          <button
            title="Excluir variação"
            onClick={() => deleteVariation(v.id)}
            className="hidden rounded p-1.5 text-slate-500 hover:bg-ink-700 hover:text-red-400 group-hover:block"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          onClick={() => autoVariations()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-ember-500 to-ember-400 px-2 py-2 text-xs font-bold text-ink-950 hover:brightness-110"
        >
          <Sparkles size={14} /> Gerar 5 forjas
        </button>
        <button
          onClick={() => addVariation()}
          title="Nova variação em branco"
          className="flex items-center justify-center gap-1 rounded-lg border border-ink-600 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-pixel-500 hover:text-pixel-400"
        >
          <Plus size={14} /> Manual
        </button>
      </div>

      {/* editor da variação selecionada */}
      {selected ? (
        <div className="rounded-xl border border-ink-700 bg-ink-950/60 p-3">
          <div className="mb-2 flex items-center gap-2">
            <input
              value={selected.name}
              onChange={(e) => updateVariation(selected.id, { name: e.target.value })}
              className="w-full rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-sm font-semibold text-slate-100"
            />
            <button
              title="Aleatorizar matiz"
              onClick={() => updateVariation(selected.id, { hue: Math.floor(Math.random() * 360) - 180 })}
              className="rounded-md border border-ink-700 p-1.5 text-slate-400 hover:text-ember-400"
            >
              <Dices size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Slider label="Matiz" value={selected.hue} min={-180} max={180} onChange={(hue) => updateVariation(selected.id, { hue })} />
            <Slider label="Saturação" value={selected.sat} min={-100} max={100} onChange={(sat) => updateVariation(selected.id, { sat })} />
            <Slider label="Luz" value={selected.light} min={-60} max={60} onChange={(light) => updateVariation(selected.id, { light })} />
          </div>

          <button
            onClick={() => setShowMapping(!showMapping)}
            className="mt-2 flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300"
          >
            Troca de cores fina ({Object.keys(selected.mapping).length})
            <span>{showMapping ? '−' : '+'}</span>
          </button>

          {showMapping && (
            <div className="mt-1.5 flex max-h-44 flex-col gap-1 overflow-y-auto thin-scroll">
              {topColors.length === 0 && (
                <p className="text-[11px] text-slate-500">Desenhe algo no frame atual para remapear cores.</p>
              )}
              {topColors.map(({ color: c, count }) => {
                const key = normalizeHex(c);
                const target = selected.mapping[key] ?? key;
                return (
                  <div key={key} className="flex items-center gap-2 rounded-md bg-ink-900/80 px-2 py-1">
                    <span className="h-5 w-5 shrink-0 rounded border border-ink-600" style={{ background: key }} title={key} />
                    <span className="font-mono text-[10px] text-slate-500">×{count}</span>
                    <span className="text-slate-600">→</span>
                    <label className="relative h-5 w-8 shrink-0 cursor-pointer overflow-hidden rounded border border-ink-600" style={{ background: target }}>
                      <input
                        type="color"
                        value={normalizeHex(target)}
                        onChange={(e) => setMapping(key, e.target.value)}
                        className="absolute inset-0 h-full w-full opacity-0"
                      />
                    </label>
                    <span className="truncate font-mono text-[10px] text-slate-400">{target}</span>
                    {selected.mapping[key] && (
                      <button onClick={() => setMapping(key, key)} title="Reverter" className="ml-auto text-slate-500 hover:text-slate-200">
                        <RotateCcw size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-ink-700 p-3 text-center text-[11px] text-slate-500">
          Selecione uma variação para ajustar matiz e trocas de cor.
        </p>
      )}
    </div>
  );
}
