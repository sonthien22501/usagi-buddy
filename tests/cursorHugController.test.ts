import { describe, expect, it } from 'vitest';
import {
  CursorHugPhase,
  CursorHugState,
  createCursorHugState,
  triggerCursorPounce,
  stepCursorHug,
  shouldIgnoreMouseDuringHug,
} from '../src/core/cursorHugController';

describe('cursorHugController', () => {
  it('creates initial cursor hug state in idle phase', () => {
    const state = createCursorHugState();
    expect(state.enabled).toBe(true);
    expect(state.phase).toBe('idle');
    expect(state.pendulumAngleRad).toBe(0);
    expect(state.shakeReversals).toBe(0);
    expect(shouldIgnoreMouseDuringHug(state)).toBe(false);
  });

  it('enters pounce-wiggle for 550ms with !! bubble and wiggle rotation', () => {
    let state = createCursorHugState(true);
    state = triggerCursorPounce(state);
    expect(state.phase).toBe('pounce-wiggle');

    const usagiPos = { x: 200, y: 200 };
    const cursorPos = { x: 250, y: 150 };

    // Step at 200ms
    const step1 = stepCursorHug(state, usagiPos, cursorPos, 200, 1000);
    expect(step1.hugState.phase).toBe('pounce-wiggle');
    expect(step1.speechBubbleOverride).toBe('!!');
    expect(typeof step1.rotationOverride).toBe('number');
    expect(step1.rotationOverride).not.toBe(0);

    // Step to 550ms -> transitions to clinging
    const step2 = stepCursorHug(step1.hugState, usagiPos, cursorPos, 350, 1350);
    expect(step2.hugState.phase).toBe('clinging');
    expect(step2.soundTrigger).toBe('hug-attach');
    expect(step2.targetPos).toEqual({ x: 250, y: 150 + 44 });
    expect(shouldIgnoreMouseDuringHug(step2.hugState)).toBe(true);
  });

  it('swings pendulum in clinging phase and clamps angle within bounds', () => {
    let state = createCursorHugState(true);
    state = triggerCursorPounce(state);
    // Fast forward to clinging
    const clingingStep = stepCursorHug(state, { x: 100, y: 100 }, { x: 300, y: 300 }, 560, 560);
    expect(clingingStep.hugState.phase).toBe('clinging');

    // Simulate fast cursor move to the right (+100px in 16ms)
    const stepSwing = stepCursorHug(
      clingingStep.hugState,
      { x: 300, y: 344 },
      { x: 400, y: 300 },
      16,
      576
    );
    expect(stepSwing.hugState.phase).toBe('clinging');
    expect(stepSwing.targetPos).toEqual({ x: 400, y: 344 });
    expect(Math.abs(stepSwing.hugState.pendulumAngleRad)).toBeLessThanOrEqual(0.65);
  });

  it('requires 3 rapid direction reversals (|dx| >= 18 within 600ms) to trigger dizzy-drop', () => {
    let state = createCursorHugState(true);
    state = triggerCursorPounce(state);
    state = stepCursorHug(state, { x: 100, y: 100 }, { x: 300, y: 300 }, 560, 560).hugState;
    expect(state.phase).toBe('clinging');

    let currentCursor = { x: 300, y: 300 };
    let now = 1000;

    // Movement 1: Move right by +25px
    currentCursor = { x: 325, y: 300 };
    let res = stepCursorHug(state, { x: 300, y: 344 }, currentCursor, 50, now);
    state = res.hugState;
    expect(state.shakeReversals).toBe(0);

    // Movement 2: Reversal 1 -> move left by -30px (dx = -30, sign flipped)
    now += 100;
    currentCursor = { x: 295, y: 300 };
    res = stepCursorHug(state, { x: 325, y: 344 }, currentCursor, 50, now);
    state = res.hugState;
    expect(state.shakeReversals).toBe(1);

    // Movement 3: Reversal 2 -> move right by +35px
    now += 100;
    currentCursor = { x: 330, y: 300 };
    res = stepCursorHug(state, { x: 295, y: 344 }, currentCursor, 50, now);
    state = res.hugState;
    expect(state.shakeReversals).toBe(2);

    // Movement 4: Reversal 3 -> move left by -40px -> DIZZY DROP!
    now += 100;
    currentCursor = { x: 290, y: 300 };
    res = stepCursorHug(state, { x: 330, y: 344 }, currentCursor, 50, now);
    state = res.hugState;
    expect(state.phase).toBe('dizzy-drop');
    expect(res.soundTrigger).toBe('dizzy-drop');
    expect(res.speechBubbleOverride).toContain('@ _ @');
    expect(shouldIgnoreMouseDuringHug(state)).toBe(false);
  });

  it('does not trigger dizzy-drop for slow or single-direction movement', () => {
    let state = createCursorHugState(true);
    state = triggerCursorPounce(state);
    state = stepCursorHug(state, { x: 100, y: 100 }, { x: 300, y: 300 }, 560, 560).hugState;

    // Move in same direction slowly
    let res = stepCursorHug(state, { x: 300, y: 344 }, { x: 320, y: 300 }, 50, 1000);
    res = stepCursorHug(res.hugState, { x: 320, y: 344 }, { x: 340, y: 300 }, 50, 1050);
    res = stepCursorHug(res.hugState, { x: 340, y: 344 }, { x: 360, y: 300 }, 50, 1100);
    expect(res.hugState.phase).toBe('clinging');
    expect(res.hugState.shakeReversals).toBe(0);
  });

  it('auto-releases clinging to cooldown after 9000ms', () => {
    let state = createCursorHugState(true);
    state = triggerCursorPounce(state);
    state = stepCursorHug(state, { x: 100, y: 100 }, { x: 300, y: 300 }, 560, 560).hugState;
    expect(state.phase).toBe('clinging');

    // Advance 9001ms without shaking
    const res = stepCursorHug(state, { x: 300, y: 344 }, { x: 300, y: 300 }, 9005, 9600);
    expect(res.hugState.phase).toBe('cooldown');
  });

  it('immediately cancels active hug and resets to idle when blockedByMode is true', () => {
    let state = createCursorHugState(true);
    state = triggerCursorPounce(state);
    expect(state.phase).toBe('pounce-wiggle');

    // Blocked by stationary or sleeping mode
    const res = stepCursorHug(state, { x: 100, y: 100 }, { x: 200, y: 200 }, 50, 1000, true);
    expect(res.hugState.phase).toBe('idle');
    expect(res.hugState.pendulumAngleRad).toBe(0);
    expect(res.targetPos).toBeNull();
    expect(res.rotationOverride).toBeNull();
    expect(res.speechBubbleOverride).toBeNull();
  });
});
