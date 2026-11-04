import {
  ReminderItem,
  ReminderState,
  formatReminderDueBadge,
  formatDisplayDate,
} from '../core/reminderStore';
import { getKawaiiIcon } from '../core/kawaiiIcons';
import {
  HolidayEvent,
  BuddyProfile,
  buildMonthCalendarGrid,
  getUpcomingCountdownItems,
  getSelectedDaySummary,
  formatDateYMD,
} from '../core/calendarStore';
import {
  ScheduleState,
  createInitialScheduleState,
  getEntriesForDay,
  getCurrentAndNextSchedule,
} from '../core/scheduleStore';
import {
  SupportedLocale,
  t,
  getMonthNames,
  getWeekdayLabels,
  getScheduleWeekdayPills,
  getLocalizedHolidayTitle,
} from '../core/i18n';
import { resolveStickyClockRollover, type StickyClockSnapshot } from '../core/stickyClock';

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
let activeTab: 'quests' | 'calendar' | 'schedule' = 'quests';

let currentScheduleState: ScheduleState = createInitialScheduleState();
let selectedScheduleDay: number = new Date().getDay(); // 0..6
let currentLocale: SupportedLocale = 'en';

const initialClockDate = new Date();
let stickyClockSnapshot: StickyClockSnapshot = {
  dateYMD: formatDateYMD(
    initialClockDate.getFullYear(),
    initialClockDate.getMonth() + 1,
    initialClockDate.getDate()
  ),
  dayOfWeek: initialClockDate.getDay(),
  selectedScheduleDay,
  calendarYear: currentCalendarYear,
  calendarMonth: currentCalendarMonth,
};

const tabBtnQuests = document.getElementById('tabBtnQuests') as HTMLButtonElement | null;
const tabBtnCalendar = document.getElementById('tabBtnCalendar') as HTMLButtonElement | null;
const tabBtnSchedule = document.getElementById('tabBtnSchedule') as HTMLButtonElement | null;
const viewQuests = document.getElementById('viewQuests') as HTMLDivElement | null;
const viewCalendar = document.getElementById('viewCalendar') as HTMLDivElement | null;
const viewSchedule = document.getElementById('viewSchedule') as HTMLDivElement | null;

const questInput = document.getElementById('questInput') as HTMLInputElement | null;
const addQuestBtn = document.getElementById('addQuestBtn') as HTMLButtonElement | null;
const questList = document.getElementById('questList') as HTMLDivElement | null;
const questCounter = document.getElementById('questCounter') as HTMLSpanElement | null;
const clearDoneBtn = document.getElementById('clearDoneBtn') as HTMLButtonElement | null;
const minimizeBtn = document.getElementById('minimizeBtn') as HTMLButtonElement | null;
const textZoomBtn = document.getElementById('textZoomBtn') as HTMLButtonElement | null;
const windowSizeBtn = document.getElementById('windowSizeBtn') as HTMLButtonElement | null;

const stickyResizeRight = document.getElementById('stickyResizeRight') as HTMLDivElement | null;
const stickyResizeBottom = document.getElementById('stickyResizeBottom') as HTMLDivElement | null;
const stickyResizeCorner = document.getElementById('stickyResizeCorner') as HTMLDivElement | null;

const stickySelectedDateRow = document.getElementById(
  'stickySelectedDateRow'
) as HTMLDivElement | null;
const stickySelectedDateLabel = document.getElementById(
  'stickySelectedDateLabel'
) as HTMLSpanElement | null;
const stickyChipClearDate = document.getElementById(
  'stickyChipClearDate'
) as HTMLButtonElement | null;

const stickyCalPrevBtn = document.getElementById('stickyCalPrevBtn') as HTMLButtonElement | null;
const stickyCalNextBtn = document.getElementById('stickyCalNextBtn') as HTMLButtonElement | null;
const stickyCalTodayBtn = document.getElementById('stickyCalTodayBtn') as HTMLButtonElement | null;
const stickyCalMonthTitle = document.getElementById(
  'stickyCalMonthTitle'
) as HTMLSpanElement | null;
const stickyCalWeekdaysGrid = document.getElementById(
  'stickyCalWeekdaysGrid'
) as HTMLDivElement | null;
const stickyCalDaysGrid = document.getElementById('stickyCalDaysGrid') as HTMLDivElement | null;
const stickyCalDetailBanner = document.getElementById(
  'stickyCalDetailBanner'
) as HTMLDivElement | null;
const stickyCalDetailText = document.getElementById('stickyCalDetailText') as HTMLDivElement | null;
const stickyCalJumpAddBtn = document.getElementById(
  'stickyCalJumpAddBtn'
) as HTMLButtonElement | null;
const stickyCalDayItemsList = document.getElementById(
  'stickyCalDayItemsList'
) as HTMLDivElement | null;
const stickyUpcomingList = document.getElementById('stickyUpcomingList') as HTMLDivElement | null;

// Schedule view elements
const stickyScheduleNowBanner = document.getElementById(
  'stickyScheduleNowBanner'
) as HTMLDivElement | null;
const stickyScheduleNowText = document.getElementById(
  'stickyScheduleNowText'
) as HTMLSpanElement | null;
const stickySchedDaysRow = document.getElementById('stickySchedDaysRow') as HTMLDivElement | null;
const stickyScheduleList = document.getElementById('stickyScheduleList') as HTMLDivElement | null;
const schedStartInput = document.getElementById('schedStartInput') as HTMLInputElement | null;
const schedEndInput = document.getElementById('schedEndInput') as HTMLInputElement | null;
const schedLocationInput = document.getElementById('schedLocationInput') as HTMLInputElement | null;
const schedTitleInput = document.getElementById('schedTitleInput') as HTMLInputElement | null;
const addSchedBtn = document.getElementById('addSchedBtn') as HTMLButtonElement | null;

const stickyHeaderIcon = document.querySelector('.header-title .icon') as HTMLSpanElement | null;
if (stickyHeaderIcon) {
  stickyHeaderIcon.innerHTML = getKawaiiIcon('pudding', 16);
}

function getTodayYMD(): string {
  const now = new Date();
  return formatDateYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function renderStaticLocaleText(): void {
  const titleEl = document.getElementById('stickyHeaderTitle');
  if (titleEl) titleEl.textContent = t(currentLocale, 'sticky.title');
  if (tabBtnQuests) tabBtnQuests.textContent = t(currentLocale, 'sticky.tab.quests');
  if (tabBtnCalendar) tabBtnCalendar.textContent = t(currentLocale, 'sticky.tab.calendar');
  if (tabBtnSchedule) tabBtnSchedule.textContent = t(currentLocale, 'sticky.tab.schedule');
  if (clearDoneBtn) clearDoneBtn.textContent = t(currentLocale, 'sticky.footer.clearDone');
  if (stickyCalTodayBtn) stickyCalTodayBtn.textContent = t(currentLocale, 'sticky.cal.todayBtn');
  if (stickyChipClearDate) stickyChipClearDate.textContent = t(currentLocale, 'sticky.clearDate');

  const upcomingTitleEl = document.getElementById('stickyUpcomingTitle');
  if (upcomingTitleEl) upcomingTitleEl.textContent = t(currentLocale, 'sticky.cal.upcomingTitle');
  const countdownBadge = document.getElementById('stickyCountdownBadge');
  if (countdownBadge) countdownBadge.textContent = t(currentLocale, 'sticky.cal.countdown');

  if (schedTitleInput)
    schedTitleInput.placeholder = t(currentLocale, 'sticky.sched.titlePlaceholder');
  if (schedLocationInput)
    schedLocationInput.placeholder = t(currentLocale, 'sticky.sched.roomPlaceholder');
}

function switchTab(tab: 'quests' | 'calendar' | 'schedule', persist = true): void {
  activeTab = tab;
  tabBtnQuests?.classList.toggle('active', tab === 'quests');
  tabBtnCalendar?.classList.toggle('active', tab === 'calendar');
  tabBtnSchedule?.classList.toggle('active', tab === 'schedule');

  if (viewQuests) viewQuests.style.display = tab === 'quests' ? 'flex' : 'none';
  if (viewCalendar) viewCalendar.style.display = tab === 'calendar' ? 'flex' : 'none';
  if (viewSchedule) viewSchedule.style.display = tab === 'schedule' ? 'flex' : 'none';

  if (tab === 'calendar') {
    renderCalendar();
  } else if (tab === 'schedule') {
    renderSchedule();
  }

  if (persist && currentState.activeStickyTab !== tab) {
    currentState.activeStickyTab = tab;
    window.usagiAPI?.updateReminderPreferences({ activeStickyTab: tab });
  }
}

function renderCalendar(): void {
  if (!stickyCalDaysGrid || !stickyCalMonthTitle) return;
  const todayYMD = getTodayYMD();
  stickyCalMonthTitle.textContent = `${getMonthNames(currentLocale)[currentCalendarMonth - 1]} ${currentCalendarYear}`;

  if (stickyCalWeekdaysGrid) {
    const days = getWeekdayLabels(currentLocale, currentState.weekStartsOn ?? 1);
    stickyCalWeekdaysGrid.innerHTML = days.map((d) => `<div>${d}</div>`).join('');
  }

  const cells = buildMonthCalendarGrid(
    currentCalendarYear,
    currentCalendarMonth,
    todayYMD,
    selectedDateStr,
    currentEvents,
    currentState.items,
    currentState.weekStartsOn ?? 1
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

  // Update Section A: Dedicated Selected Day Card
  if (selectedDateStr) {
    if (stickyCalDetailBanner) stickyCalDetailBanner.style.display = 'flex';
    const summary = getSelectedDaySummary(currentEvents, currentState.items, selectedDateStr);
    const fmt = currentState.dateFormat || 'DD/MM';

    if (stickyCalDetailText) {
      stickyCalDetailText.textContent = `${t(currentLocale, 'sticky.cal.selected')} ${formatDisplayDate(selectedDateStr, fmt, true)}`;
    }
    if (stickyCalJumpAddBtn) {
      stickyCalJumpAddBtn.textContent = `${t(currentLocale, 'sticky.cal.addQuestOn')} (${formatDisplayDate(selectedDateStr, fmt, false)})`;
    }

    if (stickyCalDayItemsList) {
      stickyCalDayItemsList.innerHTML = '';
      if (summary.holidays.length === 0 && summary.quests.length === 0) {
        const empty = document.createElement('div');
        empty.style.fontSize = '9.5px';
        empty.style.color = 'var(--text-muted)';
        empty.style.fontStyle = 'italic';
        empty.style.padding = '2px 0';
        empty.textContent = t(currentLocale, 'sticky.cal.emptyDate');
        stickyCalDayItemsList.appendChild(empty);
      } else {
        for (const h of summary.holidays) {
          const row = document.createElement('div');
          row.className = 'upcoming-item-row';
          row.style.padding = '3px 6px';

          const left = document.createElement('div');
          left.style.display = 'flex';
          left.style.alignItems = 'center';
          left.style.gap = '4px';
          left.style.overflow = 'hidden';

          const icon = document.createElement('span');
          icon.textContent = h.type === 'birthday' ? '🎂' : '🎉';

          const title = document.createElement('span');
          title.style.fontWeight = '700';
          title.style.overflow = 'hidden';
          title.style.textOverflow = 'ellipsis';
          title.style.whiteSpace = 'nowrap';
          title.textContent = getLocalizedHolidayTitle(h, currentLocale);

          left.appendChild(icon);
          left.appendChild(title);

          const badge = document.createElement('span');
          badge.className = 'upcoming-badge';
          badge.textContent =
            h.type === 'birthday'
              ? t(currentLocale, 'sticky.cal.badgeBirthday')
              : t(currentLocale, 'sticky.cal.badgeHoliday');

          row.appendChild(left);
          row.appendChild(badge);
          stickyCalDayItemsList.appendChild(row);
        }

        for (const q of summary.quests) {
          const row = document.createElement('div');
          row.className = 'upcoming-item-row';
          row.style.padding = '3px 6px';
          if (q.completed) row.style.opacity = '0.65';

          const left = document.createElement('div');
          left.style.display = 'flex';
          left.style.alignItems = 'center';
          left.style.gap = '4px';
          left.style.overflow = 'hidden';

          const icon = document.createElement('span');
          icon.textContent = q.completed ? '🍮' : '✦';

          const title = document.createElement('span');
          title.style.fontWeight = '600';
          title.style.overflow = 'hidden';
          title.style.textOverflow = 'ellipsis';
          title.style.whiteSpace = 'nowrap';
          title.textContent = q.text;

          left.appendChild(icon);
          left.appendChild(title);

          const badge = document.createElement('span');
          badge.className = 'upcoming-badge';
          badge.style.background = q.completed ? 'var(--text-muted)' : 'var(--accent-color)';
          badge.textContent = q.completed
            ? t(currentLocale, 'sticky.cal.badgeDone')
            : t(currentLocale, 'sticky.cal.badgeQuest');

          row.appendChild(left);
          row.appendChild(badge);
          stickyCalDayItemsList.appendChild(row);
        }
      }
    }
  } else {
    if (stickyCalDetailBanner) stickyCalDetailBanner.style.display = 'none';
  }

  // Update Section B: Upcoming (Strictly Excluding Selected Date)
  renderUpcoming();
}

function renderUpcoming(): void {
  if (!stickyUpcomingList) return;
  stickyUpcomingList.innerHTML = '';
  const todayYMD = getTodayYMD();
  const upcoming = getUpcomingCountdownItems(
    currentEvents,
    currentState.items,
    todayYMD,
    5,
    selectedDateStr,
    currentLocale
  );

  if (upcoming.length === 0) {
    const empty = document.createElement('div');
    empty.style.fontSize = '10px';
    empty.style.color = 'var(--text-muted)';
    empty.style.textAlign = 'center';
    empty.style.padding = '4px 0';
    empty.textContent = selectedDateStr
      ? t(currentLocale, 'sticky.cal.emptyOtherUpcoming')
      : t(currentLocale, 'sticky.cal.emptyUpcoming');
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

function renderSchedule(): void {
  // 1. Update Now / Next Banner Today
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const curHHMM = `${hh}:${mm}`;
  const todayDay = now.getDay();

  const { current, next } = getCurrentAndNextSchedule(
    currentScheduleState.entries,
    todayDay,
    curHHMM
  );

  if (stickyScheduleNowText) {
    stickyScheduleNowText.textContent = '';
    if (current) {
      const locStr = current.location ? ` • ${current.location}` : '';
      const prefix = document.createElement('strong');
      prefix.textContent = `${t(currentLocale, 'sticky.sched.now')}: `;
      stickyScheduleNowText.appendChild(prefix);
      stickyScheduleNowText.appendChild(
        document.createTextNode(
          `${current.title} (${current.startTime}–${current.endTime})${locStr}`
        )
      );
    } else if (next) {
      const locStr = next.location ? ` • ${next.location}` : '';
      const prefix = document.createElement('strong');
      prefix.textContent = `${t(currentLocale, 'sticky.sched.next')}: `;
      stickyScheduleNowText.appendChild(prefix);
      stickyScheduleNowText.appendChild(
        document.createTextNode(
          `${next.title} ${t(currentLocale, 'sticky.sched.at')} ${next.startTime}${locStr}`
        )
      );
    } else {
      stickyScheduleNowText.textContent = t(currentLocale, 'sticky.sched.noMoreClasses');
    }
  }

  // 2. Update Weekday Selector Buttons
  if (stickySchedDaysRow) {
    const pills = getScheduleWeekdayPills(currentLocale);
    stickySchedDaysRow.innerHTML = pills
      .map(
        (p) =>
          `<button class="sticky-chip-btn ${p.day === selectedScheduleDay ? 'active' : ''}" data-day="${p.day}">${p.label}</button>`
      )
      .join('');
  }

  // 3. Render Schedule Entry Cards
  if (!stickyScheduleList) return;
  stickyScheduleList.innerHTML = '';
  const entries = getEntriesForDay(currentScheduleState, selectedScheduleDay);

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<div class="emoji">📚</div><div>${t(currentLocale, 'sticky.sched.emptyDay')}</div>`;
    stickyScheduleList.appendChild(empty);
    return;
  }

  for (const entry of entries) {
    const card = document.createElement('div');
    card.className = 'sched-entry-card';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '6px';
    left.style.overflow = 'hidden';

    const timePill = document.createElement('span');
    timePill.className = 'sched-time-pill';
    timePill.textContent = `${entry.startTime}–${entry.endTime}`;

    const title = document.createElement('span');
    title.className = 'sched-title';
    title.textContent = entry.title;

    left.appendChild(timePill);
    left.appendChild(title);

    if (entry.location) {
      const loc = document.createElement('span');
      loc.className = 'sched-location';
      loc.textContent = entry.location;
      left.appendChild(loc);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'sched-delete-btn';
    delBtn.textContent = '✕';
    delBtn.title = 'Delete class';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.usagiAPI?.deleteScheduleEntry(entry.id);
    });

    card.appendChild(left);
    card.appendChild(delBtn);
    stickyScheduleList.appendChild(card);
  }
}

function handleAddSchedule(): void {
  if (!schedTitleInput || !schedStartInput || !schedEndInput) return;
  const title = schedTitleInput.value.trim();
  const startTime = schedStartInput.value;
  const endTime = schedEndInput.value;
  const location = schedLocationInput?.value.trim() || undefined;

  if (!title) {
    schedTitleInput.focus();
    return;
  }
  if (startTime >= endTime) {
    alert('Start time must be earlier than end time!');
    return;
  }

  window.usagiAPI?.addScheduleEntry({
    title,
    dayOfWeek: selectedScheduleDay,
    startTime,
    endTime,
    location,
  });

  schedTitleInput.value = '';
  if (schedLocationInput) schedLocationInput.value = '';
}

function setupResizeDrag(
  element: HTMLElement | null,
  direction: 'both' | 'horizontal' | 'vertical'
): void {
  if (!element) return;
  element.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    const startX = e.screenX;
    const startY = e.screenY;
    const startW = window.innerWidth;
    const startH = window.innerHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.screenX - startX;
      const deltaY = moveEvent.screenY - startY;
      const nextW = direction === 'vertical' ? startW : startW + deltaX;
      const nextH = direction === 'horizontal' ? startH : startH + deltaY;
      window.usagiAPI?.resizeStickyWindow(nextW, nextH);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}

function render(state: ReminderState): void {
  currentState = state;
  document.body.setAttribute('data-theme', 'custard');
  document.body.setAttribute('data-font-scale', state.fontScale || 'md');

  if (state.activeStickyTab && state.activeStickyTab !== activeTab) {
    switchTab(state.activeStickyTab, false);
  }

  if (textZoomBtn) {
    textZoomBtn.textContent =
      state.fontScale === 'sm' ? 'A' : state.fontScale === 'lg' ? 'A++' : 'A+';
  }

  if (questInput) {
    questInput.placeholder = t(
      currentLocale,
      state.dateFormat === 'MM/DD' ? 'sticky.input.placeholderMMDD' : 'sticky.input.placeholderDDMM'
    );
  }

  renderCalendar();
  if (activeTab === 'schedule') {
    renderSchedule();
  }

  if (!questList) return;
  questList.innerHTML = '';

  const fmt = state.dateFormat || 'DD/MM';

  const itemsToRender = activeQuickDueDate
    ? state.items.filter((item) => item.dueDate === activeQuickDueDate)
    : state.items;

  if (itemsToRender.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="emoji">🍮</div>
      <div>${activeQuickDueDate ? t(currentLocale, 'sticky.empty.questsOnDate') : t(currentLocale, 'sticky.empty.quests')}</div>
    `;
    questList.appendChild(empty);
  } else {
    for (const item of itemsToRender) {
      const itemEl = document.createElement('div');
      itemEl.className = `quest-item ${item.completed ? 'completed' : ''}`;
      itemEl.dataset.id = item.id;

      itemEl.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.quest-delete')) return;
        window.usagiAPI?.toggleReminder(item.id);
      });

      const bullet = document.createElement('span');
      bullet.className = 'quest-bullet';
      bullet.textContent = item.completed ? '🍮' : '✦';

      const text = document.createElement('span');
      text.className = 'quest-text';
      text.textContent = item.text;

      if (item.dueDate) {
        const badge = document.createElement('span');
        badge.className = 'quest-due-badge';
        const baseBadge = formatReminderDueBadge(item.dueDate, getTodayYMD(), fmt, currentLocale);
        badge.textContent = item.repeat ? `↻ ${baseBadge}` : baseBadge;
        text.appendChild(badge);
      }

      const comfyLine = document.createElement('span');
      comfyLine.className = 'comfy-line';
      text.appendChild(comfyLine);

      const delBtn = document.createElement('button');
      delBtn.className = 'quest-delete';
      delBtn.textContent = '✕';
      delBtn.title = 'Delete quest';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.usagiAPI?.deleteReminder(item.id);
      });

      itemEl.appendChild(bullet);
      itemEl.appendChild(text);
      itemEl.appendChild(delBtn);
      questList.appendChild(itemEl);
    }
  }

  const completed = state.items.filter((it) => it.completed).length;
  if (questCounter) {
    const base = t(currentLocale, 'sticky.footer.completed', {
      done: completed,
      total: state.items.length,
    });
    if (activeQuickDueDate) {
      const filteredDue = state.items.filter((it) => it.dueDate === activeQuickDueDate).length;
      const suffix = t(currentLocale, 'sticky.footer.dueOn', {
        count: filteredDue,
        date: formatDisplayDate(activeQuickDueDate, fmt, false),
      });
      questCounter.textContent = `${base} ${suffix}`;
    } else {
      questCounter.textContent = base;
    }
  }
}

function handleAddQuest(): void {
  if (!questInput) return;
  const val = questInput.value.trim();
  if (val && window.usagiAPI) {
    window.usagiAPI.addReminder(val, activeQuickDueDate || undefined);
    questInput.value = '';
    activeQuickDueDate = null;
    if (stickySelectedDateRow) stickySelectedDateRow.style.display = 'none';
  }
}

function startClockRefresh(): void {
  const refresh = (): void => {
    const now = new Date();
    stickyClockSnapshot = {
      ...stickyClockSnapshot,
      selectedScheduleDay,
      calendarYear: currentCalendarYear,
      calendarMonth: currentCalendarMonth,
    };
    const result = resolveStickyClockRollover(stickyClockSnapshot, now);
    stickyClockSnapshot = result.snapshot;

    if (result.dateChanged) {
      selectedScheduleDay = result.snapshot.selectedScheduleDay;
      currentCalendarYear = result.snapshot.calendarYear;
      currentCalendarMonth = result.snapshot.calendarMonth;
      render(currentState);
      return;
    }

    if (activeTab === 'schedule') {
      renderSchedule();
    }
  };

  window.setInterval(refresh, 15_000);
}

function init(): void {
  renderStaticLocaleText();
  startClockRefresh();

  if (tabBtnQuests) {
    tabBtnQuests.addEventListener('click', () => switchTab('quests'));
  }
  if (tabBtnCalendar) {
    tabBtnCalendar.addEventListener('click', () => switchTab('calendar'));
  }
  if (tabBtnSchedule) {
    tabBtnSchedule.addEventListener('click', () => switchTab('schedule'));
  }

  if (stickySchedDaysRow) {
    stickySchedDaysRow.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest(
        '.sticky-chip-btn'
      ) as HTMLButtonElement | null;
      if (target && target.hasAttribute('data-day')) {
        selectedScheduleDay = Number(target.getAttribute('data-day'));
        renderSchedule();
      }
    });
  }

  if (addSchedBtn) {
    addSchedBtn.addEventListener('click', handleAddSchedule);
  }
  if (schedTitleInput) {
    schedTitleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddSchedule();
    });
  }

  // Setup interactive window resizing
  setupResizeDrag(stickyResizeCorner, 'both');
  setupResizeDrag(stickyResizeRight, 'horizontal');
  setupResizeDrag(stickyResizeBottom, 'vertical');

  const PRESET_SIZES = [
    { w: 350, h: 480 },
    { w: 410, h: 560 },
    { w: 480, h: 650 },
  ];
  if (windowSizeBtn) {
    windowSizeBtn.addEventListener('click', () => {
      const curW = currentState.stickyWidth || window.innerWidth;
      let nextIdx = 0;
      if (curW < 380) {
        nextIdx = 1;
      } else if (curW < 450) {
        nextIdx = 2;
      } else {
        nextIdx = 0;
      }
      const target = PRESET_SIZES[nextIdx];
      window.usagiAPI?.resizeStickyWindow(target.w, target.h);
    });
  }

  if (addQuestBtn) {
    addQuestBtn.addEventListener('click', handleAddQuest);
  }

  if (questInput) {
    questInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddQuest();
    });
  }

  if (stickyChipClearDate) {
    stickyChipClearDate.addEventListener('click', () => {
      activeQuickDueDate = null;
      if (stickySelectedDateRow) stickySelectedDateRow.style.display = 'none';
      render(currentState);
    });
  }

  if (textZoomBtn) {
    textZoomBtn.addEventListener('click', () => {
      window.usagiAPI?.cycleStickyFontScale();
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
        if (stickySelectedDateRow) stickySelectedDateRow.style.display = 'flex';
        if (stickySelectedDateLabel) {
          const fmt = currentState.dateFormat || 'DD/MM';
          stickySelectedDateLabel.textContent = `${t(currentLocale, 'sticky.targetDate')} ${formatDisplayDate(activeQuickDueDate, fmt, true)}`;
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

    window.usagiAPI.onLocaleChanged((locale) => {
      currentLocale = locale;
      renderStaticLocaleText();
      render(currentState);
    });

    window.usagiAPI.onCalendarStateChanged((payload) => {
      currentEvents = payload.events;
      currentProfile = payload.profile;
      render(currentState);
    });

    window.usagiAPI.onScheduleStateChanged((state) => {
      currentScheduleState = state;
      if (activeTab === 'schedule') {
        renderSchedule();
      }
    });

    window.usagiAPI
      .getLocale?.()
      .then((loc) => {
        if (loc) {
          currentLocale = loc;
          renderStaticLocaleText();
          render(currentState);
          if (activeTab === 'schedule') {
            renderSchedule();
          }
        }
      })
      .catch(() => {});

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

    window.usagiAPI
      .getScheduleState()
      .then((state) => {
        if (state) {
          currentScheduleState = state;
          if (activeTab === 'schedule') {
            renderSchedule();
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load initial schedule state:', err);
      });
  }
}

document.addEventListener('DOMContentLoaded', init);
