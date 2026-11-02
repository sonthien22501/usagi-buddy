import { describe, expect, it } from 'vitest';
import {
  formatDateYMD,
  parseDateYMD,
  daysBetweenYMD,
  getEndOfNextMonthYMD,
  detectCountryCode,
  getStaticFallbackHolidays,
  buildCalendarEvents,
  buildMonthCalendarGrid,
  getUpcomingCountdownItems,
  parseCalendarProfileJson,
  serializeCalendarProfileJson,
  BuddyProfile,
  HolidayEvent,
} from '../src/core/calendarStore';
import { ReminderItem } from '../src/core/reminderStore';

describe('calendarStore', () => {
  describe('Timezone-safe YMD helpers', () => {
    it('formats and parses YYYY-MM-DD accurately without timezone drift', () => {
      const ymd = formatDateYMD(2026, 11, 2);
      expect(ymd).toBe('2026-11-02');
      const parsed = parseDateYMD('2026-11-02');
      expect(parsed).toEqual({ year: 2026, month: 11, day: 2 });
    });

    it('calculates calendar days difference accurately', () => {
      expect(daysBetweenYMD('2026-11-02', '2026-11-02')).toBe(0);
      expect(daysBetweenYMD('2026-11-02', '2026-11-03')).toBe(1);
      expect(daysBetweenYMD('2026-11-02', '2026-11-07')).toBe(5);
      expect(daysBetweenYMD('2026-11-05', '2026-11-02')).toBe(-3);
      expect(daysBetweenYMD('2026-12-31', '2027-01-01')).toBe(1);
    });

    it('calculates end of next calendar month accurately including year rollover and leap years', () => {
      expect(getEndOfNextMonthYMD('2026-11-02')).toBe('2026-12-31');
      expect(getEndOfNextMonthYMD('2026-12-15')).toBe('2027-01-31');
      expect(getEndOfNextMonthYMD('2028-01-10')).toBe('2028-02-29'); // Leap year Feb
      expect(getEndOfNextMonthYMD('2027-01-05')).toBe('2027-02-28'); // Non-leap year Feb
    });
  });

  describe('detectCountryCode', () => {
    it('detects country code from timezone or locale correctly', () => {
      expect(detectCountryCode('en-US', 'Asia/Ho_Chi_Minh')).toBe('VN');
      expect(detectCountryCode('vi-VN', '')).toBe('VN');
      expect(detectCountryCode('de-DE', 'Europe/Berlin')).toBe('DE');
      expect(detectCountryCode('fr-FR', 'Europe/Paris')).toBe('FR');
      expect(detectCountryCode('ja-JP', 'Asia/Tokyo')).toBe('JP');
      expect(detectCountryCode('ko-KR', 'Asia/Seoul')).toBe('KR');
      expect(detectCountryCode('en-GB', 'Europe/London')).toBe('GB');
      expect(detectCountryCode('en-AU', 'Australia/Sydney')).toBe('AU');
      expect(detectCountryCode('en-CA', 'America/Toronto')).toBe('CA');
      expect(detectCountryCode('en-US', 'America/New_York')).toBe('US');
      // Fallback
      expect(detectCountryCode('unknown', 'unknown')).toBe('US');
    });
  });

  describe('getStaticFallbackHolidays', () => {
    it('returns key public holidays for country and year', () => {
      const vnHolidays = getStaticFallbackHolidays('VN', 2026);
      expect(vnHolidays.length).toBeGreaterThanOrEqual(5);
      expect(vnHolidays.some((h) => h.date === '2026-01-01')).toBe(true);
      expect(vnHolidays.some((h) => h.date === '2026-04-30')).toBe(true);
      expect(vnHolidays.some((h) => h.date === '2026-09-02')).toBe(true);

      const usHolidays = getStaticFallbackHolidays('US', 2026);
      expect(usHolidays.some((h) => h.date === '2026-07-04')).toBe(true);
      expect(usHolidays.some((h) => h.date === '2026-12-25')).toBe(true);
    });
  });

  describe('buildCalendarEvents', () => {
    const rawHolidays: HolidayEvent[] = [
      {
        id: 'h1',
        date: '2026-11-20',
        name: "Teachers' Day",
        localName: 'Ngày Nhà giáo',
        countryCode: 'VN',
        type: 'public_holiday',
      },
    ];

    it('injects buddy birthday event and handles Feb 29 on non-leap year', () => {
      const profile: BuddyProfile = {
        nickname: 'Luna',
        birthdayMonth: 11,
        birthdayDay: 5,
        countryCode: 'VN',
      };

      const events = buildCalendarEvents(rawHolidays, profile, 2026);
      expect(events.length).toBe(2);
      const bday = events.find((e) => e.type === 'birthday');
      expect(bday).toBeDefined();
      expect(bday?.date).toBe('2026-11-05');
      expect(bday?.name).toContain("Luna's Birthday");

      // Non-leap year Feb 29 safely maps to Feb 28
      const leapProfile: BuddyProfile = {
        nickname: 'Kite',
        birthdayMonth: 2,
        birthdayDay: 29,
        countryCode: 'US',
      };
      const events2026 = buildCalendarEvents([], leapProfile, 2026);
      expect(events2026[0].date).toBe('2026-02-28');

      // Leap year 2028 retains Feb 29
      const events2028 = buildCalendarEvents([], leapProfile, 2028);
      expect(events2028[0].date).toBe('2028-02-29');
    });

    it('deduplicates holidays with identical date and name', () => {
      const profile: BuddyProfile = {
        nickname: 'Luna',
        birthdayMonth: null,
        birthdayDay: null,
        countryCode: 'VN',
      };
      const duplicateHolidays: HolidayEvent[] = [
        rawHolidays[0],
        { ...rawHolidays[0], id: 'h1-copy' },
      ];
      const result = buildCalendarEvents(duplicateHolidays, profile, 2026);
      expect(result.length).toBe(1);
    });
  });

  describe('buildMonthCalendarGrid', () => {
    it('returns 42 day cells with accurate flags, holidays and quests', () => {
      const events: HolidayEvent[] = [
        {
          id: 'h-ny',
          date: '2026-11-05',
          name: 'Pudding Festival',
          localName: 'Pudding Fest',
          countryCode: 'VN',
          type: 'public_holiday',
        },
        {
          id: 'b-1',
          date: '2026-11-15',
          name: "Buddy's Birthday",
          localName: "Buddy's Birthday",
          countryCode: 'VN',
          type: 'birthday',
        },
      ];

      const reminders: ReminderItem[] = [
        {
          id: 'q1',
          text: 'Quest 1',
          completed: false,
          createdAtMs: 1000,
          dueDate: '2026-11-05',
        },
        {
          id: 'q2',
          text: 'Quest 2',
          completed: true,
          createdAtMs: 2000,
          dueDate: '2026-11-05',
        },
      ];

      const grid = buildMonthCalendarGrid(2026, 11, '2026-11-02', '2026-11-05', events, reminders);
      expect(grid.length).toBe(42);

      // Check today cell
      const todayCell = grid.find((c) => c.dateStr === '2026-11-02');
      expect(todayCell).toBeDefined();
      expect(todayCell?.isToday).toBe(true);
      expect(todayCell?.isCurrentMonth).toBe(true);

      // Check selected cell with holiday and quests
      const selectedCell = grid.find((c) => c.dateStr === '2026-11-05');
      expect(selectedCell).toBeDefined();
      expect(selectedCell?.isSelected).toBe(true);
      expect(selectedCell?.holidays.length).toBe(1);
      expect(selectedCell?.questsDue.length).toBe(2);

      // Check birthday cell
      const bdayCell = grid.find((c) => c.dateStr === '2026-11-15');
      expect(bdayCell?.hasBirthday).toBe(true);
    });
  });

  describe('getUpcomingCountdownItems', () => {
    it('returns sorted upcoming countdown items for holidays, birthdays, and uncompleted quests', () => {
      const todayStr = '2026-11-02';
      const events: HolidayEvent[] = [
        {
          id: 'h-today',
          date: '2026-11-02',
          name: 'Usagi Day',
          localName: 'Usagi Day',
          countryCode: 'VN',
          type: 'public_holiday',
        },
        {
          id: 'h-tmrw',
          date: '2026-11-03',
          name: 'Caramel Feast',
          localName: 'Caramel Feast',
          countryCode: 'VN',
          type: 'public_holiday',
        },
        {
          id: 'h-future',
          date: '2026-11-10',
          name: 'Star Party',
          localName: 'Star Party',
          countryCode: 'VN',
          type: 'birthday',
        },
      ];

      const reminders: ReminderItem[] = [
        {
          id: 'q-due',
          text: 'Submit code diff',
          completed: false,
          createdAtMs: 1000,
          dueDate: '2026-11-04',
        },
        {
          id: 'q-done',
          text: 'Already done quest',
          completed: true,
          createdAtMs: 2000,
          dueDate: '2026-11-03',
        },
      ];

      const upcoming = getUpcomingCountdownItems(events, reminders, todayStr, 5);
      expect(upcoming.length).toBe(4); // excludes completed quest

      expect(upcoming[0].title).toBe('Usagi Day');
      expect(upcoming[0].daysUntil).toBe(0);
      expect(upcoming[0].badgeText).toBe('Today!');

      expect(upcoming[1].title).toBe('Caramel Feast');
      expect(upcoming[1].daysUntil).toBe(1);
      expect(upcoming[1].badgeText).toBe('Tomorrow');

      expect(upcoming[2].title).toBe('Submit code diff');
      expect(upcoming[2].daysUntil).toBe(2);
      expect(upcoming[2].badgeText).toBe('In 2d');

      expect(upcoming[3].title).toBe('Star Party');
      expect(upcoming[3].daysUntil).toBe(8);
      expect(upcoming[3].badgeText).toBe('In 8d');
    });

    it('strictly limits upcoming items to current month and next month only, excluding farther dates', () => {
      const todayStr = '2026-11-02';
      const events: HolidayEvent[] = [
        {
          id: 'ev-nov',
          date: '2026-11-20',
          name: 'Nov Event',
          localName: 'Nov Event',
          countryCode: 'US',
          type: 'public_holiday',
        },
        {
          id: 'ev-dec-last',
          date: '2026-12-31',
          name: 'Dec 31 Event',
          localName: 'Dec 31 Event',
          countryCode: 'US',
          type: 'public_holiday',
        },
        {
          id: 'ev-jan-newyear',
          date: '2027-01-01',
          name: 'Jan 1 Far Event',
          localName: 'Jan 1 Far Event',
          countryCode: 'US',
          type: 'public_holiday',
        },
        {
          id: 'ev-feb',
          date: '2027-02-14',
          name: 'Valentine Far',
          localName: 'Valentine Far',
          countryCode: 'US',
          type: 'public_holiday',
        },
      ];

      const reminders: ReminderItem[] = [
        {
          id: 'r-nov',
          text: 'Nov quest',
          completed: false,
          createdAtMs: 1000,
          dueDate: '2026-11-15',
        },
        {
          id: 'r-dec',
          text: 'Dec quest',
          completed: false,
          createdAtMs: 1000,
          dueDate: '2026-12-25',
        },
        {
          id: 'r-jan',
          text: 'Jan quest too far',
          completed: false,
          createdAtMs: 1000,
          dueDate: '2027-01-10',
        },
      ];

      const upcoming = getUpcomingCountdownItems(events, reminders, todayStr, 10);
      const dates = upcoming.map((u) => u.date);

      expect(dates).toContain('2026-11-15');
      expect(dates).toContain('2026-11-20');
      expect(dates).toContain('2026-12-25');
      expect(dates).toContain('2026-12-31');
      // Should exclude anything in January 2027 or beyond
      expect(dates).not.toContain('2027-01-01');
      expect(dates).not.toContain('2027-01-10');
      expect(dates).not.toContain('2027-02-14');
    });

    it('handles December to January rollover correctly (current month Dec, next month Jan)', () => {
      const todayStr = '2026-12-15';
      const events: HolidayEvent[] = [
        {
          id: 'ev-dec',
          date: '2026-12-25',
          name: 'Christmas',
          localName: 'Christmas',
          countryCode: 'US',
          type: 'public_holiday',
        },
        {
          id: 'ev-jan-end',
          date: '2027-01-31',
          name: 'Jan End Event',
          localName: 'Jan End Event',
          countryCode: 'US',
          type: 'public_holiday',
        },
        {
          id: 'ev-feb-first',
          date: '2027-02-01',
          name: 'Feb Event Too Far',
          localName: 'Feb Event Too Far',
          countryCode: 'US',
          type: 'public_holiday',
        },
      ];

      const upcoming = getUpcomingCountdownItems(events, [], todayStr, 10);
      const dates = upcoming.map((u) => u.date);

      expect(dates).toContain('2026-12-25');
      expect(dates).toContain('2027-01-31');
      expect(dates).not.toContain('2027-02-01');
    });
  });

  describe('JSON profile persistence', () => {
    it('serializes and deserializes BuddyProfile and cached holidays safely', () => {
      const profile: BuddyProfile = {
        nickname: 'Caramel Bunny',
        birthdayMonth: 7,
        birthdayDay: 14,
        countryCode: 'FR',
      };
      const events: HolidayEvent[] = [
        {
          id: 'h-bastille',
          date: '2026-07-14',
          name: 'Bastille Day',
          localName: 'Fête nationale',
          countryCode: 'FR',
          type: 'public_holiday',
        },
      ];

      const json = serializeCalendarProfileJson(profile, events);
      const restored = parseCalendarProfileJson(json);

      expect(restored.profile.nickname).toBe('Caramel Bunny');
      expect(restored.profile.birthdayMonth).toBe(7);
      expect(restored.profile.birthdayDay).toBe(14);
      expect(restored.profile.countryCode).toBe('FR');
      expect(restored.cachedHolidays.length).toBe(1);
    });

    it('falls back safely for malformed JSON or empty string', () => {
      const fallback = parseCalendarProfileJson('malformed { json');
      expect(fallback.profile.nickname).toBe('Buddy');
      expect(fallback.profile.countryCode).toBeDefined();
      expect(fallback.cachedHolidays).toEqual([]);
    });
  });
});
