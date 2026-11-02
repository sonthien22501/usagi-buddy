/**
 * Smart Multi-Stage Deadline Engine (#11)
 * Honest Date-Only Combined Daily Digest:
 * - At most 1 combined summary bubble per digest window (Morning Today Digest >= 08:00, Evening Preview >= 19:00)
 * - Evaluated inside the 5-second wellness coach ticker when Usagi is visible (!usagiHidden)
 */

import {
  ReminderState,
  ReminderItem,
  DeadlineAlertStage,
  formatLocalDateYMD,
} from './reminderStore';
import { daysBetweenYMD } from './calendarStore';

export interface DeadlineAlertEvent {
  stage: DeadlineAlertStage;
  message: string;
  soundEvent: 'wellness-reminder';
  questIds: string[];
}

export interface DeadlineEvaluationResult {
  state: ReminderState;
  alerts: DeadlineAlertEvent[];
}

export function evaluateDeadlineAlerts(
  state: ReminderState,
  now: Date = new Date(),
  eveningHour = 19
): DeadlineEvaluationResult {
  const todayYMD = formatLocalDateYMD(now);
  const hour = now.getHours();

  // 1. Morning / First-Open Today Digest ('due-day', hour >= 8):
  // Collects all uncompleted quests with diffDays === 0 or diffDays < 0 without 'due-day'
  if (hour >= 8) {
    const todayItems: ReminderItem[] = [];
    for (const item of state.items) {
      if (!item.completed && item.dueDate) {
        const diff = daysBetweenYMD(todayYMD, item.dueDate);
        const notified = item.notifiedStages ?? [];
        if (diff <= 0 && !notified.includes('due-day')) {
          todayItems.push(item);
        }
      }
    }

    if (todayItems.length > 0) {
      const todayIds = new Set(todayItems.map((i) => i.id));
      const count = todayItems.length;
      let message = '';
      if (count === 1) {
        message = `☀️ Today's quest: ${todayItems[0].text}! Ganbatte~`;
      } else {
        const names = todayItems.slice(0, 2).map((i) => i.text);
        message = `☀️ Today you have ${count} quests: ${names.join(', ')}${count > 2 ? '...' : ''}~`;
      }

      const nextItems = state.items.map((item) => {
        if (todayIds.has(item.id)) {
          return {
            ...item,
            notifiedStages: [...(item.notifiedStages ?? []), 'due-day' as DeadlineAlertStage],
          };
        }
        return item;
      });

      return {
        state: { ...state, items: nextItems },
        alerts: [
          {
            stage: 'due-day',
            message,
            soundEvent: 'wellness-reminder',
            questIds: Array.from(todayIds),
          },
        ],
      };
    }
  }

  // 2. Cozy Evening Preview ('evening-before', hour >= eveningHour, default 19:00):
  // Collects all uncompleted quests with diffDays === 1 without 'evening-before'
  if (hour >= eveningHour) {
    const tomorrowItems: ReminderItem[] = [];
    for (const item of state.items) {
      if (!item.completed && item.dueDate) {
        const diff = daysBetweenYMD(todayYMD, item.dueDate);
        const notified = item.notifiedStages ?? [];
        if (diff === 1 && !notified.includes('evening-before')) {
          tomorrowItems.push(item);
        }
      }
    }

    if (tomorrowItems.length > 0) {
      const tomorrowIds = new Set(tomorrowItems.map((i) => i.id));
      const count = tomorrowItems.length;
      let message = '';
      if (count === 1) {
        message = `🌙 Tomorrow's quest: ${tomorrowItems[0].text}~`;
      } else {
        const names = tomorrowItems.slice(0, 2).map((i) => i.text);
        message = `🌙 Tomorrow you have ${count} quests: ${names.join(', ')}${count > 2 ? '...' : ''}~`;
      }

      const nextItems = state.items.map((item) => {
        if (tomorrowIds.has(item.id)) {
          return {
            ...item,
            notifiedStages: [
              ...(item.notifiedStages ?? []),
              'evening-before' as DeadlineAlertStage,
            ],
          };
        }
        return item;
      });

      return {
        state: { ...state, items: nextItems },
        alerts: [
          {
            stage: 'evening-before',
            message,
            soundEvent: 'wellness-reminder',
            questIds: Array.from(tomorrowIds),
          },
        ],
      };
    }
  }

  return { state, alerts: [] };
}
