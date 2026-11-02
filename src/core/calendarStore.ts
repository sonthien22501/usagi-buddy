import { ReminderItem, WeekStartDay } from './reminderStore';

export interface BuddyProfile {
  nickname: string;
  birthdayMonth: number | null; // 1-12
  birthdayDay: number | null; // 1-31
  countryCode: string; // ISO 3166-1 alpha-2, e.g. 'VN', 'US'
}

export interface HolidayEvent {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  localName: string;
  countryCode: string;
  type: 'public_holiday' | 'birthday';
}

export interface CalendarDayCell {
  dateStr: string; // YYYY-MM-DD
  dayOfMonth: number;
  year: number;
  month: number; // 1-12
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  holidays: HolidayEvent[];
  hasBirthday: boolean;
  questsDue: ReminderItem[];
}

export interface UpcomingCountdownItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: 'holiday' | 'birthday' | 'quest';
  daysUntil: number; // 0, 1, 2, ...
  badgeText: string; // "Today!", "Tomorrow", "In 3d"
  completed?: boolean;
}

export interface SelectedDaySummary {
  dateStr: string;
  holidays: HolidayEvent[];
  quests: ReminderItem[];
}

export interface CalendarState {
  profile: BuddyProfile;
  cachedHolidays: HolidayEvent[];
}

export const SUPPORTED_COUNTRIES = [
  { code: 'VN', name: 'Vietnam 🇻🇳' },
  { code: 'US', name: 'United States 🇺🇸' },
  { code: 'GB', name: 'United Kingdom 🇬🇧' },
  { code: 'DE', name: 'Germany 🇩🇪' },
  { code: 'FR', name: 'France 🇫🇷' },
  { code: 'ES', name: 'Spain 🇪🇸' },
  { code: 'JP', name: 'Japan 🇯🇵' },
  { code: 'KR', name: 'South Korea 🇰🇷' },
  { code: 'AU', name: 'Australia 🇦🇺' },
  { code: 'CA', name: 'Canada 🇨🇦' },
];

/**
 * Format local year, month (1-12), and day (1-31) into timezone-safe YYYY-MM-DD string.
 */
export function formatDateYMD(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD into numeric year, month (1-12), day (1-31).
 */
export function parseDateYMD(ymd: string): { year: number; month: number; day: number } {
  const parts = ymd.split('-').map((p) => parseInt(p, 10));
  return {
    year: parts[0] || 1970,
    month: parts[1] || 1,
    day: parts[2] || 1,
  };
}

/**
 * Calculate difference in calendar days between two YYYY-MM-DD strings.
 * Zero timezone drift by calculating UTC epoch day difference.
 */
export function daysBetweenYMD(fromYMD: string, toYMD: string): number {
  const [y1, m1, d1] = fromYMD.split('-').map((p) => parseInt(p, 10));
  const [y2, m2, d2] = toYMD.split('-').map((p) => parseInt(p, 10));
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

/**
 * Returns the YYYY-MM-DD corresponding to the last day of the calendar month immediately
 * following today's month (e.g. Nov 2 -> Dec 31; Dec 15 -> Jan 31).
 */
export function getEndOfNextMonthYMD(todayYMD: string): string {
  const { year, month } = parseDateYMD(todayYMD);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const lastDay = new Date(nextYear, nextMonth, 0).getDate();
  return formatDateYMD(nextYear, nextMonth, lastDay);
}

/**
 * Detect country code from locale string or timezone name, with 'US' fallback.
 */
export function detectCountryCode(locale?: string, timeZone?: string): string {
  const matchTZ = (tzStr: string): string | null => {
    const tz = tzStr.toLowerCase();
    if (tz.includes('ho_chi_minh') || tz.includes('saigon') || tz.includes('vietnam')) return 'VN';
    if (tz.includes('tokyo') || tz.includes('japan')) return 'JP';
    if (tz.includes('seoul') || tz.includes('korea')) return 'KR';
    if (tz.includes('berlin')) return 'DE';
    if (tz.includes('paris')) return 'FR';
    if (tz.includes('london')) return 'GB';
    if (tz.includes('madrid')) return 'ES';
    if (tz.includes('australia') || tz.includes('sydney') || tz.includes('melbourne')) return 'AU';
    if (tz.includes('toronto') || tz.includes('vancouver') || tz.includes('canada')) return 'CA';
    if (
      tz.includes('new_york') ||
      tz.includes('chicago') ||
      tz.includes('los_angeles') ||
      tz.includes('denver') ||
      tz.includes('america')
    ) {
      return 'US';
    }
    return null;
  };

  const matchLoc = (locStr: string): string | null => {
    const loc = locStr.toUpperCase();
    const match = loc.match(/[-_]([A-Z]{2})\b/);
    if (match) {
      const candidate = match[1];
      if (SUPPORTED_COUNTRIES.some((c) => c.code === candidate)) {
        return candidate;
      }
    }
    if (loc.startsWith('VI') || loc === 'VN') return 'VN';
    if (loc.startsWith('JA') || loc === 'JP') return 'JP';
    if (loc.startsWith('KO') || loc === 'KR') return 'KR';
    if (loc.startsWith('DE')) return 'DE';
    if (loc.startsWith('FR')) return 'FR';
    if (loc.startsWith('ES')) return 'ES';
    return null;
  };

  // If explicit arguments are provided, use only them and fallback to US
  const hasExplicitArgs = locale !== undefined || timeZone !== undefined;
  if (hasExplicitArgs) {
    if (timeZone && timeZone.trim()) {
      const fromTz = matchTZ(timeZone);
      if (fromTz) return fromTz;
    }
    if (locale && locale.trim()) {
      const fromLoc = matchLoc(locale);
      if (fromLoc) return fromLoc;
    }
    return 'US';
  }

  // Otherwise try system timezone and system locale
  try {
    const sysTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fromSysTz = matchTZ(sysTz);
    if (fromSysTz) return fromSysTz;
  } catch {
    // ignore
  }

  // Otherwise try system locale
  try {
    const sysLoc = Intl.DateTimeFormat().resolvedOptions().locale;
    const fromSysLoc = matchLoc(sysLoc);
    if (fromSysLoc) return fromSysLoc;
  } catch {
    // ignore
  }

  return 'US';
}

/**
 * Built-in deterministic static holidays for offline fallback.
 */
export function getStaticFallbackHolidays(countryCode: string, year: number): HolidayEvent[] {
  const code = countryCode.toUpperCase();
  const holidays: HolidayEvent[] = [
    {
      id: `stat-${year}-01-01`,
      date: formatDateYMD(year, 1, 1),
      name: "New Year's Day",
      localName: "New Year's Day",
      countryCode: code,
      type: 'public_holiday',
    },
    {
      id: `stat-${year}-02-14`,
      date: formatDateYMD(year, 2, 14),
      name: "Valentine's Day",
      localName: "Valentine's Day",
      countryCode: code,
      type: 'public_holiday',
    },
    {
      id: `stat-${year}-10-31`,
      date: formatDateYMD(year, 10, 31),
      name: 'Halloween',
      localName: 'Halloween',
      countryCode: code,
      type: 'public_holiday',
    },
    {
      id: `stat-${year}-12-24`,
      date: formatDateYMD(year, 12, 24),
      name: 'Christmas Eve',
      localName: 'Christmas Eve',
      countryCode: code,
      type: 'public_holiday',
    },
    {
      id: `stat-${year}-12-25`,
      date: formatDateYMD(year, 12, 25),
      name: 'Christmas Day',
      localName: 'Christmas Day',
      countryCode: code,
      type: 'public_holiday',
    },
    {
      id: `stat-${year}-12-31`,
      date: formatDateYMD(year, 12, 31),
      name: "New Year's Eve",
      localName: "New Year's Eve",
      countryCode: code,
      type: 'public_holiday',
    },
  ];

  if (code === 'VN') {
    holidays.push(
      {
        id: `stat-${year}-vn-reunification`,
        date: formatDateYMD(year, 4, 30),
        name: 'Reunification Day',
        localName: 'Ngày Giải phóng Miền Nam',
        countryCode: 'VN',
        type: 'public_holiday',
      },
      {
        id: `stat-${year}-vn-labor`,
        date: formatDateYMD(year, 5, 1),
        name: 'International Labor Day',
        localName: 'Ngày Quốc tế Lao động',
        countryCode: 'VN',
        type: 'public_holiday',
      },
      {
        id: `stat-${year}-vn-national`,
        date: formatDateYMD(year, 9, 2),
        name: 'National Day',
        localName: 'Quốc khánh Việt Nam',
        countryCode: 'VN',
        type: 'public_holiday',
      },
      {
        id: `stat-${year}-vn-teacher`,
        date: formatDateYMD(year, 11, 20),
        name: "Teachers' Day",
        localName: 'Ngày Nhà giáo Việt Nam',
        countryCode: 'VN',
        type: 'public_holiday',
      }
    );
  } else if (code === 'US') {
    holidays.push(
      {
        id: `stat-${year}-us-independence`,
        date: formatDateYMD(year, 7, 4),
        name: 'Independence Day',
        localName: 'Independence Day',
        countryCode: 'US',
        type: 'public_holiday',
      },
      {
        id: `stat-${year}-us-veterans`,
        date: formatDateYMD(year, 11, 11),
        name: 'Veterans Day',
        localName: 'Veterans Day',
        countryCode: 'US',
        type: 'public_holiday',
      }
    );
  } else if (code === 'JP') {
    holidays.push(
      {
        id: `stat-${year}-jp-constitution`,
        date: formatDateYMD(year, 5, 3),
        name: 'Constitution Memorial Day',
        localName: '憲法記念日',
        countryCode: 'JP',
        type: 'public_holiday',
      },
      {
        id: `stat-${year}-jp-children`,
        date: formatDateYMD(year, 5, 5),
        name: "Children's Day",
        localName: 'こどもの日',
        countryCode: 'JP',
        type: 'public_holiday',
      },
      {
        id: `stat-${year}-jp-culture`,
        date: formatDateYMD(year, 11, 3),
        name: 'Culture Day',
        localName: '文化の日',
        countryCode: 'JP',
        type: 'public_holiday',
      }
    );
  } else if (code === 'DE') {
    holidays.push({
      id: `stat-${year}-de-unity`,
      date: formatDateYMD(year, 10, 3),
      name: 'German Unity Day',
      localName: 'Tag der Deutschen Einheit',
      countryCode: 'DE',
      type: 'public_holiday',
    });
  } else if (code === 'FR') {
    holidays.push({
      id: `stat-${year}-fr-bastille`,
      date: formatDateYMD(year, 7, 14),
      name: 'Bastille Day',
      localName: 'Fête nationale',
      countryCode: 'FR',
      type: 'public_holiday',
    });
  } else if (code === 'GB') {
    holidays.push({
      id: `stat-${year}-gb-boxing`,
      date: formatDateYMD(year, 12, 26),
      name: 'Boxing Day',
      localName: 'Boxing Day',
      countryCode: 'GB',
      type: 'public_holiday',
    });
  }

  return holidays;
}

/**
 * Normalizes Nager.Date API v3 payload into HolidayEvent list.
 */
export function normalizeNagerHolidays(rawItems: unknown[], countryCode: string): HolidayEvent[] {
  if (!Array.isArray(rawItems)) return [];
  const results: HolidayEvent[] = [];

  for (const item of rawItems) {
    if (typeof item !== 'object' || item === null) continue;
    const cand = item as Record<string, unknown>;
    if (typeof cand.date === 'string' && typeof cand.name === 'string') {
      results.push({
        id: `nager-${cand.date}-${cand.name}`,
        date: cand.date,
        name: cand.name,
        localName: typeof cand.localName === 'string' ? cand.localName : cand.name,
        countryCode: typeof cand.countryCode === 'string' ? cand.countryCode : countryCode,
        type: 'public_holiday',
      });
    }
  }

  return results;
}

/**
 * Injects user's birthday event into holidays list and deduplicates by date + name.
 */
export function buildCalendarEvents(
  rawHolidays: HolidayEvent[],
  profile: BuddyProfile,
  year: number
): HolidayEvent[] {
  const merged: HolidayEvent[] = [...rawHolidays];

  if (
    profile.birthdayMonth &&
    profile.birthdayMonth >= 1 &&
    profile.birthdayMonth <= 12 &&
    profile.birthdayDay &&
    profile.birthdayDay >= 1 &&
    profile.birthdayDay <= 31
  ) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    let bdayDay = profile.birthdayDay;
    if (profile.birthdayMonth === 2 && bdayDay === 29 && !isLeapYear) {
      bdayDay = 28;
    }

    const bdayDate = formatDateYMD(year, profile.birthdayMonth, bdayDay);
    const bdayName = `🎂 ${profile.nickname ? `${profile.nickname}'s` : "Buddy's"} Birthday!`;

    merged.push({
      id: `birthday-${year}-${bdayDate}`,
      date: bdayDate,
      name: bdayName,
      localName: bdayName,
      countryCode: profile.countryCode,
      type: 'birthday',
    });
  }

  // Deduplicate by date + name
  const seen = new Set<string>();
  const unique: HolidayEvent[] = [];
  for (const ev of merged) {
    const key = `${ev.date}__${ev.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(ev);
    }
  }

  return unique.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Builds standard 42-cell (6 rows x 7 cols) calendar grid for a given year & month.
 * weekStartsOn: 1 = Monday, 0 = Sunday (default 0 for backward compatibility).
 */
export function buildMonthCalendarGrid(
  year: number,
  month: number, // 1-12
  todayYMD: string,
  selectedYMD?: string | null,
  events: HolidayEvent[] = [],
  reminders: ReminderItem[] = [],
  weekStartsOn: WeekStartDay = 0
): CalendarDayCell[] {
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
  const leadingBlanks = (firstDayOfWeek - weekStartsOn + 7) % 7;
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < 42; i++) {
    const dayDate = new Date(year, month - 1, 1 - leadingBlanks + i);
    const cellYear = dayDate.getFullYear();
    const cellMonth = dayDate.getMonth() + 1;
    const cellDay = dayDate.getDate();
    const cellDateStr = formatDateYMD(cellYear, cellMonth, cellDay);

    const isCurrentMonth = cellMonth === month;
    const isToday = cellDateStr === todayYMD;
    const isSelected = Boolean(selectedYMD && cellDateStr === selectedYMD);

    const cellHolidays = events.filter((e) => e.date === cellDateStr);
    const hasBirthday = cellHolidays.some((e) => e.type === 'birthday');
    const questsDue = reminders.filter((r) => r.dueDate === cellDateStr);

    cells.push({
      dateStr: cellDateStr,
      dayOfMonth: cellDay,
      year: cellYear,
      month: cellMonth,
      isCurrentMonth,
      isToday,
      isSelected,
      holidays: cellHolidays,
      hasBirthday,
      questsDue,
    });
  }

  return cells;
}

/**
 * Compute upcoming countdown items (holidays, birthdays, and incomplete quests) sorted by days until.
 * Optional excludeDateYMD avoids duplicating items already displayed in a dedicated Selected Day card.
 */
export function getUpcomingCountdownItems(
  events: HolidayEvent[],
  reminders: ReminderItem[],
  todayYMD: string,
  limit = 5,
  excludeDateYMD?: string | null
): UpcomingCountdownItem[] {
  const items: UpcomingCountdownItem[] = [];
  const maxDateYMD = getEndOfNextMonthYMD(todayYMD);

  for (const ev of events) {
    if (excludeDateYMD && ev.date === excludeDateYMD) {
      continue;
    }
    const diff = daysBetweenYMD(todayYMD, ev.date);
    if (diff >= 0 && ev.date <= maxDateYMD) {
      items.push({
        id: ev.id,
        date: ev.date,
        title: ev.name,
        type: ev.type === 'birthday' ? 'birthday' : 'holiday',
        daysUntil: diff,
        badgeText: diff === 0 ? 'Today!' : diff === 1 ? 'Tomorrow' : `In ${diff}d`,
      });
    }
  }

  for (const r of reminders) {
    if (r.dueDate && !r.completed) {
      if (excludeDateYMD && r.dueDate === excludeDateYMD) {
        continue;
      }
      const diff = daysBetweenYMD(todayYMD, r.dueDate);
      if (diff >= 0 && r.dueDate <= maxDateYMD) {
        items.push({
          id: r.id,
          date: r.dueDate,
          title: r.text,
          type: 'quest',
          daysUntil: diff,
          badgeText: diff === 0 ? 'Today!' : diff === 1 ? 'Tomorrow' : `In ${diff}d`,
          completed: r.completed,
        });
      }
    }
  }

  items.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) {
      return a.daysUntil - b.daysUntil;
    }
    // If same day, put birthdays first, then holidays, then quests
    const typePriority: Record<string, number> = { birthday: 0, holiday: 1, quest: 2 };
    return (typePriority[a.type] ?? 9) - (typePriority[b.type] ?? 9);
  });

  return items.slice(0, limit);
}

/**
 * Returns exact holidays and quests for a chosen day.
 */
export function getSelectedDaySummary(
  events: HolidayEvent[],
  reminders: ReminderItem[],
  selectedYMD: string
): SelectedDaySummary {
  const holidays = events.filter((e) => e.date === selectedYMD);
  const quests = reminders.filter((r) => r.dueDate === selectedYMD);
  return {
    dateStr: selectedYMD,
    holidays,
    quests,
  };
}

export function createDefaultBuddyProfile(): BuddyProfile {
  return {
    nickname: 'Buddy',
    birthdayMonth: null,
    birthdayDay: null,
    countryCode: detectCountryCode(),
  };
}

export function parseCalendarProfileJson(raw: string | null | undefined): CalendarState {
  const defaultState: CalendarState = {
    profile: createDefaultBuddyProfile(),
    cachedHolidays: [],
  };

  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return defaultState;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return defaultState;
    }

    const nickname =
      typeof parsed.profile?.nickname === 'string' && parsed.profile.nickname.trim()
        ? parsed.profile.nickname.trim().slice(0, 32)
        : 'Buddy';

    const birthdayMonth =
      typeof parsed.profile?.birthdayMonth === 'number' &&
      parsed.profile.birthdayMonth >= 1 &&
      parsed.profile.birthdayMonth <= 12
        ? parsed.profile.birthdayMonth
        : null;

    const birthdayDay =
      typeof parsed.profile?.birthdayDay === 'number' &&
      parsed.profile.birthdayDay >= 1 &&
      parsed.profile.birthdayDay <= 31
        ? parsed.profile.birthdayDay
        : null;

    const countryCode =
      typeof parsed.profile?.countryCode === 'string' && parsed.profile.countryCode.length === 2
        ? parsed.profile.countryCode.toUpperCase()
        : detectCountryCode();

    const cachedHolidays: HolidayEvent[] = [];
    if (Array.isArray(parsed.cachedHolidays)) {
      for (const item of parsed.cachedHolidays) {
        if (
          item &&
          typeof item.id === 'string' &&
          typeof item.date === 'string' &&
          typeof item.name === 'string'
        ) {
          cachedHolidays.push({
            id: item.id,
            date: item.date,
            name: item.name,
            localName: typeof item.localName === 'string' ? item.localName : item.name,
            countryCode: typeof item.countryCode === 'string' ? item.countryCode : countryCode,
            type: item.type === 'birthday' ? 'birthday' : 'public_holiday',
          });
        }
      }
    }

    return {
      profile: {
        nickname,
        birthdayMonth,
        birthdayDay,
        countryCode,
      },
      cachedHolidays,
    };
  } catch {
    return defaultState;
  }
}

export function serializeCalendarProfileJson(
  profile: BuddyProfile,
  cachedHolidays: HolidayEvent[] = []
): string {
  return JSON.stringify(
    {
      profile,
      cachedHolidays,
    },
    null,
    2
  );
}
