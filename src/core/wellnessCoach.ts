export interface DailyStats {
  snacksFed: number;
  pomodorosCompleted: number;
  breaksTaken: number;
}

export interface WellnessConfig {
  readonly reminderIntervalMs: number;
  readonly afkThresholdSeconds: number;
}

export interface WellnessState {
  activeScreenMs: number;
  mood: 'active' | 'sleeping';
  reminderIndex: number;
  stats: DailyStats;
}

export interface WellnessTickResult {
  state: WellnessState;
  reminderMessage: string | null;
  enteredSleep: boolean;
  welcomeBack: boolean;
}

export const DEFAULT_WELLNESS_CONFIG: WellnessConfig = {
  reminderIntervalMs: 30 * 60 * 1000, // 30 minutes
  afkThresholdSeconds: 120, // 2 minutes
};

export const GENTLE_WELLNESS_MESSAGES: readonly string[] = [
  '💧 Una! Sip some water~',
  '👀 Yaha! Rest your eyes for a bit~',
  '🧘 Ura~ Little stretch if you want!',
] as const;

export function createWellnessState(): WellnessState {
  return {
    activeScreenMs: 0,
    mood: 'active',
    reminderIndex: 0,
    stats: {
      snacksFed: 0,
      pomodorosCompleted: 0,
      breaksTaken: 0,
    },
  };
}

export function recordSnackFed(state: WellnessState): WellnessState {
  return {
    ...state,
    stats: {
      ...state.stats,
      snacksFed: state.stats.snacksFed + 1,
    },
  };
}

export function recordPomodoroCompleted(state: WellnessState): WellnessState {
  return {
    ...state,
    stats: {
      ...state.stats,
      pomodorosCompleted: state.stats.pomodorosCompleted + 1,
    },
  };
}

export function formatStatsTrayLabel(stats: DailyStats): string {
  return `🍮 Snacks: ${stats.snacksFed} | 🍅 Pomodoros: ${stats.pomodorosCompleted} | 💧 Breaks: ${stats.breaksTaken}`;
}

export function tickWellnessCoach(
  state: WellnessState,
  elapsedMs: number,
  systemIdleSeconds: number,
  config?: Partial<WellnessConfig>
): WellnessTickResult {
  const cfg = { ...DEFAULT_WELLNESS_CONFIG, ...config };
  const isIdle = systemIdleSeconds >= cfg.afkThresholdSeconds;

  if (state.mood === 'active') {
    if (isIdle) {
      // Enter AFK sleep mode: pause active screen time accumulation
      return {
        state: {
          ...state,
          mood: 'sleeping',
        },
        reminderMessage: null,
        enteredSleep: true,
        welcomeBack: false,
      };
    }

    // Active screen time accumulation
    const nextActiveMs = state.activeScreenMs + Math.max(0, elapsedMs);

    if (nextActiveMs >= cfg.reminderIntervalMs) {
      const reminderMessage =
        GENTLE_WELLNESS_MESSAGES[state.reminderIndex % GENTLE_WELLNESS_MESSAGES.length];
      const nextReminderIndex = state.reminderIndex + 1;

      // Immediately reset activeScreenMs to 0 so it never nags repeatedly
      return {
        state: {
          ...state,
          activeScreenMs: 0,
          reminderIndex: nextReminderIndex,
        },
        reminderMessage,
        enteredSleep: false,
        welcomeBack: false,
      };
    }

    return {
      state: {
        ...state,
        activeScreenMs: nextActiveMs,
      },
      reminderMessage: null,
      enteredSleep: false,
      welcomeBack: false,
    };
  }

  // Currently sleeping (mood === 'sleeping')
  if (!isIdle) {
    // User has returned from break!
    return {
      state: {
        ...state,
        mood: 'active',
        activeScreenMs: 0,
        stats: {
          ...state.stats,
          breaksTaken: state.stats.breaksTaken + 1,
        },
      },
      reminderMessage: null,
      enteredSleep: false,
      welcomeBack: true,
    };
  }

  // Still sleeping: do not accumulate activeScreenMs
  return {
    state,
    reminderMessage: null,
    enteredSleep: false,
    welcomeBack: false,
  };
}
