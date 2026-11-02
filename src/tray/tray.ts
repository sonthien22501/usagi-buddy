import { getKawaiiIcon } from '../core/kawaiiIcons';
import { formatPomodoroTime, PomodoroState } from '../core/pomodoroTimer';
import { ReminderState } from '../core/reminderStore';

// Timer elements
const clockTime = document.getElementById('tray-clock-time') as HTMLDivElement | null;
const clockBadge = document.getElementById('tray-clock-badge') as HTMLSpanElement | null;
const startPauseBtn = document.getElementById('tray-start-pause-btn') as HTMLButtonElement | null;
const startPauseIcon = document.getElementById('tray-start-pause-icon') as HTMLSpanElement | null;
const startPauseText = document.getElementById('tray-start-pause-text') as HTMLSpanElement | null;
const resetBtn = document.getElementById('tray-reset-btn') as HTMLButtonElement | null;
const resetIcon = document.getElementById('tray-reset-icon') as HTMLSpanElement | null;

// Chips
const presetChips = document.querySelectorAll<HTMLButtonElement>('.preset-chip');

// Action elements
const openDashboardBtn = document.getElementById(
  'tray-open-dashboard-btn'
) as HTMLButtonElement | null;
const toggleStickyBtn = document.getElementById(
  'tray-toggle-sticky-btn'
) as HTMLButtonElement | null;
const toggleHiddenBtn = document.getElementById(
  'tray-toggle-hidden-btn'
) as HTMLButtonElement | null;
const dropSnackBtn = document.getElementById('tray-drop-snack-btn') as HTMLButtonElement | null;
const quitBtn = document.getElementById('tray-quit-btn') as HTMLButtonElement | null;

const stickyText = document.getElementById('tray-sticky-text') as HTMLSpanElement | null;
const stickyStatus = document.getElementById('tray-sticky-status') as HTMLSpanElement | null;
const hiddenText = document.getElementById('tray-hidden-text') as HTMLSpanElement | null;
const hiddenStatus = document.getElementById('tray-hidden-status') as HTMLSpanElement | null;
const hiddenIcon = document.getElementById('tray-hidden-icon') as HTMLSpanElement | null;

let currentPomodoroState: PomodoroState | null = null;
let currentReminderState: ReminderState = {
  items: [],
  stickyVisible: true,
  theme: 'custard',
};
let isUsagiHidden = false;

// Populate static kawaii icons
function initStaticIcons(): void {
  const dashboardIcon = document.getElementById('tray-dashboard-icon');
  if (dashboardIcon) dashboardIcon.innerHTML = getKawaiiIcon('dashboard', 16);

  const stickyIcon = document.getElementById('tray-sticky-icon');
  if (stickyIcon) stickyIcon.innerHTML = getKawaiiIcon('note', 16);

  const puddingIcon = document.getElementById('tray-pudding-icon');
  if (puddingIcon) puddingIcon.innerHTML = getKawaiiIcon('pudding', 16);

  const quitIcon = document.getElementById('tray-quit-icon');
  if (quitIcon) quitIcon.innerHTML = getKawaiiIcon('door-quit', 15);

  if (resetIcon) resetIcon.innerHTML = getKawaiiIcon('reset', 14);
}

// Update Timer UI
function updatePomodoroUI(state: PomodoroState): void {
  currentPomodoroState = state;
  const timeFormatted = formatPomodoroTime(state.remainingMs);
  const phaseUpper = state.phase.toUpperCase();

  if (clockTime) {
    clockTime.textContent = timeFormatted;
  }
  if (clockBadge) {
    clockBadge.textContent = phaseUpper;
  }

  if (startPauseIcon && startPauseText) {
    if (state.phase === 'running') {
      startPauseIcon.innerHTML = getKawaiiIcon('pause', 14);
      startPauseText.textContent = 'Pause';
    } else {
      startPauseIcon.innerHTML = getKawaiiIcon('play', 14);
      startPauseText.textContent = state.phase === 'paused' ? 'Resume' : 'Start';
    }
  }
}

// Update Reminder and Sticky State
function updateReminderUI(state: ReminderState): void {
  currentReminderState = state;
  document.body.setAttribute('data-theme', 'custard');

  if (stickyText && stickyStatus) {
    stickyText.textContent = state.stickyVisible ? 'Hide Sticky Quests' : 'Show Sticky Quests';
    stickyStatus.textContent = state.stickyVisible ? 'ON' : 'OFF';
  }
  if (toggleStickyBtn) {
    if (state.stickyVisible) {
      toggleStickyBtn.classList.add('active');
    } else {
      toggleStickyBtn.classList.remove('active');
    }
  }
}

// Update Usagi Hidden State
function updateHiddenUI(hidden: boolean): void {
  isUsagiHidden = hidden;
  if (hiddenText) {
    hiddenText.textContent = hidden ? 'Show Usagi Buddy' : 'Hide Usagi Buddy';
  }
  if (hiddenStatus) {
    hiddenStatus.textContent = hidden ? 'HIDDEN' : '';
  }
  if (hiddenIcon) {
    hiddenIcon.innerHTML = getKawaiiIcon(hidden ? 'usagi' : 'eye-hide', 16);
  }
  if (toggleHiddenBtn) {
    if (hidden) {
      toggleHiddenBtn.classList.add('active');
    } else {
      toggleHiddenBtn.classList.remove('active');
    }
  }
}

// Event Bindings
initStaticIcons();
updateHiddenUI(false);

if (startPauseBtn) {
  startPauseBtn.addEventListener('click', () => {
    if (currentPomodoroState && currentPomodoroState.phase === 'running') {
      window.usagiAPI?.pausePomodoroTimer();
    } else if (currentPomodoroState && currentPomodoroState.phase === 'paused') {
      window.usagiAPI?.pausePomodoroTimer();
    } else {
      window.usagiAPI?.setPomodoroDuration(25 * 60 * 1000, true);
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    window.usagiAPI?.resetPomodoroTimer();
  });
}

presetChips.forEach((btn) => {
  btn.addEventListener('click', () => {
    const min = Number(btn.getAttribute('data-min'));
    if (min > 0) {
      window.usagiAPI?.setPomodoroDuration(min * 60 * 1000, true);
    }
  });
});

if (openDashboardBtn) {
  openDashboardBtn.addEventListener('click', () => {
    window.usagiAPI?.openDashboardWindow();
  });
}

if (toggleStickyBtn) {
  toggleStickyBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleStickyWindow();
  });
}

if (toggleHiddenBtn) {
  toggleHiddenBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleUsagiHidden();
  });
}

if (dropSnackBtn) {
  dropSnackBtn.addEventListener('click', () => {
    window.usagiAPI?.dropSnackNow();
  });
}

if (quitBtn) {
  quitBtn.addEventListener('click', () => {
    window.usagiAPI?.quitApp();
  });
}

// IPC Listeners
if (window.usagiAPI) {
  window.usagiAPI.onPomodoroStateChanged((state) => {
    updatePomodoroUI(state);
  });

  window.usagiAPI.onReminderStateChanged((state) => {
    updateReminderUI(state);
  });

  window.usagiAPI.onUsagiHiddenChanged((hidden) => {
    updateHiddenUI(hidden);
  });

  window.usagiAPI
    .getReminderState()
    .then((state) => {
      if (state) updateReminderUI(state);
    })
    .catch((err) => {
      console.warn('Failed to load initial reminder state in tray:', err);
    });
}
