import { describe, expect, it } from 'vitest';
import {
  createInitialScheduleState,
  addScheduleEntry,
  deleteScheduleEntry,
  getEntriesForDay,
  getCurrentAndNextSchedule,
  parseScheduleJson,
  serializeScheduleJson,
  ScheduleState,
  ScheduleEntry,
} from '../src/core/scheduleStore';

describe('scheduleStore', () => {
  describe('createInitialScheduleState', () => {
    it('creates a valid initial schedule state with empty entries array', () => {
      const state = createInitialScheduleState();
      expect(state).toBeDefined();
      expect(Array.isArray(state.entries)).toBe(true);
      expect(state.entries.length).toBe(0);
    });
  });

  describe('addScheduleEntry', () => {
    it('adds a valid schedule entry, generates an ID, trims fields, and returns immutable new state', () => {
      const state = createInitialScheduleState();
      const nextState = addScheduleEntry(state, {
        title: '  Algorithms & Data Structures  ',
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '10:30',
        location: '  Hall B3  ',
      });

      expect(state.entries.length).toBe(0); // immutable
      expect(nextState.entries.length).toBe(1);

      const entry = nextState.entries[0];
      expect(entry.id).toBeDefined();
      expect(entry.title).toBe('Algorithms & Data Structures');
      expect(entry.dayOfWeek).toBe(1);
      expect(entry.startTime).toBe('09:00');
      expect(entry.endTime).toBe('10:30');
      expect(entry.location).toBe('Hall B3');
    });

    it('sorts entries on the same day chronologically by startTime', () => {
      let state = createInitialScheduleState();
      state = addScheduleEntry(state, {
        title: 'Afternoon Lab',
        dayOfWeek: 2,
        startTime: '14:00',
        endTime: '16:00',
      });
      state = addScheduleEntry(state, {
        title: 'Morning Lecture',
        dayOfWeek: 2,
        startTime: '08:30',
        endTime: '10:00',
      });
      state = addScheduleEntry(state, {
        title: 'Midday Seminar',
        dayOfWeek: 2,
        startTime: '11:00',
        endTime: '12:30',
      });

      const dayEntries = getEntriesForDay(state, 2);
      expect(dayEntries.length).toBe(3);
      expect(dayEntries[0].title).toBe('Morning Lecture');
      expect(dayEntries[1].title).toBe('Midday Seminar');
      expect(dayEntries[2].title).toBe('Afternoon Lab');
    });

    it('validates dayOfWeek (must be integer 0..6)', () => {
      const state = createInitialScheduleState();
      expect(() =>
        addScheduleEntry(state, {
          title: 'Invalid Day',
          dayOfWeek: 7,
          startTime: '09:00',
          endTime: '10:00',
        })
      ).toThrow();

      expect(() =>
        addScheduleEntry(state, {
          title: 'Negative Day',
          dayOfWeek: -1,
          startTime: '09:00',
          endTime: '10:00',
        })
      ).toThrow();

      expect(() =>
        addScheduleEntry(state, {
          title: 'Float Day',
          dayOfWeek: 1.5,
          startTime: '09:00',
          endTime: '10:00',
        })
      ).toThrow();
    });

    it('validates time format HH:MM (00:00 - 23:59) and startTime < endTime', () => {
      const state = createInitialScheduleState();

      expect(() =>
        addScheduleEntry(state, {
          title: 'Bad Time',
          dayOfWeek: 1,
          startTime: '25:00',
          endTime: '26:00',
        })
      ).toThrow();

      expect(() =>
        addScheduleEntry(state, {
          title: 'Bad Minutes',
          dayOfWeek: 1,
          startTime: '09:65',
          endTime: '10:00',
        })
      ).toThrow();

      expect(() =>
        addScheduleEntry(state, {
          title: 'End before start',
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '09:00',
        })
      ).toThrow();

      expect(() =>
        addScheduleEntry(state, {
          title: 'Equal times',
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '10:00',
        })
      ).toThrow();
    });

    it('validates non-empty title', () => {
      const state = createInitialScheduleState();
      expect(() =>
        addScheduleEntry(state, {
          title: '   ',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '10:00',
        })
      ).toThrow();
    });
  });

  describe('deleteScheduleEntry', () => {
    it('removes matching entry by id and leaves others intact', () => {
      let state = createInitialScheduleState();
      state = addScheduleEntry(state, {
        title: 'Class 1',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
      });
      state = addScheduleEntry(state, {
        title: 'Class 2',
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '11:00',
      });

      const idToDelete = state.entries[0].id;
      const nextState = deleteScheduleEntry(state, idToDelete);

      expect(nextState.entries.length).toBe(1);
      expect(nextState.entries[0].title).toBe('Class 2');
    });

    it('returns same state if id not found', () => {
      let state = createInitialScheduleState();
      state = addScheduleEntry(state, {
        title: 'Class 1',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
      });
      const nextState = deleteScheduleEntry(state, 'non-existent-id');
      expect(nextState.entries.length).toBe(1);
    });
  });

  describe('getEntriesForDay', () => {
    it('returns only entries for the specified day sorted chronologically', () => {
      let state = createInitialScheduleState();
      state = addScheduleEntry(state, {
        title: 'Mon Class 2',
        dayOfWeek: 1,
        startTime: '14:00',
        endTime: '15:00',
      });
      state = addScheduleEntry(state, {
        title: 'Tue Class',
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '10:00',
      });
      state = addScheduleEntry(state, {
        title: 'Mon Class 1',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
      });

      const monEntries = getEntriesForDay(state, 1);
      expect(monEntries.map((e) => e.title)).toEqual(['Mon Class 1', 'Mon Class 2']);

      const wedEntries = getEntriesForDay(state, 3);
      expect(wedEntries).toEqual([]);
    });
  });

  describe('getCurrentAndNextSchedule', () => {
    const mondayEntries: ScheduleEntry[] = [
      {
        id: '1',
        title: 'Morning Math',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:30',
        location: 'Room 101',
      },
      {
        id: '2',
        title: 'Physics Lab',
        dayOfWeek: 1,
        startTime: '11:00',
        endTime: '12:30',
        location: 'Lab A',
      },
      {
        id: '3',
        title: 'History',
        dayOfWeek: 1,
        startTime: '14:00',
        endTime: '15:30',
      },
    ];

    it('returns next when before first class', () => {
      const res = getCurrentAndNextSchedule(mondayEntries, 1, '08:30');
      expect(res.current).toBeNull();
      expect(res.next?.title).toBe('Morning Math');
    });

    it('returns current when inside class time', () => {
      const res = getCurrentAndNextSchedule(mondayEntries, 1, '09:15');
      expect(res.current?.title).toBe('Morning Math');
      expect(res.next?.title).toBe('Physics Lab');
    });

    it('returns current at exact startTime', () => {
      const res = getCurrentAndNextSchedule(mondayEntries, 1, '09:00');
      expect(res.current?.title).toBe('Morning Math');
      expect(res.next?.title).toBe('Physics Lab');
    });

    it('handles break between classes', () => {
      const res = getCurrentAndNextSchedule(mondayEntries, 1, '10:45');
      expect(res.current).toBeNull();
      expect(res.next?.title).toBe('Physics Lab');
    });

    it('returns null for next when in or after last class', () => {
      const resDuring = getCurrentAndNextSchedule(mondayEntries, 1, '14:30');
      expect(resDuring.current?.title).toBe('History');
      expect(resDuring.next).toBeNull();

      const resAfter = getCurrentAndNextSchedule(mondayEntries, 1, '16:00');
      expect(resAfter.current).toBeNull();
      expect(resAfter.next).toBeNull();
    });

    it('returns nulls for days with no classes', () => {
      const res = getCurrentAndNextSchedule(mondayEntries, 0, '10:00');
      expect(res.current).toBeNull();
      expect(res.next).toBeNull();
    });
  });

  describe('JSON serialization & parsing', () => {
    it('round-trips ScheduleState safely', () => {
      let state = createInitialScheduleState();
      state = addScheduleEntry(state, {
        title: 'CompSci 101',
        dayOfWeek: 3,
        startTime: '10:00',
        endTime: '11:30',
        location: 'Auditorium',
      });

      const json = serializeScheduleJson(state);
      const parsed = parseScheduleJson(json);

      expect(parsed.entries.length).toBe(1);
      expect(parsed.entries[0].title).toBe('CompSci 101');
      expect(parsed.entries[0].dayOfWeek).toBe(3);
      expect(parsed.entries[0].startTime).toBe('10:00');
      expect(parsed.entries[0].endTime).toBe('11:30');
      expect(parsed.entries[0].location).toBe('Auditorium');
    });

    it('safely parses empty, null, or malformed JSON', () => {
      expect(parseScheduleJson(null)).toEqual({ entries: [] });
      expect(parseScheduleJson('')).toEqual({ entries: [] });
      expect(parseScheduleJson('{ not: json')).toEqual({ entries: [] });
      expect(parseScheduleJson('{"entries": "not-an-array"}')).toEqual({ entries: [] });
      expect(
        parseScheduleJson(
          JSON.stringify({
            entries: [
              { id: '1', title: 'Valid', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
              { id: '2', title: '', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }, // invalid empty title
              { id: '3', title: 'Bad Day', dayOfWeek: 9, startTime: '09:00', endTime: '10:00' }, // invalid day
            ],
          })
        ).entries.length
      ).toBe(1);
    });
  });
});
