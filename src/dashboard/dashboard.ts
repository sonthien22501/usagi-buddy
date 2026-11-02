import { formatPomodoroTime, parseCustomDuration, PomodoroState } from '../core/pomodoroTimer';
import { VolumeConfig } from '../core/soundManager';
import { CostumeId, OutfitSelection, getCostumeDefinition } from '../core/costumeManager';
import { ReminderState } from '../core/reminderStore';
import { getKawaiiIcon } from '../core/kawaiiIcons';
import { BuddyProfile, HolidayEvent } from '../core/calendarStore';

// Tab Switcher Elements
const dashTabCompanion = document.getElementById('dashTabCompanion') as HTMLButtonElement | null;
const dashTabConfig = document.getElementById('dashTabConfig') as HTMLButtonElement | null;
const dashViewCompanion = document.getElementById('dashViewCompanion') as HTMLDivElement | null;
const dashViewConfig = document.getElementById('dashViewConfig') as HTMLDivElement | null;

// Sticky Note Toggle in Companion tab
const toggleStickyWindowBtn = document.getElementById(
  'toggle-sticky-window-btn'
) as HTMLButtonElement | null;

// Buddy Profile Elements
const buddyNicknameInput = document.getElementById(
  'buddy-nickname-input'
) as HTMLInputElement | null;
const buddyBdayDay = document.getElementById('buddy-bday-day') as HTMLSelectElement | null;
const buddyBdayMonth = document.getElementById('buddy-bday-month') as HTMLSelectElement | null;
const buddyCountrySelect = document.getElementById(
  'buddy-country-select'
) as HTMLSelectElement | null;
const buddyProfileIcon = document.getElementById('buddy-profile-icon') as HTMLSpanElement | null;

// Date & Sticky Config Elements
const configDateFormatBtn = document.getElementById(
  'config-date-format-btn'
) as HTMLButtonElement | null;
const configWeekStartBtn = document.getElementById(
  'config-week-start-btn'
) as HTMLButtonElement | null;
const configFontScaleBtn = document.getElementById(
  'config-font-scale-btn'
) as HTMLButtonElement | null;
const configStickySizeBtn = document.getElementById(
  'config-sticky-size-btn'
) as HTMLButtonElement | null;
const configStickyPinBtn = document.getElementById(
  'config-sticky-pin-btn'
) as HTMLButtonElement | null;
const configCalendarIcon = document.getElementById(
  'config-calendar-icon'
) as HTMLSpanElement | null;

// Volume Elements
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement | null;
const volumeValBadge = document.getElementById('volume-val-badge') as HTMLSpanElement | null;
const testSoundBtn = document.getElementById('test-sound-btn') as HTMLButtonElement | null;
const muteToggleBtn = document.getElementById('mute-toggle-btn') as HTMLButtonElement | null;

// Mode Elements
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
const hideUsagiToggleBtn = document.getElementById(
  'hide-usagi-toggle-btn'
) as HTMLButtonElement | null;

// Timer Elements
const timerBadge = document.getElementById('timer-badge') as HTMLSpanElement | null;
const clockTime = document.getElementById('clock-time') as HTMLDivElement | null;
const clockStatus = document.getElementById('clock-status') as HTMLDivElement | null;
const manualTimeInput = document.getElementById('manual-time-input') as HTMLInputElement | null;
const add10Btn = document.getElementById('add-10-btn') as HTMLButtonElement | null;
const startTimerBtn = document.getElementById('start-timer-btn') as HTMLButtonElement | null;
const pauseTimerBtn = document.getElementById('pause-timer-btn') as HTMLButtonElement | null;
const resetTimerBtn = document.getElementById('reset-timer-btn') as HTMLButtonElement | null;
const chipButtons = document.querySelectorAll<HTMLButtonElement>('.chip-btn');

// Wardrobe Elements
const costumeBadge = document.getElementById('costume-badge') as HTMLSpanElement | null;
const costumeButtons = document.querySelectorAll<HTMLButtonElement>('.costume-card-btn');
const fixAppearanceToggleBtn = document.getElementById(
  'fix-appearance-toggle-btn'
) as HTMLButtonElement | null;

// State Cache
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
  dateFormat: 'DD/MM',
  weekStartsOn: 1,
  stickyAlwaysOnTop: false,
};
let currentProfile: BuddyProfile = {
  nickname: 'Buddy',
  birthdayMonth: null,
  birthdayDay: null,
  countryCode: 'US',
};
let isMuted = false;
let isStationary = false;
let isPlayMode = false;
let isGhostMode = false;
let isFixedAppearance = false;
let isUsagiHidden = false;

const PRESET_STICKY_SIZES = [
  { label: 'Compact (350×480)', w: 350, h: 480 },
  { label: 'Medium (410×560)', w: 410, h: 560 },
  { label: 'Large (480×650)', w: 480, h: 650 },
];
let currentStickySizeIdx = 0;

// 1. Tab Switcher
function switchDashboardTab(tab: 'companion' | 'config', persist = true): void {
  dashTabCompanion?.classList.toggle('active', tab === 'companion');
  dashTabConfig?.classList.toggle('active', tab === 'config');
  if (dashViewCompanion) dashViewCompanion.style.display = tab === 'companion' ? 'flex' : 'none';
  if (dashViewConfig) dashViewConfig.style.display = tab === 'config' ? 'flex' : 'none';
  if (persist && window.usagiAPI?.updateDashboardTab) {
    window.usagiAPI.updateDashboardTab(tab);
  }
}

if (dashTabCompanion) {
  dashTabCompanion.addEventListener('click', () => switchDashboardTab('companion'));
}
if (dashTabConfig) {
  dashTabConfig.addEventListener('click', () => switchDashboardTab('config'));
}

// 2. Buddy Profile
function renderBuddyProfile(profile: BuddyProfile): void {
  currentProfile = profile;
  if (buddyNicknameInput && document.activeElement !== buddyNicknameInput) {
    buddyNicknameInput.value = profile.nickname || '';
  }
  if (buddyBdayDay) {
    buddyBdayDay.value = profile.birthdayDay ? String(profile.birthdayDay) : '';
  }
  if (buddyBdayMonth) {
    buddyBdayMonth.value = profile.birthdayMonth ? String(profile.birthdayMonth) : '';
  }
  if (buddyCountrySelect) {
    buddyCountrySelect.value = profile.countryCode || 'US';
  }
}

if (buddyNicknameInput) {
  buddyNicknameInput.addEventListener('change', () => {
    window.usagiAPI?.updateBuddyProfile({ nickname: buddyNicknameInput.value.trim() });
  });
}
if (buddyBdayDay) {
  buddyBdayDay.addEventListener('change', () => {
    const val = buddyBdayDay.value ? parseInt(buddyBdayDay.value, 10) : null;
    window.usagiAPI?.updateBuddyProfile({ birthdayDay: val });
  });
}
if (buddyBdayMonth) {
  buddyBdayMonth.addEventListener('change', () => {
    const val = buddyBdayMonth.value ? parseInt(buddyBdayMonth.value, 10) : null;
    window.usagiAPI?.updateBuddyProfile({ birthdayMonth: val });
  });
}
if (buddyCountrySelect) {
  buddyCountrySelect.addEventListener('change', () => {
    window.usagiAPI?.updateBuddyProfile({ countryCode: buddyCountrySelect.value });
  });
}

// 3. Date & Sticky Config Controls
function renderReminderConfigUI(state: ReminderState): void {
  currentReminderState = state;

  if (configDateFormatBtn) {
    configDateFormatBtn.textContent =
      state.dateFormat === 'MM/DD' ? 'MM/DD (11/15)' : 'DD/MM (15/11)';
  }

  if (configWeekStartBtn) {
    configWeekStartBtn.textContent = state.weekStartsOn === 0 ? 'Sunday (Su–Sa)' : 'Monday (Mo–Su)';
  }

  if (configFontScaleBtn) {
    configFontScaleBtn.textContent =
      state.fontScale === 'sm'
        ? 'Small (A)'
        : state.fontScale === 'lg'
          ? 'Large (A++)'
          : 'Medium (A+)';
  }

  if (configStickyPinBtn) {
    configStickyPinBtn.textContent = state.stickyAlwaysOnTop ? 'Pinned on Top' : 'Desktop Widget';
    configStickyPinBtn.classList.toggle('active', Boolean(state.stickyAlwaysOnTop));
  }

  if (configStickySizeBtn) {
    const w = state.stickyWidth ?? 350;
    const h = state.stickyHeight ?? 480;
    const matchingIdx = PRESET_STICKY_SIZES.findIndex((p) => p.w === w && p.h === h);
    if (matchingIdx >= 0) {
      currentStickySizeIdx = matchingIdx;
      configStickySizeBtn.textContent = PRESET_STICKY_SIZES[matchingIdx].label;
    } else {
      configStickySizeBtn.textContent = `Custom (${w}×${h})`;
    }
  }

  if (toggleStickyWindowBtn) {
    toggleStickyWindowBtn.textContent = state.stickyVisible ? 'Hide Note' : 'Show Note';
    toggleStickyWindowBtn.classList.toggle('active', Boolean(state.stickyVisible));
  }
}

if (configDateFormatBtn) {
  configDateFormatBtn.addEventListener('click', () => {
    const next = currentReminderState.dateFormat === 'MM/DD' ? 'DD/MM' : 'MM/DD';
    window.usagiAPI?.updateReminderPreferences({ dateFormat: next });
  });
}

if (configWeekStartBtn) {
  configWeekStartBtn.addEventListener('click', () => {
    const next = currentReminderState.weekStartsOn === 0 ? 1 : 0;
    window.usagiAPI?.updateReminderPreferences({ weekStartsOn: next });
  });
}

if (configFontScaleBtn) {
  configFontScaleBtn.addEventListener('click', () => {
    const cur = currentReminderState.fontScale || 'md';
    const next = cur === 'sm' ? 'md' : cur === 'md' ? 'lg' : 'sm';
    window.usagiAPI?.updateReminderPreferences({ fontScale: next });
  });
}

if (configStickySizeBtn) {
  configStickySizeBtn.addEventListener('click', () => {
    currentStickySizeIdx = (currentStickySizeIdx + 1) % PRESET_STICKY_SIZES.length;
    const target = PRESET_STICKY_SIZES[currentStickySizeIdx];
    configStickySizeBtn.textContent = target.label;
    window.usagiAPI?.resizeStickyWindow(target.w, target.h);
  });
}

if (configStickyPinBtn) {
  configStickyPinBtn.addEventListener('click', () => {
    const next = !currentReminderState.stickyAlwaysOnTop;
    window.usagiAPI?.updateReminderPreferences({ stickyAlwaysOnTop: next });
  });
}

if (toggleStickyWindowBtn) {
  toggleStickyWindowBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleStickyWindow();
  });
}

// 4. Unified Volume Slider with Active Dynamic Fill
function updateSliderTrack(val: number): void {
  if (!volumeSlider) return;
  const pct = Math.max(0, Math.min(100, val));
  volumeSlider.style.background = `linear-gradient(to right, var(--accent-strawberry) 0%, var(--card-inner) ${pct}%, var(--slider-track) ${pct}%, var(--slider-track) 100%)`;
}

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
    pauseTimerBtn.textContent = state.phase === 'running' ? 'Pause' : 'Resume';
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

// 6. Wardrobe Selection
function updateCostumeUI(costume: CostumeId, selection: OutfitSelection): void {
  if (costumeBadge) {
    if (selection === 'random') {
      const def = getCostumeDefinition(costume);
      costumeBadge.textContent = `RANDOM (${def.label.toUpperCase()})`;
    } else {
      const def = getCostumeDefinition(costume);
      costumeBadge.textContent = def.label.toUpperCase();
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

// 7. Companion Modes
function updateStationaryUI(stationary: boolean): void {
  isStationary = stationary;
  if (stationaryToggleBtn) {
    stationaryToggleBtn.textContent = stationary ? 'Stationary' : 'Pin Still';
    stationaryToggleBtn.classList.toggle('active', stationary);
  }
}

function updatePlayModeUI(enabled: boolean): void {
  isPlayMode = enabled;
  if (playModeToggleBtn) {
    playModeToggleBtn.textContent = enabled ? 'Following' : 'Follow Mouse';
    playModeToggleBtn.classList.toggle('active', enabled);
  }
}

function updateGhostModeUI(locked: boolean): void {
  isGhostMode = locked;
  if (ghostModeToggleBtn) {
    ghostModeToggleBtn.textContent = locked ? 'Pass-thru' : 'Ghost Mode';
    ghostModeToggleBtn.classList.toggle('active', locked);
  }
}

function updateFixedAppearanceUI(fixed: boolean): void {
  isFixedAppearance = fixed;
  if (fixAppearanceToggleBtn) {
    fixAppearanceToggleBtn.textContent = fixed ? 'Appearance Fixed' : 'Auto-Change';
    fixAppearanceToggleBtn.classList.toggle('active', fixed);
  }
}

function updateUsagiHiddenUI(hidden: boolean): void {
  isUsagiHidden = hidden;
  if (hideUsagiToggleBtn) {
    hideUsagiToggleBtn.textContent = hidden ? 'Show Usagi' : 'Hide Usagi';
    hideUsagiToggleBtn.classList.toggle('active', hidden);
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

// 8. Static Icon Initialization
function initDashboardIcons(): void {
  const volCardIcon = document.getElementById('volume-card-icon');
  if (volCardIcon) volCardIcon.innerHTML = getKawaiiIcon('volume', 16);

  const volLowIcon = document.getElementById('vol-low-icon');
  if (volLowIcon) volLowIcon.innerHTML = getKawaiiIcon('volume-low', 14);

  const volHighIcon = document.getElementById('vol-high-icon');
  if (volHighIcon) volHighIcon.innerHTML = getKawaiiIcon('volume', 14);

  const timerCardIcon = document.getElementById('timer-card-icon');
  if (timerCardIcon) timerCardIcon.innerHTML = getKawaiiIcon('tomato', 16);

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

  const modesCardIcon = document.getElementById('modes-card-icon');
  if (modesCardIcon) modesCardIcon.innerHTML = getKawaiiIcon('gamepad', 16);

  if (buddyProfileIcon) buddyProfileIcon.innerHTML = getKawaiiIcon('usagi', 14);
  if (configCalendarIcon) configCalendarIcon.innerHTML = getKawaiiIcon('note', 16);
}

initDashboardIcons();

// 9. IPC Listeners
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
      muteToggleBtn.textContent = muted ? 'Unmute' : 'Mute';
      muteToggleBtn.classList.toggle('active', muted);
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
    renderReminderConfigUI(state);
  });

  window.usagiAPI.onCalendarStateChanged((payload) => {
    renderBuddyProfile(payload.profile);
  });

  window.usagiAPI.onFixedAppearanceChanged((fixed) => {
    updateFixedAppearanceUI(fixed);
  });

  window.usagiAPI.onUsagiHiddenChanged((hidden) => {
    updateUsagiHiddenUI(hidden);
  });

  window.usagiAPI.onDashboardTabChanged((tab) => {
    switchDashboardTab(tab, false);
  });

  window.usagiAPI
    .getReminderState()
    .then((state) => {
      if (state) renderReminderConfigUI(state);
    })
    .catch((err) => {
      console.warn('Failed to fetch initial reminder state in dashboard:', err);
    });

  window.usagiAPI
    .getCalendarState()
    .then((payload) => {
      if (payload) {
        renderBuddyProfile(payload.profile);
      }
    })
    .catch((err) => {
      console.warn('Failed to fetch initial calendar state in dashboard:', err);
    });
}
