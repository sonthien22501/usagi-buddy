import { contextBridge, ipcRenderer } from 'electron';
import { SnackTarget } from '../core/physicsEngine';

export interface UsagiAPI {
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
  onGhostModeChanged: (callback: (locked: boolean) => void) => () => void;
  onSnackSpawned: (callback: (snack: SnackTarget) => void) => () => void;
  onTriggerInteraction: (callback: () => void) => () => void;
  notifySnackConsumed: () => void;
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
};

contextBridge.exposeInMainWorld('usagiAPI', api);

declare global {
  interface Window {
    usagiAPI: UsagiAPI;
  }
}
