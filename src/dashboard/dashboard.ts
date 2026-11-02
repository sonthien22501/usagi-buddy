import { formatPomodoroTime, parseCustomDuration, PomodoroState } from '../core/pomodoroTimer';
import { VolumeConfig } from '../core/soundManager';
import { CostumeId, OutfitSelection, getCostumeDefinition } from '../core/costumeManager';
import { ReminderState } from '../core/reminderStore';
import { getKawaiiIcon, renderIconLabel } from '../core/kawaiiIcons';

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
const fixAppearanceToggleBtn = document.getElementById(
  'fix-appearance-toggle-btn'
) as HTMLButtonElement | null;
const hideUsagiToggleBtn = document.getElementById(
  'hide-usagi-toggle-btn'
) as HTMLButtonElement | null;
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
let isFixedAppearance = false;
let isUsagiHidden = false;

// 1. Theme Management
function updateThemeUI(theme: 'custard' | 'night'): void {
  document.body.setAttribute('data-theme', theme);
  if (themeToggleBtn) {
    themeToggleBtn.innerHTML = renderIconLabel(
      theme === 'custard' ? 'moon' : 'sun',
      theme === 'custard' ? 'Night' : 'Custard',
      13
    );
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
    toggleStickyWindowBtn.innerHTML = renderIconLabel(
      'note',
      state.stickyVisible ? 'Hide Note' : 'Show Note',
      13
    );
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

// 3. Unified Volume Slider with Active Dynamic Fill & Grey Inactive Track
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
  const durationMin = Math.round(state.durationMs / 60000);

  if (manualTimeInput) {
    manualTimeInput.placeholder = String(durationMin);
  }

  chipButtons.forEach((btn) => {
    const min = Number(btn.getAttribute('data-min'));
    if (min === durationMin) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

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
    pauseTimerBtn.innerHTML = renderIconLabel(
      state.phase === 'running' ? 'pause' : 'play',
      state.phase === 'running' ? 'Pause' : 'Resume',
      13
    );
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

// Static Icon Initialization
function initDashboardIcons(): void {
  const stickyCardIcon = document.getElementById('sticky-card-icon');
  if (stickyCardIcon) stickyCardIcon.innerHTML = getKawaiiIcon('note', 16);

  const volCardIcon = document.getElementById('volume-card-icon');
  if (volCardIcon) volCardIcon.innerHTML = getKawaiiIcon('volume', 16);

  const volLowIcon = document.getElementById('vol-low-icon');
  if (volLowIcon) volLowIcon.innerHTML = getKawaiiIcon('volume-low', 14);

  const volHighIcon = document.getElementById('vol-high-icon');
  if (volHighIcon) volHighIcon.innerHTML = getKawaiiIcon('volume', 14);

  if (testSoundBtn) testSoundBtn.innerHTML = renderIconLabel('music', 'Test Sound', 13);

  const timerCardIcon = document.getElementById('timer-card-icon');
  if (timerCardIcon) timerCardIcon.innerHTML = getKawaiiIcon('tomato', 16);

  if (startTimerBtn) startTimerBtn.innerHTML = renderIconLabel('play', 'Start', 13);
  if (resetTimerBtn) resetTimerBtn.innerHTML = renderIconLabel('reset', 'Reset', 13);

  // Preset chips
  const chip25 = document.querySelector('.chip-btn[data-min="25"]');
  if (chip25) chip25.innerHTML = renderIconLabel('tomato', '25m Pomodoro', 13);
  const chip52 = document.querySelector('.chip-btn[data-min="52"]');
  if (chip52) chip52.innerHTML = renderIconLabel('bolt', '52m Rule (17m rest)', 13);
  const chip90 = document.querySelector('.chip-btn[data-min="90"]');
  if (chip90) chip90.innerHTML = renderIconLabel('wave', '90m Ultradian (20m rest)', 13);

  // Wardrobe header & costume icons
  const wardrobeCardIcon = document.getElementById('wardrobe-card-icon');
  if (wardrobeCardIcon) wardrobeCardIcon.innerHTML = getKawaiiIcon('wardrobe', 16);

  const classicIcon = document.getElementById('costume-icon-classic');
  if (classicIcon) classicIcon.innerHTML = getKawaiiIcon('usagi', 20);
  const studyIcon = document.getElementById('costume-icon-study');
  if (studyIcon) studyIcon.innerHTML = getKawaiiIcon('book', 20);
  const vestIcon = document.getElementById('costume-icon-vest');
  if (vestIcon) vestIcon.innerHTML = getKawaiiIcon('tie', 20);
  const sigmaIcon = document.getElementById('costume-icon-sigma');
  if (sigmaIcon) sigmaIcon.innerHTML = getKawaiiIcon('shades', 20);
  const starIcon = document.getElementById('costume-icon-star');
  if (starIcon) starIcon.innerHTML = getKawaiiIcon('star', 20);
  const randomIcon = document.getElementById('costume-icon-random');
  if (randomIcon) randomIcon.innerHTML = getKawaiiIcon('dice', 20);

  // Mode header & title icons
  const modesCardIcon = document.getElementById('modes-card-icon');
  if (modesCardIcon) modesCardIcon.innerHTML = getKawaiiIcon('gamepad', 16);

  const pinTitleIcon = document.getElementById('pin-title-icon');
  if (pinTitleIcon) pinTitleIcon.innerHTML = getKawaiiIcon('pin', 14);
  const wandTitleIcon = document.getElementById('wand-title-icon');
  if (wandTitleIcon) wandTitleIcon.innerHTML = getKawaiiIcon('wand', 14);
  const ghostTitleIcon = document.getElementById('ghost-title-icon');
  if (ghostTitleIcon) ghostTitleIcon.innerHTML = getKawaiiIcon('ghost', 14);
  const puddingTitleIcon = document.getElementById('pudding-title-icon');
  if (puddingTitleIcon) puddingTitleIcon.innerHTML = getKawaiiIcon('pudding', 14);
  const hideTitleIcon = document.getElementById('hide-title-icon');
  if (hideTitleIcon) hideTitleIcon.innerHTML = getKawaiiIcon('eye-hide', 14);

  if (dropSnackBtn) dropSnackBtn.innerHTML = renderIconLabel('pudding', 'Drop Snack', 13);
}

initDashboardIcons();

// 6. Companion Modes (Equal Identical Buttons)
function updateStationaryUI(stationary: boolean): void {
  isStationary = stationary;
  if (stationaryToggleBtn) {
    stationaryToggleBtn.innerHTML = renderIconLabel(
      'pin',
      stationary ? 'Stationary' : 'Pin Still',
      13
    );
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
    playModeToggleBtn.innerHTML = renderIconLabel(
      'wand',
      enabled ? 'Following' : 'Follow Mouse',
      13
    );
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
    ghostModeToggleBtn.innerHTML = renderIconLabel(
      'ghost',
      locked ? 'Pass-thru' : 'Ghost Mode',
      13
    );
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
      costumeBadge.innerHTML = renderIconLabel('dice', `RANDOM (${def.label.toUpperCase()})`, 12);
    } else {
      const def = getCostumeDefinition(costume);
      const iconId = (
        def.id === 'classic'
          ? 'usagi'
          : def.id === 'study'
            ? 'book'
            : def.id === 'vest'
              ? 'tie'
              : def.id === 'sigma'
                ? 'shades'
                : 'star'
      ) as any;
      costumeBadge.innerHTML = renderIconLabel(iconId, def.label.toUpperCase(), 12);
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

// 8. Fixed Appearance & Hide Usagi Controls
function updateFixedAppearanceUI(fixed: boolean): void {
  isFixedAppearance = fixed;
  if (fixAppearanceToggleBtn) {
    fixAppearanceToggleBtn.innerHTML = renderIconLabel(
      fixed ? 'lock' : 'rotate',
      fixed ? 'Appearance Fixed' : 'Auto-Change',
      13
    );
    if (fixed) {
      fixAppearanceToggleBtn.classList.add('active');
    } else {
      fixAppearanceToggleBtn.classList.remove('active');
    }
  }
}

function updateUsagiHiddenUI(hidden: boolean): void {
  isUsagiHidden = hidden;
  if (hideUsagiToggleBtn) {
    hideUsagiToggleBtn.innerHTML = renderIconLabel(
      hidden ? 'usagi' : 'eye-hide',
      hidden ? 'Show Usagi' : 'Hide Usagi',
      13
    );
    if (hidden) {
      hideUsagiToggleBtn.classList.add('active');
    } else {
      hideUsagiToggleBtn.classList.remove('active');
    }
  }
}

if (fixAppearanceToggleBtn) {
  fixAppearanceToggleBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleFixedAppearance();
  });
}

if (hideUsagiToggleBtn) {
  hideUsagiToggleBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleUsagiHidden();
  });
}

// 9. IPC Listeners from Main Process
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
      muteToggleBtn.innerHTML = renderIconLabel(
        muted ? 'volume' : 'mute',
        muted ? 'Unmute' : 'Mute',
        13
      );
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

  window.usagiAPI.onFixedAppearanceChanged((fixed) => {
    updateFixedAppearanceUI(fixed);
  });

  window.usagiAPI.onUsagiHiddenChanged((hidden) => {
    updateUsagiHiddenUI(hidden);
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
