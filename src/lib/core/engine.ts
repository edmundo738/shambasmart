/** Versão do motor procedural. Mudou o motor → fingerprints antigos divergem (esperado). */
export const ENGINE_VERSION = '0.3.0';

export const MASTER_KIND = 'pixelforge-asset-master';

/** JSON canônico: chaves ordenadas, determinístico para hash. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`).join(',')}}`;
}

/** FNV-1a 32-bit → hex de 8 chars. Rápido e estável entre sessões. */
export function fingerprint(data: unknown): string {
  const s = typeof data === 'string' ? data : stableStringify(data);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
