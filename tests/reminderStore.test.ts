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

  it('serializes and deserializes reminders JSON safely', () => {
    let state = createInitialReminderState();
    state.theme = 'night';
    state.stickyVisible = false;
    state = addReminderItem(state, 'Bedtime chamomile tea');

    const json = serializeRemindersJson(state);
    const parsed = parseRemindersJson(json);

    expect(parsed.theme).toBe('night');
    expect(parsed.stickyVisible).toBe(false);
    expect(parsed.items.length).toBe(4);
    expect(parsed.items[3].text).toBe('Bedtime chamomile tea');
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
    expect(parsedPartial.theme).toBe('night');
    expect(parsedPartial.items.length).toBe(1);
    expect(parsedPartial.items[0].text).toBe('Valid task');
  });
});
