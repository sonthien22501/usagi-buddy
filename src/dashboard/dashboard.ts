import { formatPomodoroTime, parseCustomDuration, PomodoroState } from '../core/pomodoroTimer';
import { VolumeConfig } from '../core/soundManager';
import { CostumeId, OutfitSelection, getCostumeDefinition } from '../core/costumeManager';
import { ReminderState, formatReminderDueBadge } from '../core/reminderStore';
import { getKawaiiIcon, renderIconLabel } from '../core/kawaiiIcons';
import {
  BuddyProfile,
  HolidayEvent,
  buildMonthCalendarGrid,
  getUpcomingCountdownItems,
  formatDateYMD,
} from '../core/calendarStore';

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

// Buddy Profile elements
const buddyNicknameInput = document.getElementById(
  'buddy-nickname-input'
) as HTMLInputElement | null;
const buddyBdayMonth = document.getElementById('buddy-bday-month') as HTMLSelectElement | null;
const buddyBdayDay = document.getElementById('buddy-bday-day') as HTMLSelectElement | null;
const buddyCountrySelect = document.getElementById(
  'buddy-country-select'
) as HTMLSelectElement | null;
const buddyProfileIcon = document.getElementById('buddy-profile-icon') as HTMLSpanElement | null;
const buddyCakeIcon = document.getElementById('buddy-cake-icon') as HTMLSpanElement | null;
const buddyGlobeIcon = document.getElementById('buddy-globe-icon') as HTMLSpanElement | null;

// Calendar widget elements
const calPrevBtn = document.getElementById('cal-prev-btn') as HTMLButtonElement | null;
const calNextBtn = document.getElementById('cal-next-btn') as HTMLButtonElement | null;
const calTodayBtn = document.getElementById('cal-today-btn') as HTMLButtonElement | null;
const calMonthTitle = document.getElementById('cal-month-title') as HTMLSpanElement | null;
const calDaysGrid = document.getElementById('cal-days-grid') as HTMLDivElement | null;
const calSelectedBanner = document.getElementById('cal-selected-banner') as HTMLDivElement | null;
const calSelectedInfo = document.getElementById('cal-selected-info') as HTMLSpanElement | null;
const calClearFilterBtn = document.getElementById(
  'cal-clear-filter-btn'
) as HTMLButtonElement | null;
const calEventBanner = document.getElementById('cal-event-banner') as HTMLDivElement | null;
const upcomingEventsList = document.getElementById('upcoming-events-list') as HTMLDivElement | null;
const chipClearDate = document.getElementById('chip-clear-date') as HTMLButtonElement | null;
const chipDateButtons = document.querySelectorAll<HTMLButtonElement>('.chip-date-btn');

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
let currentProfile: BuddyProfile = {
  nickname: 'Buddy',
  birthdayMonth: null,
  birthdayDay: null,
  countryCode: 'US',
};
let currentEvents: HolidayEvent[] = [];
let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth() + 1;
let selectedDateStr: string | null = null;
let activeQuickDueDate: string | null = null;
let isMuted = false;
let isStationary = false;
let isPlayMode = false;
let isGhostMode = false;
let isFixedAppearance = false;
let isUsagiHidden = false;

// 2. Desktop Sticky Reminders & Calendar
function getTodayYMD(): string {
  const now = new Date();
  return formatDateYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function renderBuddyProfile(profile: BuddyProfile): void {
  currentProfile = profile;
  if (buddyNicknameInput && document.activeElement !== buddyNicknameInput) {
    buddyNicknameInput.value = profile.nickname || '';
  }
  if (buddyBdayMonth) {
    buddyBdayMonth.value = profile.birthdayMonth ? String(profile.birthdayMonth) : '';
  }
  if (buddyBdayDay) {
    buddyBdayDay.value = profile.birthdayDay ? String(profile.birthdayDay) : '';
  }
  if (buddyCountrySelect) {
    buddyCountrySelect.value = profile.countryCode || 'US';
  }
}

function renderUpcomingFeed(): void {
  if (!upcomingEventsList) return;
  upcomingEventsList.innerHTML = '';
  const todayYMD = getTodayYMD();
  const upcoming = getUpcomingCountdownItems(
    currentEvents,
    currentReminderState.items,
    todayYMD,
    4
  );

  if (upcoming.length === 0) {
    const empty = document.createElement('div');
    empty.style.fontSize = '11px';
    empty.style.color = 'var(--text-muted)';
    empty.style.textAlign = 'center';
    empty.style.padding = '4px 0';
    empty.textContent = 'No upcoming holidays or due quests~';
    upcomingEventsList.appendChild(empty);
    return;
  }

  for (const item of upcoming) {
    const row = document.createElement('div');
    row.className = 'upcoming-item-row';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '6px';
    left.style.overflow = 'hidden';

    const icon = document.createElement('span');
    icon.textContent = item.type === 'birthday' ? '🎂' : item.type === 'holiday' ? '🎉' : '🍮';

    const title = document.createElement('span');
    title.style.fontWeight = '700';
    title.style.textOverflow = 'ellipsis';
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'hidden';
    title.textContent = item.title;

    left.appendChild(icon);
    left.appendChild(title);

    const badge = document.createElement('span');
    badge.className = 'upcoming-badge';
    badge.textContent = item.badgeText;

    row.appendChild(left);
    row.appendChild(badge);
    upcomingEventsList.appendChild(row);
  }
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function renderCalendar(): void {
  if (!calDaysGrid || !calMonthTitle) return;
  const todayYMD = getTodayYMD();
  calMonthTitle.textContent = `${MONTH_NAMES[currentCalendarMonth - 1]} ${currentCalendarYear}`;

  const cells = buildMonthCalendarGrid(
    currentCalendarYear,
    currentCalendarMonth,
    todayYMD,
    selectedDateStr,
    currentEvents,
    currentReminderState.items
  );

  calDaysGrid.innerHTML = '';

  for (const cell of cells) {
    const btn = document.createElement('button');
    btn.className = `cal-day-cell ${cell.isCurrentMonth ? '' : 'not-current-month'} ${cell.isToday ? 'today' : ''} ${cell.isSelected ? 'selected' : ''}`;
    btn.title = cell.dateStr;

    const numSpan = document.createElement('span');
    numSpan.textContent = String(cell.dayOfMonth);
    btn.appendChild(numSpan);

    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'cal-dots';

    if (cell.hasBirthday) {
      const bday = document.createElement('span');
      bday.className = 'dot-bday';
      bday.textContent = '★';
      dotsContainer.appendChild(bday);
    }
    if (cell.holidays.some((h) => h.type !== 'birthday')) {
      const hDot = document.createElement('span');
      hDot.className = 'dot-holiday';
      dotsContainer.appendChild(hDot);
    }
    if (cell.questsDue.length > 0) {
      const qDot = document.createElement('span');
      qDot.className = 'dot-quest';
      dotsContainer.appendChild(qDot);
    }

    btn.appendChild(dotsContainer);

    btn.addEventListener('click', () => {
      if (selectedDateStr === cell.dateStr) {
        selectedDateStr = null;
        activeQuickDueDate = null;
      } else {
        selectedDateStr = cell.dateStr;
        activeQuickDueDate = cell.dateStr;
      }
      updateReminderUI(currentReminderState);
    });

    calDaysGrid.appendChild(btn);
  }

  if (selectedDateStr) {
    if (calSelectedBanner && calSelectedInfo) {
      calSelectedBanner.style.display = 'flex';
      calSelectedInfo.textContent = `📅 Filtering & adding to: ${selectedDateStr}`;
    }
    if (chipClearDate) {
      chipClearDate.style.display = 'inline-block';
      chipClearDate.textContent = `✕ Clear (${selectedDateStr.slice(5)})`;
    }

    const dayEvents = currentEvents.filter((e) => e.date === selectedDateStr);
    if (calEventBanner) {
      calEventBanner.textContent = '';
      if (dayEvents.length > 0) {
        calEventBanner.style.display = 'block';
        for (const e of dayEvents) {
          const item = document.createElement('div');
          const prefix = e.type === 'birthday' ? '🎂 ' : '🎉 ';
          const suffix = e.localName && e.localName !== e.name ? ` (${e.localName})` : '';
          item.textContent = `${prefix}${e.name}${suffix}`;
          calEventBanner.appendChild(item);
        }
      } else {
        calEventBanner.style.display = 'none';
      }
    }
  } else {
    if (calSelectedBanner) calSelectedBanner.style.display = 'none';
    if (chipClearDate && !activeQuickDueDate) {
      chipClearDate.style.display = 'none';
    }
    if (calEventBanner) {
      calEventBanner.textContent = '';
      calEventBanner.style.display = 'none';
    }
  }

  renderUpcomingFeed();
}

function updateReminderUI(state: ReminderState): void {
  currentReminderState = state;
  document.body.setAttribute('data-theme', 'custard');

  if (toggleStickyWindowBtn) {
    toggleStickyWindowBtn.innerHTML = renderIconLabel(
      'note',
      state.stickyVisible ? 'Hide Note' : 'Show Note',
      13
    );
  }

  renderCalendar();

  if (!dashboardQuestList) return;
  dashboardQuestList.innerHTML = '';

  const itemsToRender = selectedDateStr
    ? state.items.filter((it) => it.dueDate === selectedDateStr)
    : state.items;

  if (itemsToRender.length === 0) {
    const empty = document.createElement('div');
    empty.style.textAlign = 'center';
    empty.style.padding = '12px 0';
    empty.style.fontSize = '12px';
    empty.style.opacity = '0.7';
    empty.textContent = selectedDateStr
      ? `No quests due on ${selectedDateStr}. Click [+] to add one!`
      : 'No active quests! Relax with Usagi~';
    dashboardQuestList.appendChild(empty);
  } else {
    for (const item of itemsToRender) {
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

      if (item.dueDate) {
        const badge = document.createElement('span');
        badge.className = 'quest-due-badge';
        badge.textContent = formatReminderDueBadge(item.dueDate, getTodayYMD());
        questText.appendChild(badge);
      }

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
    dashboardQuestCounter.textContent = selectedDateStr
      ? `${itemsToRender.filter((it) => it.completed).length}/${itemsToRender.length} due on ${selectedDateStr}`
      : `${completed}/${state.items.length} completed`;
  }
}

function handleAddQuest(): void {
  if (!dashboardQuestInput) return;
  const val = dashboardQuestInput.value.trim();
  if (val && window.usagiAPI) {
    const targetDueDate = activeQuickDueDate || selectedDateStr || undefined;
    window.usagiAPI.addReminder(val, targetDueDate);
    dashboardQuestInput.value = '';
    if (!selectedDateStr) {
      activeQuickDueDate = null;
      chipDateButtons.forEach((b) => b.classList.remove('active'));
      if (chipClearDate) chipClearDate.style.display = 'none';
    }
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

// Quick Date Chips
chipDateButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const chipType = btn.getAttribute('data-date-chip');
    const now = new Date();
    if (chipType === 'today') {
      activeQuickDueDate = getTodayYMD();
    } else if (chipType === 'tomorrow') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      activeQuickDueDate = formatDateYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
    } else if (chipType === '+3d') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
      activeQuickDueDate = formatDateYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }

    chipDateButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if (chipClearDate) {
      chipClearDate.style.display = 'inline-block';
      chipClearDate.textContent = `✕ Clear (${activeQuickDueDate?.slice(5)})`;
    }
  });
});

if (chipClearDate) {
  chipClearDate.addEventListener('click', () => {
    activeQuickDueDate = null;
    selectedDateStr = null;
    chipDateButtons.forEach((b) => b.classList.remove('active'));
    chipClearDate.style.display = 'none';
    updateReminderUI(currentReminderState);
  });
}

if (calClearFilterBtn) {
  calClearFilterBtn.addEventListener('click', () => {
    selectedDateStr = null;
    activeQuickDueDate = null;
    chipDateButtons.forEach((b) => b.classList.remove('active'));
    if (chipClearDate) chipClearDate.style.display = 'none';
    updateReminderUI(currentReminderState);
  });
}

if (calPrevBtn) {
  calPrevBtn.addEventListener('click', () => {
    currentCalendarMonth--;
    if (currentCalendarMonth < 1) {
      currentCalendarMonth = 12;
      currentCalendarYear--;
    }
    renderCalendar();
  });
}

if (calNextBtn) {
  calNextBtn.addEventListener('click', () => {
    currentCalendarMonth++;
    if (currentCalendarMonth > 12) {
      currentCalendarMonth = 1;
      currentCalendarYear++;
    }
    renderCalendar();
  });
}

if (calTodayBtn) {
  calTodayBtn.addEventListener('click', () => {
    const now = new Date();
    currentCalendarYear = now.getFullYear();
    currentCalendarMonth = now.getMonth() + 1;
    selectedDateStr = getTodayYMD();
    activeQuickDueDate = selectedDateStr;
    updateReminderUI(currentReminderState);
  });
}

// Buddy Profile Listeners
if (buddyNicknameInput) {
  buddyNicknameInput.addEventListener('change', () => {
    window.usagiAPI?.updateBuddyProfile({ nickname: buddyNicknameInput.value.trim() });
  });
}
if (buddyBdayMonth) {
  buddyBdayMonth.addEventListener('change', () => {
    const val = buddyBdayMonth.value ? parseInt(buddyBdayMonth.value, 10) : null;
    window.usagiAPI?.updateBuddyProfile({ birthdayMonth: val });
  });
}
if (buddyBdayDay) {
  buddyBdayDay.addEventListener('change', () => {
    const val = buddyBdayDay.value ? parseInt(buddyBdayDay.value, 10) : null;
    window.usagiAPI?.updateBuddyProfile({ birthdayDay: val });
  });
}
if (buddyCountrySelect) {
  buddyCountrySelect.addEventListener('change', () => {
    window.usagiAPI?.updateBuddyProfile({ countryCode: buddyCountrySelect.value });
  });
}

// Set up Kawaii Icons for Profile & Calendar
if (buddyProfileIcon) buddyProfileIcon.innerHTML = getKawaiiIcon('usagi', 14);
if (buddyCakeIcon) buddyCakeIcon.innerHTML = getKawaiiIcon('cake', 14);
if (buddyGlobeIcon) buddyGlobeIcon.innerHTML = getKawaiiIcon('globe', 14);
if (calPrevBtn) calPrevBtn.innerHTML = getKawaiiIcon('chevron-left', 12);
if (calNextBtn) calNextBtn.innerHTML = getKawaiiIcon('chevron-right', 12);

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

  window.usagiAPI.onCalendarStateChanged((payload) => {
    currentEvents = payload.events;
    renderBuddyProfile(payload.profile);
    updateReminderUI(currentReminderState);
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

  window.usagiAPI
    .getCalendarState()
    .then((payload) => {
      if (payload) {
        currentEvents = payload.events;
        renderBuddyProfile(payload.profile);
        updateReminderUI(currentReminderState);
      }
    })
    .catch((err) => {
      console.warn('Failed to fetch initial calendar state in dashboard:', err);
    });
}
