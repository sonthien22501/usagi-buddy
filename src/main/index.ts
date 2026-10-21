import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
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

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let ghostLocked = false;
let pomodoroState: PomodoroState = createPomodoroTimer();
let timerInterval: NodeJS.Timeout | null = null;

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

  const contextMenu = Menu.buildFromTemplate([
    {
      label: ghostLocked ? 'Disable Ghost Mode (Interactive)' : 'Enable Ghost Mode (Click-Through)',
      accelerator: 'CommandOrControl+Shift+G',
      click: () => toggleGhostMode(),
    },
    { type: 'separator' },
    {
      label: isRunning ? 'Pause 25m Pomodoro' : 'Start 25m Pomodoro',
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
      label: 'Reset Pomodoro Timer',
      click: () => {
        pomodoroState = resetPomodoro(pomodoroState);
        updateTrayMenu();
      },
    },
    {
      label: 'Drop Snack Now!',
      click: () => {
        dropSnackNow();
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

function dropSnackNow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = getScreenBounds();
  const snack = spawnSnackOnScreen(bounds);
  mainWindow.webContents.send('spawn-snack', snack);
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
    // Fallback 18x18 transparent icon
    trayIcon = nativeImage.createEmpty();
  } else {
    trayIcon = trayIcon.resize({ width: 18, height: 18 });
  }

  tray = new Tray(trayIcon);
  updateTrayMenu();
}

function setupPomodoroTicker(): void {
  timerInterval = setInterval(() => {
    if (pomodoroState.phase === 'running') {
      const bounds = getScreenBounds();
      const { state: nextState, spawnedSnack } = tickPomodoro(pomodoroState, 1000, bounds);
      pomodoroState = nextState;

      if (spawnedSnack && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('spawn-snack', spawnedSnack);
      }
    }
    updateTrayMenu();
  }, 1000);
}

app.whenReady().then(() => {
  createMainWindow();
  createSystemTray();
  setupPomodoroTicker();

  globalShortcut.register('CommandOrControl+Shift+G', () => {
    toggleGhostMode();
  });

  ipcMain.on('set-ignore-mouse-events', (_event, ignore: boolean, options = { forward: true }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(ignore, options);
    }
  });

  ipcMain.on('snack-consumed', () => {
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
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
