import { Crosshair, Grid3X3, Layers3, Move3d, SlidersHorizontal } from 'lucide-react';
import { normalizeProjection, PROJECTION_OPTIONS } from '../../lib/spatial';
import { useStudio } from '../../store/studio';

export function ProjectionPanel() {
  const project = useStudio((s) => s.project);
  const showGrid = useStudio((s) => s.showGrid);
  const toggleGrid = useStudio((s) => s.toggleGrid);
  const setProjection = useStudio((s) => s.setProjection);
  if (!project) return null;

  const projection = normalizeProjection(project.projection);
  const option = PROJECTION_OPTIONS.find((item) => item.id === projection.id) ?? PROJECTION_OPTIONS[0];

  return (
    <section className="panel projection-panel" aria-label="Guia espacial">
      <div className="panel-title projection-title">
        <span><Layers3 size={14} /> Espaço</span>
        <span className="panel-kicker">GUIA 2D</span>
      </div>
      <div className="projection-notice">
        <Move3d size={13} />
        <span>Projeção é um contrato de guia. O raster permanece 2D e inteiro.</span>
      </div>
      <label className="field-label" htmlFor="projection-select">Projeção</label>
      <select
        id="projection-select"
        className="select-control"
        value={projection.id}
        onChange={(event) => setProjection({ id: event.target.value as typeof projection.id })}
      >
        {PROJECTION_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <div className="projection-description">{option.description}</div>
      <div className="projection-fields">
        <label>
          <span>Tile W</span>
          <input type="number" min={1} max={64} value={projection.tileWidth}
            onChange={(event) => setProjection({ tileWidth: Number(event.target.value) })} />
        </label>
        <label>
          <span>Tile H</span>
          <input type="number" min={1} max={64} value={projection.tileHeight}
            onChange={(event) => setProjection({ tileHeight: Number(event.target.value) })} />
        </label>
      </div>
      <div className="projection-actions">
        <button className={`tool-mini ${showGrid ? 'active' : ''}`} onClick={toggleGrid} title="Mostrar ou ocultar guia">
          <Grid3X3 size={13} /> Grade
        </button>
        <button className={`tool-mini ${projection.snap ? 'active' : ''}`} onClick={() => setProjection({ snap: !projection.snap })} title="Alternar snap da guia">
          <Crosshair size={13} /> Snap
        </button>
      </div>
      <div className="projection-meta"><SlidersHorizontal size={11} /> {projection.id === '2d' ? 'Sem transformação espacial' : 'Somente overlay / preview'}</div>
    </section>
  );
}
