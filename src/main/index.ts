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
let tray: Tray | null = null;
let ghostLocked = false;
let playModeEnabled = false;
let soundMuted = false;
let stationaryMode = false;
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

function broadcastVolumeConfig(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('volume-config-changed', volumeConfig);
  }
}

function broadcastPomodoroState(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pomodoro-state-changed', pomodoroState);
  }
}

function openSettingsModal(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('open-settings-modal');
  }
}

function updateTrayMenu(): void {
  if (!tray) return;

  const timeStr = formatPomodoroTime(pomodoroState.remainingMs);
  const statusPrefix = ghostLocked ? '👻 Ghost' : '🐰 Usagi';
  tray.setTitle(`${statusPrefix} ${timeStr}`);
  tray.setToolTip(`Usagi Float — ${pomodoroState.phase.toUpperCase()} (${timeStr})`);

  const isRunning = pomodoroState.phase === 'running';
  const statsLabel = formatStatsTrayLabel(wellnessState.stats);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: statsLabel,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '🪄 Play Mode',
      type: 'checkbox',
      checked: playModeEnabled,
      accelerator: 'CommandOrControl+Shift+P',
      click: () => togglePlayMode(),
    },
    {
      label: stationaryMode ? '📌 Resume Swimming (Moving)' : '📌 Stay Still (Anchor Mode)',
      type: 'checkbox',
      checked: stationaryMode,
      accelerator: 'CommandOrControl+Shift+A',
      click: () => toggleStationaryMode(),
    },
    {
      label: '🔊 Sound & Volume',
      submenu: [
        {
          label: 'Mute All Audio',
          type: 'checkbox',
          checked: soundMuted,
          click: () => toggleSoundMute(),
        },
        {
          label: '⚖️ Equalize Clip Loudness (Normalizer)',
          type: 'checkbox',
          checked: volumeConfig.equalizeLoudness,
          click: () => {
            volumeConfig = { ...volumeConfig, equalizeLoudness: !volumeConfig.equalizeLoudness };
            broadcastVolumeConfig();
            updateTrayMenu();
          },
        },
        { type: 'separator' },
        {
          label: `🐰 Buddy Voice Volume (${Math.round(volumeConfig.buddy * 100)}%)`,
          submenu: [
            { label: '100% (Full)', value: 1.0 },
            { label: '80% (Default)', value: 0.8 },
            { label: '50% (Medium)', value: 0.5 },
            { label: '25% (Quiet)', value: 0.25 },
            { label: '0% (Mute Buddy)', value: 0.0 },
          ].map((item) => ({
            label: item.label,
            type: 'radio',
            checked: Math.abs(volumeConfig.buddy - item.value) < 0.05,
            click: () => {
              volumeConfig = { ...volumeConfig, buddy: item.value };
              broadcastVolumeConfig();
              updateTrayMenu();
            },
          })),
        },
        {
          label: `🚨 Giant Alarm Volume (${Math.round(volumeConfig.alarm * 100)}%)`,
          submenu: [
            { label: '100% (Full)', value: 1.0 },
            { label: '70% (Default - Balanced)', value: 0.7 },
            { label: '50% (Medium)', value: 0.5 },
            { label: '25% (Quiet)', value: 0.25 },
            { label: '0% (Mute Alarm)', value: 0.0 },
          ].map((item) => ({
            label: item.label,
            type: 'radio',
            checked: Math.abs(volumeConfig.alarm - item.value) < 0.05,
            click: () => {
              volumeConfig = { ...volumeConfig, alarm: item.value };
              broadcastVolumeConfig();
              updateTrayMenu();
            },
          })),
        },
      ],
    },
    {
      label: ghostLocked ? '👻 Disable Ghost Mode' : '👻 Enable Ghost Mode',
      accelerator: 'CommandOrControl+Shift+G',
      click: () => toggleGhostMode(),
    },
    { type: 'separator' },
    {
      label: '⚙️ Settings (Volume Slider & Custom Timer)...',
      accelerator: 'CommandOrControl+Shift+S',
      click: () => openSettingsModal(),
    },
    {
      label: isRunning ? '⏸ Pause Pomodoro' : '🍅 Start Pomodoro',
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
      label: '🔄 Reset Pomodoro Timer',
      click: () => {
        pomodoroState = resetPomodoro(pomodoroState);
        updateTrayMenu();
        broadcastPomodoroState();
      },
    },
    {
      label: '🚨 Test Giant Usagi Alarm (Chaos!)',
      click: () => {
        triggerGiantAlarmNow();
      },
    },
    {
      label: '⏱ Timer Presets',
      submenu: [
        {
          label: '⚡ 1-Minute Quick Test',
          click: () => setPomodoroDuration(60_000),
        },
        {
          label: '🍅 25-Minute Standard',
          click: () => setPomodoroDuration(1_500_000),
        },
        {
          label: '🍅 40-Minute Extended',
          click: () => setPomodoroDuration(2_400_000),
        },
        {
          label: '🍅 60-Minute (1 Hour)',
          click: () => setPomodoroDuration(3_600_000),
        },
        {
          label: '☕ 5-Minute Break',
          click: () => setPomodoroDuration(300_000),
        },
      ],
    },
    {
      label: '🍮 Drop Snack Now!',
      click: () => {
        dropSnackNow();
      },
    },
    { type: 'separator' },
    {
      label: '☕ Buy Usagi a Coffee...',
      click: () => {
        shell.openExternal('https://ko-fi.com/rodannguyen');
      },
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ghost-mode-toggle', ghostLocked);
  }
  updateTrayMenu();
}

function togglePlayMode(): void {
  playModeEnabled = !playModeEnabled;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('play-mode-toggle', playModeEnabled);
  }
  updateTrayMenu();
}

function toggleStationaryMode(): void {
  stationaryMode = !stationaryMode;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('stationary-mode-toggle', stationaryMode);
  }
  updateTrayMenu();
}

function toggleSoundMute(): void {
  soundMuted = !soundMuted;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sound-mute-toggle', soundMuted);
  }
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
  let iconPath = path.resolve(__dirname, '../../assets/Usagi1.png');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.resolve(__dirname, '../assets/Usagi1.png');
  }

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

  ipcMain.on('update-volume-config', (_e, nextConfig: VolumeConfig) => {
    volumeConfig = { ...nextConfig };
    broadcastVolumeConfig();
    updateTrayMenu();
  });

  ipcMain.on('toggle-stationary-mode', () => {
    toggleStationaryMode();
  });

  ipcMain.on('snack-consumed', () => {
    wellnessState = recordSnackFed(wellnessState);
    updateTrayMenu();
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
