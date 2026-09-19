import { describe, expect, it } from 'vitest';
import { parseGpl, serializeGpl } from '../../src/lib/palette';

const SAMPLE = `GIMP Palette
Name: Teste
Columns: 4
#
255   0   0\tVermelho
0 255 0 Verde
0 0 255
malformed row here
12 34
`;

describe('parseGpl', () => {
  it('lê nome, colunas e cores com/sem nome', () => {
    const pal = parseGpl(SAMPLE);
    expect(pal.name).toBe('Teste');
    expect(pal.columns).toBe(4);
    expect(pal.colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
    expect(pal.names).toEqual(['Vermelho', 'Verde', '']);
  });

  it('rejeita cabeçalho inválido', () => {
    expect(() => parseGpl('JASC-PAL\n0100\n')).toThrow();
    expect(() => parseGpl('')).toThrow();
  });

  it('ignora comentários, linhas em branco e linhas malformadas', () => {
    const pal = parseGpl('GIMP Palette\n# só comentário\n\n255 255 255 Branco\n');
    expect(pal.colors).toEqual(['#ffffff']);
  });

  it('satura RGB fora do intervalo', () => {
    const pal = parseGpl('GIMP Palette\n300 -5 128 X\n');
    expect(pal.colors).toEqual(['#ff0080']);
  });
});

describe('serializeGpl', () => {
  it('roundtrip preserva cores', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#123456'];
    const text = serializeGpl('Minha', colors);
    expect(text.startsWith('GIMP Palette\n')).toBe(true);
    const back = parseGpl(text);
    expect(back.name).toBe('Minha');
    expect(back.colors).toEqual(colors);
  });
});
