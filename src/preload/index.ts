import { contextBridge, ipcRenderer } from 'electron';
import { CostumeId, OutfitSelection } from '../core/costumeManager';
import { SnackTarget, Vector2D } from '../core/physicsEngine';
import { PomodoroState } from '../core/pomodoroTimer';
import { VolumeConfig } from '../core/soundManager';
import {
  ReminderState,
  DateFormatPreference,
  WeekStartDay,
  StickyFontScale,
  ReminderPreferencesUpdate,
  AddReminderResult,
} from '../core/reminderStore';
import { BuddyProfile, HolidayEvent } from '../core/calendarStore';
import { ScheduleState, NewScheduleEntryInput } from '../core/scheduleStore';
import { SupportedLocale } from '../core/i18n';

export interface CalendarStatePayload {
  profile: BuddyProfile;
  events: HolidayEvent[];
}

export interface WellnessUpdatePayload {
  mood: 'active' | 'sleeping';
  message: string | null;
  soundEvent?: 'wellness-reminder' | 'welcome-back';
}

export interface UsagiAPI {
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
  onGhostModeChanged: (callback: (locked: boolean) => void) => () => void;
  onSnackSpawned: (callback: (snack: SnackTarget) => void) => () => void;
  onTriggerInteraction: (callback: () => void) => () => void;
  notifySnackConsumed: () => void;
  onCursorPositionUpdated: (callback: (pos: Vector2D) => void) => () => void;
  onPlayModeChanged: (callback: (enabled: boolean) => void) => () => void;
  togglePlayMode: () => void;
  toggleGhostMode: () => void;
  dropSnackNow: () => void;
  onStationaryModeChanged: (callback: (stationary: boolean) => void) => () => void;
  toggleStationaryMode: () => void;
  onSoundMutedChanged: (callback: (muted: boolean) => void) => () => void;
  toggleSoundMute: () => void;
  onVolumeConfigChanged: (callback: (config: VolumeConfig) => void) => () => void;
  onWellnessUpdate: (callback: (payload: WellnessUpdatePayload) => void) => () => void;
  onGiantAlarmTriggered: (callback: () => void) => () => void;
  notifyGiantAlarmDismissed: () => void;
  onOpenSettingsModal: (callback: () => void) => () => void;
  setPomodoroDuration: (durationMs: number, startImmediately?: boolean) => void;
  updateVolumeConfig: (config: VolumeConfig) => void;
  onPomodoroStateChanged: (callback: (state: PomodoroState) => void) => () => void;
  pausePomodoroTimer: () => void;
  resetPomodoroTimer: () => void;
  triggerGiantAlarmNow: () => void;
  triggerTestSound: () => void;
  onTestSound: (callback: () => void) => () => void;
  setCostume: (costume: OutfitSelection, preserveFixedAppearance?: boolean) => void;
  onCostumeChanged: (
    callback: (costume: CostumeId, selection: OutfitSelection) => void
  ) => () => void;
  getReminderState: () => Promise<ReminderState>;
  onReminderStateChanged: (callback: (state: ReminderState) => void) => () => void;
  addReminder: (text: string, dueDate?: string) => Promise<AddReminderResult>;
  getCalendarState: () => Promise<CalendarStatePayload>;
  updateBuddyProfile: (profile: Partial<BuddyProfile>) => void;
  onCalendarStateChanged: (callback: (payload: CalendarStatePayload) => void) => () => void;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;
  clearCompletedReminders: () => void;
  cycleStickyFontScale: () => void;
  updateReminderPreferences: (prefs: ReminderPreferencesUpdate) => void;
  resizeStickyWindow: (width: number, height: number) => void;
  getScheduleState: () => Promise<ScheduleState>;
  onScheduleStateChanged: (callback: (state: ScheduleState) => void) => () => void;
  addScheduleEntry: (entry: NewScheduleEntryInput) => void;
  deleteScheduleEntry: (id: string) => void;
  toggleStickyWindow: () => void;
  onTaskCelebration: (callback: (taskText: string) => void) => () => void;
  toggleFixedAppearance: () => void;
  onFixedAppearanceChanged: (callback: (fixed: boolean) => void) => () => void;
  toggleUsagiHidden: () => void;
  onUsagiHiddenChanged: (callback: (hidden: boolean) => void) => () => void;
  openDashboardWindow: () => void;
  updateUsagiPosition: (x: number, y: number) => void;
  onUsagiPositionChanged: (callback: (pos: { x: number; y: number }) => void) => () => void;
  updateDashboardTab: (tab: 'companion' | 'config') => void;
  onDashboardTabChanged: (callback: (tab: 'companion' | 'config') => void) => () => void;
  setLocale: (locale: SupportedLocale) => void;
  getLocale: () => Promise<SupportedLocale>;
  onLocaleChanged: (callback: (locale: SupportedLocale) => void) => () => void;
  saveAllSettings: () => Promise<boolean>;
  quitApp: () => void;
  closeTrayPopover: () => void;
}

const api: UsagiAPI = {
  setIgnoreMouseEvents: (ignore: boolean, options = { forward: true }) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options);
  },
  onGhostModeChanged: (callback: (locked: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, locked: boolean) => callback(locked);
    ipcRenderer.on('ghost-mode-toggle', handler);
    return () => ipcRenderer.removeListener('ghost-mode-toggle', handler);
  },
  onSnackSpawned: (callback: (snack: SnackTarget) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, snack: SnackTarget) => callback(snack);
    ipcRenderer.on('spawn-snack', handler);
    return () => ipcRenderer.removeListener('spawn-snack', handler);
  },
  onTriggerInteraction: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('trigger-interaction', handler);
    return () => ipcRenderer.removeListener('trigger-interaction', handler);
  },
  notifySnackConsumed: () => {
    ipcRenderer.send('snack-consumed');
  },
  onCursorPositionUpdated: (callback: (pos: Vector2D) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, pos: Vector2D) => callback(pos);
    ipcRenderer.on('cursor-position-updated', handler);
    return () => ipcRenderer.removeListener('cursor-position-updated', handler);
  },
  onPlayModeChanged: (callback: (enabled: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, enabled: boolean) => callback(enabled);
    ipcRenderer.on('play-mode-toggle', handler);
    return () => ipcRenderer.removeListener('play-mode-toggle', handler);
  },
  togglePlayMode: () => {
    ipcRenderer.send('toggle-play-mode');
  },
  toggleGhostMode: () => {
    ipcRenderer.send('toggle-ghost-mode');
  },
  dropSnackNow: () => {
    ipcRenderer.send('drop-snack-now');
  },
  onStationaryModeChanged: (callback: (stationary: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, stationary: boolean) =>
      callback(stationary);
    ipcRenderer.on('stationary-mode-toggle', handler);
    return () => ipcRenderer.removeListener('stationary-mode-toggle', handler);
  },
  toggleStationaryMode: () => {
    ipcRenderer.send('toggle-stationary-mode');
  },
  onSoundMutedChanged: (callback: (muted: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, muted: boolean) => callback(muted);
    ipcRenderer.on('sound-mute-toggle', handler);
    return () => ipcRenderer.removeListener('sound-mute-toggle', handler);
  },
  toggleSoundMute: () => {
    ipcRenderer.send('toggle-sound-mute');
  },
  onVolumeConfigChanged: (callback: (config: VolumeConfig) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, config: VolumeConfig) => callback(config);
    ipcRenderer.on('volume-config-changed', handler);
    return () => ipcRenderer.removeListener('volume-config-changed', handler);
  },
  onWellnessUpdate: (callback: (payload: WellnessUpdatePayload) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: WellnessUpdatePayload) =>
      callback(payload);
    ipcRenderer.on('wellness-update', handler);
    return () => ipcRenderer.removeListener('wellness-update', handler);
  },
  onGiantAlarmTriggered: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('trigger-giant-alarm', handler);
    return () => ipcRenderer.removeListener('trigger-giant-alarm', handler);
  },
  notifyGiantAlarmDismissed: () => {
    ipcRenderer.send('giant-alarm-dismissed');
  },
  onOpenSettingsModal: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('open-settings-modal', handler);
    return () => ipcRenderer.removeListener('open-settings-modal', handler);
  },
  setPomodoroDuration: (durationMs: number, startImmediately: boolean = true) => {
    ipcRenderer.send('set-pomodoro-duration', durationMs, startImmediately);
  },
  updateVolumeConfig: (config: VolumeConfig) => {
    ipcRenderer.send('update-volume-config', config);
  },
  onPomodoroStateChanged: (callback: (state: PomodoroState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: PomodoroState) => callback(state);
    ipcRenderer.on('pomodoro-state-changed', handler);
    return () => ipcRenderer.removeListener('pomodoro-state-changed', handler);
  },
  pausePomodoroTimer: () => {
    ipcRenderer.send('pause-pomodoro-timer');
  },
  resetPomodoroTimer: () => {
    ipcRenderer.send('reset-pomodoro-timer');
  },
  triggerGiantAlarmNow: () => {
    ipcRenderer.send('trigger-giant-alarm');
  },
  triggerTestSound: () => {
    ipcRenderer.send('test-sound');
  },
  onTestSound: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('test-sound', handler);
    return () => ipcRenderer.removeListener('test-sound', handler);
  },
  setCostume: (costume: OutfitSelection, preserveFixedAppearance?: boolean) => {
    ipcRenderer.send('set-costume', costume, preserveFixedAppearance);
  },
  onCostumeChanged: (callback: (costume: CostumeId, selection: OutfitSelection) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      costume: CostumeId,
      selection: OutfitSelection
    ) => callback(costume, selection);
    ipcRenderer.on('costume-changed', handler);
    return () => ipcRenderer.removeListener('costume-changed', handler);
  },
  getReminderState: () => ipcRenderer.invoke('get-reminder-state'),
  onReminderStateChanged: (callback: (state: ReminderState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: ReminderState) => callback(state);
    ipcRenderer.on('reminder-state-changed', handler);
    return () => ipcRenderer.removeListener('reminder-state-changed', handler);
  },
  addReminder: (text: string, dueDate?: string) => {
    return ipcRenderer.invoke(
      'add-reminder',
      dueDate ? { text, dueDate } : text
    ) as Promise<AddReminderResult>;
  },
  getCalendarState: () => ipcRenderer.invoke('get-calendar-state'),
  updateBuddyProfile: (profile: Partial<BuddyProfile>) => {
    ipcRenderer.send('update-buddy-profile', profile);
  },
  onCalendarStateChanged: (callback: (payload: CalendarStatePayload) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: CalendarStatePayload) =>
      callback(payload);
    ipcRenderer.on('calendar-state-changed', handler);
    return () => ipcRenderer.removeListener('calendar-state-changed', handler);
  },
  toggleReminder: (id: string) => {
    ipcRenderer.send('toggle-reminder', id);
  },
  deleteReminder: (id: string) => {
    ipcRenderer.send('delete-reminder', id);
  },
  clearCompletedReminders: () => {
    ipcRenderer.send('clear-completed-reminders');
  },
  cycleStickyFontScale: () => {
    ipcRenderer.send('cycle-sticky-font-scale');
  },
  updateReminderPreferences: (prefs: ReminderPreferencesUpdate) => {
    ipcRenderer.send('update-reminder-preferences', prefs);
  },
  resizeStickyWindow: (width: number, height: number) => {
    ipcRenderer.send('resize-sticky-window', width, height);
  },
  getScheduleState: () => ipcRenderer.invoke('get-schedule-state'),
  onScheduleStateChanged: (callback: (state: ScheduleState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: ScheduleState) => callback(state);
    ipcRenderer.on('schedule-state-changed', handler);
    return () => ipcRenderer.removeListener('schedule-state-changed', handler);
  },
  addScheduleEntry: (entry: NewScheduleEntryInput) => {
    ipcRenderer.send('add-schedule-entry', entry);
  },
  deleteScheduleEntry: (id: string) => {
    ipcRenderer.send('delete-schedule-entry', id);
  },
  toggleStickyWindow: () => {
    ipcRenderer.send('toggle-sticky-window');
  },
  onTaskCelebration: (callback: (taskText: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, taskText: string) => callback(taskText);
    ipcRenderer.on('task-celebration', handler);
    return () => ipcRenderer.removeListener('task-celebration', handler);
  },
  toggleFixedAppearance: () => {
    ipcRenderer.send('toggle-fixed-appearance');
  },
  onFixedAppearanceChanged: (callback: (fixed: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, fixed: boolean) => callback(fixed);
    ipcRenderer.on('fixed-appearance-toggle', handler);
    return () => ipcRenderer.removeListener('fixed-appearance-toggle', handler);
  },
  toggleUsagiHidden: () => {
    ipcRenderer.send('toggle-usagi-hidden');
  },
  onUsagiHiddenChanged: (callback: (hidden: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, hidden: boolean) => callback(hidden);
    ipcRenderer.on('usagi-hidden-toggle', handler);
    return () => ipcRenderer.removeListener('usagi-hidden-toggle', handler);
  },
  openDashboardWindow: () => {
    ipcRenderer.send('open-dashboard-window');
  },
  updateUsagiPosition: (x: number, y: number) => {
    ipcRenderer.send('update-usagi-position', x, y);
  },
  onUsagiPositionChanged: (callback: (pos: { x: number; y: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, pos: { x: number; y: number }) =>
      callback(pos);
    ipcRenderer.on('usagi-position-changed', handler);
    return () => ipcRenderer.removeListener('usagi-position-changed', handler);
  },
  updateDashboardTab: (tab: 'companion' | 'config') => {
    ipcRenderer.send('update-dashboard-tab', tab);
  },
  onDashboardTabChanged: (callback: (tab: 'companion' | 'config') => void) => {
    const handler = (_event: Electron.IpcRendererEvent, tab: 'companion' | 'config') =>
      callback(tab);
    ipcRenderer.on('dashboard-tab-changed', handler);
    return () => ipcRenderer.removeListener('dashboard-tab-changed', handler);
  },
  setLocale: (locale: SupportedLocale) => {
    ipcRenderer.send('set-locale', locale);
  },
  getLocale: () => ipcRenderer.invoke('get-locale'),
  onLocaleChanged: (callback: (locale: SupportedLocale) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, locale: SupportedLocale) =>
      callback(locale);
    ipcRenderer.on('locale-changed', handler);
    return () => ipcRenderer.removeListener('locale-changed', handler);
  },
  saveAllSettings: () => ipcRenderer.invoke('save-all-settings'),
  quitApp: () => {
    ipcRenderer.send('quit-app');
  },
  closeTrayPopover: () => {
    ipcRenderer.send('close-tray-popover');
  },
};

contextBridge.exposeInMainWorld('usagiAPI', api);

declare global {
  interface Window {
    usagiAPI: UsagiAPI;
  }
}
