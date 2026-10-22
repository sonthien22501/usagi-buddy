export interface DailyStats {
  snacksFed: number;
  pomodorosCompleted: number;
  breaksTaken: number;
}

export interface WellnessConfig {
  readonly reminderMinMs: number;
  readonly reminderMaxMs: number;
  readonly afkThresholdSeconds: number;
}

export interface WellnessState {
  activeScreenMs: number;
  mood: 'active' | 'sleeping';
  nextReminderAtMs: number;
  stats: DailyStats;
}

export interface WellnessTickResult {
  state: WellnessState;
  reminderMessage: string | null;
  enteredSleep: boolean;
  welcomeBack: boolean;
}

export const DEFAULT_WELLNESS_CONFIG: WellnessConfig = {
  reminderMinMs: 1_200_000, // 20 minutes
  reminderMaxMs: 2_400_000, // 40 minutes
  afkThresholdSeconds: 120, // 2 minutes
};

export const WATER_REMINDER_MESSAGE = '💧 Huhhhh? Sip some water~';

export function drawReminderIntervalMs(
  rng: () => number = Math.random,
  config: Partial<WellnessConfig> = DEFAULT_WELLNESS_CONFIG
): number {
  const cfg = { ...DEFAULT_WELLNESS_CONFIG, ...config };
  return cfg.reminderMinMs + rng() * (cfg.reminderMaxMs - cfg.reminderMinMs);
}

export function createWellnessState(rng: () => number = Math.random): WellnessState {
  return {
    activeScreenMs: 0,
    mood: 'active',
    nextReminderAtMs: drawReminderIntervalMs(rng),
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
  config?: Partial<WellnessConfig>,
  rng?: () => number
): WellnessTickResult {
  const cfg = { ...DEFAULT_WELLNESS_CONFIG, ...config };
  const rand = rng ?? Math.random;
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

    if (nextActiveMs >= state.nextReminderAtMs) {
      const nextState: WellnessState = {
        ...state,
        activeScreenMs: 0,
        nextReminderAtMs: drawReminderIntervalMs(rand, cfg),
      };

      // Immediately reset activeScreenMs to 0 so it never nags repeatedly
      return {
        state: nextState,
        reminderMessage: WATER_REMINDER_MESSAGE,
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
        // Preserve activeScreenMs so brief pauses/reading do not wipe water reminder countdown
        activeScreenMs: state.activeScreenMs,
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
