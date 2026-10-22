import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  powerMonitor,
  screen,
  shell,
  Tray,
} from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createPomodoroTimer,
  formatPomodoroTime,
  pausePomodoro,
  PomodoroState,
  resetPomodoro,
  spawnSnackOnScreen,
  startPomodoro,
  tickPomodoro,
} from '../core/pomodoroTimer';
import { ScreenBounds } from '../core/physicsEngine';
import {
  createWellnessState,
  formatStatsTrayLabel,
  recordPomodoroCompleted,
  recordSnackFed,
  tickWellnessCoach,
  WellnessState,
  WATER_REMINDER_MESSAGE,
} from '../core/wellnessCoach';
import { DEFAULT_VOLUME_CONFIG, VolumeConfig } from '../core/soundManager';

let mainWindow: BrowserWindow | null = null;
let dashboardWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let ghostLocked = false;
let playModeEnabled = false;
let soundMuted = false;
let stationaryMode = false;
let isQuitting = false;
let volumeConfig: VolumeConfig = { ...DEFAULT_VOLUME_CONFIG };

let pomodoroState: PomodoroState = createPomodoroTimer();
let wellnessState: WellnessState = createWellnessState();

let pomodoroInterval: NodeJS.Timeout | null = null;
let wellnessInterval: NodeJS.Timeout | null = null;

function getScreenBounds(): ScreenBounds {
  const primaryDisplay = screen.getPrimaryDisplay();
  return {
    width: primaryDisplay.bounds.width,
    height: primaryDisplay.bounds.height,
  };
}

function broadcastToAllWindows(channel: string, ...args: any[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send(channel, ...args);
  }
}

function broadcastVolumeConfig(): void {
  broadcastToAllWindows('volume-config-changed', volumeConfig);
}

function broadcastPomodoroState(): void {
  broadcastToAllWindows('pomodoro-state-changed', pomodoroState);
}

function openSettingsModal(): void {
  createDashboardWindow();
}

function getAppLogoPath(): string {
  const candidates = [
    path.resolve(__dirname, '../../assets/Usagi_logo.png'),
    path.resolve(__dirname, '../assets/Usagi_logo.png'),
    path.resolve(__dirname, '../../assets/Usagi1.png'),
    path.resolve(__dirname, '../assets/Usagi1.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return '';
}

function createDashboardWindow(): void {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.show();
    dashboardWindow.focus();
    return;
  }

  dashboardWindow = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 440,
    minHeight: 650,
    title: 'Usagi Buddy Dashboard',
    icon: getAppLogoPath(),
    resizable: true,
    backgroundColor: '#140f1d',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const htmlPath = path.join(__dirname, '../dashboard/index.html');
  dashboardWindow.loadFile(htmlPath);

  dashboardWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      dashboardWindow?.hide();
    }
  });

  dashboardWindow.webContents.on('did-finish-load', () => {
    broadcastVolumeConfig();
    broadcastPomodoroState();
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.webContents.send('stationary-mode-toggle', stationaryMode);
      dashboardWindow.webContents.send('sound-mute-toggle', soundMuted);
      dashboardWindow.webContents.send('ghost-mode-toggle', ghostLocked);
      dashboardWindow.webContents.send('play-mode-toggle', playModeEnabled);
    }
  });
}

function updateTrayMenu(): void {
  if (!tray) return;

  const timeStr = formatPomodoroTime(pomodoroState.remainingMs);
  const titleText = ghostLocked ? `👻 ${timeStr}` : timeStr;
  tray.setTitle(titleText);
  tray.setToolTip(`Usagi Float — ${pomodoroState.phase.toUpperCase()} (${timeStr})`);

  const isRunning = pomodoroState.phase === 'running';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `⏱️ Focus Timer: ${timeStr} (${pomodoroState.phase.toUpperCase()})`,
      enabled: false,
    },
    {
      label: isRunning ? '⏸ Pause Timer' : '▶ Start Timer',
      click: () => {
        if (isRunning) {
          pomodoroState = pausePomodoro(pomodoroState);
        } else {
          pomodoroState = startPomodoro(pomodoroState);
        }
        updateTrayMenu();
        broadcastPomodoroState();
      },
    },
    {
      label: '🔄 Reset Timer',
      click: () => {
        pomodoroState = resetPomodoro(pomodoroState);
        updateTrayMenu();
        broadcastPomodoroState();
      },
    },
    { type: 'separator' },
    {
      label: '🎛️ Open Usagi Dashboard...',
      click: () => createDashboardWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit Usagi Float',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function toggleGhostMode(): void {
  ghostLocked = !ghostLocked;
  broadcastToAllWindows('ghost-mode-toggle', ghostLocked);
  updateTrayMenu();
}

function togglePlayMode(): void {
  playModeEnabled = !playModeEnabled;
  broadcastToAllWindows('play-mode-toggle', playModeEnabled);
  updateTrayMenu();
}

function toggleStationaryMode(): void {
  stationaryMode = !stationaryMode;
  broadcastToAllWindows('stationary-mode-toggle', stationaryMode);
  updateTrayMenu();
}

function toggleSoundMute(): void {
  soundMuted = !soundMuted;
  broadcastToAllWindows('sound-mute-toggle', soundMuted);
  updateTrayMenu();
}

function dropSnackNow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = getScreenBounds();
  const snack = spawnSnackOnScreen(bounds);
  mainWindow.webContents.send('spawn-snack', snack);
}

function triggerGiantAlarmNow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('trigger-giant-alarm');
}

function setPomodoroDuration(durationMs: number): void {
  pomodoroState = createPomodoroTimer(durationMs);
  pomodoroState = startPomodoro(pomodoroState);
  updateTrayMenu();
  broadcastPomodoroState();
}

function triggerPreviewWellnessReminder(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('wellness-update', {
    mood: wellnessState.mood,
    message: WATER_REMINDER_MESSAGE,
    soundEvent: 'wellness-reminder',
  });
  updateTrayMenu();
}

function createMainWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  const htmlPath = path.join(__dirname, '../renderer/index.html');
  mainWindow.loadFile(htmlPath);

  mainWindow.webContents.on('did-finish-load', () => {
    broadcastVolumeConfig();
    mainWindow?.webContents.send('stationary-mode-toggle', stationaryMode);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSystemTray(): void {
  const iconPath = getAppLogoPath();
  let trayIcon = nativeImage.createFromPath(iconPath);
  if (trayIcon.isEmpty()) {
    trayIcon = nativeImage.createEmpty();
  } else {
    trayIcon = trayIcon.resize({ width: 18, height: 18 });
  }

  tray = new Tray(trayIcon);
  updateTrayMenu();
}

function setupPomodoroTicker(): void {
  pomodoroInterval = setInterval(() => {
    if (pomodoroState.phase === 'running') {
      const bounds = getScreenBounds();
      const { state: nextState, spawnedSnack } = tickPomodoro(pomodoroState, 1000, bounds);
      pomodoroState = nextState;

      if (spawnedSnack && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('trigger-giant-alarm');
        mainWindow.webContents.send('spawn-snack', spawnedSnack);
        wellnessState = recordPomodoroCompleted(wellnessState);
      }
    }
    updateTrayMenu();
    broadcastPomodoroState();
  }, 1000);
}

function setupWellnessCoachTicker(): void {
  wellnessInterval = setInterval(() => {
    let idleSeconds = 0;
    try {
      idleSeconds = powerMonitor.getSystemIdleTime();
    } catch {
      idleSeconds = 0;
    }

    const result = tickWellnessCoach(wellnessState, 5000, idleSeconds);
    wellnessState = result.state;

    if (mainWindow && !mainWindow.isDestroyed()) {
      if (result.reminderMessage) {
        mainWindow.webContents.send('wellness-update', {
          mood: wellnessState.mood,
          message: result.reminderMessage,
          soundEvent: 'wellness-reminder',
        });
      }
      if (result.enteredSleep) {
        mainWindow.webContents.send('wellness-update', {
          mood: 'sleeping',
          message: 'Zzz...',
        });
      }
      if (result.welcomeBack) {
        mainWindow.webContents.send('wellness-update', {
          mood: 'active',
          message: 'Yaha! Welcome back~',
          soundEvent: 'welcome-back',
        });
        dropSnackNow();
      }
    }

    updateTrayMenu();
  }, 5000);
}

app.whenReady().then(() => {
  createMainWindow();
  createDashboardWindow();
  createSystemTray();
  setupPomodoroTicker();
  setupWellnessCoachTicker();

  globalShortcut.register('CommandOrControl+Shift+G', () => {
    toggleGhostMode();
  });

  globalShortcut.register('CommandOrControl+Shift+P', () => {
    togglePlayMode();
  });

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    openSettingsModal();
  });

  globalShortcut.register('CommandOrControl+Shift+A', () => {
    toggleStationaryMode();
  });

  ipcMain.on('set-ignore-mouse-events', (_event, ignore: boolean, options = { forward: true }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(ignore, options);
    }
  });

  ipcMain.on('set-pomodoro-duration', (_e, durationMs: number, startImmediately = true) => {
    pomodoroState = createPomodoroTimer(durationMs);
    if (startImmediately) {
      pomodoroState = startPomodoro(pomodoroState);
    }
    updateTrayMenu();
    broadcastPomodoroState();
  });

  ipcMain.on('pause-pomodoro-timer', () => {
    if (pomodoroState.phase === 'running') {
      pomodoroState = pausePomodoro(pomodoroState);
    } else {
      pomodoroState = startPomodoro(pomodoroState);
    }
    updateTrayMenu();
    broadcastPomodoroState();
  });

  ipcMain.on('reset-pomodoro-timer', () => {
    pomodoroState = resetPomodoro(pomodoroState);
    updateTrayMenu();
    broadcastPomodoroState();
  });

  ipcMain.on('update-volume-config', (_e, nextConfig: VolumeConfig) => {
    volumeConfig = { ...nextConfig };
    broadcastVolumeConfig();
    updateTrayMenu();
  });

  ipcMain.on('test-sound', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('test-sound');
    }
  });

  ipcMain.on('toggle-sound-mute', () => {
    toggleSoundMute();
  });

  ipcMain.on('toggle-stationary-mode', () => {
    toggleStationaryMode();
  });

  ipcMain.on('toggle-ghost-mode', () => {
    toggleGhostMode();
  });

  ipcMain.on('toggle-play-mode', () => {
    togglePlayMode();
  });

  ipcMain.on('drop-snack-now', () => {
    dropSnackNow();
  });

  ipcMain.on('snack-consumed', () => {
    wellnessState = recordSnackFed(wellnessState);
    updateTrayMenu();
  });

  ipcMain.on('trigger-giant-alarm', () => {
    triggerGiantAlarmNow();
  });

  ipcMain.on('giant-alarm-dismissed', () => {
    dropSnackNow();
  });

  screen.on('display-metrics-changed', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const primaryDisplay = screen.getPrimaryDisplay();
      mainWindow.setBounds(primaryDisplay.bounds);
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('activate', () => {
  createDashboardWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (pomodoroInterval) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
  }
  if (wellnessInterval) {
    clearInterval(wellnessInterval);
    wellnessInterval = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
