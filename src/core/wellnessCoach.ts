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
  /** Local calendar day (YYYY-MM-DD) the daily counters belong to. */
  statsDateYMD: string;
}

export interface WellnessTickResult {
  state: WellnessState;
  reminderMessage: string | null;
  enteredSleep: boolean;
  welcomeBack: boolean;
  /** True on the first tick after the local calendar day rolled over. */
  statsReset: boolean;
}

export const DEFAULT_WELLNESS_CONFIG: WellnessConfig = {
  reminderMinMs: 1_200_000, // 20 minutes
  reminderMaxMs: 2_400_000, // 40 minutes
  afkThresholdSeconds: 600, // 10 minutes
};

export const WATER_REMINDER_MESSAGE = '💧 Huhhhh? Sip some water~';

export function createEmptyDailyStats(): DailyStats {
  return {
    snacksFed: 0,
    pomodorosCompleted: 0,
    breaksTaken: 0,
  };
}

/** Local (not UTC) YYYY-MM-DD, so counters roll over at the user's midnight. */
export function localDateYMD(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Resets the daily counters if the local calendar day changed. */
export function rollWellnessStatsForDate(
  state: WellnessState,
  now: Date = new Date()
): WellnessState {
  const todayYMD = localDateYMD(now);
  if (state.statsDateYMD === todayYMD) {
    return state;
  }
  return {
    ...state,
    statsDateYMD: todayYMD,
    stats: createEmptyDailyStats(),
  };
}

export interface PersistedWellnessStats {
  statsDateYMD: string;
  stats: DailyStats;
}

export function serializeWellnessStatsJson(state: WellnessState): string {
  return JSON.stringify(
    {
      date: state.statsDateYMD,
      stats: state.stats,
    },
    null,
    2
  );
}

/**
 * Restores same-day counters. Stale, malformed, or hostile data yields zeroed
 * counters for today, so a corrupt file never resurrects yesterday's stats.
 */
export function parseWellnessStatsJson(
  raw: string | null | undefined,
  now: Date = new Date()
): PersistedWellnessStats {
  const todayYMD = localDateYMD(now);
  const fallback: PersistedWellnessStats = {
    statsDateYMD: todayYMD,
    stats: createEmptyDailyStats(),
  };

  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fallback;
    }
    if (parsed.date !== todayYMD || !parsed.stats || typeof parsed.stats !== 'object') {
      return fallback;
    }

    const count = (value: unknown): number =>
      typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

    return {
      statsDateYMD: todayYMD,
      stats: {
        snacksFed: count(parsed.stats.snacksFed),
        pomodorosCompleted: count(parsed.stats.pomodorosCompleted),
        breaksTaken: count(parsed.stats.breaksTaken),
      },
    };
  } catch {
    return fallback;
  }
}

export function drawReminderIntervalMs(
  rng: () => number = Math.random,
  config: Partial<WellnessConfig> = DEFAULT_WELLNESS_CONFIG
): number {
  const cfg = { ...DEFAULT_WELLNESS_CONFIG, ...config };
  return cfg.reminderMinMs + rng() * (cfg.reminderMaxMs - cfg.reminderMinMs);
}

export function createWellnessState(
  rng: () => number = Math.random,
  now: Date = new Date()
): WellnessState {
  return {
    activeScreenMs: 0,
    mood: 'active',
    nextReminderAtMs: drawReminderIntervalMs(rng),
    stats: createEmptyDailyStats(),
    statsDateYMD: localDateYMD(now),
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
  rng?: () => number,
  now: Date = new Date()
): WellnessTickResult {
  const cfg = { ...DEFAULT_WELLNESS_CONFIG, ...config };
  const rand = rng ?? Math.random;

  // Daily counters belong to the local calendar day, not to the app session.
  const rolledState = rollWellnessStatsForDate(state, now);
  const statsReset = rolledState !== state;
  state = rolledState;

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
        statsReset,
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
        statsReset,
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
      statsReset,
    };
  }

  // Currently sleeping (mood === 'sleeping')
  if (!isIdle) {
    // User has returned from break!
    const candidateActiveMs = state.activeScreenMs + Math.max(0, elapsedMs);
    const shouldRemind = candidateActiveMs >= state.nextReminderAtMs;

    return {
      state: {
        ...state,
        mood: 'active',
        // Preserve activeScreenMs if not reminded, or reset to 0 if reminder triggered
        activeScreenMs: shouldRemind ? 0 : state.activeScreenMs,
        nextReminderAtMs: shouldRemind ? drawReminderIntervalMs(rand, cfg) : state.nextReminderAtMs,
        stats: {
          ...state.stats,
          breaksTaken: state.stats.breaksTaken + 1,
        },
      },
      reminderMessage: shouldRemind ? WATER_REMINDER_MESSAGE : null,
      enteredSleep: false,
      welcomeBack: true,
      statsReset,
    };
  }

  // Still sleeping: do not accumulate activeScreenMs
  return {
    state,
    reminderMessage: null,
    enteredSleep: false,
    welcomeBack: false,
    statsReset,
  };
}
