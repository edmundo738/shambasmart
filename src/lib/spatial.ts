import { DEFAULT_PROJECTION, ProjectionId, ProjectionSettings } from '../types';

export interface WorldPoint {
  x: number;
  y: number;
  z?: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface GridSegment {
  a: ScreenPoint;
  b: ScreenPoint;
}

export const PROJECTION_OPTIONS: Array<{ id: ProjectionId; label: string; description: string }> = [
  { id: '2d', label: '2D livre', description: 'Canvas normal, sem guia espacial' },
  { id: 'side', label: 'Lateral', description: 'Eixo X horizontal, altura em Y' },
  { id: 'top-down', label: 'Vista de cima', description: 'Grade ortogonal de mapa' },
  { id: 'three-quarter', label: '3/4', description: 'Frente, lateral e topo sugeridos' },
  { id: 'isometric', label: 'Isométrica', description: 'Eixos diagonais com relação 2:1' },
  { id: 'dimetric', label: 'Dimétrica', description: 'Inclinação configurável por tile' },
  { id: 'oblique', label: 'Oblíqua', description: 'Profundidade inclinada' },
];

export function normalizeProjection(value?: Partial<ProjectionSettings> | null): ProjectionSettings {
  const id = value?.id && PROJECTION_OPTIONS.some((option) => option.id === value.id)
    ? value.id : DEFAULT_PROJECTION.id;
  return {
    id,
    tileWidth: Number.isFinite(value?.tileWidth) ? Math.max(1, Math.min(64, Math.round(value!.tileWidth!))) : DEFAULT_PROJECTION.tileWidth,
    tileHeight: Number.isFinite(value?.tileHeight) ? Math.max(1, Math.min(64, Math.round(value!.tileHeight!))) : DEFAULT_PROJECTION.tileHeight,
    snap: value?.snap !== false,
    originX: Number.isFinite(value?.originX) ? Math.round(value!.originX!) : DEFAULT_PROJECTION.originX,
    originY: Number.isFinite(value?.originY) ? Math.round(value!.originY!) : DEFAULT_PROJECTION.originY,
  };
}

/** Converte coordenadas lógicas em posição de tela sem anti-aliasing. */
export function worldToScreen(point: WorldPoint, projection?: Partial<ProjectionSettings>): ScreenPoint {
  const p = normalizeProjection(projection);
  const z = point.z ?? 0;
  const tw = p.tileWidth;
  const th = p.tileHeight;
  let x = point.x;
  let y = point.y - z;
  switch (p.id) {
    case 'top-down':
      x = point.x;
      y = point.y - z;
      break;
    case 'three-quarter':
      x = (point.x - point.y) * tw / 2;
      y = (point.x + point.y) * th / 2 - z;
      break;
    case 'isometric':
      x = (point.x - point.y) * tw / 2;
      y = (point.x + point.y) * th / 2 - z;
      break;
    case 'dimetric':
      x = (point.x - point.y) * tw / 2;
      y = (point.x + point.y) * th / 2 - z;
      break;
    case 'oblique':
      x = point.x + point.y * tw / 2;
      y = point.y * th / 2 - z;
      break;
    case '2d':
    case 'side':
    default:
      x = point.x;
      y = point.y - z;
      break;
  }
  return { x: x + p.originX, y: y + p.originY };
}

/** Inversão aproximada para interações de guia; z é informado pelo chamador. */
export function screenToWorld(point: ScreenPoint, projection?: Partial<ProjectionSettings>, z = 0): WorldPoint {
  const p = normalizeProjection(projection);
  const sx = point.x - p.originX;
  const sy = point.y - p.originY + z;
  if (p.id === 'isometric' || p.id === 'three-quarter' || p.id === 'dimetric') {
    const halfW = Math.max(0.5, p.tileWidth / 2);
    const halfH = Math.max(0.5, p.tileHeight / 2);
    return { x: (sx / halfW + sy / halfH) / 2, y: (sy / halfH - sx / halfW) / 2, z };
  }
  if (p.id === 'oblique') return { x: sx - sy, y: sy / Math.max(0.5, p.tileHeight / 2), z };
  return { x: sx, y: sy, z };
}

export function snapWorld(point: WorldPoint, projection?: Partial<ProjectionSettings>): WorldPoint {
  const p = normalizeProjection(projection);
  if (!p.snap) return point;
  return { x: Math.round(point.x), y: Math.round(point.y), z: Math.round(point.z ?? 0) };
}

/** Grade espacial pequena e determinística para desenhar sobre o canvas pixel. */
export function projectionGrid(width: number, height: number, projection?: Partial<ProjectionSettings>): GridSegment[] {
  const p = normalizeProjection(projection);
  if (p.id === '2d') return [];
  const segments: GridSegment[] = [];
  const limit = Math.max(width, height);
  const origin = { x: width / 2 + p.originX, y: Math.max(0, p.originY) };
  const addLine = (a: WorldPoint, b: WorldPoint) => {
    const pa = worldToScreen(a, { ...p, originX: origin.x, originY: origin.y });
    const pb = worldToScreen(b, { ...p, originX: origin.x, originY: origin.y });
    segments.push({ a: pa, b: pb });
  };
  if (p.id === 'side') {
    for (let x = -limit; x <= limit; x += 4) addLine({ x, y: -limit }, { x, y: limit });
    for (let y = -limit; y <= limit; y += 4) addLine({ x: -limit, y }, { x: limit, y });
    return segments;
  }
  if (p.id === 'top-down') {
    for (let x = -limit; x <= limit; x += 4) addLine({ x, y: -limit }, { x, y: limit });
    for (let y = -limit; y <= limit; y += 4) addLine({ x: -limit, y }, { x: limit, y });
    return segments;
  }
  for (let i = -limit; i <= limit; i += 4) {
    addLine({ x: -limit, y: i }, { x: limit, y: i });
    addLine({ x: i, y: -limit }, { x: i, y: limit });
  }
  return segments;
}
