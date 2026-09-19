import { describe, expect, it } from 'vitest';
import { normalizeProjection, projectionGrid, screenToWorld, snapWorld, worldToScreen } from '../../src/lib/spatial';

describe('spatial foundation', () => {
  it('keeps legacy 2D coordinates exact and integer-friendly', () => {
    const p = normalizeProjection({ id: '2d', snap: true });
    expect(worldToScreen({ x: 7, y: 11 }, p)).toEqual({ x: 7, y: 11 });
    expect(screenToWorld({ x: 7, y: 11 }, p)).toEqual({ x: 7, y: 11, z: 0 });
  });

  it('round-trips isometric coordinates without touching the raster', () => {
    const p = normalizeProjection({ id: 'isometric', tileWidth: 2, tileHeight: 1, originX: 10, originY: 4 });
    const screen = worldToScreen({ x: 6, y: 2 }, p);
    const world = screenToWorld(screen, p);
    expect(world.x).toBeCloseTo(6);
    expect(world.y).toBeCloseTo(2);
  });

  it('snaps only when the guide enables it', () => {
    expect(snapWorld({ x: 1.4, y: 2.6, z: -0.2 }, { id: '2d', snap: true })).toEqual({ x: 1, y: 3, z: -0 });
    expect(snapWorld({ x: 1.4, y: 2.6, z: -0.2 }, { id: '2d', snap: false })).toEqual({ x: 1.4, y: 2.6, z: -0.2 });
  });

  it('returns deterministic guide segments for non-2D projections', () => {
    expect(projectionGrid(32, 32, { id: '2d' })).toHaveLength(0);
    const guide = projectionGrid(32, 32, { id: 'oblique', tileWidth: 2, tileHeight: 1 });
    expect(guide.length).toBeGreaterThan(0);
    expect(guide[0].a.x).toBeTypeOf('number');
    expect(guide[0].b.y).toBeTypeOf('number');
  });
});
