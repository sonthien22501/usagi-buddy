export type SoundEvent =
  'click-normal' | 'click-combo' | 'snack-eaten' | 'wellness-reminder' | 'welcome-back';

export const SOUND_ASSET_FILES = [
  'una.mp3',
  'bryy.mp3',
  'huhhhh?.mp3',
  'urararusk.mp3',
  'unayahayahauna.mp3',
  'wuuulaaaa.mp3',
] as const;

export interface SoundState {
  muted: boolean;
  lastPlayedAtMs: number;
  normalClickCounter: number;
  comboClickCounter: number;
  cooldownMs: number;
}

export function createSoundState(muted: boolean = false, cooldownMs: number = 250): SoundState {
  return {
    muted,
    lastPlayedAtMs: -1,
    normalClickCounter: 0,
    comboClickCounter: 0,
    cooldownMs,
  };
}

export function resolveSoundAssetUrl(filename: string, baseDir: string = '../../assets'): string {
  const normalizedBase = baseDir.replace(/\/+$/, '');
  const encodedFilename = encodeURIComponent(filename);
  return `${normalizedBase}/${encodedFilename}`;
}

export function selectSoundForEvent(
  state: SoundState,
  event: SoundEvent,
  nowMs: number,
  baseDir: string = '../../assets'
): { state: SoundState; file: string | null; url: string | null } {
  // Mute gate: silent when muted
  if (state.muted) {
    return { state, file: null, url: null };
  }

  // Cooldown throttle: prevent overlapping sound spam
  if (state.lastPlayedAtMs >= 0 && nowMs - state.lastPlayedAtMs < state.cooldownMs) {
    return { state, file: null, url: null };
  }

  let file: string;
  let nextNormalCounter = state.normalClickCounter;
  let nextComboCounter = state.comboClickCounter;

  switch (event) {
    case 'click-normal': {
      const normalClips = ['una.mp3', 'bryy.mp3'] as const;
      file = normalClips[state.normalClickCounter % normalClips.length];
      nextNormalCounter++;
      break;
    }
    case 'click-combo': {
      const comboClips = ['urararusk.mp3', 'wuuulaaaa.mp3'] as const;
      file = comboClips[state.comboClickCounter % comboClips.length];
      nextComboCounter++;
      break;
    }
    case 'snack-eaten':
    case 'welcome-back': {
      file = 'unayahayahauna.mp3';
      break;
    }
    case 'wellness-reminder': {
      file = 'huhhhh?.mp3';
      break;
    }
  }

  const url = resolveSoundAssetUrl(file, baseDir);

  return {
    state: {
      ...state,
      lastPlayedAtMs: nowMs,
      normalClickCounter: nextNormalCounter,
      comboClickCounter: nextComboCounter,
    },
    file,
    url,
  };
}
