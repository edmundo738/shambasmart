import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, ScrollText } from 'lucide-react';
import { useStudio } from '../../store/studio';

/** Mostra a receita reproduzível do asset (seed + parâmetros) */
export default function RecipeCard() {
  const project = useStudio((s) => s.project);
  const [copied, setCopied] = useState(false);

  if (!project?.recipe) return null;
  const r = project.recipe;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(r, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  };

  const genLink = r.kind === 'manual'
    ? null
    : `/gerador?kind=${encodeURIComponent(r.kind)}&seed=${r.seed}&subtype=${encodeURIComponent(r.subtype)}&style=${encodeURIComponent(r.style)}&size=${r.size}`;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ink-700 bg-ink-900/80 p-3">
      <div className="flex items-center gap-2">
        <ScrollText size={15} className="text-ember-400" />
        <span className="text-sm font-semibold text-slate-200">Receita do asset</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">{r.kind}</span>
        <span className="rounded-full bg-ink-800 px-2 py-0.5 font-mono text-[11px] text-pixel-400">seed {r.seed}</span>
        <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] text-slate-400">{r.subtype} · {r.style} · {r.size}px</span>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">
        Mesma seed + mesmos parâmetros = mesmo asset, sempre. Guarde a receita para regenerar.
      </p>
      <div className="flex gap-2">
        <button onClick={copy} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-600 px-2 py-1.5 text-xs font-semibold text-slate-300 hover:border-ink-500 hover:text-white">
          {copied ? <Check size={13} className="text-pixel-400" /> : <Copy size={13} />}
          {copied ? 'Copiado!' : 'Copiar JSON'}
        </button>
        {genLink && (
          <Link to={genLink} className="flex flex-1 items-center justify-center rounded-lg border border-pixel-500/50 bg-pixel-500/10 px-2 py-1.5 text-xs font-bold text-pixel-400 hover:bg-pixel-500/20">
            Abrir no Gerador
          </Link>
        )}
      </div>
    </div>
  );
}
