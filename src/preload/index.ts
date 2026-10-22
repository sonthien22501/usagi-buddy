import { contextBridge, ipcRenderer } from 'electron';
import { SnackTarget } from '../core/physicsEngine';
import { VolumeConfig } from '../core/soundManager';

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
  onSoundMutedChanged: (callback: (muted: boolean) => void) => () => void;
  onVolumeConfigChanged: (callback: (config: VolumeConfig) => void) => () => void;
  onWellnessUpdate: (callback: (payload: WellnessUpdatePayload) => void) => () => void;
  onGiantAlarmTriggered: (callback: () => void) => () => void;
  notifyGiantAlarmDismissed: () => void;
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
  onSoundMutedChanged: (callback: (muted: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, muted: boolean) => callback(muted);
    ipcRenderer.on('sound-mute-toggle', handler);
    return () => ipcRenderer.removeListener('sound-mute-toggle', handler);
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
};

contextBridge.exposeInMainWorld('usagiAPI', api);

declare global {
  interface Window {
    usagiAPI: UsagiAPI;
  }
}
