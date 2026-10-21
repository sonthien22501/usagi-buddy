import { ScreenBounds, SnackTarget } from './physicsEngine';

export type PomodoroPhase = 'idle' | 'running' | 'paused' | 'completed';

export interface PomodoroState {
  phase: PomodoroPhase;
  remainingMs: number;
  durationMs: number;
  completedCount: number;
}

export const DEFAULT_POMODORO_MS = 1_500_000; // 25 minutes

export function createPomodoroTimer(durationMs: number = DEFAULT_POMODORO_MS): PomodoroState {
  const duration = Math.max(0, durationMs);
  return {
    phase: 'idle',
    remainingMs: duration,
    durationMs: duration,
    completedCount: 0,
  };
}

export function startPomodoro(state: PomodoroState): PomodoroState {
  if (state.phase === 'running') {
    return state;
  }
  const remaining = state.remainingMs <= 0 ? state.durationMs : state.remainingMs;
  return {
    ...state,
    phase: 'running',
    remainingMs: remaining,
  };
}

export function pausePomodoro(state: PomodoroState): PomodoroState {
  if (state.phase !== 'running') {
    return state;
  }
  return {
    ...state,
    phase: 'paused',
  };
}

export function resetPomodoro(state: PomodoroState): PomodoroState {
  return {
    ...state,
    phase: 'idle',
    remainingMs: state.durationMs,
  };
}

export function formatPomodoroTime(remainingMs: number): string {
  if (remainingMs <= 0 || Number.isNaN(remainingMs)) {
    return '00:00';
  }
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function spawnSnackOnScreen(
  screen: ScreenBounds,
  margin: number = 80,
  rng: () => number = Math.random
): SnackTarget {
  const minX = margin;
  const maxX = Math.max(minX, screen.width - margin);
  const minY = margin;
  const maxY = Math.max(minY, screen.height - margin);

  const rawRngX = rng();
  const rawRngY = rng();
  const clampedRngX = Math.max(0, Math.min(1, Number.isFinite(rawRngX) ? rawRngX : 0.5));
  const clampedRngY = Math.max(0, Math.min(1, Number.isFinite(rawRngY) ? rawRngY : 0.5));

  const x = minX + clampedRngX * (maxX - minX);
  const y = minY + clampedRngY * (maxY - minY);

  return {
    x,
    y,
    active: true,
    radius: 28,
  };
}

export function tickPomodoro(
  state: PomodoroState,
  elapsedMs: number,
  screen: ScreenBounds,
  margin: number = 80,
  rng: () => number = Math.random
): { state: PomodoroState; spawnedSnack: SnackTarget | null } {
  if (state.phase !== 'running') {
    return { state, spawnedSnack: null };
  }

  const dt = Math.max(0, elapsedMs);
  const nextRemaining = Math.max(0, state.remainingMs - dt);

  if (nextRemaining === 0) {
    const spawnedSnack = spawnSnackOnScreen(screen, margin, rng);
    return {
      state: {
        ...state,
        phase: 'completed',
        remainingMs: 0,
        completedCount: state.completedCount + 1,
      },
      spawnedSnack,
    };
  }

  return {
    state: {
      ...state,
      remainingMs: nextRemaining,
    },
    spawnedSnack: null,
  };
}
