import { contextBridge, ipcRenderer } from 'electron';
import { CostumeId, OutfitSelection } from '../core/costumeManager';
import { SnackTarget } from '../core/physicsEngine';
import { PomodoroState } from '../core/pomodoroTimer';
import { VolumeConfig } from '../core/soundManager';
import { ReminderState } from '../core/reminderStore';

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
  setCostume: (costume: OutfitSelection) => void;
  onCostumeChanged: (
    callback: (costume: CostumeId, selection: OutfitSelection) => void
  ) => () => void;
  getReminderState: () => Promise<ReminderState>;
  onReminderStateChanged: (callback: (state: ReminderState) => void) => () => void;
  addReminder: (text: string) => void;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;
  clearCompletedReminders: () => void;
  toggleStickyWindow: () => void;
  setTheme: (theme: 'custard' | 'night') => void;
  onTaskCelebration: (callback: (taskText: string) => void) => () => void;
  onCursorHugChanged: (callback: (enabled: boolean) => void) => () => void;
  toggleCursorHug: () => void;
  triggerCursorHugNow: () => void;
  onTriggerCursorHugNow: (callback: () => void) => () => void;
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
  setCostume: (costume: OutfitSelection) => {
    ipcRenderer.send('set-costume', costume);
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
  addReminder: (text: string) => {
    ipcRenderer.send('add-reminder', text);
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
  toggleStickyWindow: () => {
    ipcRenderer.send('toggle-sticky-window');
  },
  setTheme: (theme: 'custard' | 'night') => {
    ipcRenderer.send('set-theme', theme);
  },
  onTaskCelebration: (callback: (taskText: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, taskText: string) => callback(taskText);
    ipcRenderer.on('task-celebration', handler);
    return () => ipcRenderer.removeListener('task-celebration', handler);
  },
  onCursorHugChanged: (callback: (enabled: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, enabled: boolean) => callback(enabled);
    ipcRenderer.on('cursor-hug-toggle', handler);
    return () => ipcRenderer.removeListener('cursor-hug-toggle', handler);
  },
  toggleCursorHug: () => {
    ipcRenderer.send('toggle-cursor-hug');
  },
  triggerCursorHugNow: () => {
    ipcRenderer.send('trigger-cursor-hug-now');
  },
  onTriggerCursorHugNow: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('trigger-cursor-hug-now', handler);
    return () => ipcRenderer.removeListener('trigger-cursor-hug-now', handler);
  },
};

contextBridge.exposeInMainWorld('usagiAPI', api);

declare global {
  interface Window {
    usagiAPI: UsagiAPI;
  }
}
