import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, Dices, Dna, FlaskConical, Minus, Plus, Send, Shuffle,
} from 'lucide-react';
import { BODY_TYPES, BodyType, MOODS, MoodId } from '../lib/procgen/bodies';
import { ACTION_DEFS, generateActionFrames, generateCharacter, poseSingle } from '../lib/procgen/generator';
import { ActionId, MotionParams } from '../lib/procgen/motions';
import { randomSeed } from '../lib/procgen/rng';
import { AnimatedSprite, SpriteCanvas, SpriteFrameItem } from '../components/SpriteView';
import { useStudio } from '../store/studio';
import { useProjects } from '../store/projects';
import { Animation, Frame, ProjectData, uid } from '../types';
import { createLayer, makeFrame } from '../lib/layers';
import { fpsToMs } from '../lib/timeline';

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs text-slate-400">
      <span className="mb-1 flex justify-between"><span>{label}</span><span className="font-mono text-slate-200">{Math.round(value * 100)}%</span></span>
      <input type="range" min={0} max={100} value={Math.round(value * 100)} onChange={(e) => onChange(Number(e.target.value) / 100)} className="h-1 w-full cursor-pointer" />
    </label>
  );
}

export default function Lab() {
  const navigate = useNavigate();
  const saveProject = useProjects((s) => s.saveProject);
  const studioProject = useStudio((s) => s.project);

  const [seed, setSeed] = useState(() => randomSeed());
  const [seedDraft, setSeedDraft] = useState('');
  const [body, setBody] = useState<BodyType | 'random'>('random');
  const [mood, setMood] = useState<MoodId>('random');
  const [size, setSize] = useState(32);
  const [outline, setOutline] = useState(true);
  const [energy, setEnergy] = useState(0.55);
  const [amplitude, setAmplitude] = useState(0.55);
  const [bounce, setBounce] = useState(0.55);
  const [selectedAction, setSelectedAction] = useState<ActionId>('walk');
  const [galleryBase, setGalleryBase] = useState(() => randomSeed());
  const [notice, setNotice] = useState('');
  const [actions, setActions] = useState<Record<ActionId, { on: boolean; frames: number }>>(() =>
    Object.fromEntries(ACTION_DEFS.map((d) => [d.id, { on: true, frames: d.frames }])) as Record<ActionId, { on: boolean; frames: number }>,
  );

  const params: MotionParams = useMemo(
    () => ({ energy, amplitude, bounce }),
    [energy, amplitude, bounce],
  );

  const spec = useMemo(
    () => generateCharacter({ seed, body, mood, size, outline }),
    [seed, body, mood, size, outline],
  );

  const stageFrames: SpriteFrameItem[] = useMemo(() => {
    const cells = generateActionFrames(spec, selectedAction, actions[selectedAction].frames, params);
    return cells.map((c, i) => ({ id: `stage_${i}`, cells: c }));
  }, [spec, selectedAction, actions, params]);

  const tabFrames = useMemo(() => {
    const out = {} as Record<ActionId, SpriteFrameItem[]>;
    for (const d of ACTION_DEFS) {
      const cells = generateActionFrames(spec, d.id, Math.min(4, actions[d.id].frames), params);
      out[d.id] = cells.map((c, i) => ({ id: `tab_${d.id}_${i}`, cells: c }));
    }
    return out;
  }, [spec, actions, params]);

  const candidates = useMemo(() => {
    return [0, 1, 2, 3, 4, 5].map((i) => {
      const s = generateCharacter({ seed: galleryBase + i * 7919, body, mood, size, outline });
      return { spec: s, thumb: poseSingle(s, 'idle', 0, params) };
    });
  }, [galleryBase, body, mood, size, outline, params]);

  const stageDef = ACTION_DEFS.find((d) => d.id === selectedAction)!;
  const enabledActions = ACTION_DEFS.filter((d) => actions[d.id].on);

  const buildProjectData = (): ProjectData => {
    const layer = createLayer('Camada 1');
    const frames: Record<string, Frame> = {};
    const anims: Animation[] = enabledActions.map((def) => {
      const cells = generateActionFrames(spec, def.id, actions[def.id].frames, params);
      const frameIds = cells.map((c) => {
        const f: Frame = makeFrame(layer.id, c, fpsToMs(def.fps));
        frames[f.id] = f;
        return f.id;
      });
      return { id: uid('an'), name: def.label, fps: def.fps, frameIds };
    });
    const now = Date.now();
    return {
      id: uid('pj'),
      name: spec.name,
      width: size,
      height: size,
      layers: [layer],
      frames,
      animations: anims,
      variations: [
        { id: uid('vr'), name: 'sombra', mapping: {}, hue: 0, sat: -10, light: -22 },
        { id: uid('vr'), name: 'forja', mapping: {}, hue: 120, sat: 15, light: 0 },
      ],
      palette: spec.swatches,
      createdAt: now,
      updatedAt: now,
    };
  };

  const createProject = () => {
    if (!enabledActions.length) {
      setNotice('Ative ao menos uma ação para gerar o pack.');
      return;
    }
    const data = buildProjectData();
    saveProject(data);
    useStudio.getState().markSaved();
    navigate(`/studio/${data.id}`);
  };

  const attachToCurrent = () => {
    const cur = useStudio.getState().project;
    if (!cur || !enabledActions.length) return;
    if (cur.width !== size || cur.height !== size) {
      setNotice(`O projeto atual é ${cur.width}×${cur.height}px — gere em ${cur.width}px para anexar, ou crie um novo projeto.`);
      return;
    }
    const frames: Record<string, Frame> = { ...cur.frames };
    const lid = cur.layers[0]?.id ?? 'ly_base';
    const existing = new Set(cur.animations.map((a) => a.name));
    const anims: Animation[] = enabledActions.map((def) => {
      const cells = generateActionFrames(spec, def.id, actions[def.id].frames, params);
      const frameIds = cells.map((c) => {
        const f: Frame = makeFrame(lid, c, fpsToMs(def.fps));
        frames[f.id] = f;
        return f.id;
      });
      let name = `${def.label}_${spec.name.split(' ').pop()!.toLowerCase()}`;
      let k = 2;
      while (existing.has(name)) name = `${def.label}_${k++}`;
      existing.add(name);
      return { id: uid('an'), name, fps: def.fps, frameIds };
    });
    const merged: ProjectData = { ...cur, frames, animations: [...cur.animations, ...anims], updatedAt: Date.now() };
    useStudio.getState().loadProject(merged);
    saveProject(merged);
    useStudio.getState().markSaved();
    navigate(`/studio/${merged.id}`);
  };

  const applySeed = () => {
    const n = Number(seedDraft);
    if (Number.isFinite(n) && n > 0) {
      setSeed(Math.floor(n));
      setSeedDraft('');
    }
  };

  return (
    <div className="min-h-full bg-ink-950">
      <header className="sticky top-0 z-20 border-b border-ink-700 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link to="/projetos" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-ink-800 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <span className="grid h-8 w-8 grid-cols-2 overflow-hidden rounded-lg border border-ink-600">
            <span className="bg-pixel-500" /><span className="bg-forge-500" />
            <span className="bg-ember-500" /><span className="bg-[#ff4d6d]" />
          </span>
          <div>
            <h1 className="flex items-center gap-2 font-display text-base font-bold text-white">
              <FlaskConical size={16} className="text-pixel-400" /> Laboratório Procedural
            </h1>
            <p className="text-[11px] text-slate-500">Personagens + movimentos gerados por algoritmo, com seed</p>
          </div>
          <div className="flex-1" />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="font-mono text-xs text-slate-500">seed</span>
            <span className="rounded-lg bg-ink-800 px-3 py-1.5 font-mono text-sm font-bold text-pixel-400">{seed}</span>
            <button onClick={() => setSeed(randomSeed())} title="Novo personagem aleatório" className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-forge-500 to-pixel-500 text-ink-950 hover:brightness-110">
              <Dices size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 pt-6 lg:grid-cols-[280px_1fr_300px]">
        {/* controles */}
        <aside className="flex flex-col gap-4 rounded-2xl border border-ink-700 bg-ink-900/50 p-4">
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Corpo</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[{ id: 'random' as const, label: 'Aleatório' }, ...BODY_TYPES].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBody(b.id)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold ${body === b.id ? 'border-pixel-500 bg-pixel-500/10 text-pixel-400' : 'border-ink-700 text-slate-300 hover:border-ink-600'}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Paleta</span>
            <div className="grid grid-cols-2 gap-1.5">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMood(m.id)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold ${mood === m.id ? 'border-forge-500 bg-forge-500/10 text-forge-300' : 'border-ink-700 text-slate-300 hover:border-ink-600'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Slider label="Energia do movimento" value={energy} onChange={setEnergy} />
            <Slider label="Amplitude" value={amplitude} onChange={setAmplitude} />
            <Slider label="Quique (squash)" value={bounce} onChange={setBounce} />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Canvas</span>
              <div className="flex gap-1">
                {[24, 32, 48].map((s) => (
                  <button key={s} onClick={() => setSize(s)} className={`flex-1 rounded-lg px-2 py-1.5 font-mono text-xs ${size === s ? 'bg-forge-500/20 text-forge-300 ring-1 ring-forge-500' : 'bg-ink-950 text-slate-400'}`}>
                    {s}²
                  </button>
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-forge-500" />
              Contorno
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Ações do pack ({enabledActions.length})
            </span>
            <div className="flex flex-col gap-1.5">
              {ACTION_DEFS.map((d) => {
                const cfg = actions[d.id];
                return (
                  <div key={d.id} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${cfg.on ? 'border-ink-700 bg-ink-950' : 'border-ink-800 opacity-50'}`}>
                    <button
                      onClick={() => setActions({ ...actions, [d.id]: { ...cfg, on: !cfg.on } })}
                      className={`flex h-5 w-5 items-center justify-center rounded border ${cfg.on ? 'border-pixel-500 bg-pixel-500 text-ink-950' : 'border-ink-600'}`}
                    >
                      {cfg.on && <Check size={12} />}
                    </button>
                    <button onClick={() => setSelectedAction(d.id)} className="flex-1 text-left text-xs font-semibold text-slate-200">
                      {d.label}
                      <span className="ml-1.5 font-mono text-[10px] font-normal text-slate-500">{d.fps}fps</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setActions({ ...actions, [d.id]: { ...cfg, frames: Math.max(2, cfg.frames - 1) } })} className="rounded p-1 text-slate-500 hover:bg-ink-800 hover:text-white"><Minus size={12} /></button>
                      <span className="w-5 text-center font-mono text-[11px] text-slate-300">{cfg.frames}f</span>
                      <button onClick={() => setActions({ ...actions, [d.id]: { ...cfg, frames: Math.min(8, cfg.frames + 1) } })} className="rounded p-1 text-slate-500 hover:bg-ink-800 hover:text-white"><Plus size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={seedDraft}
              onChange={(e) => setSeedDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySeed()}
              placeholder="Ir para seed…"
              inputMode="numeric"
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-600"
            />
            <button onClick={applySeed} className="rounded-lg border border-ink-600 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-forge-500">Ir</button>
          </div>
        </aside>

        {/* palco */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/50">
            <div className="flex items-center gap-2 border-b border-ink-700 bg-ink-900/80 px-4 py-2.5">
              <Dna size={15} className="text-pixel-400" />
              <span className="font-display text-sm font-bold text-white">{spec.name}</span>
              <span className="rounded-full bg-ink-800 px-2 py-0.5 font-mono text-[10px] text-forge-300">
                {BODY_TYPES.find((b) => b.id === spec.body)?.label} · seed {spec.seed}
              </span>
              <div className="flex-1" />
              <span className="font-mono text-[11px] text-slate-400">{stageDef.label} · {stageDef.fps}fps · {actions[selectedAction].frames}f</span>
            </div>
            <div className="checker flex items-center justify-center py-8">
              <AnimatedSprite frames={stageFrames} width={size} height={size} fps={stageDef.fps} scale={size >= 48 ? 4 : 6} />
            </div>
            {/* ações */}
            <div className="grid grid-cols-3 gap-2 border-t border-ink-700 bg-ink-900/80 p-3 sm:grid-cols-6">
              {ACTION_DEFS.map((d) => (
                <ActionTab
                  key={d.id}
                  active={selectedAction === d.id}
                  enabled={actions[d.id].on}
                  label={d.label}
                  fps={d.fps}
                  frames={tabFrames[d.id]}
                  size={size}
                  onClick={() => setSelectedAction(d.id)}
                />
              ))}
            </div>
          </div>

          {/* DNA */}
          <div className="rounded-2xl border border-ink-700 bg-ink-900/50 p-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">DNA do personagem</h3>
            <div className="flex flex-wrap gap-1.5">
              {spec.traits.map((t) => (
                <span key={t} className="rounded-full border border-ink-700 bg-ink-950 px-2.5 py-1 text-[11px] text-slate-300">{t}</span>
              ))}
            </div>
            <div className="mt-3 flex gap-1">
              {spec.swatches.map((c) => (
                <span key={c} title={c} className="h-6 flex-1 rounded-md border border-ink-700" style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* enviar */}
          {notice && <div className="rounded-xl border border-ember-400/40 bg-ember-500/10 p-3 text-xs text-ember-400">{notice}</div>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={createProject} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-forge-500 to-pixel-500 px-6 py-3.5 text-sm font-bold text-ink-950 hover:brightness-110">
              <Send size={16} /> Enviar para o Studio ({enabledActions.length} ações)
            </button>
            <button
              onClick={attachToCurrent}
              disabled={!studioProject}
              title={studioProject ? `Anexar a "${studioProject.name}"` : 'Abra um projeto no Studio primeiro'}
              className="flex items-center justify-center gap-2 rounded-xl border border-ink-600 px-6 py-3.5 text-sm font-semibold text-slate-200 hover:border-pixel-500 disabled:opacity-40"
            >
              <Plus size={16} /> {studioProject ? `Anexar a "${studioProject.name.slice(0, 18)}"` : 'Nenhum projeto aberto'}
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-500">
            O pack chega ao Studio como frames editáveis — redesenhe, forje variações e exporte o ZIP.
          </p>
        </section>

        {/* candidatos */}
        <aside className="flex flex-col gap-3 rounded-2xl border border-ink-700 bg-ink-900/50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-white"><Shuffle size={14} className="text-ember-400" /> Candidatos</h3>
            <button onClick={() => setGalleryBase(randomSeed())} title="Embaralhar candidatos" className="rounded-lg border border-ink-700 p-1.5 text-slate-400 hover:text-white">
              <Dices size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 xl:grid-cols-2">
            {candidates.map(({ spec: c, thumb }) => (
              <button
                key={c.seed}
                onClick={() => { setSeed(c.seed); setNotice(''); }}
                className={`overflow-hidden rounded-xl border text-left transition-all hover:-translate-y-0.5 ${c.seed === seed ? 'border-pixel-500 shadow-glow-green' : 'border-ink-700 hover:border-ink-500'}`}
              >
                <span className="checker flex h-24 items-center justify-center">
                  <SpriteCanvas cells={thumb} width={size} height={size} scale={3} />
                </span>
                <span className="block bg-ink-950 px-2 py-1.5">
                  <span className="block truncate text-[11px] font-bold text-slate-200">{c.name}</span>
                  <span className="block font-mono text-[10px] text-slate-500">{BODY_TYPES.find((b) => b.id === c.body)?.label} · {c.seed}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Mesma seed = mesmo personagem, sempre. Anote a seed dos favoritos para regenerar depois.
          </p>
        </aside>
      </main>
    </div>
  );
}

/** Aba de ação com mini-prévia animada */
function ActionTab({ active, enabled, label, fps, frames, size, onClick }: {
  active: boolean; enabled: boolean; label: string; fps: number; frames: SpriteFrameItem[]; size: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors ${active ? 'border-forge-500 bg-forge-500/10 shadow-glow' : 'border-ink-700 hover:border-ink-600'} ${enabled ? '' : 'opacity-40'}`}
    >
      <span className="checker flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg">
        <AnimatedSprite frames={frames} width={size} height={size} fps={fps} scale={1} className="h-12 w-12 object-contain" />
      </span>
      <span className={`text-xs font-bold ${active ? 'text-forge-300' : 'text-slate-200'}`}>{label}</span>
    </button>
  );
}
