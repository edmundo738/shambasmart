/** Paletas GIMP (.gpl): o formato-texto mais interoperável (Aseprite/GIMP/Pixelorama leem). */

export interface GimpPalette {
  name: string;
  columns: number;
  colors: string[];
  /** nomes opcionais por cor ('' quando a linha não traz nome) */
  names?: string[];
}

/** Interpreta um .gpl. Tolerante a linhas estranhas; estrito com cabeçalho vazio. */
export function parseGpl(text: string): GimpPalette {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== 'GIMP Palette') {
    throw new Error('Não é uma paleta .gpl (falta o cabeçalho "GIMP Palette").');
  }
  let name = 'Sem nome';
  let columns = 8;
  const colors: string[] = [];
  const names: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const asName = /^Name:\s*(.+)$/.exec(line);
    if (asName) {
      name = asName[1].trim() || name;
      continue;
    }
    const asCols = /^Columns:\s*(\d+)$/.exec(line);
    if (asCols) {
      columns = Math.max(1, parseInt(asCols[1], 10));
      continue;
    }
    const rgb = /^(-?\d{1,3})\s+(-?\d{1,3})\s+(-?\d{1,3})(?:\s+(.*))?$/.exec(line);
    if (!rgb) continue;
    const [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
      .map((v) => Math.min(255, Math.max(0, v)));
    colors.push('#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''));
    names.push((rgb[4] ?? '').trim());
  }
  if (!colors.length) throw new Error('Nenhuma cor encontrada na paleta.');
  return { name, columns, colors, names };
}

/** Serializa cores hex (#rrggbb) para .gpl. */
export function serializeGpl(name: string, colors: string[], columns = 8): string {
  const lines = ['GIMP Palette', `Name: ${name}`, `Columns: ${Math.max(1, columns)}`, '# Gerado pelo PixelForge Studio'];
  for (const c of colors) {
    const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
    if (!m) continue;
    const r = parseInt(m[1].slice(0, 2), 16);
    const g = parseInt(m[1].slice(2, 4), 16);
    const b = parseInt(m[1].slice(4, 6), 16);
    lines.push(`${r} ${g} ${b}\t${c}`);
  }
  return lines.join('\n') + '\n';
}
