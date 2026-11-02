/**
 * Pure state manager for Weekly Study & Class Timetable
 */

export interface ScheduleEntry {
  id: string;
  title: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // 'HH:MM' 24-hour format
  endTime: string; // 'HH:MM' 24-hour format
  location?: string;
}

export interface ScheduleState {
  entries: ScheduleEntry[];
}

export interface NewScheduleEntryInput {
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
}

export const MAX_SCHEDULE_ENTRIES = 100;
export const MAX_SCHEDULE_TITLE_LENGTH = 100;
export const MAX_SCHEDULE_LOCATION_LENGTH = 60;

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeHHMM(time: string): boolean {
  return TIME_REGEX.test(time);
}

export function createInitialScheduleState(): ScheduleState {
  return {
    entries: [],
  };
}

export function validateScheduleInput(input: NewScheduleEntryInput): {
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
} {
  if (
    typeof input.dayOfWeek !== 'number' ||
    !Number.isInteger(input.dayOfWeek) ||
    input.dayOfWeek < 0 ||
    input.dayOfWeek > 6
  ) {
    throw new Error(
      `Invalid dayOfWeek: ${input.dayOfWeek}. Must be integer between 0 (Sun) and 6 (Sat).`
    );
  }

  if (typeof input.startTime !== 'string' || !isValidTimeHHMM(input.startTime)) {
    throw new Error(`Invalid startTime: ${input.startTime}. Must be HH:MM format (00:00 - 23:59).`);
  }

  if (typeof input.endTime !== 'string' || !isValidTimeHHMM(input.endTime)) {
    throw new Error(`Invalid endTime: ${input.endTime}. Must be HH:MM format (00:00 - 23:59).`);
  }

  if (input.startTime >= input.endTime) {
    throw new Error(
      `startTime (${input.startTime}) must be earlier than endTime (${input.endTime}).`
    );
  }

  const title = (input.title ?? '').trim();
  if (!title) {
    throw new Error('Schedule entry title cannot be empty.');
  }

  const location = input.location ? input.location.trim() : undefined;

  return {
    title: title.slice(0, MAX_SCHEDULE_TITLE_LENGTH),
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    location: location ? location.slice(0, MAX_SCHEDULE_LOCATION_LENGTH) : undefined,
  };
}

export function addScheduleEntry(
  state: ScheduleState,
  input: NewScheduleEntryInput
): ScheduleState {
  const validated = validateScheduleInput(input);
  const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const newEntry: ScheduleEntry = {
    id,
    title: validated.title,
    dayOfWeek: validated.dayOfWeek,
    startTime: validated.startTime,
    endTime: validated.endTime,
    location: validated.location,
  };

  const updatedEntries = [...state.entries, newEntry];

  // Sort entries: by dayOfWeek then startTime
  updatedEntries.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek;
    }
    return a.startTime.localeCompare(b.startTime);
  });

  return {
    entries: updatedEntries.slice(0, MAX_SCHEDULE_ENTRIES),
  };
}

export function deleteScheduleEntry(state: ScheduleState, id: string): ScheduleState {
  if (!state.entries.some((e) => e.id === id)) {
    return state;
  }
  return {
    entries: state.entries.filter((e) => e.id !== id),
  };
}

export function getEntriesForDay(state: ScheduleState, dayOfWeek: number): ScheduleEntry[] {
  return state.entries
    .filter((e) => e.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getCurrentAndNextSchedule(
  entries: ScheduleEntry[],
  dayOfWeek: number,
  currentHHMM: string
): { current: ScheduleEntry | null; next: ScheduleEntry | null } {
  const dayEntries = entries
    .filter((e) => e.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  let current: ScheduleEntry | null = null;
  let next: ScheduleEntry | null = null;

  for (const entry of dayEntries) {
    if (entry.startTime <= currentHHMM && currentHHMM < entry.endTime) {
      if (!current) {
        current = entry;
      }
    } else if (entry.startTime > currentHHMM) {
      if (!next) {
        next = entry;
      }
    }
  }

  return { current, next };
}

export function parseScheduleJson(raw: string | null | undefined): ScheduleState {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return createInitialScheduleState();
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entries)) {
      return createInitialScheduleState();
    }

    const validEntries: ScheduleEntry[] = [];
    for (const item of parsed.entries) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        item.title.trim().length > 0 &&
        typeof item.dayOfWeek === 'number' &&
        Number.isInteger(item.dayOfWeek) &&
        item.dayOfWeek >= 0 &&
        item.dayOfWeek <= 6 &&
        typeof item.startTime === 'string' &&
        isValidTimeHHMM(item.startTime) &&
        typeof item.endTime === 'string' &&
        isValidTimeHHMM(item.endTime) &&
        item.startTime < item.endTime
      ) {
        validEntries.push({
          id: item.id,
          title: item.title.trim().slice(0, MAX_SCHEDULE_TITLE_LENGTH),
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          location:
            typeof item.location === 'string' && item.location.trim()
              ? item.location.trim().slice(0, MAX_SCHEDULE_LOCATION_LENGTH)
              : undefined,
        });
      }
    }

    validEntries.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startTime.localeCompare(b.startTime);
    });

    return {
      entries: validEntries.slice(0, MAX_SCHEDULE_ENTRIES),
    };
  } catch {
    return createInitialScheduleState();
  }
}

export function serializeScheduleJson(state: ScheduleState): string {
  return JSON.stringify(state, null, 2);
}
