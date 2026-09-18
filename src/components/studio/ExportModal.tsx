import { useMemo, useState } from 'react';
import { Box, Download, FileJson, Film, Image, Images, Loader2, X } from 'lucide-react';
import { useStudio } from '../../store/studio';
import { EnginePreset } from '../../types';
import { buildPackZip, downloadBlob, downloadSingleFrame, slugify } from '../../lib/exporters';

const ENGINES: Array<{ id: EnginePreset; label: string }> = [
  { id: 'generic', label: 'Genérico (JSON)' },
  { id: 'phaser', label: 'Phaser 3 (atlas)' },
  { id: 'godot', label: 'Godot (AtlasTexture)' },
  { id: 'unity', label: 'Unity (Multiple)' },
  { id: 'gamemaker', label: 'GameMaker (strip)' },
];

export default function ExportModal({ onClose }: { onClose: () => void }) {
  const project = useStudio((s) => s.project);
  const currentAnimationId = useStudio((s) => s.currentAnimationId);
  const currentFrameId = useStudio((s) => s.currentFrameId);
  const variationId = useStudio((s) => s.variationId);

  const [scope, setScope] = useState<'animation' | 'pack'>('pack');
  const [engine, setEngine] = useState<EnginePreset>('godot');
  const [scale, setScale] = useState(4);
  const [columns, setColumns] = useState(0);
  const [padding, setPadding] = useState(0);
  const [includeSheet, setIncludeSheet] = useState(true);
  const [includeJson, setIncludeJson] = useState(true);
  const [includeGif, setIncludeGif] = useState(true);
  const [includeSequence, setIncludeSequence] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const stats = useMemo(() => {
    if (!project) return { anims: 0, combos: 0, files: 0 };
    const anims = scope === 'pack'
      ? project.animations
      : project.animations.filter((a) => a.id === currentAnimationId);
    const combos = anims.length * (project.variations.length + 1);
    let files = 2; // pack.json + leiame
    if (includeSheet) files += combos;
    if (includeSheet && includeJson) files += combos;
    if (includeGif) files += combos;
    if (includeSequence) {
      files += anims.reduce((acc, a) => acc + a.frameIds.length, 0) * (project.variations.length + 1);
    }
    return { anims: anims.length, combos, files };
  }, [project, scope, currentAnimationId, includeSheet, includeJson, includeGif, includeSequence]);

  if (!project) return null;
  const anim = project.animations.find((a) => a.id === currentAnimationId) ?? project.animations[0];

  const doExport = async () => {
    setBusy(true);
    setDone('');
    try {
      const blob = await buildPackZip(project, {
        engine, scale, columns, padding,
        includeJson: includeSheet && includeJson,
        includeGif, includeSheet, includeSequence,
        background: '',
        onlyAnimationId: scope === 'pack' ? null : anim?.id ?? null,
      });
      downloadBlob(blob, `${slugify(project.name)}_${scope === 'pack' ? 'pack' : slugify(anim?.name ?? 'anim')}.zip`);
      setDone(`Pack exportado com ${stats.files} arquivos. Boas-vindas à sua engine!`);
    } catch (e) {
      setDone('Algo falhou na exportação. Tente reduzir a escala.');
    } finally {
      setBusy(false);
    }
  };

  const doSingle = async () => {
    if (!currentFrameId) return;
    const v = project.variations.find((x) => x.id === variationId) ?? null;
    await downloadSingleFrame(project, currentFrameId, v, scale, '');
    setDone('Frame atual baixado como PNG.');
  };

  const check = 'h-4 w-4 rounded border-ink-600 bg-ink-800 text-forge-500 focus:ring-forge-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto thin-scroll cabinet rounded-2xl bg-ink-900 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-forge-500 to-pixel-500 text-ink-950">
            <Box size={20} />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Exportar asset pack</h2>
            <p className="text-xs text-slate-400">Sequenciado e pronto para sua engine</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-ink-800 hover:text-white"><X size={18} /></button>
        </div>

        {/* escopo */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setScope('animation')}
            className={`rounded-xl border p-3 text-left ${scope === 'animation' ? 'border-forge-500 bg-forge-500/10' : 'border-ink-700 hover:border-ink-600'}`}
          >
            <Film size={18} className="mb-1 text-forge-400" />
            <div className="text-sm font-semibold text-white">Ação atual</div>
            <div className="font-mono text-[11px] text-slate-400">{anim?.name} × todas variações</div>
          </button>
          <button
            onClick={() => setScope('pack')}
            className={`rounded-xl border p-3 text-left ${scope === 'pack' ? 'border-pixel-500 bg-pixel-500/10' : 'border-ink-700 hover:border-ink-600'}`}
          >
            <Box size={18} className="mb-1 text-pixel-400" />
            <div className="text-sm font-semibold text-white">Pack completo</div>
            <div className="font-mono text-[11px] text-slate-400">{project.animations.length} ações × {project.variations.length + 1} variações</div>
          </button>
        </div>

        {/* formatos */}
        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-700 p-2.5 hover:border-ink-600">
            <input type="checkbox" checked={includeSheet} onChange={(e) => setIncludeSheet(e.target.checked)} className={check} />
            <Image size={16} className="text-forge-400" /> Spritesheets PNG
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-700 p-2.5 hover:border-ink-600">
            <input type="checkbox" checked={includeJson} onChange={(e) => setIncludeJson(e.target.checked)} className={check} />
            <FileJson size={16} className="text-ember-400" /> Metadados JSON
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-700 p-2.5 hover:border-ink-600">
            <input type="checkbox" checked={includeGif} onChange={(e) => setIncludeGif(e.target.checked)} className={check} />
            <Film size={16} className="text-pixel-400" /> Prévias GIF
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-700 p-2.5 hover:border-ink-600">
            <input type="checkbox" checked={includeSequence} onChange={(e) => setIncludeSequence(e.target.checked)} className={check} />
            <Images size={16} className="text-fuchsia-400" /> Frames avulsos
          </label>
        </div>

        {/* engine + escala */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="block text-xs text-slate-400">
            Engine alvo
            <select value={engine} onChange={(e) => setEngine(e.target.value as EnginePreset)} className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-2 py-2 text-sm text-slate-100">
              {ENGINES.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Escala de exportação: <strong className="font-mono text-slate-100">{scale}x</strong> ({project.width * scale}×{project.height * scale}px)
            <input type="range" min={1} max={8} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="mt-2 h-1 w-full cursor-pointer" />
          </label>
          <label className="block text-xs text-slate-400">
            Colunas da sheet (0 = linha única)
            <input type="number" min={0} max={16} value={columns} onChange={(e) => setColumns(Math.max(0, Number(e.target.value)))} className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-2 py-2 text-sm text-slate-100" />
          </label>
          <label className="block text-xs text-slate-400">
            Espaçamento (px)
            <input type="number" min={0} max={16} value={padding} onChange={(e) => setPadding(Math.max(0, Number(e.target.value)))} className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-2 py-2 text-sm text-slate-100" />
          </label>
        </div>

        <div className="mb-4 rounded-lg bg-ink-950 p-3 font-mono text-[11px] leading-relaxed text-slate-400">
          <div><span className="text-slate-500">nomenclatura →</span> <span className="text-pixel-400">andar__gelo.png</span> <span className="text-slate-500">·</span> <span className="text-forge-300">andar__gelo_f00.png</span></div>
          <div><span className="text-slate-500">total →</span> {stats.anims} ações · {stats.combos} combinações · ~{stats.files} arquivos</div>
        </div>

        {done && <div className="mb-4 rounded-lg border border-pixel-500/40 bg-pixel-500/10 p-2.5 text-xs text-pixel-400">{done}</div>}

        <div className="flex gap-2">
          <button
            onClick={doSingle}
            className="rounded-xl border border-ink-600 px-4 py-3 text-sm font-semibold text-slate-300 hover:border-ink-500 hover:text-white"
          >
            Frame PNG
          </button>
          <button
            onClick={doExport}
            disabled={busy || (!includeSheet && !includeGif && !includeSequence)}
            className="flex flex-1 items-center justify-center gap-2 btn-arcade pixel-corners-sm bg-gradient-to-r from-forge-500 to-pixel-500 px-4 py-3 text-sm font-bold text-ink-950 hover:brightness-110 disabled:opacity-40"
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
            {busy ? 'Forjando pack...' : `Baixar ZIP (${stats.files} arq.)`}
          </button>
        </div>
      </div>
    </div>
  );
}
