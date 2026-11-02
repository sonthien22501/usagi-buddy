/**
 * Pure state manager for Usagi Desktop Sticky Reminders & Checklist
 */

import { daysBetweenYMD } from './calendarStore';

export interface ReminderItem {
  id: string;
  text: string;
  completed: boolean;
  createdAtMs: number;
  dueDate?: string; // YYYY-MM-DD
}

export type StickyFontScale = 'sm' | 'md' | 'lg';
export type DateFormatPreference = 'DD/MM' | 'MM/DD';
export type WeekStartDay = 0 | 1;

export interface ReminderState {
  items: ReminderItem[];
  stickyVisible: boolean;
  theme: 'custard';
  fontScale?: StickyFontScale;
  dateFormat?: DateFormatPreference;
  weekStartsOn?: WeekStartDay;
  stickyAlwaysOnTop?: boolean;
}

export const MAX_REMINDER_ITEMS = 30;
export const MAX_REMINDER_TEXT_LENGTH = 120;

export function formatLocalDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return formatLocalDateYMD(d);
}

const LATIN_CONVERSATIONAL_PREFIXES =
  /^(?:please\s+|s'il\s+vous\s+pla[îi]t\s+|por\s+favor\s+|bitte\s+|làm\s+ơn\s+|vui\s+lòng\s+)?(?:remind\s+me\s+to|i\s+have\s+to|i\s+need\s+to|i\s+must|i\s+should|i've\s+got\s+to|i\s+got\s+to|don'?t\s+forget\s+to|remember\s+to|tôi\s+phải|tôi\s+cần|mình\s+phải|mình\s+cần|em\s+phải|anh\s+phải|chị\s+phải|nhớ\s+phải|nhớ\s+là|nhớ|đừng\s+quên|cần\s+phải|phải|ich\s+muss|ich\s+sollte|erinnere\s+mich\s+daran|nicht\s+vergessen|je\s+dois|il\s+faut\s+que\s+je|il\s+faut|n'oublie\s+pas\s+de|rappeler\s+de|penser\s+à|tengo\s+que|debo|necesito|hay\s+que|no\s+olvidar|recuérdame|recuerdame|recordar)\s+/i;

const CJK_CONVERSATIONAL_PREFIXES =
  /^(?:我需要|我要|我得|记得要|記得要|记得|記得|别忘了|別忘了|不要忘记|不要忘記|要)\s*/;

const KOREAN_CONVERSATIONAL_SUFFIXES =
  /\s*(?:해야\s*해(?:요)?|해야\s*함|해야\s*합니다|잊지\s*말기)\s*[.!?]*$/;

function stripConversationalNoise(str: string): { text: string; stripped: boolean } {
  let s = str.trim();
  let stripped = false;
  let keepGoing = true;
  while (keepGoing) {
    keepGoing = false;
    const latinMatch = s.match(LATIN_CONVERSATIONAL_PREFIXES);
    if (latinMatch) {
      s = s.slice(latinMatch[0].length).trim();
      stripped = true;
      keepGoing = true;
      continue;
    }
    const cjkMatch = s.match(CJK_CONVERSATIONAL_PREFIXES);
    if (cjkMatch) {
      s = s.slice(cjkMatch[0].length).trim();
      stripped = true;
      keepGoing = true;
      continue;
    }
  }
  const suffixMatch = s.match(KOREAN_CONVERSATIONAL_SUFFIXES);
  if (suffixMatch && suffixMatch.index !== undefined) {
    s = s.slice(0, suffixMatch.index).trim();
    stripped = true;
  }
  return { text: s, stripped };
}

function applyExtractor(
  str: string,
  leadingCJK: RegExp,
  leadingSpaced: RegExp,
  trailing: RegExp
): { matched: boolean; text: string } {
  const mCJK = str.match(leadingCJK);
  if (mCJK) {
    return { matched: true, text: str.slice(mCJK[0].length) };
  }
  const mSpaced = str.match(leadingSpaced);
  if (mSpaced) {
    return { matched: true, text: str.slice(mSpaced[0].length) };
  }
  const mTrailing = str.match(trailing);
  if (mTrailing && mTrailing.index !== undefined) {
    return { matched: true, text: str.slice(0, mTrailing.index) };
  }
  return { matched: false, text: str };
}

export function extractDueDateToken(
  rawText: string,
  defaultDateStr?: string,
  now = new Date(),
  format: DateFormatPreference = 'DD/MM'
): { cleanText: string; dueDate?: string } {
  let dueDate: string | undefined = undefined;
  let text = rawText.trim();
  let shouldCapitalize = false;

  const initialCleanup = stripConversationalNoise(text);
  if (initialCleanup.stripped) {
    text = initialCleanup.text;
    shouldCapitalize = true;
  }

  const todayRegex = /(?:^|\s)@today\b/i;
  const tomorrowRegex = /(?:^|\s)@(?:tomorrow|tmrw)\b/i;
  const plusDaysRegex = /(?:^|\s)@\+(\d+)d\b/i;
  const dateRegex = /(?:^|\s)@(\d{4}-\d{2}-\d{2})\b/;

  if (todayRegex.test(text)) {
    dueDate = formatLocalDateYMD(now);
    text = text.replace(todayRegex, '');
    shouldCapitalize = true;
  } else if (tomorrowRegex.test(text)) {
    dueDate = addDays(now, 1);
    text = text.replace(tomorrowRegex, '');
    shouldCapitalize = true;
  } else if (plusDaysRegex.test(text)) {
    const match = text.match(plusDaysRegex);
    if (match) {
      const days = parseInt(match[1], 10);
      dueDate = addDays(now, days);
      text = text.replace(plusDaysRegex, '');
      shouldCapitalize = true;
    }
  } else if (dateRegex.test(text)) {
    const match = text.match(dateRegex);
    if (match) {
      dueDate = match[1];
      text = text.replace(dateRegex, '');
      shouldCapitalize = true;
    }
  }

  if (!dueDate) {
    // 1. Day After Tomorrow (+2 days)
    const cjkDayAfterTomorrow = /^(?:明後日|あさって|后天|後天)\s*/;
    const spacedDayAfterTomorrow =
      /^(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(?:day\s+after\s+tomorrow|(?:vào\s+)?(?:ngày\s+mốt|ngày\s+kia|mốt)|übermorgen|uebermorgen|après-demain|apres-demain|pasado\s+mañana|pasado\s+manana|모레|내일모레)(?:\s+|$)/i;
    const trailingDayAfterTomorrow =
      /(?:\s+|^)(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(?:day\s+after\s+tomorrow|(?:vào\s+)?(?:ngày\s+mốt|ngày\s+kia|mốt)|übermorgen|uebermorgen|après-demain|apres-demain|pasado\s+mañana|pasado\s+manana|모레|내일모레|明後日|あさって|后天|後天)\s*[.!?]*$/i;

    const resDayAfterTomorrow = applyExtractor(
      text,
      cjkDayAfterTomorrow,
      spacedDayAfterTomorrow,
      trailingDayAfterTomorrow
    );
    if (resDayAfterTomorrow.matched) {
      dueDate = addDays(now, 2);
      text = resDayAfterTomorrow.text;
      shouldCapitalize = true;
    }

    // 2. Tomorrow (+1 day)
    if (!dueDate) {
      const cjkTomorrow = /^(?:明天|明日|明早|明晚|あした|あす)\s*/;
      const spacedTomorrow =
        /^(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(?:tomorrow|tmrw|tmr|(?:vào\s+)?(?:ngày\s+mai|sáng\s+mai|chiều\s+mai|tối\s+mai|mai)|morgen|demain|mañana|manana|내일)(?:\s+|$)/i;
      const trailingTomorrow =
        /(?:\s+|^)(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(?:tomorrow|tmrw|tmr|(?:vào\s+)?(?:ngày\s+mai|sáng\s+mai|chiều\s+mai|tối\s+mai|mai)|morgen|demain|mañana|manana|내일|明天|明日|明早|明晚|あした|あす)\s*[.!?]*$/i;

      const resTomorrow = applyExtractor(text, cjkTomorrow, spacedTomorrow, trailingTomorrow);
      if (resTomorrow.matched) {
        dueDate = addDays(now, 1);
        text = resTomorrow.text;
        shouldCapitalize = true;
      }
    }

    // 3. Today (+0 days)
    if (!dueDate) {
      const cjkToday = /^(?:今日|きょう|今夜|こんや|今天|今晚)\s*/;
      const spacedToday =
        /^(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(?:today|tonight|(?:vào\s+)?(?:hôm\s+nay|tối\s+nay|chiều\s+nay|sáng\s+nay|nay)|heute(?:\s+abend)?|aujourd'hui|ce\s+soir|hoy|esta\s+noche|오늘(?:\s*밤)?)(?:\s+|$)/i;
      const trailingToday =
        /(?:\s+|^)(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(?:today|tonight|(?:vào\s+)?(?:hôm\s+nay|tối\s+nay|chiều\s+nay|sáng\s+nay|nay)|heute(?:\s+abend)?|aujourd'hui|ce\s+soir|hoy|esta\s+noche|오늘(?:\s*밤)?|今日|きょう|今夜|こんや|今天|今晚)\s*[.!?]*$/i;

      const resToday = applyExtractor(text, cjkToday, spacedToday, trailingToday);
      if (resToday.matched) {
        dueDate = addDays(now, 0);
        text = resToday.text;
        shouldCapitalize = true;
      }
    }

    // 4. Next Week (+7 days)
    if (!dueDate) {
      const cjkNextWeek = /^(?:来週|らいしゅう|下周|下週|下星期|下礼拜)\s*/;
      const spacedNextWeek =
        /^(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(?:next\s+week|(?:vào\s+)?tuần\s+(?:sau|tới)|nächste\s+woche|naechste\s+woche|(?:la\s+)?semaine\s+prochaine|(?:la\s+)?(?:próxima|proxima)\s+semana|semana\s+que\s+viene|다음\s*주)(?:\s+|$)/i;
      const trailingNextWeek =
        /(?:\s+|^)(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(?:next\s+week|(?:vào\s+)?tuần\s+(?:sau|tới)|nächste\s+woche|naechste\s+woche|(?:la\s+)?semaine\s+prochaine|(?:la\s+)?(?:próxima|proxima)\s+semana|semana\s+que\s+viene|다음\s*주|来週|らいしゅう|下周|下週|下星期|下礼拜)\s*[.!?]*$/i;

      const resNextWeek = applyExtractor(text, cjkNextWeek, spacedNextWeek, trailingNextWeek);
      if (resNextWeek.matched) {
        dueDate = addDays(now, 7);
        text = resNextWeek.text;
        shouldCapitalize = true;
      }
    }

    // 5. In N Days (+N days)
    if (!dueDate) {
      const leadingInDaysJA = /^(\d+)\s*日後(?:に)?\s*/;
      const leadingInDaysKO = /^(\d+)\s*일\s*(?:후|뒤)(?:에)?\s*/;
      const leadingInDaysZH = /^(\d+)\s*(?:天|日)(?:后|後|之后|之後)\s*/;
      const leadingInDaysSpaced =
        /^(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(?:(?:in|dans|en)\s+(\d+)\s+(?:days?|tagen?|jours?|días?|dias?)|(?:trong\s+)?(\d+)\s+ngày\s+(?:nữa|tới))(?:\s+|$)/i;
      const trailingInDays =
        /(?:\s+|^)(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(?:(?:in|dans|en)\s+(\d+)\s+(?:days?|tagen?|jours?|días?|dias?)|(?:trong\s+)?(\d+)\s+ngày\s+(?:nữa|tới)|(\d+)\s*日後(?:に)?|(\d+)\s*일\s*(?:후|뒤)(?:에)?|(\d+)\s*(?:天|日)(?:后|後|之后|之後))\s*[.!?]*$/i;

      const mLeadingJA = text.match(leadingInDaysJA);
      if (mLeadingJA) {
        dueDate = addDays(now, parseInt(mLeadingJA[1], 10));
        text = text.slice(mLeadingJA[0].length);
        shouldCapitalize = true;
      } else {
        const mLeadingKO = text.match(leadingInDaysKO);
        if (mLeadingKO) {
          dueDate = addDays(now, parseInt(mLeadingKO[1], 10));
          text = text.slice(mLeadingKO[0].length);
          shouldCapitalize = true;
        } else {
          const mLeadingZH = text.match(leadingInDaysZH);
          if (mLeadingZH) {
            dueDate = addDays(now, parseInt(mLeadingZH[1], 10));
            text = text.slice(mLeadingZH[0].length);
            shouldCapitalize = true;
          } else {
            const mLeadingSpaced = text.match(leadingInDaysSpaced);
            if (mLeadingSpaced) {
              const days = parseInt(mLeadingSpaced[1] || mLeadingSpaced[2], 10);
              dueDate = addDays(now, days);
              text = text.slice(mLeadingSpaced[0].length);
              shouldCapitalize = true;
            } else {
              const mTrailingInDays = text.match(trailingInDays);
              if (mTrailingInDays && mTrailingInDays.index !== undefined) {
                const days = parseInt(
                  mTrailingInDays[1] ||
                    mTrailingInDays[2] ||
                    mTrailingInDays[3] ||
                    mTrailingInDays[4] ||
                    mTrailingInDays[5],
                  10
                );
                dueDate = addDays(now, days);
                text = text.slice(0, mTrailingInDays.index);
                shouldCapitalize = true;
              }
            }
          }
        }
      }
    }

    // 6. Explicit Dates: ISO and Slash DD/MM(/YYYY)
    if (!dueDate) {
      const leadingISO =
        /^(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(\d{4}-\d{2}-\d{2})(?:\s+|$)/i;
      const trailingISO =
        /(?:\s+|^)(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(\d{4}-\d{2}-\d{2})\s*[.!?]*$/i;

      const mLeadingISO = text.match(leadingISO);
      if (mLeadingISO) {
        dueDate = mLeadingISO[1];
        text = text.slice(mLeadingISO[0].length);
        shouldCapitalize = true;
      } else {
        const mTrailingISO = text.match(trailingISO);
        if (mTrailingISO && mTrailingISO.index !== undefined) {
          dueDate = mTrailingISO[1];
          text = text.slice(0, mTrailingISO.index);
          shouldCapitalize = true;
        }
      }
    }

    if (!dueDate) {
      const leadingSlash =
        /^(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?:\s+|$)/i;
      const trailingSlash =
        /(?:\s+|^)(?:(?:by|on|for|due|at|vào|ngày|am|le|el|para)\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*[.!?]*$/i;

      const mLeadingSlash = text.match(leadingSlash);
      if (mLeadingSlash) {
        const p1 = parseInt(mLeadingSlash[1], 10);
        const p2 = parseInt(mLeadingSlash[2], 10);
        const year = mLeadingSlash[3] ? parseInt(mLeadingSlash[3], 10) : now.getFullYear();
        const day = format === 'MM/DD' ? p2 : p1;
        const month = format === 'MM/DD' ? p1 : p2;
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
          dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          text = text.slice(mLeadingSlash[0].length);
          shouldCapitalize = true;
        }
      } else {
        const mTrailingSlash = text.match(trailingSlash);
        if (mTrailingSlash && mTrailingSlash.index !== undefined) {
          const p1 = parseInt(mTrailingSlash[1], 10);
          const p2 = parseInt(mTrailingSlash[2], 10);
          const year = mTrailingSlash[3] ? parseInt(mTrailingSlash[3], 10) : now.getFullYear();
          const day = format === 'MM/DD' ? p2 : p1;
          const month = format === 'MM/DD' ? p1 : p2;
          if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            text = text.slice(0, mTrailingSlash.index);
            shouldCapitalize = true;
          }
        }
      }
    }
  }

  // Re-run noise cleanup once more in case date token was leading
  const postCleanup = stripConversationalNoise(text);
  if (postCleanup.stripped) {
    text = postCleanup.text;
    shouldCapitalize = true;
  }

  if (!dueDate && defaultDateStr && /^\d{4}-\d{2}-\d{2}$/.test(defaultDateStr)) {
    dueDate = defaultDateStr;
  }

  let cleanText = text.replace(/\s+/g, ' ').trim();
  if (shouldCapitalize && cleanText.length > 0) {
    cleanText = cleanText.charAt(0).toLocaleUpperCase() + cleanText.slice(1);
  }
  return { cleanText, dueDate };
}

export function formatDisplayDate(
  ymd: string,
  format: DateFormatPreference = 'DD/MM',
  includeYear = false
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return ymd;
  }
  const year = ymd.slice(0, 4);
  const month = ymd.slice(5, 7);
  const day = ymd.slice(8, 10);
  if (format === 'MM/DD') {
    return includeYear ? `${month}/${day}/${year}` : `${month}/${day}`;
  }
  return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

export function formatReminderDueBadge(
  dueDateStr: string,
  todayYMD: string,
  format: DateFormatPreference = 'DD/MM'
): string {
  const diff = daysBetweenYMD(todayYMD, dueDateStr);
  const shortDate = formatDisplayDate(dueDateStr, format, false);
  if (diff === 0) return `Today (${shortDate})`;
  if (diff === 1) return `Tmrw (${shortDate})`;
  if (diff === -1) return `Yesterday (${shortDate})`;
  if (diff < -1) return `Overdue (${shortDate})`;
  return `Due ${shortDate}`;
}

export const DEFAULT_STARTER_ITEMS: ReminderItem[] = [
  {
    id: 'starter-water',
    text: 'Drink a glass of water 💧',
    completed: false,
    createdAtMs: 1729900000000,
  },
  {
    id: 'starter-pomodoro',
    text: '25m Focus Session with Usagi 🍮',
    completed: false,
    createdAtMs: 1729900001000,
  },
  {
    id: 'starter-stretch',
    text: 'Stretch shoulders & eyes ✨',
    completed: false,
    createdAtMs: 1729900002000,
  },
];

export function createInitialReminderState(): ReminderState {
  return {
    items: DEFAULT_STARTER_ITEMS.map((item) => ({ ...item })),
    stickyVisible: true,
    theme: 'custard',
    fontScale: 'md',
    dateFormat: 'DD/MM',
    weekStartsOn: 1,
    stickyAlwaysOnTop: false,
  };
}

export function addReminderItem(
  state: ReminderState,
  text: string,
  nowMs = Date.now(),
  idOrDueDate?: string,
  explicitDueDate?: string
): ReminderState {
  const nowDate = new Date(nowMs);
  let customId: string | undefined;
  let fallbackDueDate: string | undefined;

  if (explicitDueDate !== undefined) {
    customId = idOrDueDate;
    fallbackDueDate = explicitDueDate;
  } else if (idOrDueDate !== undefined) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(idOrDueDate)) {
      fallbackDueDate = idOrDueDate;
    } else {
      customId = idOrDueDate;
    }
  }

  const { cleanText, dueDate } = extractDueDateToken(
    text,
    fallbackDueDate,
    nowDate,
    state.dateFormat || 'DD/MM'
  );
  if (!cleanText || state.items.length >= MAX_REMINDER_ITEMS) {
    return state;
  }

  const truncated = cleanText.slice(0, MAX_REMINDER_TEXT_LENGTH);
  const newItem: ReminderItem = {
    id: customId || `reminder-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    text: truncated,
    completed: false,
    createdAtMs: nowMs,
    ...(dueDate ? { dueDate } : {}),
  };

  return {
    ...state,
    items: [...state.items, newItem],
  };
}

export function toggleReminderItem(
  state: ReminderState,
  id: string
): { state: ReminderState; newlyCompleted: ReminderItem | null } {
  let newlyCompleted: ReminderItem | null = null;
  let changed = false;

  const nextItems = state.items.map((item) => {
    if (item.id === id) {
      changed = true;
      const nextCompleted = !item.completed;
      if (nextCompleted) {
        newlyCompleted = { ...item, completed: true };
      }
      return { ...item, completed: nextCompleted };
    }
    return item;
  });

  if (!changed) {
    return { state, newlyCompleted: null };
  }

  return {
    state: {
      ...state,
      items: nextItems,
    },
    newlyCompleted,
  };
}

export function deleteReminderItem(state: ReminderState, id: string): ReminderState {
  return {
    ...state,
    items: state.items.filter((item) => item.id !== id),
  };
}

export function clearCompletedReminders(state: ReminderState): ReminderState {
  return {
    ...state,
    items: state.items.filter((item) => !item.completed),
  };
}

export function cycleReminderFontScale(state: ReminderState): ReminderState {
  const current = state.fontScale || 'md';
  const nextScale: StickyFontScale = current === 'sm' ? 'md' : current === 'md' ? 'lg' : 'sm';
  return {
    ...state,
    fontScale: nextScale,
  };
}

export interface ReminderPreferencesUpdate {
  dateFormat?: DateFormatPreference;
  weekStartsOn?: WeekStartDay;
  stickyAlwaysOnTop?: boolean;
  fontScale?: StickyFontScale;
}

export function updateReminderPreferences(
  state: ReminderState,
  prefs: ReminderPreferencesUpdate
): ReminderState {
  return {
    ...state,
    ...(prefs.dateFormat !== undefined ? { dateFormat: prefs.dateFormat } : {}),
    ...(prefs.weekStartsOn !== undefined ? { weekStartsOn: prefs.weekStartsOn } : {}),
    ...(prefs.stickyAlwaysOnTop !== undefined
      ? { stickyAlwaysOnTop: prefs.stickyAlwaysOnTop }
      : {}),
    ...(prefs.fontScale !== undefined ? { fontScale: prefs.fontScale } : {}),
  };
}

function isValidReminderItem(item: unknown): item is ReminderItem {
  if (typeof item !== 'object' || item === null) return false;
  const candidate = item as Record<string, unknown>;
  const basicValid =
    typeof candidate.id === 'string' &&
    typeof candidate.text === 'string' &&
    typeof candidate.completed === 'boolean' &&
    typeof candidate.createdAtMs === 'number';
  if (!basicValid) return false;
  if ('dueDate' in candidate && candidate.dueDate !== undefined) {
    return typeof candidate.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(candidate.dueDate);
  }
  return true;
}

export function parseRemindersJson(raw: string | null | undefined): ReminderState {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return createInitialReminderState();
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return createInitialReminderState();
    }

    const theme: 'custard' = 'custard';
    const stickyVisible: boolean =
      typeof parsed.stickyVisible === 'boolean' ? parsed.stickyVisible : true;
    const fontScale: StickyFontScale =
      parsed.fontScale === 'sm' || parsed.fontScale === 'md' || parsed.fontScale === 'lg'
        ? parsed.fontScale
        : 'md';
    const dateFormat: DateFormatPreference = parsed.dateFormat === 'MM/DD' ? 'MM/DD' : 'DD/MM';
    const weekStartsOn: WeekStartDay = parsed.weekStartsOn === 0 ? 0 : 1;
    const stickyAlwaysOnTop: boolean = Boolean(parsed.stickyAlwaysOnTop);

    if (!Array.isArray(parsed.items)) {
      return {
        items: DEFAULT_STARTER_ITEMS.map((item) => ({ ...item })),
        stickyVisible,
        theme,
        fontScale,
        dateFormat,
        weekStartsOn,
        stickyAlwaysOnTop,
      };
    }

    const validItems: ReminderItem[] = [];
    for (const item of parsed.items) {
      if (isValidReminderItem(item)) {
        const validItem: ReminderItem = {
          id: String(item.id),
          text: String(item.text).slice(0, MAX_REMINDER_TEXT_LENGTH),
          completed: Boolean(item.completed),
          createdAtMs: Number(item.createdAtMs) || 0,
        };
        if (typeof item.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate)) {
          validItem.dueDate = item.dueDate;
        }
        validItems.push(validItem);
      }
    }

    return {
      items: validItems.slice(0, MAX_REMINDER_ITEMS),
      stickyVisible,
      theme,
      fontScale,
      dateFormat,
      weekStartsOn,
      stickyAlwaysOnTop,
    };
  } catch {
    return createInitialReminderState();
  }
}

export function serializeRemindersJson(state: ReminderState): string {
  return JSON.stringify(state, null, 2);
}
