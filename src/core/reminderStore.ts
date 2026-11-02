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

export interface ReminderState {
  items: ReminderItem[];
  stickyVisible: boolean;
  theme: 'custard';
}

export const MAX_REMINDER_ITEMS = 30;
export const MAX_REMINDER_TEXT_LENGTH = 120;

export function formatLocalDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function extractDueDateToken(
  rawText: string,
  defaultDateStr?: string,
  now = new Date()
): { cleanText: string; dueDate?: string } {
  let dueDate: string | undefined = undefined;
  let text = rawText.trim();
  let shouldCapitalize = false;

  const conversationalPrefixRegex =
    /^(?:please\s+)?(?:remind\s+me\s+to|i\s+have\s+to|i\s+need\s+to|i\s+must|i\s+should|i've\s+got\s+to|i\s+got\s+to|don'?t\s+forget\s+to|remember\s+to)\s+/i;
  if (conversationalPrefixRegex.test(text)) {
    text = text.replace(conversationalPrefixRegex, '');
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
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    dueDate = formatLocalDateYMD(d);
    text = text.replace(tomorrowRegex, '');
    shouldCapitalize = true;
  } else if (plusDaysRegex.test(text)) {
    const match = text.match(plusDaysRegex);
    if (match) {
      const days = parseInt(match[1], 10);
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
      dueDate = formatLocalDateYMD(d);
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
    const naturalTomorrowRegex =
      /(?:^|\s)(?:(?:by|on|for|due|at)\s+)?(tomorrow|tmrw|tmr)\s*[.!?]*$/i;
    const naturalTodayRegex = /(?:^|\s)(?:(?:by|on|for|due|at)\s+)?(today|tonight)\s*[.!?]*$/i;
    const naturalInDaysRegex = /(?:^|\s)(?:(?:by|on|for|due|at)\s+)?in\s+(\d+)\s+days?\s*[.!?]*$/i;
    const naturalNextWeekRegex = /(?:^|\s)(?:(?:by|on|for|due|at)\s+)?next\s+week\s*[.!?]*$/i;
    const naturalDateRegex = /(?:^|\s)(?:(?:by|on|for|due|at)\s+)?(\d{4}-\d{2}-\d{2})\s*[.!?]*$/i;

    if (naturalTomorrowRegex.test(text)) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      dueDate = formatLocalDateYMD(d);
      text = text.replace(naturalTomorrowRegex, '');
      shouldCapitalize = true;
    } else if (naturalTodayRegex.test(text)) {
      dueDate = formatLocalDateYMD(now);
      text = text.replace(naturalTodayRegex, '');
      shouldCapitalize = true;
    } else if (naturalInDaysRegex.test(text)) {
      const match = text.match(naturalInDaysRegex);
      if (match) {
        const days = parseInt(match[1], 10);
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
        dueDate = formatLocalDateYMD(d);
        text = text.replace(naturalInDaysRegex, '');
        shouldCapitalize = true;
      }
    } else if (naturalNextWeekRegex.test(text)) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
      dueDate = formatLocalDateYMD(d);
      text = text.replace(naturalNextWeekRegex, '');
      shouldCapitalize = true;
    } else if (naturalDateRegex.test(text)) {
      const match = text.match(naturalDateRegex);
      if (match) {
        dueDate = match[1];
        text = text.replace(naturalDateRegex, '');
        shouldCapitalize = true;
      }
    }
  }

  if (!dueDate && defaultDateStr && /^\d{4}-\d{2}-\d{2}$/.test(defaultDateStr)) {
    dueDate = defaultDateStr;
  }

  let cleanText = text.replace(/\s+/g, ' ').trim();
  if (shouldCapitalize && cleanText.length > 0) {
    cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
  }
  return { cleanText, dueDate };
}

export function formatReminderDueBadge(dueDateStr: string, todayYMD: string): string {
  const diff = daysBetweenYMD(todayYMD, dueDateStr);
  const shortDate = dueDateStr.slice(5).replace('-', '/');
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

  const { cleanText, dueDate } = extractDueDateToken(text, fallbackDueDate, nowDate);
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

    if (!Array.isArray(parsed.items)) {
      return {
        items: DEFAULT_STARTER_ITEMS.map((item) => ({ ...item })),
        stickyVisible,
        theme,
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
    };
  } catch {
    return createInitialReminderState();
  }
}

export function serializeRemindersJson(state: ReminderState): string {
  return JSON.stringify(state, null, 2);
}
