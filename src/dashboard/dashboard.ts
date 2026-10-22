import { formatPomodoroTime, parseCustomDuration, PomodoroState } from '../core/pomodoroTimer';
import { VolumeConfig } from '../core/soundManager';

const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement | null;
const volumeValBadge = document.getElementById('volume-val-badge') as HTMLSpanElement | null;
const testSoundBtn = document.getElementById('test-sound-btn') as HTMLButtonElement | null;
const muteToggleBtn = document.getElementById('mute-toggle-btn') as HTMLButtonElement | null;

const stationaryToggleBtn = document.getElementById(
  'stationary-toggle-btn'
) as HTMLButtonElement | null;

const playModeToggleBtn = document.getElementById(
  'play-mode-toggle-btn'
) as HTMLButtonElement | null;

const ghostModeToggleBtn = document.getElementById(
  'ghost-mode-toggle-btn'
) as HTMLButtonElement | null;

const dropSnackBtn = document.getElementById('drop-snack-btn') as HTMLButtonElement | null;

const timerBadge = document.getElementById('timer-badge') as HTMLSpanElement | null;
const clockTime = document.getElementById('clock-time') as HTMLDivElement | null;
const clockStatus = document.getElementById('clock-status') as HTMLDivElement | null;
const manualTimeInput = document.getElementById('manual-time-input') as HTMLInputElement | null;
const manualUnitSelect = document.getElementById('manual-unit-select') as HTMLSelectElement | null;
const startTimerBtn = document.getElementById('start-timer-btn') as HTMLButtonElement | null;
const pauseTimerBtn = document.getElementById('pause-timer-btn') as HTMLButtonElement | null;
const resetTimerBtn = document.getElementById('reset-timer-btn') as HTMLButtonElement | null;

const testGiantAlarmBtn = document.getElementById(
  'test-giant-alarm-btn'
) as HTMLButtonElement | null;
const chipButtons = document.querySelectorAll<HTMLButtonElement>('.chip-btn');

let currentVolumeConfig: VolumeConfig = {
  master: 0.8,
  buddy: 1.0,
  alarm: 1.0,
  equalizeLoudness: true,
};

let currentPomodoroState: PomodoroState | null = null;
let isMuted = false;
let isStationary = false;
let isPlayMode = false;
let isGhostMode = false;

// 1. Unified Volume Slider with Active Dynamic Fill & Grey Inactive Track
function updateSliderTrack(val: number): void {
  if (!volumeSlider) return;
  const pct = Math.max(0, Math.min(100, val));
  volumeSlider.style.background = `linear-gradient(to right, #ff7675 0%, #ffeaa7 ${pct}%, rgba(255, 255, 255, 0.16) ${pct}%, rgba(255, 255, 255, 0.16) 100%)`;
}

// Initialize track fill at 80%
updateSliderTrack(80);

if (volumeSlider) {
  volumeSlider.addEventListener('input', () => {
    const val = Number(volumeSlider.value);
    updateSliderTrack(val);
    if (volumeValBadge) {
      volumeValBadge.textContent = `${val}%`;
    }
    const master = Math.max(0, Math.min(1, val / 100));
    currentVolumeConfig = {
      ...currentVolumeConfig,
      master,
      buddy: 1.0,
      alarm: 1.0,
      equalizeLoudness: true,
    };
    window.usagiAPI?.updateVolumeConfig(currentVolumeConfig);
  });
}

if (testSoundBtn) {
  testSoundBtn.addEventListener('click', () => {
    window.usagiAPI?.triggerTestSound();
  });
}

if (muteToggleBtn) {
  muteToggleBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleSoundMute();
  });
}

// 2. Custom Pomodoro Timer
function updatePomodoroUI(state: PomodoroState): void {
  currentPomodoroState = state;
  const timeFormatted = formatPomodoroTime(state.remainingMs);
  const phaseUpper = state.phase.toUpperCase();

  if (clockTime) {
    clockTime.textContent = timeFormatted;
  }
  if (clockStatus) {
    clockStatus.textContent =
      state.phase === 'running'
        ? 'FOCUSING... (ﾉ>ω<)ﾉ'
        : state.phase === 'paused'
          ? 'PAUSED'
          : state.phase === 'completed'
            ? 'COMPLETED! 🎉'
            : 'READY TO FOCUS';
  }
  if (timerBadge) {
    timerBadge.textContent = `${timeFormatted} ${phaseUpper}`;
  }
  if (pauseTimerBtn) {
    pauseTimerBtn.textContent = state.phase === 'running' ? '⏸ Pause' : '▶ Resume';
  }
}

chipButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const minAttr = btn.getAttribute('data-min');
    const hoursAttr = btn.getAttribute('data-hours');
    let durationMs = 1_500_000;
    if (minAttr) {
      durationMs = parseCustomDuration(Number(minAttr), 'minutes');
    } else if (hoursAttr) {
      durationMs = parseCustomDuration(Number(hoursAttr), 'hours');
    }
    window.usagiAPI?.setPomodoroDuration(durationMs, true);
  });
});

if (startTimerBtn && manualTimeInput && manualUnitSelect) {
  startTimerBtn.addEventListener('click', () => {
    const val = Number(manualTimeInput.value);
    const unit = manualUnitSelect.value as 'minutes' | 'hours';
    const durationMs = parseCustomDuration(val, unit);
    window.usagiAPI?.setPomodoroDuration(durationMs, true);
  });
}

if (pauseTimerBtn) {
  pauseTimerBtn.addEventListener('click', () => {
    window.usagiAPI?.pausePomodoroTimer();
  });
}

if (resetTimerBtn) {
  resetTimerBtn.addEventListener('click', () => {
    window.usagiAPI?.resetPomodoroTimer();
  });
}

// 3. Companion Modes & Actions (Equal & Symmetrical Buttons)
function updateStationaryUI(stationary: boolean): void {
  isStationary = stationary;
  if (stationaryToggleBtn) {
    stationaryToggleBtn.textContent = stationary ? '🌊 Unpin' : '📌 Pin Still';
    if (stationary) {
      stationaryToggleBtn.classList.add('active');
    } else {
      stationaryToggleBtn.classList.remove('active');
    }
  }
}

function updatePlayModeUI(enabled: boolean): void {
  isPlayMode = enabled;
  if (playModeToggleBtn) {
    playModeToggleBtn.textContent = enabled ? '🪄 Stop Follow' : '🪄 Follow Mouse';
    if (enabled) {
      playModeToggleBtn.classList.add('active');
    } else {
      playModeToggleBtn.classList.remove('active');
    }
  }
}

function updateGhostModeUI(locked: boolean): void {
  isGhostMode = locked;
  if (ghostModeToggleBtn) {
    ghostModeToggleBtn.textContent = locked ? '👻 Solid Mode' : '👻 Ghost Mode';
    if (locked) {
      ghostModeToggleBtn.classList.add('active');
    } else {
      ghostModeToggleBtn.classList.remove('active');
    }
  }
}

if (stationaryToggleBtn) {
  stationaryToggleBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleStationaryMode();
  });
}

if (playModeToggleBtn) {
  playModeToggleBtn.addEventListener('click', () => {
    window.usagiAPI?.togglePlayMode();
  });
}

if (ghostModeToggleBtn) {
  ghostModeToggleBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleGhostMode();
  });
}

if (dropSnackBtn) {
  dropSnackBtn.addEventListener('click', () => {
    window.usagiAPI?.dropSnackNow();
  });
}

// 4. Giant Usagi Jumpscare Alarm Test
if (testGiantAlarmBtn) {
  testGiantAlarmBtn.addEventListener('click', () => {
    window.usagiAPI?.triggerGiantAlarmNow();
  });
}

// 5. IPC Listeners from Main Process
if (window.usagiAPI) {
  window.usagiAPI.onVolumeConfigChanged((config) => {
    currentVolumeConfig = config;
    const pct = Math.round(config.master * 100);
    if (volumeSlider) {
      volumeSlider.value = String(pct);
      updateSliderTrack(pct);
    }
    if (volumeValBadge) {
      volumeValBadge.textContent = `${pct}%`;
    }
  });

  window.usagiAPI.onSoundMutedChanged((muted) => {
    isMuted = muted;
    if (muteToggleBtn) {
      muteToggleBtn.textContent = muted ? '🔊 Unmute' : '🔇 Mute';
      if (muted) {
        muteToggleBtn.classList.add('active');
      } else {
        muteToggleBtn.classList.remove('active');
      }
    }
  });

  window.usagiAPI.onStationaryModeChanged((stationary) => {
    updateStationaryUI(stationary);
  });

  window.usagiAPI.onPlayModeChanged((enabled) => {
    updatePlayModeUI(enabled);
  });

  window.usagiAPI.onGhostModeChanged((locked) => {
    updateGhostModeUI(locked);
  });

  window.usagiAPI.onPomodoroStateChanged((state) => {
    updatePomodoroUI(state);
  });
}
