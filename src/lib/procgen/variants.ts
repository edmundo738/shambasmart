import { AssetRecipe } from '../../types';

/**
 * Variações 1-clique: transformações nomeadas e determinísticas sobre uma receita.
 * Mesma receita base + mesma variação = mesmo resultado, sempre.
 */
export interface VariantDef {
  id: string;
  label: string;
  desc: string;
  swatch: string;
}

export const VARIANT_SET: VariantDef[] = [
  { id: 'ouro', label: 'Ouro', desc: 'Tons dourados de tesouro', swatch: '#f5b301' },
  { id: 'brasa', label: 'Brasa', desc: 'Calor avermelhado de forja', swatch: '#ff5a3c' },
  { id: 'veneno', label: 'Veneno', desc: 'Verde tóxico e selvagem', swatch: '#4ade80' },
  { id: 'gelo', label: 'Gelo', desc: 'Azul espectral congelante', swatch: '#7dd3fc' },
  { id: 'noturna', label: 'Noturna', desc: 'Reimaginado no estilo sombrio', swatch: '#6d28d9' },
  { id: 'irmao', label: 'Irmão', desc: 'Mesmos parâmetros, seed vizinha', swatch: '#a78bfa' },
];

function wrapHue(h: number): number {
  h = h % 360;
  if (h > 180) h -= 360;
  if (h < -180) h += 360;
  return Math.round(h);
}

/** Aplica uma variação sobre a receita base, sem mutar o original. */
export function variantRecipe(base: AssetRecipe, variantId: string): AssetRecipe {
  const next: AssetRecipe = {
    ...base,
    style: base.style,
    actions: base.actions.map((a) => ({ ...a })),
    motion: base.motion ? { ...base.motion } : undefined,
  };
  switch (variantId) {
    case 'ouro': next.hueShift = wrapHue(base.hueShift + 35); break;
    case 'brasa': next.hueShift = wrapHue(base.hueShift - 30); break;
    case 'veneno': next.hueShift = wrapHue(base.hueShift + 120); break;
    case 'gelo': next.hueShift = wrapHue(base.hueShift + 170); break;
    case 'noturna': next.style = 'sombrio'; break;
    case 'irmao': next.seed = base.seed + 1; break;
    default: break;
  }
  return next;
}

/** Nome da variação a partir do nome base. */
export function variantName(baseName: string, variantId: string): string {
  const def = VARIANT_SET.find((v) => v.id === variantId);
  return def ? `${baseName} (${def.label})` : baseName;
}
