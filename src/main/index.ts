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

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let ghostLocked = false;
let playModeEnabled = false;
let soundMuted = false;

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
      label: '🔊 Sound Effects',
      type: 'checkbox',
      checked: !soundMuted,
      click: () => toggleSoundMute(),
    },
    {
      label: ghostLocked ? '👻 Disable Ghost Mode' : '👻 Enable Ghost Mode',
      accelerator: 'CommandOrControl+Shift+G',
      click: () => toggleGhostMode(),
    },
    { type: 'separator' },
    {
      label: isRunning ? '⏸ Pause 25m Pomodoro' : '🍅 Start 25m Pomodoro',
      click: () => {
        if (isRunning) {
          pomodoroState = pausePomodoro(pomodoroState);
        } else {
          pomodoroState = startPomodoro(pomodoroState);
        }
        updateTrayMenu();
      },
    },
    {
      label: '🔄 Reset Pomodoro Timer',
      click: () => {
        pomodoroState = resetPomodoro(pomodoroState);
        updateTrayMenu();
      },
    },
    {
      label: '🍮 Drop Snack Now!',
      click: () => {
        dropSnackNow();
      },
    },
    {
      label: '💧 Water Reminder',
      click: () => {
        triggerPreviewWellnessReminder();
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
        mainWindow.webContents.send('spawn-snack', spawnedSnack);
        wellnessState = recordPomodoroCompleted(wellnessState);
      }
    }
    updateTrayMenu();
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

  ipcMain.on('set-ignore-mouse-events', (_event, ignore: boolean, options = { forward: true }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(ignore, options);
    }
  });

  ipcMain.on('snack-consumed', () => {
    wellnessState = recordSnackFed(wellnessState);
    updateTrayMenu();
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
