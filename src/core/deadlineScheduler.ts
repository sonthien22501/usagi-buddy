/**
 * Smart Multi-Stage Deadline Engine (#11)
 * Pure, zero-dependency scheduler evaluated inside the 5-second wellness coach ticker
 */

import {
  ReminderState,
  ReminderItem,
  DeadlineAlertStage,
  formatLocalDateYMD,
} from './reminderStore';
import { daysBetweenYMD } from './calendarStore';

export interface DeadlineAlertEvent {
  questId: string;
  questText: string;
  stage: DeadlineAlertStage;
  message: string;
  soundEvent: 'wellness-reminder';
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
  const alerts: DeadlineAlertEvent[] = [];

  let stateChanged = false;
  const nextItems: ReminderItem[] = state.items.map((item) => {
    if (item.completed || !item.dueDate) {
      return item;
    }

    const notified = item.notifiedStages ?? [];
    const diffDays = daysBetweenYMD(todayYMD, item.dueDate);

    // 1. Stage 'evening-before': diffDays === 1 && hour >= eveningHour && !notified.includes('evening-before')
    if (diffDays === 1 && hour >= eveningHour && !notified.includes('evening-before')) {
      alerts.push({
        questId: item.id,
        questText: item.text,
        stage: 'evening-before',
        message: `🌙 Huhhhh? Tomorrow's quest: ${item.text}~`,
        soundEvent: 'wellness-reminder',
      });
      stateChanged = true;
      return {
        ...item,
        notifiedStages: [...notified, 'evening-before'],
      };
    }

    // 2. Stage 'due-day': diffDays === 0 && hour >= 9 && !notified.includes('due-day')
    if (diffDays === 0 && hour >= 9 && !notified.includes('due-day')) {
      alerts.push({
        questId: item.id,
        questText: item.text,
        stage: 'due-day',
        message: `⏰ Today's quest is due: ${item.text}! Yaha~`,
        soundEvent: 'wellness-reminder',
      });
      stateChanged = true;
      return {
        ...item,
        notifiedStages: [...notified, 'due-day'],
      };
    }

    // 3. Stage 'overdue': diffDays < 0 && !notified.includes('overdue')
    if (diffDays < 0 && !notified.includes('overdue')) {
      alerts.push({
        questId: item.id,
        questText: item.text,
        stage: 'overdue',
        message: `📝 Overdue quest waiting: ${item.text}~`,
        soundEvent: 'wellness-reminder',
      });
      stateChanged = true;
      return {
        ...item,
        notifiedStages: [...notified, 'overdue'],
      };
    }

    return item;
  });

  return {
    state: stateChanged ? { ...state, items: nextItems } : state,
    alerts,
  };
}
