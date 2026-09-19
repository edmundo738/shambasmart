import { useEffect, useMemo, useRef, useState } from 'react';
import { Command, Grid3X3, Layers, Maximize2, Moon, Paintbrush, Redo2, Search, Sun, Undo2, X } from 'lucide-react';
import { useStudio } from '../../store/studio';

type CommandPaletteProps = { onClose: () => void };

type StudioCommand = {
  id: string;
  label: string;
  detail: string;
  keys?: string;
  icon: typeof Command;
  run: () => void;
};

export default function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const setTool = useStudio((s) => s.setTool);
  const toggleGrid = useStudio((s) => s.toggleGrid);
  const toggleOnion = useStudio((s) => s.toggleOnion);
  const togglePixelPerfect = useStudio((s) => s.togglePixelPerfect);
  const requestViewport = useStudio((s) => s.requestViewport);
  const addLayer = useStudio((s) => s.addLayer);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const commands: StudioCommand[] = [
    { id: 'brush', label: 'Usar pincel', detail: 'Ferramentas · pintura', keys: 'B', icon: Paintbrush, run: () => setTool('brush') },
    { id: 'select', label: 'Selecionar objeto', detail: 'Ferramentas · seleção', keys: 'M', icon: Command, run: () => setTool('select') },
    { id: 'grid', label: 'Alternar guia e grade', detail: 'Canvas · overlay', keys: 'G', icon: Grid3X3, run: toggleGrid },
    { id: 'fit', label: 'Enquadrar canvas', detail: 'Viewport · ajustar', keys: 'F', icon: Maximize2, run: () => requestViewport('fit') },
    { id: 'onion', label: 'Alternar onion skin', detail: 'Animação · referência', icon: Moon, run: toggleOnion },
    { id: 'pixel', label: 'Alternar pixel-perfect', detail: 'Canvas · raster', keys: 'P', icon: Sun, run: togglePixelPerfect },
    { id: 'layer', label: 'Adicionar camada raster', detail: 'Asset · layers', icon: Layers, run: () => addLayer() },
    { id: 'undo', label: 'Desfazer', detail: 'Histórico', keys: '⌘Z', icon: Undo2, run: undo },
    { id: 'redo', label: 'Refazer', detail: 'Histórico', keys: '⇧⌘Z', icon: Redo2, run: redo },
  ];
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? commands.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(term)) : commands;
  }, [query, commands.length]); // comandos são determinísticos; ações têm referências estáveis no Zustand

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="command-search">
          <Search size={16} />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="O que você quer fazer?" aria-label="Buscar comando" />
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="command-hint"><Command size={12} /> Comandos determinísticos do Studio <span>Esc fecha</span></div>
        <div className="command-list">
          {filtered.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className="command-item" onClick={() => { item.run(); onClose(); }}>
              <span className="command-icon"><Icon size={15} /></span>
              <span className="command-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
              {item.keys && <kbd>{item.keys}</kbd>}
            </button>;
          })}
          {!filtered.length && <div className="command-empty">Nenhum comando encontrado.</div>}
        </div>
      </section>
    </div>
  );
}
