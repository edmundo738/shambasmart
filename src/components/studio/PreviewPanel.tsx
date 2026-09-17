import { useState } from 'react';
import { Eye, Pause, Play } from 'lucide-react';
import { useStudio } from '../../store/studio';
import { ORIGINAL_VARIATION_ID } from '../../types';
import { AnimatedSprite, SpriteCanvas } from '../SpriteView';
import { celStack, frameItem } from '../../lib/layers';

const BACKGROUNDS = [
  { id: 'checker', label: 'Transparente', css: '', checker: true },
  { id: 'dark', label: 'Escuro', css: '#10131d', checker: false },
  { id: 'light', label: 'Claro', css: '#e8eefc', checker: false },
  { id: 'green', label: 'Chroma', css: '#00ff88', checker: false },
];

export default function PreviewPanel() {
  const project = useStudio((s) => s.project);
  const currentAnimationId = useStudio((s) => s.currentAnimationId);
  const variationId = useStudio((s) => s.variationId);
  const playing = useStudio((s) => s.playing);
  const setPlaying = useStudio((s) => s.setPlaying);
  const [bg, setBg] = useState(BACKGROUNDS[0]);
  const [zoom, setZoom] = useState(6);

  if (!project) return null;
  const anim = project.animations.find((a) => a.id === currentAnimationId) ?? project.animations[0];
  if (!anim) return null;
  const frames = anim.frameIds.map((fid) => project.frames[fid]).filter(Boolean).map((f) => frameItem(project.layers, f));
  const variation = variationId === ORIGINAL_VARIATION_ID
    ? null
    : project.variations.find((v) => v.id === variationId) ?? null;
  const variationName = variation?.name ?? 'original';
  const combos = project.animations.length * (project.variations.length + 1);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ink-700 bg-ink-900/80 p-3">
      <div className="flex items-center gap-2">
        <Eye size={15} className="text-pixel-400" />
        <span className="text-sm font-semibold text-slate-200">Prévia do jogo</span>
        <div className="flex-1" />
        <button onClick={() => setPlaying(!playing)} title={playing ? 'Pausar' : 'Reproduzir'} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-ink-700 hover:text-slate-100">
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>

      <div className={`flex items-center justify-center overflow-hidden rounded-lg border border-ink-700 ${bg.checker ? 'checker' : ''}`} style={bg.checker ? {} : { background: bg.css }}>
        <AnimatedSprite
          frames={frames}
          width={project.width}
          height={project.height}
          fps={anim.fps}
          scale={zoom}
          variation={variation}
          playing={playing}
          className="m-3"
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-forge-300">{anim.name} × {variationName}</span>
        <span className="text-slate-500">{project.width}×{project.height}px</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              title={b.label}
              onClick={() => setBg(b)}
              className={`h-6 w-6 rounded-md border-2 ${bg.id === b.id ? 'border-white' : 'border-ink-700'} ${b.checker ? 'checker' : ''}`}
              style={b.checker ? {} : { background: b.css }}
            />
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-[11px] text-slate-500">Zoom</span>
        {[4, 6, 8].map((z) => (
          <button
            key={z}
            onClick={() => setZoom(z)}
            className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${zoom === z ? 'bg-forge-500/20 text-forge-300' : 'text-slate-500 hover:text-slate-200'}`}
          >
            {z}x
          </button>
        ))}
      </div>

      {/* tira de frames com a variação aplicada */}
      <div className="thin-scroll flex gap-1 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-1.5">
        {frames.map((f, i) => (
          <div key={f.id} className="shrink-0 text-center">
            <SpriteCanvas layers={f.layers} width={project.width} height={project.height} scale={1} variation={variation} className="checker h-10 w-10 rounded border border-ink-700 object-contain" />
            <div className="mt-0.5 font-mono text-[9px] text-slate-500">f{String(i).padStart(2, '0')}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-gradient-to-r from-forge-500/15 to-pixel-500/15 p-2 text-center text-[11px] text-slate-300">
        Pack atual: <strong className="text-white">{project.animations.length} ações × {project.variations.length + 1} variações = {combos} spritesheets</strong>
      </div>
    </div>
  );
}
