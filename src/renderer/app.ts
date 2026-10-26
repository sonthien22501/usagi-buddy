import { cropSpriteToAlphaBounds, CroppedSprite } from '../core/alphaCropper';
import {
  createGhostModeState,
  HitTarget,
  shouldIgnoreMouseEvents,
} from '../core/ghostModeController';
import {
  createInitialUsagiState,
  DEFAULT_PHYSICS_CONFIG,
  ScreenBounds,
  SnackTarget,
  stepUsagiPhysics,
  triggerUsagiInteraction,
  UPRIGHT_SPRITE_INDEX,
  UsagiState,
  Vector2D,
} from '../core/physicsEngine';
import {
  createSoundState,
  resolveSoundAssetUrl,
  selectSoundForEvent,
  SoundEvent,
  SoundState,
} from '../core/soundManager';
import {
  DEFAULT_POMODORO_MS,
  formatPomodoroTime,
  parseCustomDuration,
  PomodoroState,
} from '../core/pomodoroTimer';
import {
  CostumeId,
  OutfitSelection,
  COSTUME_DEFINITIONS,
  pickRandomCostume,
} from '../core/costumeManager';
import {
  calculateSnoozeDurationMs,
  createGiantAlarmState,
  dismissGiantAlarm,
  formatRepeatActionLabel,
  getGiantAlarmRenderModel,
  getRecommendedBreakMinutes,
  GiantAlarmRenderModel,
  GiantAlarmState,
  isGiantAlarmInteractive,
  tickGiantAlarm,
  triggerGiantAlarm,
} from '../core/giantAlarmController';
import {
  CursorHugState,
  createCursorHugState,
  stepCursorHug,
  triggerCursorPounce,
  shouldIgnoreMouseDuringHug,
} from '../core/cursorHugController';

interface ProcessedFrame {
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
}

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx =
  (canvas.getContext('2d', {
    alpha: true,
    desynchronized: true,
  }) as CanvasRenderingContext2D | null) || canvas.getContext('2d')!;

const audioCache = new Map<string, HTMLAudioElement>();

function getOrCreateAudio(url: string): HTMLAudioElement {
  let audio = audioCache.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = 'auto';
    audioCache.set(url, audio);
  }
  return audio;
}

let screenBounds: ScreenBounds = {
  width: window.innerWidth,
  height: window.innerHeight,
};

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  screenBounds = { width: canvas.width, height: canvas.height };
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let state: UsagiState = createInitialUsagiState(screenBounds);
let ghostState = createGhostModeState(false);
let soundState: SoundState = createSoundState(false, 250);
let giantAlarmState: GiantAlarmState = createGiantAlarmState();
let cursorHugState: CursorHugState = createCursorHugState(true);
let playModeEnabled = false;
let activeSnack: SnackTarget | null = null;
let cursorPos: Vector2D | null = null;
const processedFrames: ProcessedFrame[] = [];
const costumeFrames = new Map<CostumeId, ProcessedFrame>();
const giantSpriteFrames: ProcessedFrame[] = [];
let giantSpriteFrame: ProcessedFrame | null = null;
let activeGiantFrame: ProcessedFrame | null = null;
let currentCostumeId: CostumeId = 'classic';
let currentCostumeSelection: OutfitSelection = 'classic';

function playSound(event: SoundEvent, customVolume?: number): string | null {
  const now = performance.now();
  const result = selectSoundForEvent(soundState, event, now, '../../assets');
  soundState = result.state;

  if (result.url && result.volume > 0) {
    try {
      const audio = getOrCreateAudio(result.url);
      const targetVol = customVolume !== undefined ? customVolume : result.volume;
      audio.volume = Math.min(1.0, Math.max(0.0, targetVol));
      audio.currentTime = 0;
      audio.play().catch(() => {
        if (result.file) {
          const fallbackUrl = resolveSoundAssetUrl(result.file, '../assets');
          const fallbackAudio = getOrCreateAudio(fallbackUrl);
          fallbackAudio.volume = Math.min(1.0, Math.max(0.0, targetVol));
          fallbackAudio.currentTime = 0;
          fallbackAudio.play().catch(() => {});
        }
      });
    } catch {
      // Audio playback handles errors gracefully
    }
  }

  return result.text;
}

let isSettingsModalOpen = false;
let isFixedAppearance = false;
let isUsagiHidden = false;
let currentPomodoroState: PomodoroState | null = null;
let isDraggingUsagi = false;
let dragStartPos: Vector2D | null = null;
let dragOffset: Vector2D = { x: 0, y: 0 };
let dragMovedBeyondThreshold = false;

const settingsOverlay = document.getElementById('settings-overlay') as HTMLDivElement | null;
const closeSettingsBtn = document.getElementById('close-settings-btn') as HTMLButtonElement | null;
const volumeRange = document.getElementById('volume-range') as HTMLInputElement | null;
const volumeValBadge = document.getElementById('volume-val-badge') as HTMLSpanElement | null;
const testSoundBtn = document.getElementById('test-sound-btn') as HTMLButtonElement | null;
const muteToggleBtn = document.getElementById('mute-toggle-btn') as HTMLButtonElement | null;
const pomodoroStatusBadge = document.getElementById(
  'pomodoro-status-badge'
) as HTMLSpanElement | null;
const customTimeInput = document.getElementById('custom-time-input') as HTMLInputElement | null;
const customAdd10Btn = document.getElementById('custom-add-10-btn') as HTMLButtonElement | null;
const startCustomTimerBtn = document.getElementById(
  'start-custom-timer-btn'
) as HTMLButtonElement | null;
const stationaryValBadge = document.getElementById(
  'stationary-val-badge'
) as HTMLSpanElement | null;
const stationaryToggleBtn = document.getElementById(
  'stationary-toggle-btn'
) as HTMLButtonElement | null;

const alarmActionsOverlay = document.getElementById(
  'alarm-actions-overlay'
) as HTMLDivElement | null;
const alarmRepeatBtn = document.getElementById('alarm-repeat-btn') as HTMLButtonElement | null;
const alarmRepeatText = document.getElementById('alarm-repeat-text') as HTMLSpanElement | null;
const alarmSnoozeBtn = document.getElementById('alarm-snooze-btn') as HTMLButtonElement | null;
const alarmBreakBtn = document.getElementById('alarm-break-btn') as HTMLButtonElement | null;
const alarmBreakText = document.getElementById('alarm-break-text') as HTMLSpanElement | null;
const alarmDismissHint = document.getElementById('alarm-dismiss-hint') as HTMLDivElement | null;

function showAlarmActionsOverlay(): void {
  if (!alarmActionsOverlay) return;
  const lastDuration =
    currentPomodoroState && currentPomodoroState.durationMs > 0
      ? currentPomodoroState.durationMs
      : DEFAULT_POMODORO_MS;
  if (alarmRepeatText) {
    alarmRepeatText.textContent = formatRepeatActionLabel(lastDuration);
  }
  const breakMins = getRecommendedBreakMinutes(lastDuration);
  if (alarmBreakText) {
    alarmBreakText.textContent = `${breakMins}m Break`;
  }
  alarmActionsOverlay.style.display = 'flex';
}

function hideAlarmActionsOverlay(): void {
  if (alarmActionsOverlay) {
    alarmActionsOverlay.style.display = 'none';
  }
}

function handleRepeatSession(): void {
  if (!isGiantAlarmInteractive(giantAlarmState)) return;
  const duration =
    currentPomodoroState && currentPomodoroState.durationMs > 0
      ? currentPomodoroState.durationMs
      : DEFAULT_POMODORO_MS;
  giantAlarmState = dismissGiantAlarm(giantAlarmState);
  hideAlarmActionsOverlay();
  playSound('click-normal');
  window.usagiAPI?.setPomodoroDuration(duration, true);
  window.usagiAPI?.notifyGiantAlarmDismissed();
}

function handleSnoozeWrapUp(minutes: number = 5): void {
  if (!isGiantAlarmInteractive(giantAlarmState)) return;
  const duration = calculateSnoozeDurationMs(minutes);
  giantAlarmState = dismissGiantAlarm(giantAlarmState);
  hideAlarmActionsOverlay();
  playSound('click-normal');
  window.usagiAPI?.setPomodoroDuration(duration, true);
  window.usagiAPI?.notifyGiantAlarmDismissed();
}

function handleTakeBreak(minutes?: number): void {
  if (!isGiantAlarmInteractive(giantAlarmState)) return;
  const lastDuration =
    currentPomodoroState && currentPomodoroState.durationMs > 0
      ? currentPomodoroState.durationMs
      : DEFAULT_POMODORO_MS;
  const breakMins = minutes ?? getRecommendedBreakMinutes(lastDuration);
  const duration = calculateSnoozeDurationMs(breakMins);
  giantAlarmState = dismissGiantAlarm(giantAlarmState);
  hideAlarmActionsOverlay();
  playSound('click-normal');
  window.usagiAPI?.setPomodoroDuration(duration, true);
  window.usagiAPI?.notifyGiantAlarmDismissed();
}

function updateStationaryBadge(): void {
  const isStill = !!state.stationary;
  if (stationaryValBadge) {
    stationaryValBadge.textContent = isStill ? 'STILL' : 'SWIMMING';
    stationaryValBadge.style.color = isStill ? '#55efc4' : '#ffeaa7';
  }
  if (stationaryToggleBtn) {
    stationaryToggleBtn.textContent = isStill ? '🌊 Resume Swim' : '📌 Pin Still';
  }
}

function openSettingsModal(): void {
  isSettingsModalOpen = true;
  if (settingsOverlay) {
    settingsOverlay.style.display = 'flex';
  }
  if (volumeRange && volumeValBadge) {
    volumeRange.value = String(Math.round(soundState.volumeConfig.master * 100));
    volumeValBadge.textContent = `${volumeRange.value}%`;
  }
  if (muteToggleBtn) {
    muteToggleBtn.textContent = soundState.muted ? '🔊 Unmute' : '🔇 Mute';
  }
  updateStationaryBadge();
  updateMouseIgnoreState();
}

function closeSettingsModal(): void {
  isSettingsModalOpen = false;
  if (settingsOverlay) {
    settingsOverlay.style.display = 'none';
  }
  updateMouseIgnoreState();
}

function handleGiantAlarmDismiss(): void {
  if (!isGiantAlarmInteractive(giantAlarmState)) return;
  giantAlarmState = dismissGiantAlarm(giantAlarmState);
  hideAlarmActionsOverlay();
  playSound('click-normal');
  window.usagiAPI?.notifyGiantAlarmDismissed();
}

function updateMouseIgnoreState(): void {
  if (isUsagiHidden && !giantAlarmState.active) {
    if (!ghostState.currentlyIgnoringMouse) {
      ghostState.currentlyIgnoringMouse = true;
      window.usagiAPI?.setIgnoreMouseEvents(true, { forward: true });
    }
    return;
  }

  if (shouldIgnoreMouseDuringHug(cursorHugState)) {
    if (!ghostState.currentlyIgnoringMouse) {
      ghostState.currentlyIgnoringMouse = true;
      window.usagiAPI?.setIgnoreMouseEvents(true, { forward: true });
    }
    return;
  }

  if (isDraggingUsagi || isSettingsModalOpen || isGiantAlarmInteractive(giantAlarmState)) {
    if (ghostState.currentlyIgnoringMouse) {
      ghostState.currentlyIgnoringMouse = false;
      window.usagiAPI?.setIgnoreMouseEvents(false);
    }
    return;
  }

  const usagiTarget: HitTarget = {
    x: state.x,
    y: state.y,
    radius: DEFAULT_PHYSICS_CONFIG.spriteRadius * 1.2,
  };

  const snackTarget: HitTarget | null =
    activeSnack && activeSnack.active
      ? { x: activeSnack.x, y: activeSnack.y, radius: activeSnack.radius * 1.25 }
      : null;

  const shouldIgnore = shouldIgnoreMouseEvents(
    ghostState.ghostModeLocked,
    cursorPos,
    usagiTarget,
    snackTarget
  );

  if (shouldIgnore !== ghostState.currentlyIgnoringMouse) {
    ghostState.currentlyIgnoringMouse = shouldIgnore;
    window.usagiAPI?.setIgnoreMouseEvents(shouldIgnore, { forward: true });
  }
}

window.addEventListener('pointermove', (e: MouseEvent) => {
  cursorPos = { x: e.clientX, y: e.clientY };

  if (isDraggingUsagi && dragStartPos) {
    const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
    if (dist >= 5) {
      dragMovedBeyondThreshold = true;
      const r = DEFAULT_PHYSICS_CONFIG.spriteRadius;
      state.x = Math.max(r, Math.min(screenBounds.width - r, e.clientX + dragOffset.x));
      state.y = Math.max(r, Math.min(screenBounds.height - r, e.clientY + dragOffset.y));
      state.vx = 0;
      state.vy = 0;
    }
    return;
  }

  updateMouseIgnoreState();
});

window.addEventListener('mouseleave', () => {
  cursorPos = null;
  updateMouseIgnoreState();
});

window.addEventListener('pointerdown', (e: MouseEvent) => {
  if (isUsagiHidden && !giantAlarmState.active) {
    return;
  }

  if (isSettingsModalOpen) {
    return;
  }

  if (isGiantAlarmInteractive(giantAlarmState)) {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('#alarm-actions-overlay')) {
      return;
    }
    handleGiantAlarmDismiss();
    return;
  }

  if (ghostState.ghostModeLocked) return;

  const distToUsagi = Math.hypot(e.clientX - state.x, e.clientY - state.y);
  if (distToUsagi <= DEFAULT_PHYSICS_CONFIG.spriteRadius * 1.25) {
    isDraggingUsagi = true;
    dragStartPos = { x: e.clientX, y: e.clientY };
    dragOffset = { x: state.x - e.clientX, y: state.y - e.clientY };
    dragMovedBeyondThreshold = false;
    updateMouseIgnoreState();
  }
});

function handlePointerUp(): void {
  if (isDraggingUsagi) {
    const wasDragged = dragMovedBeyondThreshold;
    isDraggingUsagi = false;
    dragStartPos = null;

    if (!wasDragged) {
      const prev = state.speechBubble;
      state = triggerUsagiInteraction(state);

      if (currentCostumeSelection === 'random') {
        currentCostumeId = pickRandomCostume(currentCostumeId);
      }

      if (state.comboClicks >= 3) {
        if (!isFixedAppearance || currentCostumeSelection === 'random') {
          currentCostumeId = pickRandomCostume(currentCostumeId);
          window.usagiAPI?.setCostume(
            currentCostumeSelection === 'random' ? 'random' : currentCostumeId
          );
        }
        const soundEvent: SoundEvent = 'click-combo';
        const text = playSound(soundEvent);
        state.speechBubble = text ?? prev ?? state.speechBubble;
      } else {
        const soundEvent: SoundEvent = 'click-normal';
        const text = playSound(soundEvent);
        state.speechBubble = text ?? prev ?? state.speechBubble;
      }
    } else {
      if (!state.stationary) {
        state.vx = 25 * state.scaleFlipX;
        state.vy = 15;
      }
    }

    updateMouseIgnoreState();
  }
}

window.addEventListener('pointerup', handlePointerUp);
window.addEventListener('pointercancel', handlePointerUp);

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (isSettingsModalOpen) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSettingsModal();
      return;
    }
  }

  if (isGiantAlarmInteractive(giantAlarmState)) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleGiantAlarmDismiss();
      return;
    }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      handleRepeatSession();
      return;
    }
    if (e.key === 's' || e.key === 'S' || e.key === '+') {
      e.preventDefault();
      handleSnoozeWrapUp(5);
      return;
    }
    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      handleTakeBreak();
      return;
    }
  }
});

// Modal UI Event Listeners
if (alarmRepeatBtn) {
  alarmRepeatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleRepeatSession();
  });
}

if (alarmSnoozeBtn) {
  alarmSnoozeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleSnoozeWrapUp(5);
  });
}

if (alarmBreakBtn) {
  alarmBreakBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleTakeBreak();
  });
}

if (alarmDismissHint) {
  alarmDismissHint.addEventListener('click', (e) => {
    e.stopPropagation();
    handleGiantAlarmDismiss();
  });
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener('click', closeSettingsModal);
}

if (settingsOverlay) {
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) {
      closeSettingsModal();
    }
  });
}

if (volumeRange) {
  volumeRange.addEventListener('input', () => {
    const nextMaster = Number(volumeRange.value) / 100;
    if (volumeValBadge) {
      volumeValBadge.textContent = `${volumeRange.value}%`;
    }
    const updatedConfig = { ...soundState.volumeConfig, master: nextMaster };
    soundState = { ...soundState, volumeConfig: updatedConfig };
    window.usagiAPI?.updateVolumeConfig(updatedConfig);
  });
}

if (testSoundBtn) {
  testSoundBtn.addEventListener('click', () => {
    playSound('click-normal');
  });
}

if (muteToggleBtn) {
  muteToggleBtn.addEventListener('click', () => {
    const nextMuted = !soundState.muted;
    soundState = { ...soundState, muted: nextMuted };
    muteToggleBtn.textContent = nextMuted ? '🔊 Unmute' : '🔇 Mute';
    if (!nextMuted && soundState.volumeConfig.master <= 0) {
      const updatedConfig = { ...soundState.volumeConfig, master: 0.7 };
      soundState = { ...soundState, volumeConfig: updatedConfig };
      if (volumeRange && volumeValBadge) {
        volumeRange.value = '70';
        volumeValBadge.textContent = '70%';
      }
      window.usagiAPI?.updateVolumeConfig(updatedConfig);
    }
  });
}

const chipButtons = document.querySelectorAll<HTMLButtonElement>('.chip-btn');
chipButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const minAttr = btn.getAttribute('data-min');
    let durationMs = 1_500_000;
    if (minAttr) {
      durationMs = parseCustomDuration(Number(minAttr), 'minutes');
    }
    window.usagiAPI?.setPomodoroDuration(durationMs, true);
    if (pomodoroStatusBadge) {
      pomodoroStatusBadge.textContent = `${formatPomodoroTime(durationMs)} RUNNING`;
    }
  });
});

if (customAdd10Btn && customTimeInput) {
  customAdd10Btn.addEventListener('click', () => {
    const current = Number(customTimeInput.value) || 0;
    const next = current + 10;
    customTimeInput.value = String(next);
    customTimeInput.focus();
  });
}

if (startCustomTimerBtn && customTimeInput) {
  startCustomTimerBtn.addEventListener('click', () => {
    const val = Number(customTimeInput.value);
    const durationMs = parseCustomDuration(val > 0 ? val : 25, 'minutes');
    window.usagiAPI?.setPomodoroDuration(durationMs, true);
    if (pomodoroStatusBadge) {
      pomodoroStatusBadge.textContent = `${formatPomodoroTime(durationMs)} RUNNING`;
    }
  });
}

if (stationaryToggleBtn) {
  stationaryToggleBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleStationaryMode();
  });
}

if (window.usagiAPI) {
  window.usagiAPI.onGhostModeChanged((locked) => {
    ghostState.ghostModeLocked = locked;
    updateMouseIgnoreState();
  });

  window.usagiAPI.onPlayModeChanged((enabled) => {
    playModeEnabled = enabled;
  });

  window.usagiAPI.onStationaryModeChanged((stationary) => {
    state = {
      ...state,
      stationary,
      vx: stationary ? 0 : state.vx,
      vy: stationary ? 0 : state.vy,
    };
    updateStationaryBadge();
  });

  window.usagiAPI.onSoundMutedChanged((muted) => {
    soundState = { ...soundState, muted };
    if (muteToggleBtn) {
      muteToggleBtn.textContent = muted ? '🔊 Unmute' : '🔇 Mute';
    }
  });

  window.usagiAPI.onVolumeConfigChanged((config) => {
    soundState = { ...soundState, volumeConfig: config };
    if (volumeRange && volumeValBadge) {
      volumeRange.value = String(Math.round(config.master * 100));
      volumeValBadge.textContent = `${volumeRange.value}%`;
    }
  });

  window.usagiAPI.onOpenSettingsModal(() => {
    openSettingsModal();
  });

  window.usagiAPI.onPomodoroStateChanged((pState) => {
    currentPomodoroState = pState;
    if (pomodoroStatusBadge) {
      const timeStr = formatPomodoroTime(pState.remainingMs);
      pomodoroStatusBadge.textContent = `${timeStr} ${pState.phase.toUpperCase()}`;
    }
  });

  window.usagiAPI.onWellnessUpdate((payload) => {
    state = {
      ...state,
      sleeping: payload.mood === 'sleeping',
    };
    if (payload.message) {
      state.speechBubble = payload.message;
      state.speechTimerMs = DEFAULT_PHYSICS_CONFIG.speechDurationMs * 2.2;
    }
    if (payload.soundEvent) {
      const text = playSound(payload.soundEvent);
      if (text) {
        // Reminder keeps the full payload message (already contains the voice word); other events use the returned voice text
        state.speechBubble =
          payload.soundEvent === 'wellness-reminder' && payload.message ? payload.message : text;
      }
    }
  });

  window.usagiAPI.onSnackSpawned((snack) => {
    activeSnack = snack;
  });

  window.usagiAPI.onTriggerInteraction(() => {
    const prev = state.speechBubble;
    state = triggerUsagiInteraction(state);

    if (currentCostumeSelection === 'random') {
      currentCostumeId = pickRandomCostume(currentCostumeId);
    }

    if (state.comboClicks >= 3) {
      if (!isFixedAppearance || currentCostumeSelection === 'random') {
        currentCostumeId = pickRandomCostume(currentCostumeId);
        window.usagiAPI?.setCostume(
          currentCostumeSelection === 'random' ? 'random' : currentCostumeId
        );
      }
      const soundEvent: SoundEvent = 'click-combo';
      const text = playSound(soundEvent);
      state.speechBubble = text ?? prev ?? state.speechBubble;
    } else {
      const soundEvent: SoundEvent = 'click-normal';
      const text = playSound(soundEvent);
      state.speechBubble = text ?? prev ?? state.speechBubble;
    }
  });

  window.usagiAPI.onGiantAlarmTriggered(() => {
    if (giantSpriteFrames.length > 0) {
      const pickedIdx = Math.floor(Math.random() * giantSpriteFrames.length);
      activeGiantFrame = giantSpriteFrames[pickedIdx];
    }
    giantAlarmState = triggerGiantAlarm(giantAlarmState);
    playSound('timer-complete');
    updateMouseIgnoreState();
    showAlarmActionsOverlay();
  });

  window.usagiAPI.onCostumeChanged((costume, selection) => {
    currentCostumeId = costume;
    currentCostumeSelection = selection;
  });

  window.usagiAPI.onTestSound(() => {
    const text = playSound('click-normal');
    if (text) {
      state.speechBubble = text;
      state.speechTimerMs = DEFAULT_PHYSICS_CONFIG.speechDurationMs;
    }
  });

  window.usagiAPI.onCursorHugChanged((enabled) => {
    cursorHugState.enabled = enabled;
  });

  window.usagiAPI.onTriggerCursorHugNow(() => {
    cursorHugState = triggerCursorPounce(cursorHugState);
  });

  window.usagiAPI.onTaskCelebration((taskText) => {
    state.spinBoostTimerMs = 1500;
    state.speechBubble = `Yaha!! ✓ ${taskText}`;
    state.speechTimerMs = 3000;
    playSound('timer-complete');
  });

  window.usagiAPI.onFixedAppearanceChanged((fixed) => {
    isFixedAppearance = fixed;
  });

  window.usagiAPI.onUsagiHiddenChanged((hidden) => {
    isUsagiHidden = hidden;
    updateMouseIgnoreState();
  });
}

function processImageToFrame(
  name: string,
  img: HTMLImageElement,
  maxDimension: number = 320
): ProcessedFrame {
  const offscreen = document.createElement('canvas');
  offscreen.width = img.naturalWidth;
  offscreen.height = img.naturalHeight;
  const offCtx = offscreen.getContext('2d')!;
  offCtx.drawImage(img, 0, 0);

  const imgData = offCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
  const cropped: CroppedSprite = cropSpriteToAlphaBounds(name, imgData, 10);

  const naturalW = cropped.bounds.width;
  const naturalH = cropped.bounds.height;
  const scale = Math.min(1.0, maxDimension / Math.max(naturalW, naturalH));
  const targetW = Math.max(1, Math.round(naturalW * scale));
  const targetH = Math.max(1, Math.round(naturalH * scale));

  const trimmed = document.createElement('canvas');
  trimmed.width = targetW;
  trimmed.height = targetH;
  const trimmedCtx = trimmed.getContext('2d')!;

  if (scale === 1.0) {
    const trimmedData = trimmedCtx.createImageData(targetW, targetH);
    trimmedData.data.set(cropped.trimmedData);
    trimmedCtx.putImageData(trimmedData, 0, 0);
  } else {
    // Hardware accelerated downscaling into a lightweight high-DPI texture
    trimmedCtx.imageSmoothingEnabled = true;
    trimmedCtx.imageSmoothingQuality = 'high';
    trimmedCtx.drawImage(
      offscreen,
      cropped.bounds.minX,
      cropped.bounds.minY,
      naturalW,
      naturalH,
      0,
      0,
      targetW,
      targetH
    );
  }

  return {
    canvas: trimmed,
    width: targetW,
    height: targetH,
    centerX: targetW / 2,
    centerY: targetH / 2,
  };
}

function loadSingleSprite(index: number): Promise<ProcessedFrame> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = `../../assets/Usagi${index}.png`;

    img.onerror = () => {
      img.src = `../assets/Usagi${index}.png`;
    };

    img.onload = () => {
      resolve(processImageToFrame(`Usagi${index}`, img, 320));
    };
  });
}

function loadNamedSprite(filename: string, maxDimension: number): Promise<ProcessedFrame | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = `../../assets/${filename}`;

    img.onerror = () => {
      const imgAlt = new Image();
      imgAlt.src = `../assets/${filename}`;
      imgAlt.onload = () => resolve(processImageToFrame(filename, imgAlt, maxDimension));
      imgAlt.onerror = () => resolve(null);
    };

    img.onload = () => {
      resolve(processImageToFrame(filename, img, maxDimension));
    };
  });
}

async function loadAllSprites(): Promise<void> {
  const promises: Promise<ProcessedFrame>[] = [];
  for (let i = 1; i <= 6; i++) {
    promises.push(loadSingleSprite(i));
  }
  const loaded = await Promise.all(promises);
  processedFrames.push(...loaded);

  // Background load all custom costumes
  for (const def of COSTUME_DEFINITIONS) {
    if (def.id === 'classic') continue;
    loadNamedSprite(def.filename, 320)
      .then((frame) => {
        if (frame) {
          costumeFrames.set(def.id, frame);
        }
      })
      .catch(() => {});
  }

  // Background load all giant alarm sprites
  const giantCandidates = ['Usagi_Big.png', 'Usagi_Big2.png', 'GiantUsagi.png'];
  for (const filename of giantCandidates) {
    loadNamedSprite(filename, 768)
      .then((frame) => {
        if (frame) {
          giantSpriteFrames.push(frame);
          if (!giantSpriteFrame) {
            giantSpriteFrame = frame;
          }
        }
      })
      .catch(() => {});
  }
}

function drawSnack(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.save();
  context.translate(x, y);

  // Pudding plate
  context.beginPath();
  context.ellipse(0, radius * 0.55, radius * 1.15, radius * 0.45, 0, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.fill();
  context.lineWidth = 2.5;
  context.strokeStyle = '#D1D8E0';
  context.stroke();

  // Custard body
  context.beginPath();
  context.moveTo(-radius * 0.7, radius * 0.5);
  context.lineTo(-radius * 0.5, -radius * 0.35);
  context.quadraticCurveTo(0, -radius * 0.5, radius * 0.5, -radius * 0.35);
  context.lineTo(radius * 0.7, radius * 0.5);
  context.closePath();
  context.fillStyle = '#FFEAA7';
  context.fill();
  context.lineWidth = 2.5;
  context.strokeStyle = '#E17055';
  context.stroke();

  // Caramel layer on top
  context.beginPath();
  context.moveTo(-radius * 0.52, -radius * 0.35);
  context.quadraticCurveTo(0, -radius * 0.55, radius * 0.52, -radius * 0.35);
  context.quadraticCurveTo(radius * 0.3, -radius * 0.15, 0, -radius * 0.25);
  context.quadraticCurveTo(-radius * 0.3, -radius * 0.15, -radius * 0.52, -radius * 0.35);
  context.closePath();
  context.fillStyle = '#6C3415';
  context.fill();

  // Strawberry topper
  context.beginPath();
  context.arc(0, -radius * 0.65, radius * 0.32, 0, Math.PI * 2);
  context.fillStyle = '#FF4757';
  context.fill();
  context.lineWidth = 1.5;
  context.strokeStyle = '#B33939';
  context.stroke();

  // Strawberry leaf
  context.beginPath();
  context.ellipse(radius * 0.12, -radius * 0.95, radius * 0.12, radius * 0.2, 0.5, 0, Math.PI * 2);
  context.fillStyle = '#2ED573';
  context.fill();

  context.restore();
}

function drawSpeechBubble(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string
): void {
  context.save();

  context.font = 'bold 18px "Segoe UI", "Comic Sans MS", "Nunito", sans-serif';
  const metrics = context.measureText(text);
  const paddingX = 16;
  const paddingY = 8;
  const bubbleWidth = metrics.width + paddingX * 2;
  const bubbleHeight = 36;
  const bx = x - bubbleWidth / 2;
  const by = y - bubbleHeight;
  const r = 12;

  // Draw rounded rect bubble
  context.beginPath();
  context.moveTo(bx + r, by);
  context.lineTo(bx + bubbleWidth - r, by);
  context.quadraticCurveTo(bx + bubbleWidth, by, bx + bubbleWidth, by + r);
  context.lineTo(bx + bubbleWidth, by + bubbleHeight - r);
  context.quadraticCurveTo(
    bx + bubbleWidth,
    by + bubbleHeight,
    bx + bubbleWidth - r,
    by + bubbleHeight
  );
  // Pointer beak
  context.lineTo(x + 8, by + bubbleHeight);
  context.lineTo(x, by + bubbleHeight + 10);
  context.lineTo(x - 8, by + bubbleHeight);
  context.lineTo(bx + r, by + bubbleHeight);
  context.quadraticCurveTo(bx, by + bubbleHeight, bx, by + bubbleHeight - r);
  context.lineTo(bx, by + r);
  context.quadraticCurveTo(bx, by, bx + r, by);
  context.closePath();

  // Fill with drop shadow
  context.shadowColor = 'rgba(0, 0, 0, 0.15)';
  context.shadowBlur = 8;
  context.shadowOffsetY = 3;
  context.fillStyle = '#FFFFFF';
  context.fill();

  // Border
  context.shadowColor = 'transparent';
  context.lineWidth = 2.5;
  context.strokeStyle = '#2D3436';
  context.stroke();

  // Text
  context.fillStyle = '#D63031';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, x, by + bubbleHeight / 2);

  context.restore();
}

function drawUsagi(
  context: CanvasRenderingContext2D,
  currentState: UsagiState,
  frame: ProcessedFrame
): void {
  context.save();
  context.translate(currentState.x, currentState.y);
  context.rotate(currentState.rotation);

  // 60 FPS organic squash-and-stretch swimming on the upright frame
  const targetDiameter = DEFAULT_PHYSICS_CONFIG.spriteRadius * 2.15;
  const baseScale = targetDiameter / frame.height;
  const sx = currentState.scaleFlipX * baseScale * currentState.scaleX;
  const sy = baseScale * currentState.scaleY;
  context.scale(sx, sy);

  context.drawImage(frame.canvas, -frame.centerX, -frame.centerY);
  context.restore();
}

function drawSpeedLines(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  alpha: number,
  timeMs: number
): void {
  if (alpha <= 0.01) return;
  context.save();
  context.translate(width / 2, height / 2);
  const numLines = 40;
  const maxRadius = Math.hypot(width, height) / 2;
  const innerRadius = Math.min(width, height) * 0.3;

  context.fillStyle = `rgba(255, 235, 100, ${alpha * 0.7})`;
  for (let i = 0; i < numLines; i++) {
    const baseAngle = (i / numLines) * Math.PI * 2;
    const jitter = Math.sin(timeMs * 0.018 + i * 2.7) * 0.02;
    const angle = baseAngle + jitter;
    const widthOffset = 0.018 + ((i * 3) % 4) * 0.005;

    context.beginPath();
    context.moveTo(
      Math.cos(angle - widthOffset) * maxRadius,
      Math.sin(angle - widthOffset) * maxRadius
    );
    context.lineTo(
      Math.cos(angle + widthOffset) * maxRadius,
      Math.sin(angle + widthOffset) * maxRadius
    );
    context.lineTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawGiantComicBanner(
  context: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  text: string
): void {
  context.save();
  context.font = '900 32px "Segoe UI", "Comic Sans MS", "Nunito", sans-serif';
  const metrics = context.measureText(text);
  const paddingX = 28;
  const bw = metrics.width + paddingX * 2;
  const bh = 54;
  const bx = cx - bw / 2;
  const by = topY;
  const r = 16;

  // Comic border & shadow
  context.shadowColor = 'rgba(0, 0, 0, 0.4)';
  context.shadowBlur = 12;
  context.shadowOffsetY = 4;

  context.beginPath();
  context.roundRect(bx, by, bw, bh, r);
  context.fillStyle = '#FFEAA7';
  context.fill();

  context.shadowColor = 'transparent';
  context.lineWidth = 3.5;
  context.strokeStyle = '#2D3436';
  context.stroke();

  // Vibrant text
  context.fillStyle = '#D63031';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, cx, by + bh / 2);

  context.restore();
}

function drawDismissHint(
  context: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  hintText: string,
  timeMs: number
): void {
  context.save();
  const pulse = 0.85 + Math.sin(timeMs * 0.006) * 0.15;
  context.font = 'bold 16px "Segoe UI", "Nunito", sans-serif';
  const metrics = context.measureText(hintText);
  const bw = metrics.width + 36;
  const bh = 36;
  const bx = cx - bw / 2;
  const by = bottomY - bh;

  context.beginPath();
  context.roundRect(bx, by, bw, bh, 18);
  context.fillStyle = `rgba(20, 20, 25, ${0.75 * pulse})`;
  context.fill();

  context.lineWidth = 1.5;
  context.strokeStyle = `rgba(255, 255, 255, ${0.4 * pulse})`;
  context.stroke();

  context.fillStyle = '#FFFFFF';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(hintText, cx, by + bh / 2);

  context.restore();
}

function drawGiantAlarmOverlay(
  context: CanvasRenderingContext2D,
  model: GiantAlarmRenderModel,
  frame: ProcessedFrame,
  screen: ScreenBounds,
  timeMs: number
): void {
  if (!model.visible) return;

  context.save();

  // 1. Dark vignette / backdrop
  context.fillStyle = `rgba(15, 10, 25, ${model.backdropAlpha})`;
  context.fillRect(0, 0, screen.width, screen.height);

  // 2. Anime speed lines
  drawSpeedLines(context, screen.width, screen.height, model.speedLinesAlpha, timeMs);

  // 3. Screen shake translation
  context.translate(model.shakeOffsetX, model.shakeOffsetY);

  // 4. Draw Giant Usagi at screen center
  const centerX = screen.width / 2;
  const centerY = screen.height / 2 + 25;

  context.save();
  context.translate(centerX, centerY);
  context.rotate(model.wobbleRad);

  const targetHeight = screen.height * 0.68;
  const baseScale = (targetHeight / frame.height) * model.scale;
  context.scale(baseScale, baseScale);

  context.globalAlpha = model.opacity;

  // Comic glow behind giant Usagi
  context.shadowColor = 'rgba(255, 200, 50, 0.5)';
  context.shadowBlur = 35;
  context.drawImage(frame.canvas, -frame.centerX, -frame.centerY);
  context.restore();

  // 5. Giant Comic Speech Banner
  const bannerTop = Math.max(30, centerY - (targetHeight * model.scale) / 2 - 75);
  drawGiantComicBanner(context, centerX, bannerTop, model.speechText);

  // 6. Dismiss hint at screen bottom (only drawn if HTML overlay is not active)
  if (!alarmActionsOverlay) {
    drawDismissHint(context, centerX, screen.height - 45, model.hintText, timeMs);
  }

  context.restore();
}

function drawClingingNotes(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  timeMs: number
): void {
  context.save();
  context.font = 'bold 16px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Floating note 1: ♪ (strawberry pink)
  context.fillStyle = '#ff758f';
  context.fillText('♪', x - 32, y - 24 + Math.sin(timeMs * 0.005) * 6);

  // Floating note 2: ★ (custard gold)
  context.fillStyle = '#ffeaa7';
  context.fillText('★', x + 32, y - 28 + Math.cos(timeMs * 0.006) * 6);

  // Floating note 3: ♥ (soft strawberry)
  context.fillStyle = '#ff8fa3';
  context.fillText('♥', x, y - 44 + Math.sin(timeMs * 0.007 + 1) * 5);

  context.restore();
}

let lastTime = performance.now();

function animationLoop(now: number): void {
  const dt = now - lastTime;
  lastTime = now;

  if (giantAlarmState.active) {
    const wasActive = giantAlarmState.active;
    giantAlarmState = tickGiantAlarm(giantAlarmState, dt);
    if (wasActive && !giantAlarmState.active) {
      hideAlarmActionsOverlay();
      updateMouseIgnoreState();
    }
  }

  const cursorTarget = playModeEnabled && !ghostState.ghostModeLocked ? cursorPos : null;
  const result = stepUsagiPhysics(state, dt, screenBounds, activeSnack, undefined, cursorTarget);
  state = result.state;

  // Step Cursor Hug Controller
  const hugResult = stepCursorHug(
    cursorHugState,
    { x: state.x, y: state.y },
    cursorPos,
    dt,
    now,
    state.stationary || state.sleeping
  );
  cursorHugState = hugResult.hugState;

  if (hugResult.soundTrigger === 'hug-attach') {
    playSound('click-combo');
  } else if (hugResult.soundTrigger === 'dizzy-drop') {
    playSound('click-normal');
  }

  if (hugResult.speechBubbleOverride) {
    state.speechBubble = hugResult.speechBubbleOverride;
    state.speechTimerMs = 1500;
  }

  if (hugResult.targetPos) {
    state.x = hugResult.targetPos.x;
    state.y = hugResult.targetPos.y;
    state.vx = 0;
    state.vy = 0;
  }

  if (hugResult.rotationOverride !== null) {
    state.rotation = hugResult.rotationOverride;
  }

  if (result.snackConsumed && activeSnack) {
    activeSnack = null;
    const text = playSound('snack-eaten');
    if (text) {
      state.speechBubble = text;
    }
    window.usagiAPI?.notifySnackConsumed();
  }

  updateMouseIgnoreState();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (isUsagiHidden && !giantAlarmState.active) {
    requestAnimationFrame(animationLoop);
    return;
  }

  if (activeSnack && activeSnack.active) {
    drawSnack(ctx, activeSnack.x, activeSnack.y, activeSnack.radius);
  }

  // Uses upright sprite frame (Usagi3.png) or active custom costume
  const uprightFrame = processedFrames[UPRIGHT_SPRITE_INDEX] || processedFrames[0];
  const activeFrame =
    currentCostumeId === 'classic'
      ? uprightFrame
      : costumeFrames.get(currentCostumeId) || uprightFrame;
  if (activeFrame) {
    drawUsagi(ctx, state, activeFrame);
  }

  if (cursorHugState.phase === 'clinging') {
    drawClingingNotes(ctx, state.x, state.y, now);
  }

  if (state.speechBubble) {
    drawSpeechBubble(
      ctx,
      state.x,
      state.y - DEFAULT_PHYSICS_CONFIG.spriteRadius - 15,
      state.speechBubble
    );
  }

  // Draw giant alarm overlay on top of canvas when active (randomized between giant sprites)
  if (giantAlarmState.active) {
    const giantFrame =
      activeGiantFrame ||
      giantSpriteFrames[0] ||
      giantSpriteFrame ||
      processedFrames[UPRIGHT_SPRITE_INDEX] ||
      processedFrames[0];
    if (giantFrame) {
      const renderModel = getGiantAlarmRenderModel(giantAlarmState);
      drawGiantAlarmOverlay(ctx, renderModel, giantFrame, screenBounds, now);
    }
  }

  requestAnimationFrame(animationLoop);
}

loadAllSprites()
  .then(() => {
    lastTime = performance.now();
    requestAnimationFrame(animationLoop);
  })
  .catch((err) => {
    console.error('Failed to load Usagi sprites:', err);
  });
