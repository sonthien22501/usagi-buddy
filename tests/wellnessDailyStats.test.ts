import { describe, expect, it } from 'vitest';
import {
  createWellnessState,
  parseWellnessStatsJson,
  serializeWellnessStatsJson,
  tickWellnessCoach,
} from '../src/core/wellnessCoach';

describe('wellness daily stats', () => {
  it('stamps the state with the local calendar day on creation', () => {
    const state = createWellnessState(() => 0.5, new Date(2026, 10, 4, 9, 0, 0));
    expect(state.statsDateYMD).toBe('2026-11-04');
  });

  it('rolls the counters over at local midnight and reports the reset', () => {
    const dayOne = new Date(2026, 10, 4, 23, 55, 0);
    let state = createWellnessState(() => 0.5, dayOne);
    state = { ...state, stats: { snacksFed: 3, pomodorosCompleted: 2, breaksTaken: 1 } };

    // Still the same day: counters preserved.
    const sameDay = tickWellnessCoach(state, 1000, 0, undefined, () => 0.5, dayOne);
    expect(sameDay.state.stats).toEqual({ snacksFed: 3, pomodorosCompleted: 2, breaksTaken: 1 });
    expect(sameDay.statsReset).toBe(false);

    // Cross midnight: counters reset exactly once.
    const nextDay = new Date(2026, 10, 5, 0, 0, 30);
    const rolled = tickWellnessCoach(sameDay.state, 1000, 0, undefined, () => 0.5, nextDay);
    expect(rolled.statsReset).toBe(true);
    expect(rolled.state.statsDateYMD).toBe('2026-11-05');
    expect(rolled.state.stats).toEqual({ snacksFed: 0, pomodorosCompleted: 0, breaksTaken: 0 });

    // A later tick on the new day does not reset again.
    const later = tickWellnessCoach(rolled.state, 1000, 0, undefined, () => 0.5, nextDay);
    expect(later.statsReset).toBe(false);
  });

  it('serializes and restores same-day counters', () => {
    const state = createWellnessState(() => 0.5, new Date(2026, 10, 4, 12, 0, 0));
    const withStats = {
      ...state,
      stats: { snacksFed: 4, pomodorosCompleted: 2, breaksTaken: 7 },
    };

    const raw = serializeWellnessStatsJson(withStats);
    const restored = parseWellnessStatsJson(raw, new Date(2026, 10, 4, 18, 0, 0));
    expect(restored.stats).toEqual(withStats.stats);
    expect(restored.statsDateYMD).toBe('2026-11-04');
  });

  it('discards stale counters from a previous day', () => {
    const raw = JSON.stringify({
      date: '2026-11-03',
      stats: { snacksFed: 9, pomodorosCompleted: 9, breaksTaken: 9 },
    });
    const restored = parseWellnessStatsJson(raw, new Date(2026, 10, 4, 8, 0, 0));
    expect(restored.stats).toEqual({ snacksFed: 0, pomodorosCompleted: 0, breaksTaken: 0 });
    expect(restored.statsDateYMD).toBe('2026-11-04');
  });

  it('recovers safely from malformed or hostile persisted data', () => {
    for (const raw of [
      '',
      'not json',
      '[]',
      'null',
      '{"date":"2026-11-04","stats":"x"}',
      '{"date":"2026-11-04","stats":{"snacksFed":-5,"pomodorosCompleted":"nope","breaksTaken":1.9}}',
    ]) {
      const restored = parseWellnessStatsJson(raw, new Date(2026, 10, 4, 8, 0, 0));
      expect(restored.stats.snacksFed).toBeGreaterThanOrEqual(0);
      expect(restored.stats.pomodorosCompleted).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(restored.stats.breaksTaken)).toBe(true);
    }
  });
});
