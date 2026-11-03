import { formatPomodoroTime, parseCustomDuration, PomodoroState } from '../core/pomodoroTimer';
import { VolumeConfig } from '../core/soundManager';
import { CostumeId, OutfitSelection, getCostumeDefinition } from '../core/costumeManager';
import { ReminderState } from '../core/reminderStore';
import { getKawaiiIcon } from '../core/kawaiiIcons';
import { BuddyProfile, HolidayEvent } from '../core/calendarStore';
import { SupportedLocale, t, getShortMonthNames } from '../core/i18n';

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
const buddyLanguageSelect = document.getElementById(
  'buddy-language-select'
) as HTMLSelectElement | null;
const buddyNicknameInput = document.getElementById(
  'buddy-nickname-input'
) as HTMLInputElement | null;
const buddyBdayDay = document.getElementById('buddy-bday-day') as HTMLSelectElement | null;
const buddyBdayMonth = document.getElementById('buddy-bday-month') as HTMLSelectElement | null;
const buddyCountrySelect = document.getElementById(
  'buddy-country-select'
) as HTMLSelectElement | null;
const buddyProfileIcon = document.getElementById('buddy-profile-icon') as HTMLSpanElement | null;
const autosaveStatus = document.getElementById('autosave-status') as HTMLSpanElement | null;

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
let currentLocale: SupportedLocale = 'en';
let savedToastTimer: number | null = null;

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

// Passive auto-save indicator: settings persist on change, so we only acknowledge.
function flashSavedToast(): void {
  if (!autosaveStatus) return;
  autosaveStatus.textContent = t(currentLocale, 'dash.config.autosaved');
  autosaveStatus.dataset.visible = 'true';
  if (savedToastTimer !== null) {
    clearTimeout(savedToastTimer);
  }
  savedToastTimer = window.setTimeout(() => {
    savedToastTimer = null;
    if (autosaveStatus) {
      autosaveStatus.dataset.visible = 'false';
    }
  }, 1200);
}

if (buddyNicknameInput) {
  buddyNicknameInput.addEventListener('change', () => {
    window.usagiAPI?.updateBuddyProfile({ nickname: buddyNicknameInput.value.trim() });
    flashSavedToast();
  });
  buddyNicknameInput.addEventListener('input', () => {
    window.usagiAPI?.updateBuddyProfile({ nickname: buddyNicknameInput.value.trim() });
    flashSavedToast();
  });
}
if (buddyBdayDay) {
  buddyBdayDay.addEventListener('change', () => {
    const val = buddyBdayDay.value ? parseInt(buddyBdayDay.value, 10) : null;
    window.usagiAPI?.updateBuddyProfile({ birthdayDay: val });
    flashSavedToast();
  });
}
if (buddyBdayMonth) {
  buddyBdayMonth.addEventListener('change', () => {
    const val = buddyBdayMonth.value ? parseInt(buddyBdayMonth.value, 10) : null;
    window.usagiAPI?.updateBuddyProfile({ birthdayMonth: val });
    flashSavedToast();
  });
}
if (buddyCountrySelect) {
  buddyCountrySelect.addEventListener('change', () => {
    window.usagiAPI?.updateBuddyProfile({ countryCode: buddyCountrySelect.value });
    flashSavedToast();
  });
}

if (buddyLanguageSelect) {
  buddyLanguageSelect.addEventListener('change', () => {
    const val = buddyLanguageSelect.value as SupportedLocale;
    window.usagiAPI?.setLocale(val);
    flashSavedToast();
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
    configWeekStartBtn.textContent =
      state.weekStartsOn === 0
        ? `${t(currentLocale, 'dash.config.sunday')} (Su–Sa)`
        : `${t(currentLocale, 'dash.config.monday')} (Mo–Su)`;
  }

  if (configFontScaleBtn) {
    configFontScaleBtn.textContent =
      state.fontScale === 'sm'
        ? `${t(currentLocale, 'dash.config.fontSmall')} (A)`
        : state.fontScale === 'lg'
          ? `${t(currentLocale, 'dash.config.fontLarge')} (A++)`
          : `${t(currentLocale, 'dash.config.fontMedium')} (A+)`;
  }

  if (configStickyPinBtn) {
    configStickyPinBtn.textContent = state.stickyAlwaysOnTop
      ? t(currentLocale, 'dash.config.pinnedTop')
      : t(currentLocale, 'dash.config.desktopWidget');
    configStickyPinBtn.classList.toggle('active', Boolean(state.stickyAlwaysOnTop));
  }

  if (configStickySizeBtn) {
    const w = state.stickyWidth ?? 350;
    const h = state.stickyHeight ?? 480;
    const matchingIdx = PRESET_STICKY_SIZES.findIndex((p) => p.w === w && p.h === h);
    if (matchingIdx === 0) {
      currentStickySizeIdx = 0;
      configStickySizeBtn.textContent = `${t(currentLocale, 'dash.config.sizeCompact')} (350×480)`;
    } else if (matchingIdx === 1) {
      currentStickySizeIdx = 1;
      configStickySizeBtn.textContent = `${t(currentLocale, 'dash.config.sizeMedium')} (410×560)`;
    } else if (matchingIdx === 2) {
      currentStickySizeIdx = 2;
      configStickySizeBtn.textContent = `${t(currentLocale, 'dash.config.sizeLarge')} (480×650)`;
    } else {
      configStickySizeBtn.textContent = `${t(currentLocale, 'dash.config.sizeCustom')} (${w}×${h})`;
    }
  }

  if (toggleStickyWindowBtn) {
    toggleStickyWindowBtn.textContent = state.stickyVisible
      ? t(currentLocale, 'dash.modes.hideNote')
      : t(currentLocale, 'dash.modes.showNote');
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
      clockStatus.textContent = t(currentLocale, 'dash.timer.running');
    } else if (state.phase === 'paused') {
      clockStatus.textContent = t(currentLocale, 'dash.timer.paused');
    } else if (state.phase === 'completed') {
      clockStatus.textContent = t(currentLocale, 'dash.timer.completed');
    } else {
      clockStatus.textContent = t(currentLocale, 'dash.timer.ready');
    }
  }

  if (timerBadge) {
    timerBadge.textContent = `${timeFormatted} ${phaseUpper}`;
  }

  if (pauseTimerBtn) {
    pauseTimerBtn.textContent =
      state.phase === 'running'
        ? t(currentLocale, 'dash.timer.pause')
        : t(currentLocale, 'dash.timer.resume');
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
      costumeBadge.textContent = `${t(currentLocale, 'dash.costume.random').toUpperCase()} (${def.label.toUpperCase()})`;
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
    stationaryToggleBtn.textContent = stationary
      ? t(currentLocale, 'dash.modes.stationary')
      : t(currentLocale, 'dash.modes.pinStill');
    stationaryToggleBtn.classList.toggle('active', stationary);
  }
}

function updatePlayModeUI(enabled: boolean): void {
  isPlayMode = enabled;
  if (playModeToggleBtn) {
    playModeToggleBtn.textContent = enabled
      ? t(currentLocale, 'dash.modes.following')
      : t(currentLocale, 'dash.modes.followMouse');
    playModeToggleBtn.classList.toggle('active', enabled);
  }
}

function updateGhostModeUI(locked: boolean): void {
  isGhostMode = locked;
  if (ghostModeToggleBtn) {
    ghostModeToggleBtn.textContent = locked
      ? 'Pass-thru'
      : t(currentLocale, 'dash.modes.ghostMode');
    ghostModeToggleBtn.classList.toggle('active', locked);
  }
}

function updateFixedAppearanceUI(fixed: boolean): void {
  isFixedAppearance = fixed;
  if (fixAppearanceToggleBtn) {
    fixAppearanceToggleBtn.textContent = fixed
      ? t(currentLocale, 'dash.audio.fixed')
      : t(currentLocale, 'dash.audio.autoChange');
    fixAppearanceToggleBtn.classList.toggle('active', fixed);
  }
}

function updateUsagiHiddenUI(hidden: boolean): void {
  isUsagiHidden = hidden;
  if (hideUsagiToggleBtn) {
    hideUsagiToggleBtn.textContent = hidden
      ? t(currentLocale, 'dash.modes.showUsagi')
      : t(currentLocale, 'dash.modes.hideUsagi');
    hideUsagiToggleBtn.classList.toggle('active', hidden);
  }
}

if (stationaryToggleBtn) {
  stationaryToggleBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleStationaryMode();
    flashSavedToast();
  });
}

if (playModeToggleBtn) {
  playModeToggleBtn.addEventListener('click', () => {
    window.usagiAPI?.togglePlayMode();
    flashSavedToast();
  });
}

if (ghostModeToggleBtn) {
  ghostModeToggleBtn.addEventListener('click', () => {
    window.usagiAPI?.toggleGhostMode();
    flashSavedToast();
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
    flashSavedToast();
  });
}

// 8. Internationalization & Locale Rendering
function renderLocaleUI(locale: SupportedLocale): void {
  currentLocale = locale;

  if (buddyLanguageSelect && buddyLanguageSelect.value !== locale) {
    buddyLanguageSelect.value = locale;
  }

  // App Header & Tabs
  const headerTitle = document.getElementById('dash-header-title');
  if (headerTitle) headerTitle.textContent = `${t(locale, 'dash.title')} Dashboard`;
  if (dashTabCompanion) dashTabCompanion.textContent = t(locale, 'dash.tab.companion');
  if (dashTabConfig) dashTabConfig.textContent = t(locale, 'dash.tab.config');

  // Timer Card
  const timerTitle = document.getElementById('dash-timer-title');
  if (timerTitle) timerTitle.textContent = t(locale, 'dash.timer.title');
  const chip25 = document.getElementById('chip-preset-25');
  if (chip25) chip25.textContent = t(locale, 'dash.timer.preset25');
  const chip52 = document.getElementById('chip-preset-52');
  if (chip52) chip52.textContent = t(locale, 'dash.timer.preset52');
  const chip90 = document.getElementById('chip-preset-90');
  if (chip90) chip90.textContent = t(locale, 'dash.timer.preset90');
  const unitTag = document.getElementById('timer-unit-tag');
  if (unitTag) unitTag.textContent = t(locale, 'dash.timer.min');
  if (startTimerBtn) startTimerBtn.textContent = t(locale, 'dash.timer.start');
  if (resetTimerBtn) resetTimerBtn.textContent = t(locale, 'dash.timer.reset');

  // Wardrobe Card
  const wardrobeTitle = document.getElementById('dash-wardrobe-title');
  if (wardrobeTitle) wardrobeTitle.textContent = t(locale, 'dash.wardrobe.title');
  const cClassic = document.getElementById('costume-name-classic');
  if (cClassic) cClassic.textContent = t(locale, 'dash.costume.classic');
  const cStudy = document.getElementById('costume-name-study');
  if (cStudy) cStudy.textContent = t(locale, 'dash.costume.study');
  const cVest = document.getElementById('costume-name-vest');
  if (cVest) cVest.textContent = t(locale, 'dash.costume.vest');
  const cSigma = document.getElementById('costume-name-sigma');
  if (cSigma) cSigma.textContent = t(locale, 'dash.costume.sigma');
  const cStar = document.getElementById('costume-name-star');
  if (cStar) cStar.textContent = t(locale, 'dash.costume.star');
  const cRandom = document.getElementById('costume-name-random');
  if (cRandom) cRandom.textContent = t(locale, 'dash.costume.random');

  // Companion Modes Card
  const modesTitle = document.getElementById('dash-modes-title');
  if (modesTitle) modesTitle.textContent = t(locale, 'dash.modes.title');
  const mSticky = document.getElementById('mode-title-sticky');
  if (mSticky) mSticky.textContent = t(locale, 'dash.modes.stickyNote');
  const mStill = document.getElementById('mode-title-still');
  if (mStill) mStill.textContent = t(locale, 'dash.modes.stayStill');
  const mPlay = document.getElementById('mode-title-play');
  if (mPlay) mPlay.textContent = t(locale, 'dash.modes.playMode');
  const mGhost = document.getElementById('mode-title-ghost');
  if (mGhost) mGhost.textContent = t(locale, 'dash.modes.ghostMode');
  const mSnack = document.getElementById('mode-title-snack');
  if (mSnack) mSnack.textContent = t(locale, 'dash.modes.puddingSnack');
  const mHide = document.getElementById('mode-title-hide');
  if (mHide) mHide.textContent = t(locale, 'dash.modes.hideUsagi');

  // Profile Card
  const profileTitle = document.getElementById('dash-profile-title');
  if (profileTitle) profileTitle.textContent = t(locale, 'dash.profile.title');
  const langLabel = document.getElementById('buddy-lang-label');
  if (langLabel) langLabel.textContent = t(locale, 'dash.profile.language');
  const nickLabel = document.getElementById('buddy-nick-label');
  if (nickLabel) nickLabel.textContent = t(locale, 'dash.profile.nickname');
  const bdayLabel = document.getElementById('buddy-bday-label');
  if (bdayLabel) bdayLabel.textContent = t(locale, 'dash.profile.birthday');
  const bdayDayOpt = document.getElementById('buddy-bday-day-opt');
  if (bdayDayOpt) bdayDayOpt.textContent = t(locale, 'dash.profile.day');
  const bdayMonthOpt = document.getElementById('buddy-bday-month-opt');
  if (bdayMonthOpt) bdayMonthOpt.textContent = t(locale, 'dash.profile.month');
  const regionLabel = document.getElementById('buddy-region-label');
  if (regionLabel) regionLabel.textContent = t(locale, 'dash.profile.region');

  // Short month names for birthday dropdown
  if (buddyBdayMonth) {
    const shortMonths = getShortMonthNames(locale);
    for (let i = 1; i <= 12; i++) {
      const opt = buddyBdayMonth.querySelector<HTMLOptionElement>(`option[value="${i}"]`);
      if (opt && shortMonths[i - 1]) {
        opt.textContent = shortMonths[i - 1];
      }
    }
  }

  // Config Card
  const configTitle = document.getElementById('dash-config-title');
  if (configTitle) configTitle.textContent = t(locale, 'dash.config.title');
  const dfLabel = document.getElementById('config-date-format-label');
  if (dfLabel) dfLabel.textContent = t(locale, 'dash.config.dateFormat');
  const wsLabel = document.getElementById('config-week-start-label');
  if (wsLabel) wsLabel.textContent = t(locale, 'dash.config.weekStart');
  const fsLabel = document.getElementById('config-font-scale-label');
  if (fsLabel) fsLabel.textContent = t(locale, 'dash.config.fontScale');
  const ssLabel = document.getElementById('config-sticky-size-label');
  if (ssLabel) ssLabel.textContent = t(locale, 'dash.config.stickySize');
  const spLabel = document.getElementById('config-sticky-pin-label');
  if (spLabel) spLabel.textContent = t(locale, 'dash.config.stickyPin');

  // Audio Card
  const audioTitle = document.getElementById('dash-audio-title');
  if (audioTitle) audioTitle.textContent = t(locale, 'dash.audio.title');
  if (testSoundBtn) testSoundBtn.textContent = t(locale, 'dash.audio.testSound');
  if (muteToggleBtn)
    muteToggleBtn.textContent = isMuted
      ? t(locale, 'dash.audio.unmute')
      : t(locale, 'dash.audio.mute');
  const rotLabel = document.getElementById('outfit-rot-label');
  if (rotLabel) rotLabel.textContent = t(locale, 'dash.audio.outfitRotation');

  // Re-render stateful elements
  if (currentPomodoroState) updatePomodoroUI(currentPomodoroState);
  renderReminderConfigUI(currentReminderState);
  updateStationaryUI(isStationary);
  updatePlayModeUI(isPlayMode);
  updateGhostModeUI(isGhostMode);
  updateFixedAppearanceUI(isFixedAppearance);
  updateUsagiHiddenUI(isUsagiHidden);
}

// 9. Static Icon Initialization
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

  window.usagiAPI.onLocaleChanged((locale) => {
    renderLocaleUI(locale);
  });

  window.usagiAPI
    .getLocale?.()
    .then((loc) => {
      if (loc) renderLocaleUI(loc);
    })
    .catch(() => {});

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
