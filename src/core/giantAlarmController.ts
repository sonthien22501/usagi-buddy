export type GiantAlarmPhase = 'idle' | 'entering' | 'present' | 'dismissing';

export interface GiantAlarmConfig {
  enterDurationMs: number;
  dismissDurationMs: number;
  maxShakePixels: number;
  shakeDecayPerSecond: number;
}

export const DEFAULT_GIANT_ALARM_CONFIG: GiantAlarmConfig = {
  enterDurationMs: 400,
  dismissDurationMs: 250,
  maxShakePixels: 14,
  shakeDecayPerSecond: 0.85,
};

export interface GiantAlarmState {
  active: boolean;
  phase: GiantAlarmPhase;
  elapsedMs: number;
  phaseElapsedMs: number;
  shakeIntensity: number;
  scale: number;
  opacity: number;
  wobbleRad: number;
  dismissTriggered: boolean;
}

export interface GiantAlarmRenderModel {
  visible: boolean;
  scale: number;
  opacity: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
  wobbleRad: number;
  backdropAlpha: number;
  speedLinesAlpha: number;
  speechText: string;
  hintText: string;
}

export function createGiantAlarmState(): GiantAlarmState {
  return {
    active: false,
    phase: 'idle',
    elapsedMs: 0,
    phaseElapsedMs: 0,
    shakeIntensity: 0,
    scale: 0,
    opacity: 0,
    wobbleRad: 0,
    dismissTriggered: false,
  };
}

export function triggerGiantAlarm(
  _previousState?: GiantAlarmState,
  config: GiantAlarmConfig = DEFAULT_GIANT_ALARM_CONFIG
): GiantAlarmState {
  return {
    active: true,
    phase: 'entering',
    elapsedMs: 0,
    phaseElapsedMs: 0,
    shakeIntensity: config.maxShakePixels,
    scale: 0.1,
    opacity: 1,
    wobbleRad: 0,
    dismissTriggered: false,
  };
}

export function dismissGiantAlarm(state: GiantAlarmState): GiantAlarmState {
  if (!state.active || state.phase === 'idle' || state.phase === 'dismissing') {
    return state;
  }
  return {
    ...state,
    phase: 'dismissing',
    phaseElapsedMs: 0,
    dismissTriggered: true,
  };
}

export function isGiantAlarmInteractive(state: GiantAlarmState): boolean {
  return state.active && state.phase !== 'idle';
}

export function tickGiantAlarm(
  state: GiantAlarmState,
  elapsedMs: number,
  config: GiantAlarmConfig = DEFAULT_GIANT_ALARM_CONFIG
): GiantAlarmState {
  if (!state.active || state.phase === 'idle') {
    return state;
  }

  const dt = Math.max(0, elapsedMs);
  const totalElapsed = state.elapsedMs + dt;
  const phaseElapsed = state.phaseElapsedMs + dt;

  // Shake decay over time
  const decayFactor = Math.pow(1 - config.shakeDecayPerSecond, dt / 1000);
  const nextShake = Math.max(0, state.shakeIntensity * decayFactor);

  if (state.phase === 'entering') {
    const progress = Math.min(1, phaseElapsed / Math.max(1, config.enterDurationMs));
    // Overshoot pop: starts small, surges to 1.15, settles toward 1.0
    const overshoot = Math.sin(progress * Math.PI * 0.75) * 1.15;
    const currentScale = progress >= 1 ? 1.0 : overshoot;

    if (progress >= 1) {
      return {
        ...state,
        phase: 'present',
        elapsedMs: totalElapsed,
        phaseElapsedMs: 0,
        shakeIntensity: nextShake,
        scale: 1.0,
        opacity: 1.0,
        wobbleRad: 0,
      };
    }

    return {
      ...state,
      elapsedMs: totalElapsed,
      phaseElapsedMs: phaseElapsed,
      shakeIntensity: nextShake,
      scale: currentScale,
      opacity: Math.min(1, progress * 2),
      wobbleRad: Math.sin(phaseElapsed * 0.03) * 0.08,
    };
  }

  if (state.phase === 'present') {
    // Constant chaotic breathing & wobble
    const wobble = Math.sin(totalElapsed * 0.008) * 0.05;
    const pulse = 1.0 + Math.sin(totalElapsed * 0.006) * 0.04;

    return {
      ...state,
      elapsedMs: totalElapsed,
      phaseElapsedMs: phaseElapsed,
      shakeIntensity: nextShake,
      scale: pulse,
      opacity: 1.0,
      wobbleRad: wobble,
    };
  }

  if (state.phase === 'dismissing') {
    const progress = Math.min(1, phaseElapsed / Math.max(1, config.dismissDurationMs));
    // Rapid squash & shrink exit
    const shrinkScale = Math.max(0, 1.0 - progress * 1.1);
    const fadeOpacity = Math.max(0, 1.0 - progress);

    if (progress >= 1) {
      return {
        ...createGiantAlarmState(),
      };
    }

    return {
      ...state,
      elapsedMs: totalElapsed,
      phaseElapsedMs: phaseElapsed,
      shakeIntensity: 0,
      scale: shrinkScale,
      opacity: fadeOpacity,
      wobbleRad: Math.sin(phaseElapsed * 0.05) * 0.15,
    };
  }

  return state;
}

export function getGiantAlarmRenderModel(
  state: GiantAlarmState,
  rng: () => number = Math.random
): GiantAlarmRenderModel {
  if (!state.active || state.phase === 'idle') {
    return {
      visible: false,
      scale: 0,
      opacity: 0,
      shakeOffsetX: 0,
      shakeOffsetY: 0,
      wobbleRad: 0,
      backdropAlpha: 0,
      speedLinesAlpha: 0,
      speechText: '',
      hintText: '',
    };
  }

  const shakeOffsetX = (rng() * 2 - 1) * state.shakeIntensity;
  const shakeOffsetY = (rng() * 2 - 1) * state.shakeIntensity;

  const backdropAlpha = state.phase === 'dismissing' ? state.opacity * 0.55 : 0.55;
  const speedLinesAlpha =
    state.phase === 'entering'
      ? 0.75
      : state.phase === 'present'
        ? 0.35 + Math.abs(Math.sin(state.elapsedMs * 0.005)) * 0.35
        : 0;

  return {
    visible: true,
    scale: state.scale,
    opacity: state.opacity,
    shakeOffsetX,
    shakeOffsetY,
    wobbleRad: state.wobbleRad,
    backdropAlpha,
    speedLinesAlpha,
    speechText: 'YAHA!! TIME IS UP!! (ﾉ>ω<)ﾉ',
    hintText: '[ Click anywhere or press ESC to dismiss ]',
  };
}

export function formatRepeatActionLabel(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return 'Study Another 25m';
  }
  const totalMins = Math.round(durationMs / 60_000);
  if (totalMins >= 60 && totalMins % 60 === 0) {
    const hours = Math.floor(totalMins / 60);
    return `Study Another ${hours}h`;
  }
  return `Study Another ${totalMins}m`;
}

export function calculateSnoozeDurationMs(snoozeMinutes: number = 5): number {
  const mins = Math.max(1, Number.isFinite(snoozeMinutes) ? Math.round(snoozeMinutes) : 5);
  return mins * 60_000;
}

export function getRecommendedBreakMinutes(workDurationMs: number): number {
  if (!Number.isFinite(workDurationMs) || workDurationMs <= 0) {
    return 5;
  }
  const workMins = Math.round(workDurationMs / 60_000);
  if (workMins >= 80) {
    return 20;
  }
  if (workMins >= 45 && workMins <= 65) {
    return 17;
  }
  return 5;
}
