import { formatDateYMD } from './calendarStore';

export interface StickyClockSnapshot {
  /** Local YYYY-MM-DD when the snapshot was taken. */
  dateYMD: string;
  dayOfWeek: number; // 0..6
  selectedScheduleDay: number; // 0..6
  calendarYear: number;
  calendarMonth: number; // 1-12
}

export interface StickyClockRolloverResult {
  snapshot: StickyClockSnapshot;
  dateChanged: boolean;
}

/**
 * Keeps the sticky note's time-sensitive UI in sync with the local calendar.
 *
 * When the date changes:
 * - the schedule day follows "today" only if the user had not picked another day;
 * - the calendar jumps to the new current month only if it was showing the old
 *   current month (a month the user is browsing is preserved).
 */
export function resolveStickyClockRollover(
  previous: StickyClockSnapshot,
  now: Date
): StickyClockRolloverResult {
  const dateYMD = formatDateYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());
  if (dateYMD === previous.dateYMD) {
    return { snapshot: previous, dateChanged: false };
  }

  const [previousYear, previousMonth] = previous.dateYMD.split('-').map((part) => Number(part));
  const dayOfWeek = now.getDay();
  const wasFollowingToday = previous.selectedScheduleDay === previous.dayOfWeek;
  const wasShowingCurrentMonth =
    previous.calendarYear === previousYear && previous.calendarMonth === previousMonth;

  return {
    snapshot: {
      dateYMD,
      dayOfWeek,
      selectedScheduleDay: wasFollowingToday ? dayOfWeek : previous.selectedScheduleDay,
      calendarYear: wasShowingCurrentMonth ? now.getFullYear() : previous.calendarYear,
      calendarMonth: wasShowingCurrentMonth ? now.getMonth() + 1 : previous.calendarMonth,
    },
    dateChanged: true,
  };
}
