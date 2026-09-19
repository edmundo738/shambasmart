import { describe, expect, it } from 'vitest';
import { buildColorRamp, buildShadeRamp, ditherColor, ditherUsesPrimary, hexToOklab, oklabToHex, shadeColor } from '../../src/lib/colorTools';
import { normalizeHex } from '../../src/lib/color';

describe('E4 cor', () => {
  it('OKLab roundtrip preserva cores sRGB comuns', () => {
    for (const c of ['#000000', '#ffffff', '#ff0000', '#22b8f0', '#7a4b2a']) {
      expect(oklabToHex(hexToOklab(c))).toBe(normalizeHex(c));
    }
  });

  it('rampa é inclusiva, monotónica em luminosidade e não repete extremos', () => {
    const ramp = buildColorRamp('#160b2e', '#f8d34f', 7);
    expect(ramp).toHaveLength(7);
    expect(ramp[0]).toBe('#160b2e');
    expect(ramp[6]).toBe('#f8d34f');
    const ls = ramp.map((c) => hexToOklab(c).L);
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeGreaterThan(ls[i - 1]);
  });

  it('shade altera luminosidade sem injectar transparência', () => {
    expect(hexToOklab(shadeColor('#4f8fca', -0.2)).L).toBeLessThan(hexToOklab('#4f8fca').L);
    expect(hexToOklab(shadeColor('#4f8fca', 0.2)).L).toBeGreaterThan(hexToOklab('#4f8fca').L);
    expect(buildShadeRamp('#4f8fca', 5)).toHaveLength(5);
  });

  it('dithers são determinísticos e usam as duas cores', () => {
    expect(ditherUsesPrimary('solid', 99, 99)).toBe(true);
    expect(ditherUsesPrimary('checker', 0, 0)).not.toBe(ditherUsesPrimary('checker', 1, 0));
    const cells = Array.from({ length: 16 }, (_, i) => ditherColor('#fff', '#000', 'bayer4', i % 4, Math.floor(i / 4)));
    expect(new Set(cells).size).toBe(2);
  });
});
