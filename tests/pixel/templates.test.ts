import { describe, expect, it } from 'vitest';
import { STARTER_PALETTES, TEMPLATES } from '../../src/lib/templates';

describe('templates culturais angolanos', () => {
  it('oferece estudos 2D de imbondeiro, palanca, candongueiro e pessoa', () => {
    for (const id of ['imbondeiro-angola', 'palanca-angola', 'candongueiro-angola', 'pessoa-angola']) {
      const template = TEMPLATES.find((item) => item.id === id);
      expect(template).toBeDefined();
      expect(template?.tags).toContain('angola');
      const built = template!.build();
      expect(built.animations.length).toBeGreaterThan(0);
      expect(Object.keys(built.frames).length).toBeGreaterThan(0);
      expect(built.layers).toHaveLength(1);
      expect(built.palette.length).toBeGreaterThan(2);
    }
  });

  it('inclui uma paleta de terra e bandeira de Angola', () => {
    const palette = STARTER_PALETTES.find((item) => item.name.startsWith('Angola'));
    expect(palette?.colors).toEqual(expect.arrayContaining(['#ce1126', '#f9d616', '#171717']));
  });
});
