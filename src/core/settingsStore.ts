import {
  isKnownCostumeId,
  isKnownOutfitSelection,
  type CostumeId,
  type OutfitSelection,
} from './costumeManager';
import { DEFAULT_POMODORO_MS, type PomodoroPhase } from './pomodoroTimer';
import { DEFAULT_VOLUME_CONFIG, type VolumeConfig } from './soundManager';
import { SupportedLocale, detectSystemLocale, isSupportedLocale } from './i18n';

export type DashboardTabId = 'companion' | 'config';

export interface UserSettings {
  costumeSelection: OutfitSelection;
  activeCostume: CostumeId;
  fixedAppearance: boolean;
  timerDurationMs: number;
  timerRemainingMs: number;
  timerPhase: PomodoroPhase;
  volumeConfig: VolumeConfig;
  soundMuted: boolean;
  ghostLocked: boolean;
  playModeEnabled: boolean;
  stationaryMode: boolean;
  usagiHidden: boolean;
  usagiX?: number | null;
  usagiY?: number | null;
  activeDashboardTab?: DashboardTabId;
  locale?: SupportedLocale;
}

export interface ModeFlags {
  ghostLocked: boolean;
  playModeEnabled: boolean;
  stationaryMode: boolean;
  usagiHidden: boolean;
}

export type ModeToggleAction =
  | { type: 'toggle-ghost' }
  | { type: 'toggle-play' }
  | { type: 'toggle-stationary' }
  | { type: 'toggle-hidden' };

export function createDefaultUserSettings(): UserSettings {
  return {
    costumeSelection: 'classic',
    activeCostume: 'classic',
    fixedAppearance: false,
    timerDurationMs: DEFAULT_POMODORO_MS,
    timerRemainingMs: DEFAULT_POMODORO_MS,
    timerPhase: 'idle',
    volumeConfig: { ...DEFAULT_VOLUME_CONFIG },
    soundMuted: false,
    ghostLocked: false,
    playModeEnabled: false,
    stationaryMode: false,
    usagiHidden: false,
    usagiX: null,
    usagiY: null,
    activeDashboardTab: 'companion',
    locale: detectSystemLocale(),
  };
}

const MIN_POMODORO_DURATION_MS = 60_000; // 1 minute
const MAX_POMODORO_DURATION_MS = 43_200_000; // 12 hours

/**
 * Resolves the canonical userData directory from an Electron `appData` path.
 * Pure, dependency-free string handling: works for POSIX and Windows separators
 * without pulling a `node:` import into the browser renderer bundles.
 * No filesystem or `app` access.
 */
export function resolveCanonicalUserDataPath(appDataDir: string): string {
  const trimmed = appDataDir.replace(/[\\/]+$/, '');
  return `${trimmed}/usagi-buddy`;
}

export function parseUserSettingsJson(raw: string | null | undefined): UserSettings {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return createDefaultUserSettings();
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return createDefaultUserSettings();
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return createDefaultUserSettings();
  }

  const costumeSelection: OutfitSelection =
    typeof data.costumeSelection === 'string' && isKnownOutfitSelection(data.costumeSelection)
      ? data.costumeSelection
      : 'classic';

  let activeCostume: CostumeId = 'classic';
  if (typeof data.activeCostume === 'string' && isKnownCostumeId(data.activeCostume)) {
    activeCostume = data.activeCostume;
  } else if (costumeSelection !== 'random' && isKnownCostumeId(costumeSelection)) {
    activeCostume = costumeSelection;
  }

  const fixedAppearance = typeof data.fixedAppearance === 'boolean' ? data.fixedAppearance : false;

  let timerDurationMs = DEFAULT_POMODORO_MS;
  if (
    typeof data.timerDurationMs === 'number' &&
    Number.isFinite(data.timerDurationMs) &&
    data.timerDurationMs >= MIN_POMODORO_DURATION_MS &&
    data.timerDurationMs <= MAX_POMODORO_DURATION_MS
  ) {
    timerDurationMs = data.timerDurationMs;
  }

  let timerRemainingMs = timerDurationMs;
  if (typeof data.timerRemainingMs === 'number' && Number.isFinite(data.timerRemainingMs)) {
    const clamped = Math.min(Math.max(data.timerRemainingMs, 0), timerDurationMs);
    timerRemainingMs = clamped <= 0 ? timerDurationMs : clamped;
  }

  let timerPhase: PomodoroPhase = 'idle';
  if (
    (data.timerPhase === 'running' || data.timerPhase === 'paused') &&
    timerRemainingMs > 0 &&
    timerRemainingMs < timerDurationMs
  ) {
    timerPhase = 'paused';
  }

  const parseVol = (val: any, fallback: number): number => {
    if (typeof val === 'number' && Number.isFinite(val)) {
      return Math.min(Math.max(val, 0), 1);
    }
    return fallback;
  };

  const rawVol =
    data.volumeConfig && typeof data.volumeConfig === 'object' ? data.volumeConfig : {};
  const volumeConfig: VolumeConfig = {
    master: parseVol(rawVol.master, DEFAULT_VOLUME_CONFIG.master),
    buddy: parseVol(rawVol.buddy, DEFAULT_VOLUME_CONFIG.buddy),
    alarm: parseVol(rawVol.alarm, DEFAULT_VOLUME_CONFIG.alarm),
    equalizeLoudness:
      typeof rawVol.equalizeLoudness === 'boolean'
        ? rawVol.equalizeLoudness
        : DEFAULT_VOLUME_CONFIG.equalizeLoudness,
  };

  const soundMuted = typeof data.soundMuted === 'boolean' ? data.soundMuted : false;
  const ghostLocked = typeof data.ghostLocked === 'boolean' ? data.ghostLocked : false;
  const playModeEnabled = typeof data.playModeEnabled === 'boolean' ? data.playModeEnabled : false;
  let stationaryMode = typeof data.stationaryMode === 'boolean' ? data.stationaryMode : false;
  if (playModeEnabled && stationaryMode) {
    stationaryMode = false;
  }
  const usagiHidden = typeof data.usagiHidden === 'boolean' ? data.usagiHidden : false;

  const usagiX =
    typeof data.usagiX === 'number' && Number.isFinite(data.usagiX)
      ? Math.round(data.usagiX)
      : null;
  const usagiY =
    typeof data.usagiY === 'number' && Number.isFinite(data.usagiY)
      ? Math.round(data.usagiY)
      : null;
  const activeDashboardTab: DashboardTabId =
    data.activeDashboardTab === 'config' ? 'config' : 'companion';

  const locale: SupportedLocale =
    typeof data.locale === 'string' && isSupportedLocale(data.locale)
      ? data.locale
      : detectSystemLocale();

  return {
    costumeSelection,
    activeCostume,
    fixedAppearance,
    timerDurationMs,
    timerRemainingMs,
    timerPhase,
    volumeConfig,
    soundMuted,
    ghostLocked,
    playModeEnabled,
    stationaryMode,
    usagiHidden,
    usagiX,
    usagiY,
    activeDashboardTab,
    locale,
  };
}

export function serializeUserSettingsJson(settings: UserSettings): string {
  return JSON.stringify(settings, null, 2);
}

export function resolveModeTransition(current: ModeFlags, action: ModeToggleAction): ModeFlags {
  switch (action.type) {
    case 'toggle-ghost':
      return {
        ...current,
        ghostLocked: !current.ghostLocked,
      };
    case 'toggle-play': {
      const nextPlay = !current.playModeEnabled;
      return {
        ...current,
        playModeEnabled: nextPlay,
        stationaryMode: nextPlay ? false : current.stationaryMode,
        usagiHidden: nextPlay ? false : current.usagiHidden,
      };
    }
    case 'toggle-stationary': {
      const nextStationary = !current.stationaryMode;
      return {
        ...current,
        stationaryMode: nextStationary,
        playModeEnabled: nextStationary ? false : current.playModeEnabled,
        usagiHidden: nextStationary ? false : current.usagiHidden,
      };
    }
    case 'toggle-hidden':
      return {
        ...current,
        usagiHidden: !current.usagiHidden,
      };
  }
}

export function shouldFollowCursor(modes: ModeFlags): boolean {
  return modes.playModeEnabled && !modes.stationaryMode && !modes.usagiHidden;
}
