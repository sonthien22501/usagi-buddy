import { describe, expect, it } from 'vitest';
import {
  createInitialUsagiState,
  DEFAULT_PHYSICS_CONFIG,
  stepUsagiPhysics,
  triggerUsagiInteraction,
  UPRIGHT_SPRITE_INDEX,
} from '../src/core/physicsEngine';

describe('physicsEngine', () => {
  const screen = { width: 1440, height: 900 };

  it('keeps frameIndex locked to UPRIGHT_SPRITE_INDEX (2, Usagi3.png) and applies 60 FPS squash-and-stretch swimming with banking tilt', () => {
    let state = createInitialUsagiState(screen);
    expect(state.frameIndex).toBe(UPRIGHT_SPRITE_INDEX);
    expect(UPRIGHT_SPRITE_INDEX).toBe(2);

    for (let i = 0; i < 20; i++) {
      state = stepUsagiPhysics(state, 50, screen).state;
      expect(state.frameIndex).toBe(UPRIGHT_SPRITE_INDEX);
      expect(state.swimPhaseRad).toBeGreaterThan(0);
      expect(state.scaleX).toBeGreaterThanOrEqual(0.9);
      expect(state.scaleX).toBeLessThanOrEqual(1.1);
      expect(state.scaleY).toBeGreaterThanOrEqual(0.9);
      expect(state.scaleY).toBeLessThanOrEqual(1.1);
      // Gentle banking tilt, NOT 360-degree stepped spinning
      expect(Math.abs(state.rotation)).toBeLessThanOrEqual(0.35);
    }
  });

  it('bounces gently off left/right/top/bottom desktop boundaries and updates scaleFlipX', () => {
    const r = DEFAULT_PHYSICS_CONFIG.spriteRadius;
    const nearRight = {
      ...createInitialUsagiState(screen),
      x: screen.width - r + 5,
      y: 300,
      vx: 120,
      vy: 0,
    };
    const { state: bouncedRight } = stepUsagiPhysics(nearRight, 50, screen);
    expect(bouncedRight.x).toBeLessThanOrEqual(screen.width - r);
    expect(bouncedRight.vx).toBeLessThan(0);
    expect(bouncedRight.scaleFlipX).toBe(-1);

    const nearTop = {
      ...bouncedRight,
      y: r - 10,
      vy: -90,
    };
    const { state: bouncedTop } = stepUsagiPhysics(nearTop, 50, screen);
    expect(bouncedTop.y).toBeGreaterThanOrEqual(r);
    expect(bouncedTop.vy).toBeGreaterThan(0);
  });

  it('triggers spin boost and Ura!/Yaha! speech bubble on hover/click interaction', () => {
    const initial = createInitialUsagiState(screen);
    const s0 = triggerUsagiInteraction(initial, 0);
    expect(s0.speechBubble).toBe('Ura!');
    expect(s0.spinBoostTimerMs).toBeGreaterThan(0);
    expect(Math.abs(s0.angularVelocity)).toBeGreaterThan(5);

    const s1 = triggerUsagiInteraction(initial, 1);
    expect(s1.speechBubble).toBe('Yaha!');
  });

  it('triggers combo-click super-spin tornado when clicked 3+ times in rapid succession', () => {
    const initial = createInitialUsagiState(screen);
    const click1 = triggerUsagiInteraction(initial, 0);
    expect(click1.comboClicks).toBe(1);
    const baseAngular = Math.abs(click1.angularVelocity);

    const click2 = triggerUsagiInteraction(click1, 1);
    expect(click2.comboClicks).toBe(2);

    const click3 = triggerUsagiInteraction(click2, 2);
    expect(click3.comboClicks).toBe(3);
    expect(Math.abs(click3.angularVelocity)).toBeGreaterThan(18);
    expect(Math.abs(click3.angularVelocity)).toBeGreaterThan(baseAngular);
    expect(click3.spinBoostTimerMs).toBeGreaterThan(DEFAULT_PHYSICS_CONFIG.spinBoostDurationMs);
  });

  it('steers toward active Pomodoro snack and consumes it upon arrival', () => {
    let state = {
      ...createInitialUsagiState(screen),
      x: 200,
      y: 200,
      vx: 10,
      vy: 10,
    };
    const snack = { x: 260, y: 200, active: true, radius: 28 };

    let consumed = false;
    for (let i = 0; i < 30; i++) {
      const res = stepUsagiPhysics(state, 50, screen, snack);
      state = res.state;
      if (res.snackConsumed) {
        consumed = true;
        break;
      }
    }
    expect(consumed).toBe(true);
    expect(state.snacksEaten).toBe(1);
    expect(state.speechBubble).toBe('Yaha!');
  });

  it('steers toward cursorTarget when Play Mode is active and no snack is present', () => {
    const state = {
      ...createInitialUsagiState(screen),
      x: 300,
      y: 300,
      vx: 0,
      vy: 0,
    };
    const cursorTarget = { x: 600, y: 300 };

    const { state: steered } = stepUsagiPhysics(state, 50, screen, null, undefined, cursorTarget);
    expect(steered.vx).toBeGreaterThan(0);
    expect(steered.x).toBeGreaterThan(300);
  });

  it('drifts lazily with Zzz... speech bubble when sleeping is true', () => {
    const sleepingState = {
      ...createInitialUsagiState(screen),
      sleeping: true,
      speechBubble: null,
    };
    const { state: afterStep } = stepUsagiPhysics(sleepingState, 50, screen);
    expect(afterStep.sleeping).toBe(true);
    expect(afterStep.speechBubble).toBe('Zzz...');
  });

  it('clamps extreme dtMs spikes and shrinking screen bounds safely (Review Focus #2 & #3)', () => {
    const initial = createInitialUsagiState(screen);
    // 60-second OS sleep spike should be clamped to 100ms
    const { state: afterSpike } = stepUsagiPhysics(initial, 60_000, screen);
    expect(afterSpike.x).toBeGreaterThanOrEqual(DEFAULT_PHYSICS_CONFIG.spriteRadius);
    expect(afterSpike.x).toBeLessThanOrEqual(screen.width - DEFAULT_PHYSICS_CONFIG.spriteRadius);

    // Shrunk screen bounds
    const smallScreen = { width: 400, height: 300 };
    const { state: clamped } = stepUsagiPhysics({ ...initial, x: 1200, y: 800 }, 16, smallScreen);
    expect(clamped.x).toBeLessThanOrEqual(smallScreen.width - DEFAULT_PHYSICS_CONFIG.spriteRadius);
    expect(clamped.y).toBeLessThanOrEqual(smallScreen.height - DEFAULT_PHYSICS_CONFIG.spriteRadius);
  });
});
