import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Boxes, Dices, Download, Layers, Search, Shuffle, Sparkles, X,
} from 'lucide-react';
import { AnimatedSprite } from '../components/SpriteView';
import { frameItem } from '../lib/layers';
import { useProjects } from '../store/projects';
import {
  BUNDLES, BundleDef, buildBundleZip, generateBundle, spriteToProjectData,
} from '../lib/procgen/bundles';
import { VARIANT_SET, variantName, variantRecipe } from '../lib/procgen/variants';
import {
  GeneratedSprite, SPRITE_KINDS, SpriteKind, generateSprite,
} from '../lib/procgen/sprites';
import { STYLE_PRESETS, StyleId } from '../lib/procgen/styles';
import { randomSeed } from '../lib/procgen/rng';
import { buildPackZip, downloadBlob, slugify } from '../lib/exporters';
import { AssetRecipe, ProjectData } from '../types';

function kindLabel(kind: string): string {
  return SPRITE_KINDS.find((k) => k.id === kind)?.label ?? 'Manual';
}

function spriteFromRecipe(r: AssetRecipe): GeneratedSprite {
  return generateSprite({
    kind: r.kind as SpriteKind,
    seed: r.seed,
    style: r.style as StyleId,
    size: r.size,
    outline: r.outline,
    subtype: r.subtype,
    hueShift: r.hueShift,
    actions: r.actions,
    energy: r.motion?.energy ?? 0.6,
    amplitude: r.motion?.amplitude ?? 0.6,
    bounce: r.motion?.bounce ?? 0.6,
  });
}

/* ------------------------- mini prévia animada ------------------------- */

function AnimThumb({ project, box = 'h-16 w-16' }: { project: ProjectData; box?: string }) {
  const anim = project.animations[0];
  const frames = anim ? anim.frameIds.map((fid) => project.frames[fid]).filter(Boolean).map((f) => frameItem(project.layers, f)) : [];
  if (!anim || !frames.length) return <span className="text-xs text-slate-600">vazio</span>;
  return (
    <AnimatedSprite
      frames={frames} width={project.width} height={project.height}
      fps={anim.fps} scale={1} className={`${box} object-contain`}
    />
  );
}

function SpriteThumb({ sprite, box = 'h-16 w-16' }: { sprite: GeneratedSprite; box?: string }) {
  const a = sprite.actions[0];
  if (!a) return <span className="text-xs text-slate-600">vazio</span>;
  return (
    <AnimatedSprite
      frames={a.frames.map((cells, i) => ({ id: `t${i}`, cells }))}
      width={sprite.size} height={sprite.size} fps={a.fps} scale={1}
      className={`${box} object-contain`}
    />
  );
}

/* ------------------------- cartão de pack completo ------------------------- */

function BundleCard({ def, onSaved }: { def: BundleDef; onSaved: (n: number) => void }) {
  const saveProject = useProjects((s) => s.saveProject);
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(() => randomSeed());
  const [size, setSize] = useState(32);
  const [sprites, setSprites] = useState<GeneratedSprite[] | null>(null);
  const [busy, setBusy] = useState(false);

  const styleLabel = STYLE_PRESETS.find((s) => s.id === def.style)?.label ?? def.style;

  const run = (s: number, sz: number) => {
    setBusy(true);
    setTimeout(() => {
      setSprites(generateBundle(s, def, sz, true));
      setBusy(false);
    }, 30);
  };

  useEffect(() => {
    if (open && !sprites && !busy) run(seed, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const saveAll = async (withZip: boolean) => {
    if (!sprites) return;
    setBusy(true);
    try {
      const tag = `${def.name} · seed ${seed}`;
      const projects = sprites.map((s) => spriteToProjectData(s, size, tag));
      projects.forEach(saveProject);
      onSaved(projects.length);
      if (withZip) {
        const blob = await buildBundleZip(projects, `${def.name} (seed ${seed})`);
        downloadBlob(blob, `${slugify(def.name)}-pack-completo.zip`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pf-shadow overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/50">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-forge-500/30 to-pixel-500/30 text-forge-300">
          <Boxes size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-white">{def.name}</span>
          <span className="block truncate text-[11px] text-slate-500">{def.desc}</span>
        </span>
        <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[10px] font-bold text-forge-300">{def.items.length} assets</span>
        <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[10px] text-slate-400">{styleLabel}</span>
      </button>

      {open && (
        <div className="border-t border-ink-700 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500">seed</span>
            <span className="rounded-lg bg-ink-950 px-2.5 py-1 font-mono text-xs font-bold text-pixel-400">{seed}</span>
            <button onClick={() => { const s = randomSeed(); setSeed(s); run(s, size); }} className="flex items-center gap-1 rounded-lg border border-ink-600 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:border-forge-500">
              <Dices size={13} /> Nova seed
            </button>
            <div className="flex gap-1">
              {[24, 32, 48, 64].map((s) => (
                <button key={s} onClick={() => { setSize(s); run(seed, s); }} className={`rounded-lg px-2 py-1 font-mono text-xs ${size === s ? 'bg-forge-500/20 text-forge-300 ring-1 ring-forge-500' : 'bg-ink-950 text-slate-500'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {busy || !sprites ? (
            <p className="py-8 text-center text-sm text-slate-500">Montando o pack…</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {sprites.map((s) => (
                  <div key={s.name} className="flex flex-col items-center gap-1 rounded-xl border border-ink-700 bg-ink-950 p-2">
                    <span className="checker flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg">
                      <SpriteThumb sprite={s} />
                    </span>
                    <span className="w-full truncate text-center text-[11px] font-semibold text-slate-300">{s.name}</span>
                    <span className="font-mono text-[10px] text-slate-600">{s.actions.length} anim</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => saveAll(false)} disabled={busy} className="flex-1 btn-arcade pixel-corners-sm bg-gradient-to-r from-forge-500 to-pixel-500 px-4 py-2.5 text-sm font-bold text-ink-950 hover:brightness-110 disabled:opacity-50">
                  Salvar os {sprites.length} na Biblioteca
                </button>
                <button onClick={() => saveAll(true)} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-ink-600 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-pixel-500 disabled:opacity-50">
                  <Download size={15} /> Salvar + ZIP
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------- modal de variações ------------------------- */

function VariantModal({ project, onClose, onSaved }: {
  project: ProjectData; onClose: () => void; onSaved: (n: number) => void;
}) {
  const saveProject = useProjects((s) => s.saveProject);
  const [variantId, setVariantId] = useState(VARIANT_SET[0].id);
  const base = project.recipe!;
  const def = VARIANT_SET.find((v) => v.id === variantId)!;

  const preview = useMemo(
    () => spriteFromRecipe(variantRecipe(base, variantId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project.id, variantId],
  );

  const tag = `Variações de ${project.name}`;
  const saveOne = () => {
    const p = spriteToProjectData(preview, base.size, tag);
    p.name = variantName(project.name, variantId);
    saveProject(p);
    onSaved(1);
    onClose();
  };
  const saveAll = () => {
    for (const v of VARIANT_SET) {
      const s = spriteFromRecipe(variantRecipe(base, v.id));
      const p = spriteToProjectData(s, base.size, tag);
      p.name = variantName(project.name, v.id);
      saveProject(p);
    }
    onSaved(VARIANT_SET.length);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-ink-600 bg-ink-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-3">
          <Layers size={16} className="text-forge-300" />
          <span className="text-sm font-bold text-white">Variações de “{project.name}”</span>
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-800 hover:text-white"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-ink-700 bg-ink-950 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Original</span>
            <span className="checker flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg">
              <AnimThumb project={project} box="h-20 w-20" />
            </span>
            <span className="font-mono text-[10px] text-slate-600">seed {base.seed}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-forge-500/60 bg-forge-500/5 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-forge-300">{def.label}</span>
            <span className="checker flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg">
              <SpriteThumb sprite={preview} box="h-20 w-20" />
            </span>
            <span className="text-center text-[10px] text-slate-500">{def.desc}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 px-4">
          {VARIANT_SET.map((v) => (
            <button
              key={v.id}
              onClick={() => setVariantId(v.id)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${variantId === v.id ? 'border-forge-500 bg-forge-500/10 text-forge-300' : 'border-ink-700 text-slate-300 hover:border-ink-600'}`}
            >
              <span className="h-3 w-3 rounded-full border border-black/40" style={{ background: v.swatch }} />
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 p-4">
          <button onClick={saveOne} className="flex-1 btn-arcade pixel-corners-sm bg-gradient-to-r from-forge-500 to-pixel-500 px-4 py-2.5 text-sm font-bold text-ink-950 hover:brightness-110">
            Salvar “{def.label}”
          </button>
          <button onClick={saveAll} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-ink-600 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-pixel-500">
            <Shuffle size={15} /> Salvar as {VARIANT_SET.length}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- página --------------------------------- */

type Filter = 'all' | SpriteKind | 'manual';
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'personagem', label: 'Personagens' },
  { id: 'criatura', label: 'Criaturas' },
  { id: 'arma', label: 'Armas' },
  { id: 'item', label: 'Itens' },
  { id: 'efeito', label: 'Efeitos' },
  { id: 'manual', label: 'Manuais' },
];

export default function Library() {
  const metas = useProjects((s) => s.metas);
  const refresh = useProjects((s) => s.refresh);
  const loadProjectFull = useProjects((s) => s.loadProjectFull);
  useEffect(() => { refresh(); }, [refresh]);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [variantOf, setVariantOf] = useState<ProjectData | null>(null);
  const [notice, setNotice] = useState('');
  const [zipBusy, setZipBusy] = useState<string | null>(null);

  const fulls = useMemo(
    () => metas.map((m) => loadProjectFull(m.id)).filter((p): p is ProjectData => !!p),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metas],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: fulls.length };
    for (const p of fulls) {
      const k = p.recipe?.kind ?? 'manual';
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [fulls]);

  const filtered = fulls.filter((p) => {
    const kind = p.recipe?.kind ?? 'manual';
    if (filter !== 'all' && kind !== filter) return false;
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const downloadOne = async (p: ProjectData) => {
    setZipBusy(p.id);
    try {
      const blob = await buildPackZip(p, {
        engine: 'generic', scale: 4, columns: 0, padding: 0,
        includeJson: true, includeGif: true, includeSheet: true, includeSequence: false,
        background: '',
      });
      downloadBlob(blob, `${slugify(p.name)}_pack.zip`);
    } finally {
      setZipBusy(null);
    }
  };

  return (
    <div className="min-h-full bg-ink-950">
      <header className="sticky top-0 z-20 border-b border-ink-700 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link to="/projetos" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-ink-800 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-display text-base font-bold text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">Biblioteca de Assets</h1>
            <p className="text-[11px] text-slate-500">Packs prontos, seus sprites e variações em 1 clique</p>
          </div>
          <div className="flex-1" />
          <Link to="/gerador" className="btn-arcade pixel-corners-sm flex items-center gap-1.5 bg-gradient-to-r from-forge-500 to-pixel-500 px-3 py-2 text-xs font-bold text-ink-950">
            <Sparkles size={14} /> Novo no Gerador
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-20 pt-6">
        {notice && (
          <div className="rounded-xl border border-pixel-500/40 bg-pixel-500/10 p-3 text-sm text-pixel-400">{notice}</div>
        )}

        {/* packs completos */}
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Pack completo de jogo — 1 clique, família coerente
          </h2>
          <div className="flex flex-col gap-3">
            {BUNDLES.map((def: BundleDef) => (
              <BundleCard key={def.id} def={def} onSaved={(n) => { refresh(); setNotice(`${n} assets salvos na Biblioteca! Role para ver.`); }} />
            ))}
          </div>
        </section>

        {/* meus assets */}
        <section>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Meus assets ({filtered.length})
            </h2>
            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome…"
                className="w-full rounded-lg border border-ink-700 bg-ink-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-600"
              />
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${filter === f.id ? 'border-pixel-500 bg-pixel-500/10 text-pixel-400' : 'border-ink-700 text-slate-400 hover:border-ink-600'}`}
              >
                {f.label} <span className="font-mono opacity-60">{counts[f.id] ?? 0}</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-600 py-12">
              <p className="text-sm text-slate-500">
                {fulls.length === 0 ? 'Nenhum asset ainda — monte um pack acima ou crie no Gerador.' : 'Nada aqui com esse filtro.'}
              </p>
              <Link to="/gerador" className="flex items-center gap-1.5 btn-arcade pixel-corners-sm bg-gradient-to-r from-forge-500 to-pixel-500 px-4 py-2.5 text-sm font-bold text-ink-950 hover:brightness-110">
                <Sparkles size={15} /> Abrir Gerador
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((p) => (
                <div key={p.id} className="pf-shadow overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/50">
                  <div className="checker flex h-32 items-center justify-center">
                    <AnimThumb project={p} box="h-24 w-24" />
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-sm font-bold text-white" title={p.name}>{p.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded-full bg-ink-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">{kindLabel(p.recipe?.kind ?? 'manual')}</span>
                      {p.recipe && <span className="rounded-full bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-pixel-400">seed {p.recipe.seed}</span>}
                      {p.bundle && <span className="max-w-full truncate rounded-full bg-ink-800 px-1.5 py-0.5 text-[10px] text-forge-300" title={p.bundle}>{p.bundle}</span>}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <Link to={`/studio/${p.id}`} className="flex-1 rounded-lg bg-ink-800 px-2 py-1.5 text-center text-xs font-bold text-slate-200 hover:bg-ink-700 hover:text-white">
                        Abrir
                      </Link>
                      <button onClick={() => downloadOne(p)} disabled={zipBusy === p.id} title="Baixar pack ZIP" className="flex items-center justify-center rounded-lg border border-ink-700 px-2.5 text-slate-300 hover:border-pixel-500 disabled:opacity-50">
                        <Download size={14} />
                      </button>
                      {p.recipe && (
                        <button onClick={() => setVariantOf(p)} title="Criar variações" className="flex items-center justify-center gap-1 rounded-lg border border-forge-500/50 bg-forge-500/10 px-2.5 text-xs font-bold text-forge-300 hover:bg-forge-500/20">
                          <Layers size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {variantOf && (
        <VariantModal project={variantOf} onClose={() => setVariantOf(null)} onSaved={(n) => { refresh(); setNotice(`${n} ${n === 1 ? 'variação salva' : 'variações salvas'} na Biblioteca!`); }} />
      )}
    </div>
  );
}
