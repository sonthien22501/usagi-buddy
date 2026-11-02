import { describe, expect, it } from 'vitest';
import {
  evaluateDeadlineAlerts,
  DeadlineAlertEvent,
  DeadlineEvaluationResult,
} from '../src/core/deadlineScheduler';
import { ReminderState, createInitialReminderState } from '../src/core/reminderStore';

describe('deadlineScheduler', () => {
  const baseDate = new Date(2026, 10, 2, 20, 0, 0); // 2026-11-02 20:00:00 (evening)

  function createStateWithTasks(): ReminderState {
    const state = createInitialReminderState();
    state.items = [
      {
        id: 'q-tomorrow',
        text: 'Finish slides',
        completed: false,
        createdAtMs: 1000,
        dueDate: '2026-11-03', // diff = 1 (tomorrow)
        notifiedStages: [],
      },
      {
        id: 'q-today',
        text: 'Pay rent',
        completed: false,
        createdAtMs: 2000,
        dueDate: '2026-11-02', // diff = 0 (today)
        notifiedStages: [],
      },
      {
        id: 'q-overdue',
        text: 'Submit tax return',
        completed: false,
        createdAtMs: 3000,
        dueDate: '2026-10-31', // diff = -2 (overdue)
        notifiedStages: [],
      },
      {
        id: 'q-done',
        text: 'Completed quest',
        completed: true,
        createdAtMs: 4000,
        dueDate: '2026-11-02',
        notifiedStages: [],
      },
      {
        id: 'q-no-date',
        text: 'No date quest',
        completed: false,
        createdAtMs: 5000,
      },
    ];
    return state;
  }

  it('triggers evening-before alert for tomorrow task at or after eveningHour (19:00)', () => {
    const state = createStateWithTasks();
    const eveningTime = new Date(2026, 10, 2, 19, 30, 0); // 19:30
    const result = evaluateDeadlineAlerts(state, eveningTime);

    const eveningAlert = result.alerts.find((a) => a.questId === 'q-tomorrow');
    expect(eveningAlert).toBeDefined();
    expect(eveningAlert?.stage).toBe('evening-before');
    expect(eveningAlert?.message).toContain("Tomorrow's quest: Finish slides");
    expect(eveningAlert?.soundEvent).toBe('wellness-reminder');

    // Verify stage is appended to notifiedStages
    const updatedItem = result.state.items.find((i) => i.id === 'q-tomorrow');
    expect(updatedItem?.notifiedStages).toContain('evening-before');
  });

  it('does NOT trigger evening-before before eveningHour (e.g. 14:00)', () => {
    const state = createStateWithTasks();
    const afternoonTime = new Date(2026, 10, 2, 14, 0, 0);
    const result = evaluateDeadlineAlerts(state, afternoonTime);

    const eveningAlert = result.alerts.find((a) => a.questId === 'q-tomorrow');
    expect(eveningAlert).toBeUndefined();
  });

  it('triggers due-day alert for today task at or after 09:00', () => {
    const state = createStateWithTasks();
    const morningTime = new Date(2026, 10, 2, 9, 15, 0);
    const result = evaluateDeadlineAlerts(state, morningTime);

    const todayAlert = result.alerts.find((a) => a.questId === 'q-today');
    expect(todayAlert).toBeDefined();
    expect(todayAlert?.stage).toBe('due-day');
    expect(todayAlert?.message).toContain("Today's quest is due: Pay rent! Yaha~");

    const updatedItem = result.state.items.find((i) => i.id === 'q-today');
    expect(updatedItem?.notifiedStages).toContain('due-day');
  });

  it('does NOT trigger due-day before 09:00 (e.g. 08:30)', () => {
    const state = createStateWithTasks();
    const earlyMorning = new Date(2026, 10, 2, 8, 30, 0);
    const result = evaluateDeadlineAlerts(state, earlyMorning);

    const todayAlert = result.alerts.find((a) => a.questId === 'q-today');
    expect(todayAlert).toBeUndefined();
  });

  it('triggers overdue alert for past-due tasks regardless of hour', () => {
    const state = createStateWithTasks();
    const morningTime = new Date(2026, 10, 2, 8, 0, 0);
    const result = evaluateDeadlineAlerts(state, morningTime);

    const overdueAlert = result.alerts.find((a) => a.questId === 'q-overdue');
    expect(overdueAlert).toBeDefined();
    expect(overdueAlert?.stage).toBe('overdue');
    expect(overdueAlert?.message).toContain('Overdue quest waiting: Submit tax return~');

    const updatedItem = result.state.items.find((i) => i.id === 'q-overdue');
    expect(updatedItem?.notifiedStages).toContain('overdue');
  });

  it('enforces anti-spam idempotency: does not fire already notified stages', () => {
    const state = createStateWithTasks();
    // Pre-mark stages
    state.items[0].notifiedStages = ['evening-before'];
    state.items[1].notifiedStages = ['due-day'];
    state.items[2].notifiedStages = ['overdue'];

    const eveningTime = new Date(2026, 10, 2, 20, 0, 0);
    const result = evaluateDeadlineAlerts(state, eveningTime);

    expect(result.alerts).toHaveLength(0);
  });

  it('ignores completed tasks and tasks without dueDate', () => {
    const state = createStateWithTasks();
    const eveningTime = new Date(2026, 10, 2, 20, 0, 0);
    const result = evaluateDeadlineAlerts(state, eveningTime);

    expect(result.alerts.some((a) => a.questId === 'q-done')).toBe(false);
    expect(result.alerts.some((a) => a.questId === 'q-no-date')).toBe(false);
  });
});
