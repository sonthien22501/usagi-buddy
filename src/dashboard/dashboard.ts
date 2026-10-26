import { formatPomodoroTime, parseCustomDuration, PomodoroState } from '../core/pomodoroTimer';
import { VolumeConfig } from '../core/soundManager';
import { CostumeId, OutfitSelection, getCostumeDefinition } from '../core/costumeManager';
import { ReminderState } from '../core/reminderStore';

const themeToggleBtn = document.getElementById('theme-toggle-btn') as HTMLButtonElement | null;

// Sticky Reminders elements
const toggleStickyWindowBtn = document.getElementById(
  'toggle-sticky-window-btn'
) as HTMLButtonElement | null;
const dashboardQuestInput = document.getElementById(
  'dashboard-quest-input'
) as HTMLInputElement | null;
const dashboardAddQuestBtn = document.getElementById(
  'dashboard-add-quest-btn'
) as HTMLButtonElement | null;
const dashboardQuestList = document.getElementById('dashboard-quest-list') as HTMLDivElement | null;
const dashboardQuestCounter = document.getElementById(
  'dashboard-quest-counter'
) as HTMLSpanElement | null;
const dashboardClearDoneBtn = document.getElementById(
  'dashboard-clear-done-btn'
) as HTMLButtonElement | null;

// Cursor Hug elements
const cursorHugToggleBtn = document.getElementById(
  'cursor-hug-toggle-btn'
) as HTMLButtonElement | null;
const pounceCursorBtn = document.getElementById('pounce-cursor-btn') as HTMLButtonElement | null;

// Volume elements
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement | null;
const volumeValBadge = document.getElementById('volume-val-badge') as HTMLSpanElement | null;
const testSoundBtn = document.getElementById('test-sound-btn') as HTMLButtonElement | null;
const muteToggleBtn = document.getElementById('mute-toggle-btn') as HTMLButtonElement | null;

// Mode elements
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

// Timer elements
const timerBadge = document.getElementById('timer-badge') as HTMLSpanElement | null;
const clockTime = document.getElementById('clock-time') as HTMLDivElement | null;
const clockStatus = document.getElementById('clock-status') as HTMLDivElement | null;
const manualTimeInput = document.getElementById('manual-time-input') as HTMLInputElement | null;
const add10Btn = document.getElementById('add-10-btn') as HTMLButtonElement | null;
const startTimerBtn = document.getElementById('start-timer-btn') as HTMLButtonElement | null;
const pauseTimerBtn = document.getElementById('pause-timer-btn') as HTMLButtonElement | null;
const resetTimerBtn = document.getElementById('reset-timer-btn') as HTMLButtonElement | null;

// Wardrobe elements
const costumeBadge = document.getElementById('costume-badge') as HTMLSpanElement | null;
const costumeButtons = document.querySelectorAll<HTMLButtonElement>('.costume-card-btn');
const chipButtons = document.querySelectorAll<HTMLButtonElement>('.chip-btn');

let currentVolumeConfig: VolumeConfig = {
  master: 0.8,
  buddy: 1.0,
  alarm: 1.0,
  equalizeLoudness: true,
};

let currentPomodoroState: PomodoroState | null = null;
let currentReminderState: ReminderState = {
  items: [],
  stickyVisible: true,
  theme: 'custard',
};
let isMuted = false;
let isStationary = false;
let isPlayMode = false;
let isGhostMode = false;
let isCursorHugEnabled = true;

// 1. Theme Management
function updateThemeUI(theme: 'custard' | 'night'): void {
  document.body.setAttribute('data-theme', theme);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = theme === 'custard' ? '🌙 Night' : '☀️ Custard';
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const nextTheme = currentReminderState.theme === 'custard' ? 'night' : 'custard';
    window.usagiAPI?.setTheme(nextTheme);
  });
}

// 2. Desktop Sticky Reminders
function updateReminderUI(state: ReminderState): void {
  currentReminderState = state;
  updateThemeUI(state.theme);

  if (toggleStickyWindowBtn) {
    toggleStickyWindowBtn.textContent = state.stickyVisible ? '📝 Hide Note' : '📝 Show Note';
  }

  if (!dashboardQuestList) return;
  dashboardQuestList.innerHTML = '';

  if (state.items.length === 0) {
    const empty = document.createElement('div');
    empty.style.textAlign = 'center';
    empty.style.padding = '12px 0';
    empty.style.fontSize = '12px';
    empty.style.opacity = '0.7';
    empty.textContent = 'No active quests! Relax with Usagi~';
    dashboardQuestList.appendChild(empty);
  } else {
    for (const item of state.items) {
      const itemRow = document.createElement('div');
      itemRow.className = `quest-dashboard-item ${item.completed ? 'completed' : ''}`;
      itemRow.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.delete-btn')) return;
        window.usagiAPI?.toggleReminder(item.id);
      });

      const bullet = document.createElement('span');
      bullet.className = 'quest-bullet';
      bullet.textContent = item.completed ? '🍮' : '✦';

      const questText = document.createElement('span');
      questText.className = 'quest-text';
      questText.textContent = item.text;
      const comfyLine = document.createElement('span');
      comfyLine.className = 'comfy-line';
      questText.appendChild(comfyLine);

      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = '✕';
      del.title = 'Delete Quest';
      del.addEventListener('click', () => {
        window.usagiAPI?.deleteReminder(item.id);
      });

      itemRow.appendChild(bullet);
      itemRow.appendChild(questText);
      itemRow.appendChild(del);
      dashboardQuestList.appendChild(itemRow);
    }
  }

  const completed = state.items.filter((it) => it.completed).length;
  if (dashboardQuestCounter) {
    dashboardQuestCounter.textContent = `${completed}/${state.items.length} completed`;
  }
}

function handleAddQuest(): void {
  if (!dashboardQuestInput) return;
  const val = dashboardQuestInput.value.trim();
  if (val && window.usagiAPI) {
    window.usagiAPI.addReminder(val);
    dashboardQuestInput.value = '';
  }
}

if (dashboardAddQuestBtn) {
  dashboardAddQuestBtn.addEventListener('click', handleAddQuest);
}

if (dashboardQuestInput) {
  dashboardQuestInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleAddQuest();
    }
  });
}

if (dashboardClearDoneBtn) {
  dashboardClearDoneBtn.addEventListener('click', () => {
    window.usagiAPI?.clearCompletedReminders();
  });
}

if (toggleStickyWindowBtn) {
  toggleStickyWindowBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleStickyWindow();
  });
}

// 3. Cursor Hug Controls
function updateCursorHugUI(enabled: boolean): void {
  isCursorHugEnabled = enabled;
  if (cursorHugToggleBtn) {
    cursorHugToggleBtn.textContent = enabled ? '🐾 Hug: ON' : '🐾 Hug: OFF';
    if (enabled) {
      cursorHugToggleBtn.classList.add('active');
    } else {
      cursorHugToggleBtn.classList.remove('active');
    }
  }
}

if (cursorHugToggleBtn) {
  cursorHugToggleBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleCursorHug();
  });
}

if (pounceCursorBtn) {
  pounceCursorBtn.addEventListener('click', () => {
    window.usagiAPI?.triggerCursorHugNow();
  });
}

// 4. Unified Volume Slider with Active Dynamic Fill & Grey Inactive Track
function updateSliderTrack(val: number): void {
  if (!volumeSlider) return;
  const pct = Math.max(0, Math.min(100, val));
  volumeSlider.style.background = `linear-gradient(to right, var(--accent-strawberry) 0%, var(--card-inner) ${pct}%, var(--slider-track) ${pct}%, var(--slider-track) 100%)`;
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

// 5. Custom Pomodoro Timer
function updatePomodoroUI(state: PomodoroState): void {
  currentPomodoroState = state;
  const timeFormatted = formatPomodoroTime(state.remainingMs);
  const phaseUpper = state.phase.toUpperCase();

  if (clockTime) {
    clockTime.textContent = timeFormatted;
  }

  if (clockStatus) {
    if (state.phase === 'running') {
      clockStatus.textContent = 'FOCUS SESSION IN PROGRESS';
    } else if (state.phase === 'paused') {
      clockStatus.textContent = 'SESSION PAUSED';
    } else if (state.phase === 'completed') {
      clockStatus.textContent = 'GREAT JOB! SESSION FINISHED';
    } else {
      clockStatus.textContent = 'READY TO FOCUS';
    }
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
    const min = Number(btn.getAttribute('data-min'));
    if (min > 0) {
      const ms = min * 60 * 1000;
      window.usagiAPI?.setPomodoroDuration(ms, true);
    }
  });
});

if (startTimerBtn) {
  startTimerBtn.addEventListener('click', () => {
    const val = manualTimeInput ? Number(manualTimeInput.value) : 0;
    if (val > 0) {
      const parsedMs = parseCustomDuration(val, 'minutes');
      window.usagiAPI?.setPomodoroDuration(parsedMs, true);
    } else if (currentPomodoroState && currentPomodoroState.phase === 'paused') {
      window.usagiAPI?.pausePomodoroTimer();
    } else {
      window.usagiAPI?.setPomodoroDuration(25 * 60 * 1000, true);
    }
  });
}

if (add10Btn) {
  add10Btn.addEventListener('click', () => {
    if (!manualTimeInput) return;
    const current = Number(manualTimeInput.value) || 0;
    manualTimeInput.value = String(current + 10);
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

// 6. Companion Modes (Equal Identical Buttons)
function updateStationaryUI(stationary: boolean): void {
  isStationary = stationary;
  if (stationaryToggleBtn) {
    stationaryToggleBtn.textContent = stationary ? '📌 Stationary' : '📌 Pin Still';
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
    playModeToggleBtn.textContent = enabled ? '🪄 Following' : '🪄 Follow Mouse';
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
    ghostModeToggleBtn.textContent = locked ? '👻 Pass-thru' : '👻 Ghost Mode';
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

// 7. Costume Selection
function updateCostumeUI(costume: CostumeId, selection: OutfitSelection): void {
  if (costumeBadge) {
    if (selection === 'random') {
      const def = getCostumeDefinition(costume);
      costumeBadge.textContent = `🎲 RANDOM (${def.label.toUpperCase()})`;
    } else {
      const def = getCostumeDefinition(costume);
      costumeBadge.textContent = `${def.icon} ${def.label.toUpperCase()}`;
    }
  }

  costumeButtons.forEach((btn) => {
    const target = btn.getAttribute('data-costume');
    if (target === selection) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

costumeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-costume') as OutfitSelection | null;
    if (target) {
      window.usagiAPI?.setCostume(target);
    }
  });
});

// 8. IPC Listeners from Main Process
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

  window.usagiAPI.onCostumeChanged((costume, selection) => {
    updateCostumeUI(costume, selection);
  });

  window.usagiAPI.onReminderStateChanged((state) => {
    updateReminderUI(state);
  });

  window.usagiAPI.onCursorHugChanged((enabled) => {
    updateCursorHugUI(enabled);
  });

  window.usagiAPI
    .getReminderState()
    .then((state) => {
      if (state) updateReminderUI(state);
    })
    .catch((err) => {
      console.warn('Failed to fetch initial reminder state in dashboard:', err);
    });
}
