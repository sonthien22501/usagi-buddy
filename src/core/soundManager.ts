export type SoundEvent =
  | 'click-normal'
  | 'click-combo'
  | 'snack-eaten'
  | 'wellness-reminder'
  | 'welcome-back'
  | 'timer-complete';

export type SoundChannel = 'buddy' | 'alarm';

export function getSoundChannelForEvent(event: SoundEvent): SoundChannel {
  return event === 'timer-complete' ? 'alarm' : 'buddy';
}

export const SOUND_ASSET_FILES = [
  'una.mp3',
  'bryy.mp3',
  'huhhhh.mp3',
  'urararusk.mp3',
  'unayahayahauna.mp3',
  'wuuulaaaa.mp3',
] as const;

export const CLIP_LOUDNESS_FACTORS: Record<string, number> = {
  'una.mp3': 1.0,
  'bryy.mp3': 1.05,
  'huhhhh.mp3': 0.82,
  'urararusk.mp3': 0.95,
  'unayahayahauna.mp3': 0.82,
  'wuuulaaaa.mp3': 0.8,
};

export function getClipLoudnessFactor(filename: string): number {
  return CLIP_LOUDNESS_FACTORS[filename] ?? 1.0;
}

export interface VolumeConfig {
  master: number;
  buddy: number;
  alarm: number;
  equalizeLoudness: boolean;
}

export const DEFAULT_VOLUME_CONFIG: VolumeConfig = {
  master: 1.0,
  buddy: 0.8,
  alarm: 0.7,
  equalizeLoudness: true,
};

export function calculatePlaybackVolume(
  config: VolumeConfig,
  event: SoundEvent,
  clipFile: string,
  muted: boolean = false
): number {
  if (muted || config.master <= 0) return 0;

  const channel = getSoundChannelForEvent(event);
  const channelVolume = channel === 'alarm' ? config.alarm : config.buddy;
  if (channelVolume <= 0) return 0;

  const loudnessMultiplier = config.equalizeLoudness ? getClipLoudnessFactor(clipFile) : 1.0;
  const rawVolume = config.master * channelVolume * loudnessMultiplier;
  return Math.min(1.0, Math.max(0.0, rawVolume));
}

export interface SoundState {
  muted: boolean;
  lastPlayedAtMs: number;
  normalClickCounter: number;
  comboClickCounter: number;
  cooldownMs: number;
  volumeConfig: VolumeConfig;
}

export function createSoundState(
  muted: boolean = false,
  cooldownMs: number = 250,
  volumeConfig: VolumeConfig = DEFAULT_VOLUME_CONFIG
): SoundState {
  return {
    muted,
    lastPlayedAtMs: -1,
    normalClickCounter: 0,
    comboClickCounter: 0,
    cooldownMs,
    volumeConfig,
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
    case 'timer-complete':
      return {
        file: 'wuuulaaaa.mp3',
        nextNormalCounter: state.normalClickCounter,
        nextComboCounter: state.comboClickCounter,
      };
  }
}

export interface SoundSelectionResult {
  state: SoundState;
  file: string | null;
  url: string | null;
  text: string | null;
  volume: number;
}

export function selectSoundForEvent(
  state: SoundState,
  event: SoundEvent,
  nowMs: number,
  baseDir: string = '../../assets'
): SoundSelectionResult {
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
      volume: 0,
    };
  }

  // Cooldown throttle: prevent overlapping sound spam
  if (state.lastPlayedAtMs >= 0 && nowMs - state.lastPlayedAtMs < state.cooldownMs) {
    return { state, file: null, url: null, text: null, volume: 0 };
  }

  const { file, nextNormalCounter, nextComboCounter } = resolveClipFile(state, event);
  const volume = calculatePlaybackVolume(state.volumeConfig, event, file, state.muted);
  const url = volume > 0 ? resolveSoundAssetUrl(file, baseDir) : null;

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
    volume,
  };
}
