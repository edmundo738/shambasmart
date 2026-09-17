import JSZip from 'jszip';
import { Animation, Frame, ProjectData, uid } from '../../types';
import { createLayer, makeFrame } from '../layers';
import { fpsToMs } from '../timeline';
import { buildPackZip, slugify } from '../exporters';
import { GeneratedSprite, SpriteKind, generateSprite } from './sprites';
import { StyleId } from './styles';

export interface BundleItem {
  kind: SpriteKind;
  subtype: string;
  label: string;
  actions: Array<{ id: string; frames: number }>;
}

export interface BundleDef {
  id: string;
  name: string;
  desc: string;
  style: StyleId;
  items: BundleItem[];
}

/** Pacotes temáticos: famílias coerentes (mesmo estilo, seeds vizinhas). */
export const BUNDLES: BundleDef[] = [
  {
    id: 'heroi',
    name: 'Herói da Aldeia',
    desc: 'Herói, slime, espada, poção, moeda e explosão — um mini-jogo completo',
    style: 'fantasia',
    items: [
      { kind: 'personagem', subtype: 'humanoid', label: 'Herói', actions: [{ id: 'idle', frames: 4 }, { id: 'walk', frames: 4 }, { id: 'run', frames: 4 }, { id: 'jump', frames: 6 }, { id: 'attack', frames: 5 }] },
      { kind: 'criatura', subtype: 'slime', label: 'Slime', actions: [{ id: 'idle', frames: 4 }, { id: 'jump', frames: 6 }] },
      { kind: 'arma', subtype: 'espada', label: 'Espada', actions: [{ id: 'idle', frames: 4 }, { id: 'brilho', frames: 6 }] },
      { kind: 'item', subtype: 'pocao', label: 'Poção', actions: [{ id: 'idle', frames: 4 }, { id: 'brilho', frames: 4 }] },
      { kind: 'item', subtype: 'moeda', label: 'Moeda', actions: [{ id: 'idle', frames: 4 }, { id: 'brilho', frames: 4 }] },
      { kind: 'efeito', subtype: 'explosao', label: 'Explosão', actions: [{ id: 'tocar', frames: 6 }] },
    ],
  },
  {
    id: 'masmorra',
    name: 'Masmorra Sombria',
    desc: 'Guardião, fantasma, fera, machado, baú, tocha e névoa',
    style: 'sombrio',
    items: [
      { kind: 'personagem', subtype: 'humanoid', label: 'Guardião', actions: [{ id: 'idle', frames: 4 }, { id: 'walk', frames: 4 }, { id: 'attack', frames: 5 }] },
      { kind: 'criatura', subtype: 'ghost', label: 'Fantasma', actions: [{ id: 'idle', frames: 4 }, { id: 'jump', frames: 6 }] },
      { kind: 'criatura', subtype: 'critter', label: 'Fera', actions: [{ id: 'idle', frames: 4 }, { id: 'walk', frames: 4 }] },
      { kind: 'arma', subtype: 'machado', label: 'Machado', actions: [{ id: 'idle', frames: 4 }, { id: 'brilho', frames: 6 }] },
      { kind: 'item', subtype: 'bau', label: 'Baú', actions: [{ id: 'idle', frames: 4 }, { id: 'brilho', frames: 4 }] },
      { kind: 'item', subtype: 'tocha', label: 'Tocha', actions: [{ id: 'idle', frames: 4 }, { id: 'brilho', frames: 4 }] },
      { kind: 'efeito', subtype: 'fumaca', label: 'Névoa', actions: [{ id: 'tocar', frames: 6 }] },
    ],
  },
  {
    id: 'tesouro',
    name: 'Caça ao Tesouro',
    desc: 'Mascote, moedas, gema, baú, chave e anel de poder',
    style: 'natureza',
    items: [
      { kind: 'criatura', subtype: 'critter', label: 'Mascote', actions: [{ id: 'idle', frames: 4 }, { id: 'dance', frames: 6 }] },
      { kind: 'item', subtype: 'moeda', label: 'Moeda', actions: [{ id: 'idle', frames: 4 }, { id: 'brilho', frames: 4 }] },
      { kind: 'item', subtype: 'gema', label: 'Gema', actions: [{ id: 'idle', frames: 4 }, { id: 'brilho', frames: 4 }] },
      { kind: 'item', subtype: 'bau', label: 'Baú', actions: [{ id: 'idle', frames: 4 }, { id: 'brilho', frames: 4 }] },
      { kind: 'item', subtype: 'chave', label: 'Chave', actions: [{ id: 'idle', frames: 4 }, { id: 'brilho', frames: 4 }] },
      { kind: 'efeito', subtype: 'anel', label: 'Anel', actions: [{ id: 'tocar', frames: 6 }] },
    ],
  },
];

/** Gera todos os sprites do pacote a partir de uma seed mestra. */
export function generateBundle(seed: number, def: BundleDef, size: number, outline: boolean): GeneratedSprite[] {
  return def.items.map((item, i) => generateSprite({
    kind: item.kind,
    seed: seed + i * 7919,
    style: def.style,
    size,
    outline,
    subtype: item.subtype,
    hueShift: 0,
    actions: item.actions,
    energy: 0.6,
    amplitude: 0.6,
    bounce: 0.6,
  }));
}

/** Converte um sprite gerado em ProjectData (reutilizado por Gerador/Biblioteca). */
export function spriteToProjectData(sprite: GeneratedSprite, size: number, bundle?: string): ProjectData {
  const layer = createLayer('Camada 1');
  const frames: Record<string, Frame> = {};
  const anims: Animation[] = sprite.actions.map((a) => {
    const frameIds = a.frames.map((cells) => {
      const f: Frame = makeFrame(layer.id, cells, fpsToMs(a.fps));
      frames[f.id] = f;
      return f.id;
    });
    return { id: uid('an'), name: a.label, fps: a.fps, frameIds, playMode: 'loop' };
  });
  const now = Date.now();
  return {
    id: uid('pj'),
    name: sprite.name,
    width: size,
    height: size,
    layers: [layer],
    frames,
    animations: anims,
    variations: [{ id: uid('vr'), name: 'sombra', mapping: {}, hue: 0, sat: -10, light: -22 }],
    palette: sprite.palette,
    recipe: sprite.recipe,
    bundle,
    createdAt: now,
    updatedAt: now,
  };
}

/** Junta vários packs individuais em um ZIP único, uma pasta por asset. */
export async function buildBundleZip(projects: ProjectData[], bundleName: string): Promise<Blob> {
  const bundle = new JSZip();
  for (const p of projects) {
    const pack = await buildPackZip(p, {
      engine: 'generic', scale: 4, columns: 0, padding: 0,
      includeJson: true, includeGif: true, includeSheet: true, includeSequence: false,
      background: '',
    });
    const sub = await JSZip.loadAsync(pack);
    const jobs: Array<Promise<void>> = [];
    sub.forEach((path, file) => {
      if (file.dir) return;
      jobs.push(file.async('uint8array').then((data) => {
        bundle.file(path, data);
      }));
    });
    await Promise.all(jobs);
  }
  const lines = [
    bundleName,
    `Gerado pelo PixelForge em ${new Date().toLocaleString('pt-BR')}`,
    '',
    ...projects.map((p) => `- ${p.name} (${p.animations.length} animações, seed ${p.recipe?.seed ?? 'manual'})`),
  ];
  bundle.file('LEIA-ME.txt', lines.join('\n'));
  void slugify;
  return bundle.generateAsync({ type: 'blob' });
}
