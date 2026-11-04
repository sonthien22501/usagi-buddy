import { describe, expect, it } from 'vitest';
import { resolveStickyClockRollover, type StickyClockSnapshot } from '../src/core/stickyClock';

describe('stickyClock', () => {
  const base: StickyClockSnapshot = {
    dateYMD: '2026-11-04',
    dayOfWeek: 3, // Wednesday
    selectedScheduleDay: 3,
    calendarYear: 2026,
    calendarMonth: 11,
  };

  it('reports no rollover while the local date is unchanged', () => {
    const result = resolveStickyClockRollover(base, new Date(2026, 10, 4, 23, 59, 0));
    expect(result.dateChanged).toBe(false);
    expect(result.snapshot).toEqual(base);
  });

  it('advances the schedule day when it was following today', () => {
    const result = resolveStickyClockRollover(base, new Date(2026, 10, 5, 0, 0, 30));
    expect(result.dateChanged).toBe(true);
    expect(result.snapshot.dateYMD).toBe('2026-11-05');
    expect(result.snapshot.dayOfWeek).toBe(4); // Thursday
    expect(result.snapshot.selectedScheduleDay).toBe(4);
  });

  it('preserves a day the user manually selected', () => {
    const result = resolveStickyClockRollover(
      { ...base, selectedScheduleDay: 1 },
      new Date(2026, 10, 5, 0, 0, 30)
    );
    expect(result.snapshot.selectedScheduleDay).toBe(1);
  });

  it('advances the calendar month only when it was showing the current month', () => {
    const result = resolveStickyClockRollover(base, new Date(2026, 11, 1, 0, 0, 30));
    expect(result.snapshot.calendarYear).toBe(2026);
    expect(result.snapshot.calendarMonth).toBe(12);

    const browsingMay = resolveStickyClockRollover(
      { ...base, calendarMonth: 5 },
      new Date(2026, 11, 1, 0, 0, 30)
    );
    expect(browsingMay.snapshot.calendarMonth).toBe(5);
    expect(browsingMay.snapshot.calendarYear).toBe(2026);
  });

  it('rolls the calendar year over at New Year', () => {
    const result = resolveStickyClockRollover(
      {
        dateYMD: '2026-12-31',
        dayOfWeek: 4,
        selectedScheduleDay: 4,
        calendarYear: 2026,
        calendarMonth: 12,
      },
      new Date(2027, 0, 1, 0, 0, 30)
    );
    expect(result.snapshot.dateYMD).toBe('2027-01-01');
    expect(result.snapshot.calendarYear).toBe(2027);
    expect(result.snapshot.calendarMonth).toBe(1);
    expect(result.snapshot.selectedScheduleDay).toBe(5); // Friday
  });
});
