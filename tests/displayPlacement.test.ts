import { describe, expect, it } from 'vitest';
import {
  computeStickyWindowPosition,
  type Rect,
  type WindowSize,
} from '../src/core/displayPlacement';

describe('displayPlacement', () => {
  const primary: Rect = { x: 0, y: 0, width: 1440, height: 900 };
  const secondary: Rect = { x: 1440, y: 0, width: 1920, height: 1080 };
  const size: WindowSize = { width: 350, height: 480 };

  it('keeps a saved sticky on its secondary display instead of snapping to primary', () => {
    expect(computeStickyWindowPosition({ x: 2000, y: 100 }, size, [primary, secondary])).toEqual({
      x: 2000,
      y: 100,
    });
  });

  it('moves an off-screen saved sticky onto the nearest remaining display', () => {
    const pos = computeStickyWindowPosition({ x: 5000, y: 100 }, size, [primary, secondary]);
    expect(pos).toEqual({ x: secondary.x + secondary.width - size.width, y: 100 });
  });

  it('anchors a brand-new sticky to the primary display top-right', () => {
    expect(computeStickyWindowPosition(null, size, [primary, secondary])).toEqual({
      x: primary.x + primary.width - size.width - 24,
      y: primary.y + 48,
    });
  });

  it('clamps a window larger than the display to the work area origin', () => {
    expect(
      computeStickyWindowPosition({ x: 100, y: 100 }, { width: 2000, height: 1000 }, [primary])
    ).toEqual({ x: primary.x, y: primary.y });
  });

  it('supports displays positioned left of the primary with negative coordinates', () => {
    const left: Rect = { x: -1920, y: 0, width: 1920, height: 1080 };
    expect(computeStickyWindowPosition({ x: -1500, y: 50 }, size, [primary, left])).toEqual({
      x: -1500,
      y: 50,
    });
  });

  it('falls back safely when no displays are reported', () => {
    expect(computeStickyWindowPosition({ x: 12, y: 34 }, size, [])).toEqual({ x: 12, y: 34 });
  });
});
