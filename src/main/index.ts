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
import {
  CostumeId,
  OutfitSelection,
  pickRandomCostume,
  isKnownOutfitSelection,
  createWardrobeRotationState,
  tickWardrobeRotation,
  WardrobeRotationState,
} from '../core/costumeManager';
import {
  ReminderState,
  createInitialReminderState,
  addReminderItem,
  toggleReminderItem,
  deleteReminderItem,
  clearCompletedReminders,
  parseRemindersJson,
  serializeRemindersJson,
} from '../core/reminderStore';

let mainWindow: BrowserWindow | null = null;
let dashboardWindow: BrowserWindow | null = null;
let stickyWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let ghostLocked = false;
let playModeEnabled = false;
let soundMuted = false;
let stationaryMode = false;
let cursorHugEnabled = true;
let isQuitting = false;
let volumeConfig: VolumeConfig = { ...DEFAULT_VOLUME_CONFIG };
let costumeSelection: OutfitSelection = 'classic';
let activeCostume: CostumeId = 'classic';
let wardrobeRotation: WardrobeRotationState = createWardrobeRotationState(false);
let usagiHidden = false;

let pomodoroState: PomodoroState = createPomodoroTimer();
let wellnessState: WellnessState = createWellnessState();
let reminderState: ReminderState = createInitialReminderState();

let pomodoroInterval: NodeJS.Timeout | null = null;
let wellnessInterval: NodeJS.Timeout | null = null;

function getRemindersFilePath(): string {
  try {
    return path.join(app.getPath('userData'), 'usagi-reminders.json');
  } catch {
    return path.resolve(__dirname, '../../usagi-reminders.json');
  }
}

function loadRemindersFromDisk(): void {
  try {
    const p = getRemindersFilePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      reminderState = parseRemindersJson(raw);
    }
  } catch (err) {
    console.warn('Failed to load reminders from disk:', err);
    reminderState = createInitialReminderState();
  }
}

function saveRemindersToDisk(): void {
  try {
    const p = getRemindersFilePath();
    fs.writeFileSync(p, serializeRemindersJson(reminderState), 'utf-8');
  } catch (err) {
    console.warn('Failed to save reminders to disk:', err);
  }
}

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
  if (stickyWindow && !stickyWindow.isDestroyed()) {
    stickyWindow.webContents.send(channel, ...args);
  }
}

function broadcastReminderState(): void {
  broadcastToAllWindows('reminder-state-changed', reminderState);
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
      dashboardWindow.webContents.send('costume-changed', activeCostume, costumeSelection);
      dashboardWindow.webContents.send('reminder-state-changed', reminderState);
      dashboardWindow.webContents.send('cursor-hug-toggle', cursorHugEnabled);
      dashboardWindow.webContents.send('fixed-appearance-toggle', wardrobeRotation.fixedAppearance);
      dashboardWindow.webContents.send('usagi-hidden-toggle', usagiHidden);
    }
  });
}

function createStickyWindow(): void {
  if (stickyWindow && !stickyWindow.isDestroyed()) {
    if (reminderState.stickyVisible) {
      stickyWindow.show();
    } else {
      stickyWindow.hide();
    }
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  const width = 300;
  const height = 360;
  const x = Math.max(0, workArea.x + workArea.width - width - 24);
  const y = Math.max(0, workArea.y + 48);

  stickyWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: false,
    skipTaskbar: true,
    fullscreenable: false,
    hasShadow: false,
    acceptFirstMouse: true,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const htmlPath = path.join(__dirname, '../sticky/index.html');
  stickyWindow.loadFile(htmlPath);

  stickyWindow.webContents.on('did-finish-load', () => {
    if (stickyWindow && !stickyWindow.isDestroyed()) {
      stickyWindow.webContents.send('reminder-state-changed', reminderState);
    }
  });

  stickyWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      reminderState.stickyVisible = false;
      saveRemindersToDisk();
      broadcastReminderState();
      updateTrayMenu();
      stickyWindow?.hide();
    }
  });

  if (!reminderState.stickyVisible) {
    stickyWindow.hide();
  }
}

function toggleStickyWindow(): void {
  reminderState.stickyVisible = !reminderState.stickyVisible;
  saveRemindersToDisk();
  broadcastReminderState();
  updateTrayMenu();
  if (stickyWindow && !stickyWindow.isDestroyed()) {
    if (reminderState.stickyVisible) {
      stickyWindow.show();
    } else {
      stickyWindow.hide();
    }
  } else if (reminderState.stickyVisible) {
    createStickyWindow();
  }
}

function setCostume(selection: OutfitSelection): void {
  costumeSelection = selection;
  if (selection === 'random') {
    activeCostume = pickRandomCostume(activeCostume);
  } else {
    activeCostume = selection;
  }
  broadcastToAllWindows('costume-changed', activeCostume, costumeSelection);
  updateTrayMenu();
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
      label: isRunning ? '⏸️ Pause Timer' : '▶️ Start Timer',
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
    {
      label: '⏱️ Set Timer Duration',
      submenu: [
        {
          label: '🍅 25-Min Pomodoro (5m Break)',
          click: () => setPomodoroDuration(25 * 60_000),
        },
        {
          label: '⚡ 52-Min Focus (17m Break)',
          click: () => setPomodoroDuration(52 * 60_000),
        },
        {
          label: '🌊 90-Min Ultradian (20m Break)',
          click: () => setPomodoroDuration(90 * 60_000),
        },
        { type: 'separator' },
        {
          label: '☕ 5-Minute Short Break',
          click: () => setPomodoroDuration(5 * 60_000),
        },
        {
          label: '☕ 17-Minute 52/17 Rest Break',
          click: () => setPomodoroDuration(17 * 60_000),
        },
        {
          label: '☕ 20-Minute Deep Rest Break',
          click: () => setPomodoroDuration(20 * 60_000),
        },
        {
          label: '⚡ 1-Minute Quick Test',
          click: () => setPomodoroDuration(60_000),
        },
        { type: 'separator' },
        {
          label: '✏️ Custom Duration... (Open Dashboard)',
          click: () => createDashboardWindow(),
        },
      ],
    },
    { type: 'separator' },
    {
      label: '🎛️ Open Usagi Dashboard...',
      click: () => createDashboardWindow(),
    },
    {
      label: reminderState.stickyVisible ? '📝 Hide Sticky Quests' : '📝 Show Sticky Quests',
      click: () => toggleStickyWindow(),
    },
    {
      label: usagiHidden ? '🐰 Show Usagi Buddy' : '🙈 Hide Usagi Buddy',
      click: () => toggleUsagiHidden(),
    },
    { type: 'separator' },
    {
      label: '🚪 Quit Usagi Float',
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

function toggleFixedAppearance(): void {
  wardrobeRotation = {
    ...wardrobeRotation,
    fixedAppearance: !wardrobeRotation.fixedAppearance,
    elapsedMs: 0,
  };
  broadcastToAllWindows('fixed-appearance-toggle', wardrobeRotation.fixedAppearance);
}

function toggleUsagiHidden(): void {
  usagiHidden = !usagiHidden;
  broadcastToAllWindows('usagi-hidden-toggle', usagiHidden);
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
    mainWindow?.webContents.send('cursor-hug-toggle', cursorHugEnabled);
    mainWindow?.webContents.send('fixed-appearance-toggle', wardrobeRotation.fixedAppearance);
    mainWindow?.webContents.send('usagi-hidden-toggle', usagiHidden);
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

    // 30-Minute Wardrobe Auto-Rotate
    const wardrobeResult = tickWardrobeRotation(wardrobeRotation, activeCostume, 5000);
    wardrobeRotation = wardrobeResult.state;
    if (wardrobeResult.nextCostume) {
      activeCostume = wardrobeResult.nextCostume;
      broadcastToAllWindows('costume-changed', activeCostume, costumeSelection);
      updateTrayMenu();
    }

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
  loadRemindersFromDisk();
  createMainWindow();
  createStickyWindow();
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

  ipcMain.on('set-costume', (_e, selection: OutfitSelection) => {
    if (isKnownOutfitSelection(selection)) {
      setCostume(selection);
    }
  });

  ipcMain.handle('get-reminder-state', () => reminderState);

  ipcMain.on('add-reminder', (_e, text: string) => {
    reminderState = addReminderItem(reminderState, text);
    saveRemindersToDisk();
    broadcastReminderState();
  });

  ipcMain.on('toggle-reminder', (_e, id: string) => {
    const result = toggleReminderItem(reminderState, id);
    reminderState = result.state;
    saveRemindersToDisk();
    broadcastReminderState();
    if (result.newlyCompleted) {
      broadcastToAllWindows('task-celebration', result.newlyCompleted.text);
    }
  });

  ipcMain.on('delete-reminder', (_e, id: string) => {
    reminderState = deleteReminderItem(reminderState, id);
    saveRemindersToDisk();
    broadcastReminderState();
  });

  ipcMain.on('clear-completed-reminders', () => {
    reminderState = clearCompletedReminders(reminderState);
    saveRemindersToDisk();
    broadcastReminderState();
  });

  ipcMain.on('toggle-sticky-window', () => {
    toggleStickyWindow();
  });

  ipcMain.on('set-theme', (_e, theme: 'custard' | 'night') => {
    reminderState = { ...reminderState, theme };
    saveRemindersToDisk();
    broadcastReminderState();
  });

  ipcMain.on('toggle-cursor-hug', () => {
    cursorHugEnabled = !cursorHugEnabled;
    broadcastToAllWindows('cursor-hug-toggle', cursorHugEnabled);
  });

  ipcMain.on('trigger-cursor-hug-now', () => {
    broadcastToAllWindows('trigger-cursor-hug-now');
  });

  ipcMain.on('toggle-fixed-appearance', () => {
    toggleFixedAppearance();
  });

  ipcMain.on('toggle-usagi-hidden', () => {
    toggleUsagiHidden();
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
