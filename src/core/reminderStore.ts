/**
 * Pure state manager for Usagi Desktop Sticky Reminders & Checklist
 */

export interface ReminderItem {
  id: string;
  text: string;
  completed: boolean;
  createdAtMs: number;
}

export interface ReminderState {
  items: ReminderItem[];
  stickyVisible: boolean;
  theme: 'custard' | 'night';
}

export const MAX_REMINDER_ITEMS = 30;
export const MAX_REMINDER_TEXT_LENGTH = 120;

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
  nowMs = Date.now()
): ReminderState {
  const trimmed = text.trim();
  if (!trimmed || state.items.length >= MAX_REMINDER_ITEMS) {
    return state;
  }

  const truncated = trimmed.slice(0, MAX_REMINDER_TEXT_LENGTH);
  const newItem: ReminderItem = {
    id: `reminder-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    text: truncated,
    completed: false,
    createdAtMs: nowMs,
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
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.text === 'string' &&
    typeof candidate.completed === 'boolean' &&
    typeof candidate.createdAtMs === 'number'
  );
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

    const theme: 'custard' | 'night' = parsed.theme === 'night' ? 'night' : 'custard';
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
        validItems.push({
          id: String(item.id),
          text: String(item.text).slice(0, MAX_REMINDER_TEXT_LENGTH),
          completed: Boolean(item.completed),
          createdAtMs: Number(item.createdAtMs) || 0,
        });
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
