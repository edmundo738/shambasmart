/**
 * Motor de rig 2D para pixel art procedural.
 * Personagens são árvores de nós (partes); cada pose define translação,
 * rotação e escala por nó; o rasterizador compõe a hierarquia e pinta a grade.
 */

export interface Px {
  x: number;
  y: number;
  c: string;
}

export interface NodePose {
  dx?: number;
  dy?: number;
  rot?: number; // graus
  sx?: number;
  sy?: number;
  visible?: boolean;
  alt?: boolean; // usa pixels alternativos (ex.: olho fechado)
}

export interface RigNode {
  id: string;
  parent: string | null;
  /** posição do pivô no espaço local do pai (raiz = coordenadas absolutas) */
  attach: { x: number; y: number };
  /** pixels relativos ao pivô */
  pixels: Px[];
  /** pixels alternativos (piscada, boca aberta...) */
  alt?: Px[];
  z: number;
  noOutline?: boolean;
}

export interface Rig {
  nodes: RigNode[];
  w: number;
  h: number;
  outline: string | null;
}

export type Pose = Record<string, NodePose>;

/** Compõe a hierarquia: transforma um ponto local em coordenadas do mundo */
function toWorld(
  byId: Map<string, RigNode>,
  node: RigNode,
  x: number,
  y: number,
  pose: Pose,
): [number, number] {
  const ps = pose[node.id];
  const sx = ps?.sx ?? 1;
  const sy = ps?.sy ?? 1;
  const rot = ((ps?.rot ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const lx = x * sx;
  const ly = y * sy;
  const rx = lx * cos - ly * sin + node.attach.x + (ps?.dx ?? 0);
  const ry = lx * sin + ly * cos + node.attach.y + (ps?.dy ?? 0);
  if (!node.parent) return [rx, ry];
  const parent = byId.get(node.parent);
  if (!parent) return [rx, ry];
  return toWorld(byId, parent, rx, ry, pose);
}

/** Rasteriza o rig com uma pose → grade de células */
export function rasterize(rig: Rig, pose: Pose): string[] {
  const { w, h } = rig;
  const cells = new Array<string>(w * h).fill('');
  const owner = new Array<number>(w * h).fill(-1);
  const byId = new Map(rig.nodes.map((n) => [n.id, n]));
  const ordered = [...rig.nodes].sort((a, b) => a.z - b.z);

  ordered.forEach((node, orderIdx) => {
    const ps = pose[node.id];
    if (ps?.visible === false) return;
    const pixels = ps?.alt && node.alt ? node.alt : node.pixels;
    for (const p of pixels) {
      const [wx, wy] = toWorld(byId, node, p.x, p.y, pose);
      const x = Math.round(wx);
      const y = Math.round(wy);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = y * w + x;
      cells[i] = p.c;
      owner[i] = orderIdx;
    }
  });

  // contorno automático: pixel vazio vizinho a pixel pintado ganha outline
  if (rig.outline) {
    const noOutlineFlag = ordered.map((n) => !!n.noOutline);
    const out = [...cells];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (cells[i]) continue;
        const neighbors: Array<[number, number]> = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
        let paint = false;
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (cells[ni] && !noOutlineFlag[owner[ni]]) {
            paint = true;
            break;
          }
        }
        if (paint) out[i] = rig.outline;
      }
    }
    return out;
  }

  return cells;
}

/* ------------------------- helpers de construção -------------------------- */

/** retângulo de pixels em coords locais */
export function rect(x0: number, y0: number, x1: number, y1: number, c: string): Px[] {
  const out: Px[] = [];
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      out.push({ x, y, c });
    }
  }
  return out;
}

/** elipse preenchida em coords locais */
export function ell(cx: number, cy: number, rx: number, ry: number, c: string): Px[] {
  const out: Px[] = [];
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const v = ((x - cx) / Math.max(rx, 0.5)) ** 2 + ((y - cy) / Math.max(ry, 0.5)) ** 2;
      if (v <= 1) out.push({ x, y, c });
    }
  }
  return out;
}

/** remove pixels que satisfazem um predicado (recortes, ondas...) */
export function carve(pixels: Px[], pred: (x: number, y: number) => boolean): Px[] {
  return pixels.filter((p) => !pred(p.x, p.y));
}

/** Rasteriza pixels estáticos (coords em 32-space) em qualquer tamanho, com outline opcional */
export function renderStatic(pixels32: Px[], size: number, outline: string | null): string[] {
  const k = size / 32;
  const seen = new Map<number, string>();
  for (const p of pixels32) {
    if (!p.c) continue;
    const x = Math.round(p.x * k);
    const y = Math.round(p.y * k);
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    seen.set(y * size + x, p.c);
  }
  const pixels: Px[] = [...seen.entries()].map(([i, c]) => ({ x: i % size, y: Math.floor(i / size), c }));
  return rasterize(
    { nodes: [{ id: 'root', parent: null, attach: { x: 0, y: 0 }, pixels, z: 0 }], w: size, h: size, outline },
    {},
  );
}
