import { describe, expect, it } from 'vitest';
import {
  createPomodoroTimer,
  DEFAULT_POMODORO_MS,
  formatPomodoroTime,
  pausePomodoro,
  resetPomodoro,
  startPomodoro,
  tickPomodoro,
} from '../src/core/pomodoroTimer';

describe('pomodoroTimer', () => {
  const screen = { width: 1440, height: 900 };

  it('initializes with a 25-minute countdown and formats MM:SS accurately', () => {
    const timer = createPomodoroTimer();
    expect(timer.durationMs).toBe(DEFAULT_POMODORO_MS);
    expect(formatPomodoroTime(timer.remainingMs)).toBe('25:00');
    expect(formatPomodoroTime(65_000)).toBe('01:05');
    expect(formatPomodoroTime(500)).toBe('00:01');
    expect(formatPomodoroTime(0)).toBe('00:00');
    expect(formatPomodoroTime(-500)).toBe('00:00');
  });

  it('transitions idle -> running -> paused -> reset cleanly', () => {
    let timer = createPomodoroTimer();
    timer = startPomodoro(timer);
    expect(timer.phase).toBe('running');

    timer = tickPomodoro(timer, 60_000, screen).state;
    expect(timer.remainingMs).toBe(DEFAULT_POMODORO_MS - 60_000);

    timer = pausePomodoro(timer);
    expect(timer.phase).toBe('paused');
    // Ticking while paused does not decrement
    timer = tickPomodoro(timer, 60_000, screen).state;
    expect(timer.remainingMs).toBe(DEFAULT_POMODORO_MS - 60_000);

    timer = resetPomodoro(timer);
    expect(timer.phase).toBe('idle');
    expect(timer.remainingMs).toBe(DEFAULT_POMODORO_MS);
  });

  it('drops a clamped snack on screen exactly once when 25-min timer completes (Review Focus #5)', () => {
    let timer = startPomodoro(createPomodoroTimer(10_000));
    const res1 = tickPomodoro(timer, 10_500, screen, 80, () => 0.5);
    expect(res1.state.phase).toBe('completed');
    expect(res1.state.remainingMs).toBe(0);
    expect(res1.state.completedCount).toBe(1);
    expect(res1.spawnedSnack).toEqual({
      x: 720,
      y: 450,
      active: true,
      radius: 28,
    });

    // Subsequent ticks while completed must not spawn duplicate snacks
    const res2 = tickPomodoro(res1.state, 1_000, screen, 80, () => 0.5);
    expect(res2.spawnedSnack).toBeNull();
    expect(res2.state.completedCount).toBe(1);
  });
});
