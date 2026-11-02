import { describe, expect, it } from 'vitest';
import {
  evaluateDeadlineAlerts,
  DeadlineAlertEvent,
  DeadlineEvaluationResult,
} from '../src/core/deadlineScheduler';
import { ReminderState, createInitialReminderState } from '../src/core/reminderStore';

describe('deadlineScheduler — Date-Only Combined Daily Digest', () => {
  function createStateWithTasks(): ReminderState {
    const state = createInitialReminderState();
    state.items = [
      {
        id: 'q-today-1',
        text: 'Pay electric bill',
        completed: false,
        createdAtMs: 1000,
        dueDate: '2026-11-02', // diff = 0 (today)
        notifiedStages: [],
      },
      {
        id: 'q-overdue',
        text: 'Submit report',
        completed: false,
        createdAtMs: 2000,
        dueDate: '2026-10-31', // diff = -2 (overdue)
        notifiedStages: [],
      },
      {
        id: 'q-tomorrow-1',
        text: 'Clean room',
        completed: false,
        createdAtMs: 3000,
        dueDate: '2026-11-03', // diff = 1 (tomorrow)
        notifiedStages: [],
      },
      {
        id: 'q-tomorrow-2',
        text: 'Water plants',
        completed: false,
        createdAtMs: 4000,
        dueDate: '2026-11-03', // diff = 1 (tomorrow)
        notifiedStages: [],
      },
      {
        id: 'q-done',
        text: 'Completed quest',
        completed: true,
        createdAtMs: 5000,
        dueDate: '2026-11-02',
        notifiedStages: [],
      },
      {
        id: 'q-no-date',
        text: 'No date quest',
        completed: false,
        createdAtMs: 6000,
      },
    ];
    return state;
  }

  it('triggers single combined Morning/Today Digest for due-today and overdue quests at or after 08:00', () => {
    const state = createStateWithTasks();
    const morningTime = new Date(2026, 10, 2, 8, 30, 0); // 08:30
    const result = evaluateDeadlineAlerts(state, morningTime);

    expect(result.alerts).toHaveLength(1);
    const alert = result.alerts[0];
    expect(alert.stage).toBe('due-day');
    expect(alert.soundEvent).toBe('wellness-reminder');
    // Multiple tasks format: "☀️ Today you have 2 quests: Pay electric bill, Submit report~"
    expect(alert.message).toContain('Today you have 2 quests: Pay electric bill, Submit report~');

    // Both today-1 and overdue items get 'due-day' in notifiedStages
    const itemToday = result.state.items.find((i) => i.id === 'q-today-1');
    const itemOverdue = result.state.items.find((i) => i.id === 'q-overdue');
    expect(itemToday?.notifiedStages).toContain('due-day');
    expect(itemOverdue?.notifiedStages).toContain('due-day');
  });

  it('formats single quest Morning Digest message when only 1 task is due today', () => {
    const state = createInitialReminderState();
    state.items = [
      {
        id: 'q-single',
        text: 'Prepare presentation',
        completed: false,
        createdAtMs: 1000,
        dueDate: '2026-11-02',
        notifiedStages: [],
      },
    ];
    const morningTime = new Date(2026, 10, 2, 9, 0, 0);
    const result = evaluateDeadlineAlerts(state, morningTime);

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].message).toBe("☀️ Today's quest: Prepare presentation! Ganbatte~");
  });

  it('formats 3+ quests Morning Digest with ellipsis', () => {
    const state = createInitialReminderState();
    state.items = [
      {
        id: '1',
        text: 'Task A',
        completed: false,
        createdAtMs: 1,
        dueDate: '2026-11-02',
        notifiedStages: [],
      },
      {
        id: '2',
        text: 'Task B',
        completed: false,
        createdAtMs: 2,
        dueDate: '2026-11-02',
        notifiedStages: [],
      },
      {
        id: '3',
        text: 'Task C',
        completed: false,
        createdAtMs: 3,
        dueDate: '2026-11-02',
        notifiedStages: [],
      },
    ];
    const morningTime = new Date(2026, 10, 2, 9, 0, 0);
    const result = evaluateDeadlineAlerts(state, morningTime);

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].message).toBe('☀️ Today you have 3 quests: Task A, Task B...~');
  });

  it('does NOT trigger Morning Digest before 08:00 (e.g. 07:30)', () => {
    const state = createStateWithTasks();
    const earlyMorning = new Date(2026, 10, 2, 7, 30, 0);
    const result = evaluateDeadlineAlerts(state, earlyMorning);

    expect(result.alerts).toHaveLength(0);
  });

  it('triggers Cozy Evening Preview for tomorrow quests at or after eveningHour (19:00)', () => {
    const state = createStateWithTasks();
    // Mark today's tasks as already notified so evening preview can run
    state.items[0].notifiedStages = ['due-day'];
    state.items[1].notifiedStages = ['due-day'];

    const eveningTime = new Date(2026, 10, 2, 19, 30, 0);
    const result = evaluateDeadlineAlerts(state, eveningTime);

    expect(result.alerts).toHaveLength(1);
    const alert = result.alerts[0];
    expect(alert.stage).toBe('evening-before');
    expect(alert.message).toBe('🌙 Tomorrow you have 2 quests: Clean room, Water plants~');

    const itemTom1 = result.state.items.find((i) => i.id === 'q-tomorrow-1');
    const itemTom2 = result.state.items.find((i) => i.id === 'q-tomorrow-2');
    expect(itemTom1?.notifiedStages).toContain('evening-before');
    expect(itemTom2?.notifiedStages).toContain('evening-before');
  });

  it('formats single quest Evening Preview when only 1 task is due tomorrow', () => {
    const state = createInitialReminderState();
    state.items = [
      {
        id: 'q-tom',
        text: 'Dentist appointment',
        completed: false,
        createdAtMs: 1000,
        dueDate: '2026-11-03',
        notifiedStages: [],
      },
    ];
    const eveningTime = new Date(2026, 10, 2, 20, 0, 0);
    const result = evaluateDeadlineAlerts(state, eveningTime);

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].message).toBe("🌙 Tomorrow's quest: Dentist appointment~");
  });

  it('does NOT trigger Evening Preview before eveningHour (e.g. 14:00)', () => {
    const state = createStateWithTasks();
    state.items[0].notifiedStages = ['due-day'];
    state.items[1].notifiedStages = ['due-day'];

    const afternoon = new Date(2026, 10, 2, 14, 0, 0);
    const result = evaluateDeadlineAlerts(state, afternoon);

    expect(result.alerts).toHaveLength(0);
  });

  it('enforces anti-spam idempotency: does not re-emit already notified stages', () => {
    const state = createStateWithTasks();
    state.items[0].notifiedStages = ['due-day'];
    state.items[1].notifiedStages = ['due-day'];
    state.items[2].notifiedStages = ['evening-before'];
    state.items[3].notifiedStages = ['evening-before'];

    const eveningTime = new Date(2026, 10, 2, 20, 0, 0);
    const result = evaluateDeadlineAlerts(state, eveningTime);

    expect(result.alerts).toHaveLength(0);
  });

  it('ignores completed tasks and tasks without dueDate', () => {
    const state = createInitialReminderState();
    state.items = [
      {
        id: 'done',
        text: 'Done task',
        completed: true,
        createdAtMs: 1,
        dueDate: '2026-11-02',
        notifiedStages: [],
      },
      { id: 'nodate', text: 'No date', completed: false, createdAtMs: 2 },
    ];
    const morningTime = new Date(2026, 10, 2, 9, 0, 0);
    const result = evaluateDeadlineAlerts(state, morningTime);

    expect(result.alerts).toHaveLength(0);
  });
});
