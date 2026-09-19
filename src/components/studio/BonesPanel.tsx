import { useState } from 'react';
import { Bone, ClipboardCopy, ClipboardPaste, Eye, EyeOff, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useStudio } from '../../store/studio';
import { boneDepth, boneDescendants } from '../../lib/fk';

/** Editor do esqueleto-guia (rig FK + poses por frame). */
export default function BonesPanel() {
  const project = useStudio((s) => s.project);
  const currentFrameId = useStudio((s) => s.currentFrameId);
  const showRig = useStudio((s) => s.showRig);
  const toggleShowRig = useStudio((s) => s.toggleShowRig);
  const selectedBoneId = useStudio((s) => s.selectedBoneId);
  const selectBone = useStudio((s) => s.selectBone);
  const addBone = useStudio((s) => s.addBone);
  const renameBone = useStudio((s) => s.renameBone);
  const deleteBone = useStudio((s) => s.deleteBone);
  const setBoneParent = useStudio((s) => s.setBoneParent);
  const setBoneRest = useStudio((s) => s.setBoneRest);
  const poseBone = useStudio((s) => s.poseBone);
  const poseToRest = useStudio((s) => s.poseToRest);
  const resetPose = useStudio((s) => s.resetPose);
  const copyPose = useStudio((s) => s.copyPose);
  const pastePose = useStudio((s) => s.pastePose);
  const poseClipboard = useStudio((s) => s.poseClipboard);
  const [editing, setEditing] = useState<string | null>(null);

  if (!project) return null;
  const rig = project.rig ?? [];
  const frame = currentFrameId ? project.frames[currentFrameId] : undefined;
  const pose = frame?.pose ?? {};
  const posedCount = Object.keys(pose).length;
  const selected = rig.find((b) => b.id === selectedBoneId) ?? null;
  const eff = selected ? pose[selected.id] ?? { x: selected.x, y: selected.y, rotation: selected.rotation } : null;
  const forbidden = selected ? new Set([selected.id, ...boneDescendants(rig, selected.id)]) : new Set<string>();

  const num = (value: number, commit: (v: number) => void, title: string, step = 1, w = 'w-14') => (
    <input
      key={`${currentFrameId}:${selected?.id}:${title}:${value}`}
      type="number"
      step={step}
      defaultValue={Math.round(value * 100) / 100}
      title={title}
      onBlur={(e) => commit(Number(e.target.value))}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={`${w} rounded-md border border-ink-700 bg-ink-950 px-1.5 py-0.5 font-mono text-[11px] text-slate-200`}
    />
  );

  return (
    <div className="pf-shadow flex flex-col gap-2 rounded-xl border border-ink-700 bg-ink-900/90 p-3">
      <div className="flex items-center gap-2">
        <Bone size={15} className="text-cyan-300" />
        <span className="text-sm font-semibold text-slate-200">Esqueleto</span>
        <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
          {rig.length} {rig.length === 1 ? 'osso' : 'ossos'}
        </span>
        <div className="flex-1" />
        <button
          onClick={toggleShowRig}
          title={showRig ? 'Ocultar no canvas' : 'Mostrar no canvas'}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-ink-700 hover:text-slate-100"
        >
          {showRig ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        <button
          onClick={() => addBone(null)}
          title="Adicionar raiz no centro"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-ink-700 hover:text-cyan-300"
        >
          <Plus size={15} />
        </button>
      </div>

      {rig.length === 0 && (
        <p className="rounded-lg border border-dashed border-ink-700 px-2 py-1.5 text-center text-[11px] leading-relaxed text-slate-500">
          Sem ossos. Ferramenta <strong className="text-slate-300">N</strong>: clique no canvas p/ criar a raiz,
          depois clique com um osso selecionado p/ encadear filhos.
        </p>
      )}

      {rig.length > 0 && (
        <div className="flex items-center gap-1">
          <button
            onClick={copyPose}
            title="Copiar pose do frame atual"
            className="flex h-6 flex-1 items-center justify-center gap-1 rounded-md border border-ink-700 text-[11px] text-slate-400 hover:bg-ink-800 hover:text-slate-200"
          >
            <ClipboardCopy size={12} /> Copiar pose
          </button>
          <button
            onClick={pastePose}
            disabled={!poseClipboard}
            title="Colar pose neste frame"
            className="flex h-6 flex-1 items-center justify-center gap-1 rounded-md border border-ink-700 text-[11px] text-slate-400 hover:bg-ink-800 hover:text-slate-200 disabled:opacity-30"
          >
            <ClipboardPaste size={12} /> Colar
          </button>
          <button
            onClick={resetPose}
            disabled={!posedCount}
            title="Voltar este frame ao repouso"
            className="flex h-6 flex-1 items-center justify-center gap-1 rounded-md border border-ink-700 text-[11px] text-slate-400 hover:bg-ink-800 hover:text-slate-200 disabled:opacity-30"
          >
            <RotateCcw size={12} /> Repouso{posedCount ? ` (${posedCount})` : ''}
          </button>
        </div>
      )}

      {rig.map((b) => {
        const active = b.id === selectedBoneId;
        const posed = !!pose[b.id];
        return (
          <div
            key={b.id}
            onClick={() => selectBone(b.id)}
            style={{ marginLeft: boneDepth(rig, b.id) * 12 }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 ${
              active ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-ink-800 bg-ink-950/60 hover:border-ink-600'
            }`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-[2px] ${posed ? 'bg-amber-300' : 'bg-cyan-400'}`} title={posed ? 'Com pose neste frame' : 'Em repouso'} />
            {editing === b.id ? (
              <input
                autoFocus
                defaultValue={b.name}
                maxLength={24}
                onBlur={(e) => { renameBone(b.id, e.target.value || b.name); setEditing(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 flex-1 rounded border border-ink-600 bg-ink-900 px-1 py-0.5 text-xs text-slate-200"
              />
            ) : (
              <button
                onDoubleClick={() => setEditing(b.id)}
                title="Duplo clique renomeia"
                className="min-w-0 flex-1 truncate text-left text-xs text-slate-300"
              >
                {b.name}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); deleteBone(b.id); }}
              title="Excluir osso (filhos sobem)"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-ink-800 hover:text-red-400"
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}

      {selected && eff && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-cyan-900 bg-ink-950/60 p-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Pai</span>
            <select
              value={selected.parentId ?? ''}
              onChange={(e) => setBoneParent(selected.id, e.target.value || null)}
              className="min-w-0 flex-1 rounded-md border border-ink-700 bg-ink-900 px-1.5 py-1 text-xs text-slate-200"
            >
              <option value="">— raiz —</option>
              {rig.filter((b) => !forbidden.has(b.id)).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500" title="Comprimento (repouso)">comp</span>
            {num(selected.length, (v) => setBoneRest(selected.id, { length: v }), 'Comprimento do osso', 1, 'w-12')}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-10 shrink-0 text-[11px] text-slate-500" title="Repouso (vale p/ todos os frames)">Rep.</span>
            {num(selected.x, (v) => setBoneRest(selected.id, { x: v }), 'X de repouso')}
            {num(selected.y, (v) => setBoneRest(selected.id, { y: v }), 'Y de repouso')}
            {num(selected.rotation, (v) => setBoneRest(selected.id, { rotation: v }), 'Rotação de repouso (°)')}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-10 shrink-0 text-[11px] text-amber-200/80" title="Pose neste frame">Pose</span>
            {num(eff.x, (v) => poseBone(selected.id, { x: v }), 'X na pose')}
            {num(eff.y, (v) => poseBone(selected.id, { y: v }), 'Y na pose')}
            {num(eff.rotation, (v) => poseBone(selected.id, { rotation: v }), 'Rotação na pose (°)')}
            <button
              onClick={() => poseToRest(selected.id)}
              title="Copiar pose atual p/ o repouso"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-ink-700 text-slate-400 hover:bg-ink-800 hover:text-cyan-300"
            >
              <Upload size={12} />
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-slate-500">
        Rig e poses saem no pack.json do export. Arraste a junta p/ mover, o corpo p/ girar.
      </p>
    </div>
  );
}
