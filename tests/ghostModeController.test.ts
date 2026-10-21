import { describe, expect, it } from 'vitest';
import {
  createGhostModeState,
  isPointInTarget,
  shouldIgnoreMouseEvents,
  toggleGhostMode,
} from '../src/core/ghostModeController';

describe('ghostModeController', () => {
  const usagi = { x: 500, y: 400, radius: 60 };
  const snack = { x: 800, y: 300, radius: 30 };

  it('passes clicks through when Ghost Mode is locked even if cursor is directly over Usagi', () => {
    expect(shouldIgnoreMouseEvents(true, { x: 500, y: 400 }, usagi, snack)).toBe(true);
  });

  it('captures mouse events only when cursor is inside Usagi or active snack bounds in Interactive Mode', () => {
    // Cursor over Usagi -> do NOT ignore mouse events (false)
    expect(shouldIgnoreMouseEvents(false, { x: 520, y: 410 }, usagi, snack)).toBe(false);
    // Cursor over Snack -> do NOT ignore mouse events (false)
    expect(shouldIgnoreMouseEvents(false, { x: 810, y: 300 }, usagi, snack)).toBe(false);
    // Cursor over empty desktop (VS Code / Browser) -> ignore mouse events (true)
    expect(shouldIgnoreMouseEvents(false, { x: 100, y: 100 }, usagi, snack)).toBe(true);
  });

  it('safely defaults to click-through when cursor is null or NaN (Review Focus #4)', () => {
    expect(shouldIgnoreMouseEvents(false, null, usagi)).toBe(true);
    expect(shouldIgnoreMouseEvents(false, { x: Number.NaN, y: 400 }, usagi)).toBe(true);
    expect(isPointInTarget(Number.NaN, 400, usagi)).toBe(false);
  });

  it('toggles Ghost Mode state cleanly', () => {
    const s0 = createGhostModeState(false);
    const s1 = toggleGhostMode(s0);
    expect(s1.ghostModeLocked).toBe(true);
    expect(s1.currentlyIgnoringMouse).toBe(true);
  });
});
