import { describe, expect, it } from 'vitest';
import {
  createWellnessState,
  DEFAULT_WELLNESS_CONFIG,
  drawReminderIntervalMs,
  formatStatsTrayLabel,
  WATER_REMINDER_MESSAGE,
  recordPomodoroCompleted,
  recordSnackFed,
  tickWellnessCoach,
} from '../src/core/wellnessCoach';

describe('wellnessCoach', () => {
  it('accumulates activeScreenMs while active and emits the water reminder within the randomized 30-40 minute interval, immediately resetting activeScreenMs to avoid nagging (Review Focus #3)', () => {
    let state = createWellnessState(() => 0);
    expect(state.activeScreenMs).toBe(0);
    expect(state.mood).toBe('active');
    // First reminder interval is drawn from rng (here: minimum -> 30 min)
    expect(state.nextReminderAtMs).toBe(DEFAULT_WELLNESS_CONFIG.reminderMinMs);

    // Tick 29 minutes while active (system idle = 5s < 120s) -> no reminder yet
    const twentyNineMins = 29 * 60 * 1000;
    const res1 = tickWellnessCoach(state, twentyNineMins, 5);
    state = res1.state;
    expect(state.activeScreenMs).toBe(twentyNineMins);
    expect(res1.reminderMessage).toBeNull();
    expect(res1.enteredSleep).toBe(false);

    // Tick past the drawn interval -> emits the water reminder and IMMEDIATELY resets activeScreenMs
    const twoMins = 2 * 60 * 1000;
    const res2 = tickWellnessCoach(state, twoMins, 5, undefined, () => 0.5);
    state = res2.state;

    expect(res2.reminderMessage).toBe(WATER_REMINDER_MESSAGE);
    expect(state.activeScreenMs).toBe(0);
    // Next reminder interval is redrawn from the passed rng (here: () => 0.5 -> 35 min)
    expect(state.nextReminderAtMs).toBe(2_100_000);

    // Immediate next tick does not nag again
    const res3 = tickWellnessCoach(state, 5_000, 5, undefined, () => 0.5);
    expect(res3.reminderMessage).toBeNull();
    expect(res3.state.activeScreenMs).toBe(5_000);
  });

  it('draws randomized water reminder intervals within the 30-40 minute bounds', () => {
    expect(drawReminderIntervalMs(() => 0)).toBe(1_800_000);
    expect(drawReminderIntervalMs(() => 0.5)).toBe(2_100_000);
    expect(drawReminderIntervalMs(() => 1)).toBe(2_400_000);
  });

  it('emits the water reminder once per randomized interval and redraws the next one', () => {
    let state = createWellnessState(() => 0);

    const r1 = tickWellnessCoach(state, 1_799_999, 5);
    expect(r1.reminderMessage).toBeNull();

    const r2 = tickWellnessCoach(r1.state, 1, 5, undefined, () => 0.5);
    expect(r2.reminderMessage).toBe(WATER_REMINDER_MESSAGE);
    expect(r2.state.nextReminderAtMs).toBe(2_100_000);

    // Subsequent reminder fires again with the same water message and redraws the interval
    const r3 = tickWellnessCoach(r2.state, 2_100_000, 5, undefined, () => 0.5);
    expect(r3.reminderMessage).toBe(WATER_REMINDER_MESSAGE);
    expect(r3.state.nextReminderAtMs).toBe(2_100_000);
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
    const res = tickWellnessCoach(state, 5000, 2, undefined, () => 0.5);
    expect(res.welcomeBack).toBe(true);
    expect(res.state.mood).toBe('active');
    expect(res.state.activeScreenMs).toBe(0);
    expect(res.state.stats.breaksTaken).toBe(1);
    // Waking from AFK redraws the next reminder interval from rng
    expect(res.state.nextReminderAtMs).toBe(2_100_000);
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
