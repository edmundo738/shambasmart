import { create } from 'zustand';
import { ProjectData, uid } from '../types';
import { renderFrameToCanvas } from '../lib/exporters';
import { migrateProject } from '../lib/layers';

export interface ProjectMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  animations: number;
  frames: number;
  variations: number;
  updatedAt: number;
  thumb: string;
}

const META_KEY = 'pixelforge_projects_meta_v1';
const fullKey = (id: string) => `pixelforge_project_${id}_v1`;

function readMeta(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeMeta(list: ProjectMeta[]) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(list));
  } catch {
    /* armazenamento cheio — ignora */
  }
}

function makeThumb(p: ProjectData): string {
  try {
    const proj = migrateProject(p);
    const anim = proj.animations[0];
    const fid = anim?.frameIds[0];
    const frame = fid ? proj.frames[fid] : undefined;
    if (!frame) return '';
    const scale = Math.max(1, Math.floor(96 / Math.max(proj.width, proj.height)));
    const canvas = renderFrameToCanvas(proj, frame, { scale });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

interface ProjectsState {
  metas: ProjectMeta[];
  refresh: () => void;
  saveProject: (p: ProjectData) => void;
  loadProjectFull: (id: string) => ProjectData | null;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => ProjectMeta | null;
  renameProject: (id: string, name: string) => void;
}

export const useProjects = create<ProjectsState>((set) => ({
  metas: readMeta(),

  refresh: () => set({ metas: readMeta() }),

  saveProject: (p) => {
    try {
      localStorage.setItem(fullKey(p.id), JSON.stringify(p));
    } catch {
      /* ignora */
    }
    const metas = readMeta();
    const meta: ProjectMeta = {
      id: p.id,
      name: p.name,
      width: p.width,
      height: p.height,
      animations: p.animations.length,
      frames: Object.keys(p.frames).length,
      variations: p.variations.length,
      updatedAt: p.updatedAt,
      thumb: makeThumb(p),
    };
    const idx = metas.findIndex((m) => m.id === p.id);
    if (idx >= 0) metas[idx] = meta;
    else metas.unshift(meta);
    writeMeta(metas);
    set({ metas });
  },

  loadProjectFull: (id) => {
    try {
      const raw = localStorage.getItem(fullKey(id));
      if (!raw) return null;
      return migrateProject(JSON.parse(raw) as ProjectData);
    } catch {
      return null;
    }
  },

  deleteProject: (id) => {
    try {
      localStorage.removeItem(fullKey(id));
    } catch { /* ignora */ }
    const metas = readMeta().filter((m) => m.id !== id);
    writeMeta(metas);
    set({ metas });
  },

  duplicateProject: (id) => {
    try {
      const raw = localStorage.getItem(fullKey(id));
      if (!raw) return null;
      const src = JSON.parse(raw) as ProjectData;
      const copy: ProjectData = {
        ...JSON.parse(JSON.stringify(src)),
        id: uid('pj'),
        name: `${src.name} (cópia)`,
        updatedAt: Date.now(),
      };
      localStorage.setItem(fullKey(copy.id), JSON.stringify(copy));
      const metas = readMeta();
      const meta: ProjectMeta = {
        id: copy.id, name: copy.name, width: copy.width, height: copy.height,
        animations: copy.animations.length, frames: Object.keys(copy.frames).length,
        variations: copy.variations.length, updatedAt: copy.updatedAt, thumb: makeThumb(copy),
      };
      metas.unshift(meta);
      writeMeta(metas);
      set({ metas });
      return meta;
    } catch {
      return null;
    }
  },

  renameProject: (id, name) => {
    const metas = readMeta().map((m) => (m.id === id ? { ...m, name } : m));
    writeMeta(metas);
    set({ metas });
    try {
      const raw = localStorage.getItem(fullKey(id));
      if (raw) {
        const p = JSON.parse(raw) as ProjectData;
        p.name = name;
        localStorage.setItem(fullKey(id), JSON.stringify(p));
      }
    } catch { /* ignora */ }
  },
}));
