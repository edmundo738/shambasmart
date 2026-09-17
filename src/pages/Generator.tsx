import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Check, Dices, Download, Gem, Ghost, Minus, PersonStanding, Plus, Send, Sword, Zap,
} from 'lucide-react';
import {
  SPRITE_KINDS, SpriteKind, defaultActionsFor, generateSprite, subtypesFor,
} from '../lib/procgen/sprites';
import { STYLE_PRESETS, StyleId } from '../lib/procgen/styles';
import { randomSeed } from '../lib/procgen/rng';
import { AnimatedSprite } from '../components/SpriteView';
import { useProjects } from '../store/projects';
import { buildPackZip, downloadBlob, slugify } from '../lib/exporters';
import { Animation, Frame, ProjectData, uid } from '../types';
import { createLayer, makeFrame } from '../lib/layers';
import { fpsToMs } from '../lib/timeline';

const KIND_ICONS: Record<SpriteKind, React.ReactNode> = {
  personagem: <PersonStanding size={22} />,
  criatura: <Ghost size={22} />,
  arma: <Sword size={22} />,
  item: <Gem size={22} />,
  efeito: <Zap size={22} />,
};

const VALID_KINDS: SpriteKind[] = ['personagem', 'criatura', 'arma', 'item', 'efeito'];
const VALID_STYLES: StyleId[] = ['fantasia', 'scifi', 'fofo', 'sombrio', 'retro', 'natureza'];
const VALID_SIZES = [24, 32, 48, 64];

export default function Generator() {
  const navigate = useNavigate();
  const saveProject = useProjects((s) => s.saveProject);
  const [params] = useSearchParams();

  const [kind, setKind] = useState<SpriteKind>(() => {
    const k = params.get('kind') as SpriteKind;
    return VALID_KINDS.includes(k) ? k : 'personagem';
  });
  const [seed, setSeed] = useState(() => {
    const n = Number(params.get('seed'));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : randomSeed();
  });
  const [subtype, setSubtype] = useState(() => params.get('subtype') || 'random');
  const [style, setStyle] = useState<StyleId>(() => {
    const s = params.get('style') as StyleId;
    return VALID_STYLES.includes(s) ? s : 'fantasia';
  });
  const [size, setSize] = useState(() => {
    const n = Number(params.get('size'));
    return VALID_SIZES.includes(n) ? n : 32;
  });
  const [outline, setOutline] = useState(true);
  const [hue, setHue] = useState(0);
  const [energy, setEnergy] = useState(0.6);
  const [selectedAction, setSelectedAction] = useState(0);
  const [seedDraft, setSeedDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [actions, setActions] = useState(() =>
    Object.fromEntries(defaultActionsFor('personagem').map((d) => [d.id, { on: true, frames: d.frames }])),
  );

  const subtypes = subtypesFor(kind);
  const actionDefs = useMemo(() => defaultActionsFor(kind), [kind]);

  // ao trocar de categoria, reseta subtipo/ações
  const pickKind = (k: SpriteKind) => {
    setKind(k);
    setSubtype('random');
    setSelectedAction(0);
    setActions(Object.fromEntries(defaultActionsFor(k).map((d) => [d.id, { on: true, frames: d.frames }])));
    setNotice('');
  };

  const enabledActions = actionDefs.filter((d) => actions[d.id]?.on);

  const sprite = useMemo(() => generateSprite({
    kind, seed, style, size, outline, subtype, hueShift: hue,
    actions: enabledActions.map((d) => ({ id: d.id, frames: actions[d.id].frames })),
    energy, amplitude: energy, bounce: energy,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [kind, seed, style, size, outline, subtype, hue, energy, JSON.stringify(actions)]);

  const stage = sprite.actions[Math.min(selectedAction, Math.max(0, sprite.actions.length - 1))];

  // exemplos animados dos cartões de categoria (seeds fixas)
  const examples = useMemo(() => {
    return SPRITE_KINDS.map((k, i) => {
      const s = generateSprite({
        kind: k.id, seed: 101000 + i * 1313, style: 'fantasia', size: 32, outline: true,
        subtype: 'random', hueShift: 0,
        actions: [{ id: defaultActionsFor(k.id)[0].id, frames: 4 }],
        energy: 0.6, amplitude: 0.6, bounce: 0.6,
      });
      return { kind: k.id, frames: s.actions[0]?.frames ?? [] };
    });
  }, []);

  const buildProjectData = (): ProjectData => {
    const layer = createLayer('Camada 1');
    const frames: Record<string, Frame> = {};
    const anims: Animation[] = sprite.actions.map((a) => {
      const frameIds = a.frames.map((cells) => {
        const f: Frame = makeFrame(layer.id, cells, fpsToMs(a.fps));
        frames[f.id] = f;
        return f.id;
      });
      return { id: uid('an'), name: a.label, fps: a.fps, frameIds };
    });
    const now = Date.now();
    return {
      id: uid('pj'), name: sprite.name, width: size, height: size,
      layers: [layer],
      frames, animations: anims,
      variations: [{ id: uid('vr'), name: 'sombra', mapping: {}, hue: 0, sat: -10, light: -22 }],
      palette: sprite.palette, recipe: sprite.recipe, createdAt: now, updatedAt: now,
    };
  };

  const createInStudio = () => {
    if (!sprite.actions.length) {
      setNotice('Ative ao menos uma ação para criar o sprite.');
      return;
    }
    const data = buildProjectData();
    saveProject(data);
    navigate(`/studio/${data.id}`);
  };

  const downloadZip = async () => {
    if (!sprite.actions.length) {
      setNotice('Ative ao menos uma ação para baixar o pack.');
      return;
    }
    setBusy(true);
    try {
      const data = buildProjectData();
      saveProject(data);
      const blob = await buildPackZip(data, {
        engine: 'generic', scale: 4, columns: 0, padding: 0,
        includeJson: true, includeGif: true, includeSheet: true, includeSequence: false,
        background: '',
      });
      downloadBlob(blob, `${slugify(data.name)}_pack.zip`);
      setNotice(`Pack "${data.name}" baixado! O projeto também foi salvo em Meus projetos.`);
    } finally {
      setBusy(false);
    }
  };

  const applySeed = () => {
    const n = Number(seedDraft);
    if (Number.isFinite(n) && n > 0) {
      setSeed(Math.floor(n));
      setSeedDraft('');
    }
  };

  const maxFrames = kind === 'efeito' ? 10 : 8;

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
            <h1 className="font-display text-base font-bold text-white">Gerador de Sprites</h1>
            <p className="text-[11px] text-slate-500">Crie assets para seu jogo sem saber desenhar</p>
          </div>
          <div className="flex-1" />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="font-mono text-xs text-slate-500">seed</span>
            <span className="rounded-lg bg-ink-800 px-3 py-1.5 font-mono text-sm font-bold text-pixel-400">{seed}</span>
            <button onClick={() => setSeed(randomSeed())} title="Gerar outro" className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-forge-500 to-pixel-500 text-ink-950 hover:brightness-110">
              <Dices size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 pt-6 lg:grid-cols-[300px_1fr_280px]">
        {/* PASSO 1 e 2: o quê + estilo */}
        <aside className="flex flex-col gap-4 rounded-2xl border border-ink-700 bg-ink-900/50 p-4">
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              1 · O que você quer criar?
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {SPRITE_KINDS.map((k) => {
                const ex = examples.find((e) => e.kind === k.id);
                const active = kind === k.id;
                return (
                  <button
                    key={k.id}
                    onClick={() => pickKind(k.id)}
                    className={`flex items-center gap-3 rounded-xl border p-2 text-left transition-all ${
                      active ? 'border-pixel-500 bg-pixel-500/10 shadow-glow-green' : 'border-ink-700 hover:border-ink-500'
                    }`}
                  >
                    <span className="checker flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-700">
                      {ex && ex.frames.length > 0 ? (
                        <AnimatedSprite frames={ex.frames.map((cells, i) => ({ id: `ex${i}`, cells }))} width={32} height={32} fps={6} scale={1} className="h-10 w-10 object-contain" />
                      ) : (
                        <span className="text-slate-500">{KIND_ICONS[k.id]}</span>
                      )}
                    </span>
                    <span>
                      <span className={`block text-sm font-bold ${active ? 'text-pixel-400' : 'text-white'}`}>{k.label}</span>
                      <span className="block text-[11px] text-slate-500">{k.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">2 · Tipo</span>
            <div className="flex flex-wrap gap-1.5">
              {subtypes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubtype(s.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${subtype === s.id ? 'border-forge-500 bg-forge-500/10 text-forge-300' : 'border-ink-700 text-slate-300 hover:border-ink-600'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">3 · Estilo visual</span>
            <div className="grid grid-cols-2 gap-1.5">
              {STYLE_PRESETS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  title={s.desc}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold ${style === s.id ? 'border-ember-400 bg-ember-500/10 text-ember-400' : 'border-ink-700 text-slate-300 hover:border-ink-600'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-xs text-slate-400">
            <span className="mb-1 flex justify-between"><span>Mudar cor (matiz)</span><span className="font-mono text-slate-200">{hue}°</span></span>
            <input type="range" min={-180} max={180} value={hue} onChange={(e) => setHue(Number(e.target.value))} className="h-1 w-full cursor-pointer" />
          </label>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tamanho</span>
              <div className="flex gap-1">
                {VALID_SIZES.map((s) => (
                  <button key={s} onClick={() => setSize(s)} className={`flex-1 rounded-lg px-1 py-1.5 font-mono text-xs ${size === s ? 'bg-forge-500/20 text-forge-300 ring-1 ring-forge-500' : 'bg-ink-950 text-slate-400'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-forge-500" />
              Contorno
            </label>
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
              <span className="text-slate-500">{KIND_ICONS[kind]}</span>
              <span className="font-display text-sm font-bold text-white">{sprite.name}</span>
              <span className="rounded-full bg-ink-800 px-2 py-0.5 font-mono text-[10px] text-forge-300">seed {seed}</span>
              <div className="flex-1" />
              {stage && <span className="font-mono text-[11px] text-slate-400">{stage.label} · {stage.fps}fps</span>}
            </div>
            <div className="checker flex items-center justify-center py-8">
              {stage ? (
                <AnimatedSprite
                  frames={stage.frames.map((cells, i) => ({ id: `st${i}`, cells }))}
                  width={size} height={size} fps={stage.fps} scale={size >= 48 ? 4 : 6}
                />
              ) : (
                <p className="py-8 text-sm text-slate-500">Ative ao menos uma ação ao lado →</p>
              )}
            </div>
            {sprite.actions.length > 1 && (
              <div className="flex gap-2 overflow-x-auto thin-scroll border-t border-ink-700 bg-ink-900/80 p-3">
                {sprite.actions.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAction(i)}
                    className={`flex shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 ${i === selectedAction ? 'border-forge-500 bg-forge-500/10' : 'border-ink-700 hover:border-ink-600'}`}
                  >
                    <span className="checker flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg">
                      <AnimatedSprite frames={a.frames.map((cells, k) => ({ id: `tb${k}`, cells }))} width={size} height={size} fps={a.fps} scale={1} className="h-12 w-12 object-contain" />
                    </span>
                    <span className={`text-xs font-bold ${i === selectedAction ? 'text-forge-300' : 'text-slate-200'}`}>{a.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-ink-700 bg-ink-900/50 p-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Características</h3>
            <div className="flex flex-wrap gap-1.5">
              {sprite.traits.map((t) => (
                <span key={t} className="rounded-full border border-ink-700 bg-ink-950 px-2.5 py-1 text-[11px] text-slate-300">{t}</span>
              ))}
            </div>
            <div className="mt-3 flex gap-1">
              {sprite.palette.map((c) => (
                <span key={c} title={c} className="h-6 flex-1 rounded-md border border-ink-700" style={{ background: c }} />
              ))}
            </div>
          </div>
        </section>

        {/* PASSO 4: ações + criar */}
        <aside className="flex flex-col gap-3 rounded-2xl border border-ink-700 bg-ink-900/50 p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            4 · Animações do pack ({enabledActions.length})
          </h3>
          <div className="flex flex-col gap-1.5">
            {actionDefs.map((d) => {
              const cfg = actions[d.id];
              if (!cfg) return null;
              return (
                <div key={d.id} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${cfg.on ? 'border-ink-700 bg-ink-950' : 'border-ink-800 opacity-50'}`}>
                  <button
                    onClick={() => setActions({ ...actions, [d.id]: { ...cfg, on: !cfg.on } })}
                    className={`flex h-5 w-5 items-center justify-center rounded border ${cfg.on ? 'border-pixel-500 bg-pixel-500 text-ink-950' : 'border-ink-600'}`}
                  >
                    {cfg.on && <Check size={12} />}
                  </button>
                  <span className="flex-1 text-xs font-semibold text-slate-200">
                    {d.label}
                    <span className="ml-1.5 font-mono text-[10px] font-normal text-slate-500">{d.fps}fps</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setActions({ ...actions, [d.id]: { ...cfg, frames: Math.max(2, cfg.frames - 1) } })} className="rounded p-1 text-slate-500 hover:bg-ink-800 hover:text-white"><Minus size={12} /></button>
                    <span className="w-5 text-center font-mono text-[11px] text-slate-300">{cfg.frames}f</span>
                    <button onClick={() => setActions({ ...actions, [d.id]: { ...cfg, frames: Math.min(maxFrames, cfg.frames + 1) } })} className="rounded p-1 text-slate-500 hover:bg-ink-800 hover:text-white"><Plus size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {(kind === 'personagem' || kind === 'criatura') && (
            <label className="block text-xs text-slate-400">
              <span className="mb-1 flex justify-between"><span>Vivacidade do movimento</span><span className="font-mono text-slate-200">{Math.round(energy * 100)}%</span></span>
              <input type="range" min={10} max={100} value={Math.round(energy * 100)} onChange={(e) => setEnergy(Number(e.target.value) / 100)} className="h-1 w-full cursor-pointer" />
            </label>
          )}

          {notice && <div className="rounded-xl border border-pixel-500/40 bg-pixel-500/10 p-3 text-xs text-pixel-400">{notice}</div>}

          <button onClick={createInStudio} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-forge-500 to-pixel-500 px-4 py-3.5 text-sm font-bold text-ink-950 hover:brightness-110">
            <Send size={16} /> Criar no Studio
          </button>
          <button
            onClick={downloadZip}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl border border-ink-600 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-pixel-500 disabled:opacity-50"
          >
            <Download size={16} /> {busy ? 'Gerando ZIP…' : 'Baixar pack ZIP'}
          </button>
          <p className="text-[11px] leading-relaxed text-slate-500">
            O ZIP vem com spritesheets, metadados e prévias animadas — pronto para colocar no seu jogo, sem desenhar nada.
          </p>
        </aside>
      </main>
    </div>
  );
}
