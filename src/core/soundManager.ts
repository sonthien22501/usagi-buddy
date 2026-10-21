export type SoundEvent =
  'click-normal' | 'click-combo' | 'snack-eaten' | 'wellness-reminder' | 'welcome-back';

export const SOUND_ASSET_FILES = [
  'una.mp3',
  'bryy.mp3',
  'huhhhh.mp3',
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

export function voiceTextForFile(file: string): string {
  const base = file.replace(/\.mp3$/, '');
  const capitalized = base.charAt(0).toUpperCase() + base.slice(1);
  if (base.toLowerCase().startsWith('huhhhh')) {
    return 'Huhhhh?';
  }
  return capitalized.endsWith('?') ? capitalized : `${capitalized}!`;
}

function resolveClipFile(
  state: SoundState,
  event: SoundEvent
): { file: string; nextNormalCounter: number; nextComboCounter: number } {
  switch (event) {
    case 'click-normal': {
      const normalClips = ['una.mp3', 'bryy.mp3'] as const;
      return {
        file: normalClips[state.normalClickCounter % normalClips.length],
        nextNormalCounter: state.normalClickCounter + 1,
        nextComboCounter: state.comboClickCounter,
      };
    }
    case 'click-combo': {
      const comboClips = ['urararusk.mp3', 'wuuulaaaa.mp3'] as const;
      return {
        file: comboClips[state.comboClickCounter % comboClips.length],
        nextNormalCounter: state.normalClickCounter,
        nextComboCounter: state.comboClickCounter + 1,
      };
    }
    case 'snack-eaten':
    case 'welcome-back':
      return {
        file: 'unayahayahauna.mp3',
        nextNormalCounter: state.normalClickCounter,
        nextComboCounter: state.comboClickCounter,
      };
    case 'wellness-reminder':
      return {
        file: 'huhhhh.mp3',
        nextNormalCounter: state.normalClickCounter,
        nextComboCounter: state.comboClickCounter,
      };
  }
}

export function selectSoundForEvent(
  state: SoundState,
  event: SoundEvent,
  nowMs: number,
  baseDir: string = '../../assets'
): { state: SoundState; file: string | null; url: string | null; text: string | null } {
  // Mute gate: resolve the voice line for the bubble text but stay silent
  if (state.muted) {
    const { file, nextNormalCounter, nextComboCounter } = resolveClipFile(state, event);
    return {
      state: {
        ...state,
        normalClickCounter: nextNormalCounter,
        comboClickCounter: nextComboCounter,
      },
      file,
      url: null,
      text: voiceTextForFile(file),
    };
  }

  // Cooldown throttle: prevent overlapping sound spam
  if (state.lastPlayedAtMs >= 0 && nowMs - state.lastPlayedAtMs < state.cooldownMs) {
    return { state, file: null, url: null, text: null };
  }

  const { file, nextNormalCounter, nextComboCounter } = resolveClipFile(state, event);
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
    text: voiceTextForFile(file),
  };
}
