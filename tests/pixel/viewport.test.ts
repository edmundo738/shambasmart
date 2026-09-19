import { describe, expect, it } from 'vitest';
import { anchorFrac, cellFromView, centerScroll, clampZoom, fitZoom, keepAnchor, posFromView, stepZoom, ZOOM_LADDER } from '../../src/lib/viewport';

describe('clampZoom', () => {
  it('arredonda e prende em 1..64', () => {
    expect(clampZoom(12.7)).toBe(13);
    expect(clampZoom(0)).toBe(1);
    expect(clampZoom(-5)).toBe(1);
    expect(clampZoom(100)).toBe(64);
  });
  it('valor inválido volta ao fallback 12', () => {
    expect(clampZoom(NaN)).toBe(12);
    expect(clampZoom(Infinity)).toBe(12);
  });
});

describe('stepZoom', () => {
  it('sobe e desce a escada', () => {
    expect(stepZoom(12, 1)).toBe(16);
    expect(stepZoom(12, -1)).toBe(8);
    expect(stepZoom(1, -1)).toBe(1);
    expect(stepZoom(64, 1)).toBe(64);
  });
  it('parte de valor fora da escada para o degrau vizinho', () => {
    expect(stepZoom(10, 1)).toBe(12);
    expect(stepZoom(10, -1)).toBe(8);
  });
  it('escada é crescente e inteira', () => {
    const sorted = [...ZOOM_LADDER].sort((a, b) => a - b);
    expect(ZOOM_LADDER).toEqual(sorted);
    expect(ZOOM_LADDER.every(Number.isInteger)).toBe(true);
  });
});

describe('fitZoom', () => {
  it('cabe 32x32 em 800x600 com respiro 48', () => {
    // min((800-96)/32, (600-96)/32) = min(22, 15.75) -> 15
    expect(fitZoom(800, 600, 32, 32)).toBe(15);
  });
  it('nunca abaixo de 1, mesmo em viewport minúscula', () => {
    expect(fitZoom(40, 40, 64, 64)).toBe(1);
    expect(fitZoom(0, 0, 32, 32)).toBe(1);
  });
  it('respeita o limite 64', () => {
    expect(fitZoom(10000, 10000, 8, 8)).toBe(64);
  });
});

describe('anchorFrac + keepAnchor', () => {
  it('ponto sob o cursor permanece estável ao dobrar o conteúdo', () => {
    // antes: scroll 100, cursor a 50 da borda, conteúdo 1000 -> fração 0.15
    const frac = anchorFrac(100, 50, 1000);
    expect(frac).toBeCloseTo(0.15, 10);
    // depois: conteúdo 2000, mesmo cursor -> scroll 250, ponto = 300 = 0.15*2000
    const scroll = keepAnchor(frac, 400, 2000, 50);
    expect(scroll).toBeCloseTo(250, 10);
    expect(scroll + 50).toBeCloseTo(0.15 * 2000, 10);
  });
  it('prende o scroll nos limites', () => {
    expect(keepAnchor(-1, 400, 2000, 50)).toBe(0); // âncora antes do início
    expect(keepAnchor(2, 400, 2000, 50)).toBe(1600); // âncora além do fim
    expect(keepAnchor(0.5, 400, 200, 50)).toBe(0); // conteúdo menor que a viewport
  });
  it('fração inválida cai no centro', () => {
    expect(anchorFrac(0, 0, 0)).toBe(0.5);
    expect(keepAnchor(NaN, 400, 2000, 50)).toBeCloseTo(950, 10); // centro do conteúdo (1000) menos cursor
  });
});

describe('centerScroll', () => {
  it('centraliza e nunca negativa', () => {
    expect(centerScroll(400, 1000)).toBe(300);
    expect(centerScroll(400, 200)).toBe(0);
  });
});

describe('cellFromView', () => {
  it('converte offset em célula (canvas 32px a zoom 12 = 384px)', () => {
    expect(cellFromView(0, 0, 384, 32)).toBe(0);
    expect(cellFromView(0, 11.9, 384, 32)).toBe(0);
    expect(cellFromView(0, 12, 384, 32)).toBe(1);
    expect(cellFromView(0, 383.9, 384, 32)).toBe(31);
  });
  it('soma o scroll e rejeita fora dos limites', () => {
    expect(cellFromView(100, 0, 1000, 32)).toBe(3);
    expect(cellFromView(0, -1, 384, 32)).toBeNull();
    expect(cellFromView(0, 384, 384, 32)).toBeNull();
    expect(cellFromView(0, 0, 0, 32)).toBeNull();
  });
});

describe('posFromView', () => {
  it('devolve a posição fracionária (zoom 12: célula 1 vai de 12 a 24)', () => {
    expect(posFromView(0, 0, 384, 32)).toBe(0);
    expect(posFromView(0, 18, 384, 32)).toBeCloseTo(1.5, 10);
    expect(posFromView(0, 383.9, 384, 32)).toBeCloseTo(31.99, 2);
  });
  it('rejeita fora dos limites e dimensões inválidas', () => {
    expect(posFromView(0, -0.1, 384, 32)).toBeNull();
    expect(posFromView(0, 384, 384, 32)).toBeNull();
    expect(posFromView(0, 0, 0, 32)).toBeNull();
  });
});
