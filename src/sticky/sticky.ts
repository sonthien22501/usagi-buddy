import { ReminderItem, ReminderState, formatReminderDueBadge } from '../core/reminderStore';
import { getKawaiiIcon } from '../core/kawaiiIcons';
import {
  HolidayEvent,
  BuddyProfile,
  buildMonthCalendarGrid,
  getUpcomingCountdownItems,
  formatDateYMD,
} from '../core/calendarStore';

let currentState: ReminderState = {
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
let activeTab: 'quests' | 'calendar' = 'quests';

const tabBtnQuests = document.getElementById('tabBtnQuests') as HTMLButtonElement | null;
const tabBtnCalendar = document.getElementById('tabBtnCalendar') as HTMLButtonElement | null;
const viewQuests = document.getElementById('viewQuests') as HTMLDivElement | null;
const viewCalendar = document.getElementById('viewCalendar') as HTMLDivElement | null;

const questInput = document.getElementById('questInput') as HTMLInputElement | null;
const addQuestBtn = document.getElementById('addQuestBtn') as HTMLButtonElement | null;
const questList = document.getElementById('questList') as HTMLDivElement | null;
const questCounter = document.getElementById('questCounter') as HTMLSpanElement | null;
const clearDoneBtn = document.getElementById('clearDoneBtn') as HTMLButtonElement | null;
const minimizeBtn = document.getElementById('minimizeBtn') as HTMLButtonElement | null;

const stickyChipClearDate = document.getElementById(
  'stickyChipClearDate'
) as HTMLButtonElement | null;
const stickyChipButtons = document.querySelectorAll<HTMLButtonElement>('.sticky-chip-btn');

const stickyCalPrevBtn = document.getElementById('stickyCalPrevBtn') as HTMLButtonElement | null;
const stickyCalNextBtn = document.getElementById('stickyCalNextBtn') as HTMLButtonElement | null;
const stickyCalTodayBtn = document.getElementById('stickyCalTodayBtn') as HTMLButtonElement | null;
const stickyCalMonthTitle = document.getElementById(
  'stickyCalMonthTitle'
) as HTMLSpanElement | null;
const stickyCalDaysGrid = document.getElementById('stickyCalDaysGrid') as HTMLDivElement | null;
const stickyCalDetailBanner = document.getElementById(
  'stickyCalDetailBanner'
) as HTMLDivElement | null;
const stickyCalDetailText = document.getElementById('stickyCalDetailText') as HTMLDivElement | null;
const stickyCalEventText = document.getElementById('stickyCalEventText') as HTMLDivElement | null;
const stickyCalJumpAddBtn = document.getElementById(
  'stickyCalJumpAddBtn'
) as HTMLButtonElement | null;
const stickyUpcomingList = document.getElementById('stickyUpcomingList') as HTMLDivElement | null;

const stickyHeaderIcon = document.querySelector('.header-title .icon') as HTMLSpanElement | null;
if (stickyHeaderIcon) {
  stickyHeaderIcon.innerHTML = getKawaiiIcon('pudding', 16);
}

function getTodayYMD(): string {
  const now = new Date();
  return formatDateYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function switchTab(tab: 'quests' | 'calendar'): void {
  activeTab = tab;
  if (tab === 'quests') {
    tabBtnQuests?.classList.add('active');
    tabBtnCalendar?.classList.remove('active');
    if (viewQuests) viewQuests.style.display = 'flex';
    if (viewCalendar) viewCalendar.style.display = 'none';
  } else {
    tabBtnCalendar?.classList.add('active');
    tabBtnQuests?.classList.remove('active');
    if (viewCalendar) viewCalendar.style.display = 'flex';
    if (viewQuests) viewQuests.style.display = 'none';
    renderCalendar();
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
  if (!stickyCalDaysGrid || !stickyCalMonthTitle) return;
  const todayYMD = getTodayYMD();
  stickyCalMonthTitle.textContent = `${MONTH_NAMES[currentCalendarMonth - 1]} ${currentCalendarYear}`;

  const cells = buildMonthCalendarGrid(
    currentCalendarYear,
    currentCalendarMonth,
    todayYMD,
    selectedDateStr,
    currentEvents,
    currentState.items
  );

  stickyCalDaysGrid.innerHTML = '';

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
      } else {
        selectedDateStr = cell.dateStr;
      }
      renderCalendar();
    });

    stickyCalDaysGrid.appendChild(btn);
  }

  // Update Detail Banner
  if (selectedDateStr) {
    if (stickyCalDetailBanner) stickyCalDetailBanner.style.display = 'flex';
    const dayQuests = currentState.items.filter((i) => i.dueDate === selectedDateStr);
    const dayEvents = currentEvents.filter((e) => e.date === selectedDateStr);

    if (stickyCalDetailText) {
      stickyCalDetailText.textContent = `📅 ${selectedDateStr} (${dayQuests.length} quests due)`;
    }
    if (stickyCalEventText) {
      if (dayEvents.length > 0) {
        stickyCalEventText.style.display = 'block';
        stickyCalEventText.textContent = dayEvents
          .map((e) => `${e.type === 'birthday' ? '🎂' : '🎉'} ${e.name}`)
          .join(', ');
      } else {
        stickyCalEventText.style.display = 'none';
      }
    }
    if (stickyCalJumpAddBtn) {
      stickyCalJumpAddBtn.textContent = `+ Add Quest on ${selectedDateStr.slice(5)}`;
    }
  } else {
    if (stickyCalDetailBanner) stickyCalDetailBanner.style.display = 'none';
  }

  renderUpcoming();
}

function renderUpcoming(): void {
  if (!stickyUpcomingList) return;
  stickyUpcomingList.innerHTML = '';
  const todayYMD = getTodayYMD();
  const upcoming = getUpcomingCountdownItems(currentEvents, currentState.items, todayYMD, 5);

  if (upcoming.length === 0) {
    const empty = document.createElement('div');
    empty.style.fontSize = '10px';
    empty.style.color = 'var(--text-muted)';
    empty.style.textAlign = 'center';
    empty.style.padding = '4px 0';
    empty.textContent = 'No upcoming holidays or due quests~';
    stickyUpcomingList.appendChild(empty);
    return;
  }

  for (const item of upcoming) {
    const row = document.createElement('div');
    row.className = 'upcoming-item-row';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '5px';
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
    stickyUpcomingList.appendChild(row);
  }
}

function render(state: ReminderState): void {
  currentState = state;
  document.body.setAttribute('data-theme', 'custard');

  renderCalendar();

  if (!questList) return;
  questList.innerHTML = '';

  if (state.items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="emoji" style="display: flex; justify-content: center; gap: 6px; align-items: center; margin-bottom: 6px;">
        ${getKawaiiIcon('sparkle', 16)} ${getKawaiiIcon('usagi', 24)} ${getKawaiiIcon('sparkle', 16)}
      </div>
      <div>All quests completed!</div>
      <div>Usagi is super proud of you~</div>
    `;
    questList.appendChild(empty);
  } else {
    for (const item of state.items) {
      const row = document.createElement('div');
      row.className = `quest-item ${item.completed ? 'completed' : ''}`;
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.quest-delete')) return;
        window.usagiAPI?.toggleReminder(item.id);
      });

      const bullet = document.createElement('span');
      bullet.className = 'quest-bullet';
      bullet.textContent = item.completed ? '🍮' : '✦';

      const label = document.createElement('span');
      label.className = 'quest-text';
      label.textContent = item.text;

      if (item.dueDate) {
        const badge = document.createElement('span');
        badge.className = 'quest-due-badge';
        badge.textContent = formatReminderDueBadge(item.dueDate, getTodayYMD());
        label.appendChild(badge);
      }

      const comfyLine = document.createElement('span');
      comfyLine.className = 'comfy-line';
      label.appendChild(comfyLine);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'quest-delete';
      deleteBtn.textContent = '✕';
      deleteBtn.title = 'Delete Quest';
      deleteBtn.addEventListener('click', () => {
        window.usagiAPI?.deleteReminder(item.id);
      });

      row.appendChild(bullet);
      row.appendChild(label);
      row.appendChild(deleteBtn);
      questList.appendChild(row);
    }
  }

  const completedCount = state.items.filter((it) => it.completed).length;
  if (questCounter) {
    questCounter.textContent = `${completedCount}/${state.items.length} completed`;
  }
}

function handleAddQuest(): void {
  if (!questInput) return;
  const val = questInput.value.trim();
  if (val && window.usagiAPI) {
    window.usagiAPI.addReminder(val, activeQuickDueDate || undefined);
    questInput.value = '';
    activeQuickDueDate = null;
    stickyChipButtons.forEach((b) => b.classList.remove('active'));
    if (stickyChipClearDate) stickyChipClearDate.style.display = 'none';
  }
}

function init(): void {
  if (tabBtnQuests) {
    tabBtnQuests.addEventListener('click', () => switchTab('quests'));
  }
  if (tabBtnCalendar) {
    tabBtnCalendar.addEventListener('click', () => switchTab('calendar'));
  }

  if (addQuestBtn) {
    addQuestBtn.addEventListener('click', handleAddQuest);
  }

  if (questInput) {
    questInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleAddQuest();
      }
    });
  }

  stickyChipButtons.forEach((btn) => {
    const chipType = btn.getAttribute('data-sticky-chip');
    if (!chipType) return;
    btn.addEventListener('click', () => {
      const now = new Date();
      if (chipType === 'today') {
        activeQuickDueDate = getTodayYMD();
      } else if (chipType === 'tomorrow') {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        activeQuickDueDate = formatDateYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
      }
      stickyChipButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (stickyChipClearDate) {
        stickyChipClearDate.style.display = 'inline-block';
        stickyChipClearDate.textContent = `✕ Clear (${activeQuickDueDate?.slice(5)})`;
      }
    });
  });

  if (stickyChipClearDate) {
    stickyChipClearDate.addEventListener('click', () => {
      activeQuickDueDate = null;
      stickyChipButtons.forEach((b) => b.classList.remove('active'));
      stickyChipClearDate.style.display = 'none';
    });
  }

  if (stickyCalPrevBtn) {
    stickyCalPrevBtn.addEventListener('click', () => {
      currentCalendarMonth--;
      if (currentCalendarMonth < 1) {
        currentCalendarMonth = 12;
        currentCalendarYear--;
      }
      renderCalendar();
    });
  }

  if (stickyCalNextBtn) {
    stickyCalNextBtn.addEventListener('click', () => {
      currentCalendarMonth++;
      if (currentCalendarMonth > 12) {
        currentCalendarMonth = 1;
        currentCalendarYear++;
      }
      renderCalendar();
    });
  }

  if (stickyCalTodayBtn) {
    stickyCalTodayBtn.addEventListener('click', () => {
      const now = new Date();
      currentCalendarYear = now.getFullYear();
      currentCalendarMonth = now.getMonth() + 1;
      selectedDateStr = getTodayYMD();
      renderCalendar();
    });
  }

  if (stickyCalJumpAddBtn) {
    stickyCalJumpAddBtn.addEventListener('click', () => {
      if (selectedDateStr) {
        activeQuickDueDate = selectedDateStr;
        if (stickyChipClearDate) {
          stickyChipClearDate.style.display = 'inline-block';
          stickyChipClearDate.textContent = `✕ Clear (${activeQuickDueDate.slice(5)})`;
        }
      }
      switchTab('quests');
      questInput?.focus();
    });
  }

  if (clearDoneBtn) {
    clearDoneBtn.addEventListener('click', () => {
      window.usagiAPI?.clearCompletedReminders();
    });
  }

  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      window.usagiAPI?.toggleStickyWindow();
    });
  }

  if (window.usagiAPI) {
    window.usagiAPI.onReminderStateChanged((state) => {
      render(state);
    });

    window.usagiAPI.onCalendarStateChanged((payload) => {
      currentEvents = payload.events;
      currentProfile = payload.profile;
      render(currentState);
    });

    window.usagiAPI
      .getReminderState()
      .then((state) => {
        if (state) render(state);
      })
      .catch((err) => {
        console.warn('Failed to load initial reminder state:', err);
      });

    window.usagiAPI
      .getCalendarState()
      .then((payload) => {
        if (payload) {
          currentEvents = payload.events;
          currentProfile = payload.profile;
          render(currentState);
        }
      })
      .catch((err) => {
        console.warn('Failed to load initial calendar state:', err);
      });
  }
}

document.addEventListener('DOMContentLoaded', init);
