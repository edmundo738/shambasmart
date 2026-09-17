import { describe, expect, it } from 'vitest';
import { moveRect } from '../../src/lib/pixels';

function grid(w: number, h: number, fill = ''): string[] {
  return Array.from({ length: w * h }, () => fill);
}

describe('moveRect', () => {
  it('move pixels opacos e limpa a origem', () => {
    const cells = grid(4, 4);
    cells[0] = '#ff0000'; // (0,0)
    cells[1] = '#00ff00'; // (1,0)
    const { cells: out, rect } = moveRect(cells, 4, 4, { x0: 0, y0: 0, x1: 1, y1: 0 }, 1, 1);
    expect(out[0]).toBe('');
    expect(out[1]).toBe('');
    expect(out[5]).toBe('#ff0000'); // (1,1)
    expect(out[6]).toBe('#00ff00'); // (2,1)
    expect(rect).toEqual({ x0: 1, y0: 1, x1: 2, y1: 1 });
  });

  it('transparente nunca apaga o destino', () => {
    const cells = grid(4, 4);
    cells[0] = '#ff0000'; // origem (0,0); (1,0) vazio
    cells[6] = '#0000ff'; // destino (2,1) já ocupado
    const { cells: out } = moveRect(cells, 4, 4, { x0: 0, y0: 0, x1: 1, y1: 0 }, 1, 1);
    expect(out[5]).toBe('#ff0000'); // (1,1) recebe o vermelho
    expect(out[6]).toBe('#0000ff'); // (2,1) preservado (flutuante era transparente)
    expect(out[0]).toBe('');
  });

  it('recorta nas bordas do canvas', () => {
    const cells = grid(4, 4);
    cells[15] = '#ff0000'; // (3,3)
    const { cells: out, rect } = moveRect(cells, 4, 4, { x0: 3, y0: 3, x1: 3, y1: 3 }, 2, 0);
    expect(out.every((c) => c === '')).toBe(true); // caiu fora: some
    expect(rect).toEqual({ x0: 5, y0: 3, x1: 5, y1: 3 }); // retângulo segue a lógica
  });

  it('retângulo vazio não altera pixels mas desloca o retângulo', () => {
    const cells = grid(4, 4);
    cells[10] = '#ffffff';
    const { cells: out, rect } = moveRect(cells, 4, 4, { x0: 0, y0: 0, x1: 1, y1: 1 }, 1, 0);
    expect(out).toEqual(cells);
    expect(rect).toEqual({ x0: 1, y0: 0, x1: 2, y1: 1 });
  });

  it('normaliza retângulo invertido', () => {
    const cells = grid(4, 4);
    cells[0] = '#ff0000';
    const { cells: out } = moveRect(cells, 4, 4, { x0: 1, y0: 0, x1: 0, y1: 0 }, 0, 1);
    expect(out[0]).toBe('');
    expect(out[4]).toBe('#ff0000');
  });

  it('não muta o array original (puro)', () => {
    const cells = grid(4, 4);
    cells[0] = '#ff0000';
    const before = [...cells];
    moveRect(cells, 4, 4, { x0: 0, y0: 0, x1: 0, y1: 0 }, 1, 0);
    expect(cells).toEqual(before);
  });
});
