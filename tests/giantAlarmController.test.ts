import { describe, expect, it } from 'vitest';
import {
  calculateSnoozeDurationMs,
  createGiantAlarmState,
  DEFAULT_GIANT_ALARM_CONFIG,
  dismissGiantAlarm,
  formatRepeatActionLabel,
  getGiantAlarmRenderModel,
  isGiantAlarmInteractive,
  tickGiantAlarm,
  triggerGiantAlarm,
} from '../src/core/giantAlarmController';

describe('giantAlarmController', () => {
  it('initializes in idle state and is not interactive', () => {
    const state = createGiantAlarmState();
    expect(state.active).toBe(false);
    expect(state.phase).toBe('idle');
    expect(isGiantAlarmInteractive(state)).toBe(false);

    const render = getGiantAlarmRenderModel(state);
    expect(render.visible).toBe(false);
  });

  it('transitions to entering phase when triggered with high chaos shake', () => {
    const initial = createGiantAlarmState();
    const state = triggerGiantAlarm(initial);

    expect(state.active).toBe(true);
    expect(state.phase).toBe('entering');
    expect(state.shakeIntensity).toBeGreaterThan(5);
    expect(isGiantAlarmInteractive(state)).toBe(true);

    const render = getGiantAlarmRenderModel(state);
    expect(render.visible).toBe(true);
    expect(render.backdropAlpha).toBeGreaterThan(0);
    expect(render.speedLinesAlpha).toBeGreaterThan(0);
  });

  it('progresses from entering to present phase as time elapses', () => {
    let state = triggerGiantAlarm(createGiantAlarmState());
    expect(state.phase).toBe('entering');

    // Tick past enterDurationMs
    state = tickGiantAlarm(state, DEFAULT_GIANT_ALARM_CONFIG.enterDurationMs + 50);
    expect(state.phase).toBe('present');
    expect(state.active).toBe(true);
    expect(isGiantAlarmInteractive(state)).toBe(true);

    const render = getGiantAlarmRenderModel(state);
    expect(render.scale).toBeCloseTo(1.0, 1);
  });

  it('wobbles and decays shake intensity during present phase', () => {
    let state = triggerGiantAlarm(createGiantAlarmState());
    state = tickGiantAlarm(state, DEFAULT_GIANT_ALARM_CONFIG.enterDurationMs + 100);

    const initialShake = state.shakeIntensity;
    state = tickGiantAlarm(state, 500);
    expect(state.shakeIntensity).toBeLessThan(initialShake);
    expect(state.wobbleRad).toBeDefined();
  });

  it('enters dismissing phase when dismiss is invoked', () => {
    let state = triggerGiantAlarm(createGiantAlarmState());
    state = tickGiantAlarm(state, 200);

    state = dismissGiantAlarm(state);
    expect(state.phase).toBe('dismissing');
    expect(state.dismissTriggered).toBe(true);
    expect(isGiantAlarmInteractive(state)).toBe(true);

    // Tick past dismissDurationMs
    state = tickGiantAlarm(state, DEFAULT_GIANT_ALARM_CONFIG.dismissDurationMs + 50);
    expect(state.phase).toBe('idle');
    expect(state.active).toBe(false);
    expect(isGiantAlarmInteractive(state)).toBe(false);
  });

  it('computes screen shake offsets and comic bubble text correctly in render model', () => {
    let state = triggerGiantAlarm(createGiantAlarmState());
    state = tickGiantAlarm(state, 50);

    const render = getGiantAlarmRenderModel(state, () => 0.75);
    expect(render.shakeOffsetX).not.toBe(0);
    expect(render.speechText).toContain('YAHA');
    expect(render.hintText.toLowerCase()).toContain('click');
  });

  it('formats repeat action labels accurately for minutes and hours', () => {
    expect(formatRepeatActionLabel(20 * 60_000)).toBe('Study Another 20m');
    expect(formatRepeatActionLabel(25 * 60_000)).toBe('Study Another 25m');
    expect(formatRepeatActionLabel(40 * 60_000)).toBe('Study Another 40m');
    expect(formatRepeatActionLabel(60 * 60_000)).toBe('Study Another 1h');
    expect(formatRepeatActionLabel(120 * 60_000)).toBe('Study Another 2h');
    expect(formatRepeatActionLabel(0)).toBe('Study Another 25m');
    expect(formatRepeatActionLabel(NaN)).toBe('Study Another 25m');
  });

  it('calculates snooze and break durations accurately with minimum safety bounds', () => {
    expect(calculateSnoozeDurationMs(5)).toBe(300_000);
    expect(calculateSnoozeDurationMs(10)).toBe(600_000);
    expect(calculateSnoozeDurationMs(0)).toBe(60_000);
  });
});
