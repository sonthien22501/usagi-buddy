import { describe, expect, it } from 'vitest';
import {
  createWellnessState,
  DEFAULT_WELLNESS_CONFIG,
  formatStatsTrayLabel,
  GENTLE_WELLNESS_MESSAGES,
  recordPomodoroCompleted,
  recordSnackFed,
  tickWellnessCoach,
} from '../src/core/wellnessCoach';

describe('wellnessCoach', () => {
  it('accumulates activeScreenMs while active and emits gentle reminder every 30 minutes, immediately resetting activeScreenMs to avoid nagging (Review Focus #3)', () => {
    let state = createWellnessState();
    expect(state.activeScreenMs).toBe(0);
    expect(state.mood).toBe('active');

    // Tick 29 minutes while active (system idle = 5s < 120s)
    const twentyNineMins = 29 * 60 * 1000;
    const res1 = tickWellnessCoach(state, twentyNineMins, 5);
    state = res1.state;
    expect(state.activeScreenMs).toBe(twentyNineMins);
    expect(res1.reminderMessage).toBeNull();
    expect(res1.enteredSleep).toBe(false);

    // Tick another 2 minutes (exceeding 30 min interval)
    const twoMins = 2 * 60 * 1000;
    const res2 = tickWellnessCoach(state, twoMins, 5);
    state = res2.state;

    // Emits message and IMMEDIATELY resets activeScreenMs to 0
    expect(res2.reminderMessage).toBe(GENTLE_WELLNESS_MESSAGES[0]);
    expect(state.activeScreenMs).toBe(0);

    // Immediate next tick does not nag again
    const res3 = tickWellnessCoach(state, 5000, 5);
    expect(res3.reminderMessage).toBeNull();
    expect(res3.state.activeScreenMs).toBe(5000);
  });

  it('cycles through gentle wellness messages on subsequent reminders', () => {
    let state = createWellnessState();
    const halfHour = DEFAULT_WELLNESS_CONFIG.reminderIntervalMs;

    const r1 = tickWellnessCoach(state, halfHour, 10);
    expect(r1.reminderMessage).toBe(GENTLE_WELLNESS_MESSAGES[0]);

    const r2 = tickWellnessCoach(r1.state, halfHour, 10);
    expect(r2.reminderMessage).toBe(GENTLE_WELLNESS_MESSAGES[1]);

    const r3 = tickWellnessCoach(r2.state, halfHour, 10);
    expect(r3.reminderMessage).toBe(GENTLE_WELLNESS_MESSAGES[2]);

    const r4 = tickWellnessCoach(r3.state, halfHour, 10);
    expect(r4.reminderMessage).toBe(GENTLE_WELLNESS_MESSAGES[0]);
  });

  it('enters sleep mode after 2 minutes of OS idle and halts activeScreenMs accumulation (Review Focus #4)', () => {
    let state = createWellnessState();
    // 125 seconds of system idle (>= 120s AFK threshold)
    const res = tickWellnessCoach(state, 5000, 125);
    state = res.state;

    expect(res.enteredSleep).toBe(true);
    expect(state.mood).toBe('sleeping');
    // Active screen time should not accumulate during sleep
    expect(state.activeScreenMs).toBe(0);

    // Further ticks while idle stay asleep and do not accumulate activeScreenMs
    const resSleeping = tickWellnessCoach(state, 5000, 130);
    expect(resSleeping.state.mood).toBe('sleeping');
    expect(resSleeping.enteredSleep).toBe(false);
    expect(resSleeping.state.activeScreenMs).toBe(0);
  });

  it('wakes up when user returns, sets welcomeBack, resets activeScreenMs, and increments breaksTaken (Review Focus #4)', () => {
    let state = {
      ...createWellnessState(),
      mood: 'sleeping' as const,
      activeScreenMs: 15_000,
    };

    // User moves mouse: system idle drops to 2s (< 120s)
    const res = tickWellnessCoach(state, 5000, 2);
    expect(res.welcomeBack).toBe(true);
    expect(res.state.mood).toBe('active');
    expect(res.state.activeScreenMs).toBe(0);
    expect(res.state.stats.breaksTaken).toBe(1);
  });

  it('accurately records snacks, pomodoros, and formats daily stats for tray label', () => {
    let state = createWellnessState();
    state = recordSnackFed(state);
    state = recordSnackFed(state);
    state = recordPomodoroCompleted(state);

    const statsWithBreaks = {
      ...state.stats,
      breaksTaken: 3,
    };

    const label = formatStatsTrayLabel(statsWithBreaks);
    expect(label).toBe('🍮 Snacks: 2 | 🍅 Pomodoros: 1 | 💧 Breaks: 3');
  });
});
