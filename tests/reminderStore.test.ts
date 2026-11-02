import { describe, expect, it } from 'vitest';
import {
  ReminderItem,
  ReminderState,
  createInitialReminderState,
  addReminderItem,
  toggleReminderItem,
  deleteReminderItem,
  clearCompletedReminders,
  parseRemindersJson,
  serializeRemindersJson,
  extractDueDateToken,
  formatReminderDueBadge,
} from '../src/core/reminderStore';

describe('reminderStore', () => {
  it('creates initial reminder state with 3 default Usagi starter tasks and custard theme', () => {
    const state = createInitialReminderState();
    expect(state.stickyVisible).toBe(true);
    expect(state.theme).toBe('custard');
    expect(state.items.length).toBe(3);
    expect(state.items[0].text).toContain('Drink a glass of water');
    expect(state.items[1].text).toContain('25m Focus Session');
    expect(state.items[2].text).toContain('Stretch shoulders');
    expect(state.items.every((it) => it.completed === false)).toBe(true);
  });

  it('adds valid task and trims whitespace, ignoring empty or whitespace-only inputs', () => {
    const initial = createInitialReminderState();
    const countBefore = initial.items.length;

    // Whitespace / empty inputs should not mutate items
    const s1 = addReminderItem(initial, '   ');
    expect(s1.items.length).toBe(countBefore);

    const s2 = addReminderItem(initial, '');
    expect(s2.items.length).toBe(countBefore);

    // Valid item
    const s3 = addReminderItem(initial, '  Review PR diff with Usagi  ', 1000);
    expect(s3.items.length).toBe(countBefore + 1);
    const added = s3.items[s3.items.length - 1];
    expect(added.text).toBe('Review PR diff with Usagi');
    expect(added.completed).toBe(false);
    expect(added.createdAtMs).toBe(1000);
    expect(added.id).toBeTruthy();
  });

  it('truncates tasks longer than 120 characters and enforces maximum 30 items limit', () => {
    let state = createInitialReminderState();
    const longText = 'A'.repeat(150);
    state = addReminderItem(state, longText);
    const lastItem = state.items[state.items.length - 1];
    expect(lastItem.text.length).toBe(120);

    // Fill up to 30 items
    while (state.items.length < 30) {
      state = addReminderItem(state, `Task ${state.items.length}`);
    }
    expect(state.items.length).toBe(30);

    // Adding beyond 30 should be ignored
    const sOver = addReminderItem(state, 'Task 31');
    expect(sOver.items.length).toBe(30);
  });

  it('toggles reminder item completion and reports newlyCompleted only on false -> true', () => {
    const state = createInitialReminderState();
    const firstId = state.items[0].id;

    // Toggle false -> true
    const { state: s1, newlyCompleted: c1 } = toggleReminderItem(state, firstId);
    expect(s1.items[0].completed).toBe(true);
    expect(c1).not.toBeNull();
    expect(c1?.id).toBe(firstId);
    expect(c1?.completed).toBe(true);

    // Toggle true -> false (unchecking should NOT trigger task celebration)
    const { state: s2, newlyCompleted: c2 } = toggleReminderItem(s1, firstId);
    expect(s2.items[0].completed).toBe(false);
    expect(c2).toBeNull();

    // Toggling non-existent ID
    const { state: s3, newlyCompleted: c3 } = toggleReminderItem(s2, 'non-existent-id');
    expect(s3).toEqual(s2);
    expect(c3).toBeNull();
  });

  it('deletes reminder item by id', () => {
    const state = createInitialReminderState();
    const targetId = state.items[1].id;
    const next = deleteReminderItem(state, targetId);
    expect(next.items.length).toBe(state.items.length - 1);
    expect(next.items.some((it) => it.id === targetId)).toBe(false);
  });

  it('clears all completed reminders', () => {
    let state = createInitialReminderState();
    state = toggleReminderItem(state, state.items[0].id).state;
    state = toggleReminderItem(state, state.items[2].id).state;
    expect(state.items.filter((it) => it.completed).length).toBe(2);

    const cleared = clearCompletedReminders(state);
    expect(cleared.items.length).toBe(1);
    expect(cleared.items.every((it) => !it.completed)).toBe(true);
  });

  it('serializes and deserializes reminders JSON safely and normalizes legacy night theme to custard', () => {
    let state = createInitialReminderState();
    state.stickyVisible = false;
    state = addReminderItem(state, 'Bedtime chamomile tea');

    const json = serializeRemindersJson(state);
    const parsed = parseRemindersJson(json);

    expect(parsed.theme).toBe('custard');
    expect(parsed.stickyVisible).toBe(false);
    expect(parsed.items.length).toBe(4);
    expect(parsed.items[3].text).toBe('Bedtime chamomile tea');

    // Legacy night theme migration check
    const legacyNightJson = JSON.stringify({
      theme: 'night',
      stickyVisible: true,
      items: [{ id: 'leg-1', text: 'Legacy night task', completed: false, createdAtMs: 100 }],
    });
    const migrated = parseRemindersJson(legacyNightJson);
    expect(migrated.theme).toBe('custard');
  });

  it('gracefully recovers from null, empty, malformed or invalid JSON', () => {
    // Null / undefined / empty
    expect(parseRemindersJson(null).items.length).toBe(3);
    expect(parseRemindersJson(undefined).items.length).toBe(3);
    expect(parseRemindersJson('').items.length).toBe(3);
    expect(parseRemindersJson('   ').items.length).toBe(3);

    // Malformed JSON syntax
    expect(parseRemindersJson('{ corrupt json:').items.length).toBe(3);

    // Valid JSON but non-object or missing items
    expect(parseRemindersJson('[]').items.length).toBe(3);
    expect(parseRemindersJson('{"random": 123}').items.length).toBe(3);
    expect(parseRemindersJson('{"items": "not-an-array"}').items.length).toBe(3);

    // Corrupted items in array are filtered out
    const partialValid = JSON.stringify({
      theme: 'night',
      stickyVisible: true,
      items: [
        { id: '1', text: 'Valid task', completed: true, createdAtMs: 123 },
        { id: 2, text: null }, // corrupted
        'string instead of item',
      ],
    });
    const parsedPartial = parseRemindersJson(partialValid);
    expect(parsedPartial.theme).toBe('custard');
    expect(parsedPartial.items.length).toBe(1);
    expect(parsedPartial.items[0].text).toBe('Valid task');
  });

  describe('extractDueDateToken', () => {
    const fixedNow = new Date(2026, 10, 2); // 2026-11-02 (month index 10 is November)

    it('parses @today token and cleans text', () => {
      const res = extractDueDateToken('Submit report @today', undefined, fixedNow);
      expect(res).toEqual({
        cleanText: 'Submit report',
        dueDate: '2026-11-02',
      });
    });

    it('parses @tomorrow and @tmrw tokens and cleans text', () => {
      const res = extractDueDateToken('Buy cake @tomorrow', undefined, fixedNow);
      expect(res).toEqual({
        cleanText: 'Buy cake',
        dueDate: '2026-11-03',
      });
      const resTmrw = extractDueDateToken('Buy coffee @tmrw', undefined, fixedNow);
      expect(resTmrw).toEqual({
        cleanText: 'Buy coffee',
        dueDate: '2026-11-03',
      });
    });

    it('parses @+Nd token and cleans text', () => {
      const res = extractDueDateToken('Trip @+5d', undefined, fixedNow);
      expect(res).toEqual({
        cleanText: 'Trip',
        dueDate: '2026-11-07',
      });
    });

    it('parses explicit @YYYY-MM-DD token and cleans text', () => {
      const res = extractDueDateToken('Exam @2026-12-15', undefined, fixedNow);
      expect(res).toEqual({
        cleanText: 'Exam',
        dueDate: '2026-12-15',
      });
    });

    it('falls back to defaultDateStr when no inline token is provided', () => {
      const res = extractDueDateToken('Read chapter 4', '2026-11-20', fixedNow);
      expect(res).toEqual({
        cleanText: 'Read chapter 4',
        dueDate: '2026-11-20',
      });
    });

    it('leaves dueDate undefined when no token or default is provided', () => {
      const res = extractDueDateToken('Simple reminder', undefined, fixedNow);
      expect(res).toEqual({
        cleanText: 'Simple reminder',
        dueDate: undefined,
      });
    });

    it('extracts natural language deadlines with conversational prefixes and capitalizes clean text', () => {
      expect(extractDueDateToken('I have to do chores tomorrow', undefined, fixedNow)).toEqual({
        cleanText: 'Do chores',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('i need to submit the report today', undefined, fixedNow)).toEqual(
        {
          cleanText: 'Submit the report',
          dueDate: '2026-11-02',
        }
      );
      expect(extractDueDateToken('Remind me to call mom tonight', undefined, fixedNow)).toEqual({
        cleanText: 'Call mom',
        dueDate: '2026-11-02',
      });
      expect(
        extractDueDateToken("Don't forget to pay rent in 5 days", undefined, fixedNow)
      ).toEqual({
        cleanText: 'Pay rent',
        dueDate: '2026-11-07',
      });
      expect(extractDueDateToken('Remember to clean desk next week', undefined, fixedNow)).toEqual({
        cleanText: 'Clean desk',
        dueDate: '2026-11-09',
      });
    });

    it('extracts trailing or inline natural date tokens without conversational prefix', () => {
      expect(extractDueDateToken('Buy groceries tmrw', undefined, fixedNow)).toEqual({
        cleanText: 'Buy groceries',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('Finish homework by tomorrow', undefined, fixedNow)).toEqual({
        cleanText: 'Finish homework',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('Dentist appointment on 2026-11-15', undefined, fixedNow)).toEqual(
        {
          cleanText: 'Dentist appointment',
          dueDate: '2026-11-15',
        }
      );
    });

    it('cleans conversational prefix without a date token and capitalizes action', () => {
      expect(extractDueDateToken('I have to water the plants', undefined, fixedNow)).toEqual({
        cleanText: 'Water the plants',
        dueDate: undefined,
      });
    });
  });

  describe('formatReminderDueBadge', () => {
    it('formats badge with relative label and actual resolved date', () => {
      expect(formatReminderDueBadge('2026-11-02', '2026-11-02')).toBe('Today (11/02)');
      expect(formatReminderDueBadge('2026-11-03', '2026-11-02')).toBe('Tmrw (11/03)');
      expect(formatReminderDueBadge('2026-11-01', '2026-11-02')).toBe('Yesterday (11/01)');
      expect(formatReminderDueBadge('2026-10-28', '2026-11-02')).toBe('Overdue (10/28)');
      expect(formatReminderDueBadge('2026-11-10', '2026-11-02')).toBe('Due 11/10');
    });
  });

  describe('Date-linked reminder items', () => {
    it('stores explicit dueDate or parses inline @tomorrow token in addReminderItem', () => {
      let state = createInitialReminderState();
      state = addReminderItem(state, 'Study math', 1000, 'item-1', '2026-11-05');
      const added = state.items[state.items.length - 1];
      expect(added.id).toBe('item-1');
      expect(added.text).toBe('Study math');
      expect(added.dueDate).toBe('2026-11-05');

      // Test inline parsing within addReminderItem
      const fixedNowMs = new Date(2026, 10, 2).getTime();
      state = addReminderItem(state, 'Buy flowers @tomorrow', fixedNowMs);
      const addedInline = state.items[state.items.length - 1];
      expect(addedInline.text).toBe('Buy flowers');
      expect(addedInline.dueDate).toBe('2026-11-03');
    });

    it('preserves dueDate through JSON serialization and deserialization', () => {
      let state = createInitialReminderState();
      state = addReminderItem(state, 'Doctor appointment', 1000, 'item-doc', '2026-11-12');
      const json = serializeRemindersJson(state);
      const restored = parseRemindersJson(json);
      const restoredItem = restored.items.find((i) => i.id === 'item-doc');
      expect(restoredItem?.dueDate).toBe('2026-11-12');
    });
  });
});
