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
  resolveOutfitSelectionChange,
  tickWardrobeRotation,
  WardrobeRotationState,
} from '../core/costumeManager';
import {
  ModeFlags,
  parseUserSettingsJson,
  resolveModeTransition,
  serializeUserSettingsJson,
  shouldFollowCursor,
  UserSettings,
} from '../core/settingsStore';
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
import { computeTrayPopoverPosition } from '../core/trayPositioner';

let mainWindow: BrowserWindow | null = null;
let dashboardWindow: BrowserWindow | null = null;
let stickyWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let lastTrayBlurMs = 0;
let ghostLocked = false;
let playModeEnabled = false;
let soundMuted = false;
let stationaryMode = false;
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
let cursorInterval: NodeJS.Timeout | null = null;

function getSettingsFilePath(): string {
  try {
    return path.join(app.getPath('userData'), 'usagi-settings.json');
  } catch {
    return path.resolve(__dirname, '../../usagi-settings.json');
  }
}

function loadSettingsFromDisk(): void {
  try {
    const p = getSettingsFilePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      const settings = parseUserSettingsJson(raw);
      costumeSelection = settings.costumeSelection;
      activeCostume = settings.activeCostume;
      wardrobeRotation = createWardrobeRotationState(settings.fixedAppearance);
      volumeConfig = settings.volumeConfig;
      soundMuted = settings.soundMuted;
      ghostLocked = settings.ghostLocked;
      playModeEnabled = settings.playModeEnabled;
      stationaryMode = settings.stationaryMode;
      usagiHidden = settings.usagiHidden;
      pomodoroState = {
        ...createPomodoroTimer(settings.timerDurationMs),
        remainingMs: settings.timerRemainingMs,
        phase: settings.timerPhase,
      };
    }
  } catch (err) {
    console.warn('Failed to load settings from disk:', err);
  }
}

function saveSettingsToDisk(): void {
  try {
    const p = getSettingsFilePath();
    const settings: UserSettings = {
      costumeSelection,
      activeCostume,
      fixedAppearance: wardrobeRotation.fixedAppearance,
      timerDurationMs: pomodoroState.durationMs,
      timerRemainingMs: pomodoroState.remainingMs,
      timerPhase: pomodoroState.phase,
      volumeConfig,
      soundMuted,
      ghostLocked,
      playModeEnabled,
      stationaryMode,
      usagiHidden,
    };
    fs.writeFileSync(p, serializeUserSettingsJson(settings), 'utf-8');
  } catch (err) {
    console.warn('Failed to save settings to disk:', err);
  }
}

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
  if (trayWindow && !trayWindow.isDestroyed()) {
    trayWindow.webContents.send(channel, ...args);
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

function sendFullStateToWindow(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('volume-config-changed', volumeConfig);
  win.webContents.send('pomodoro-state-changed', pomodoroState);
  win.webContents.send('stationary-mode-toggle', stationaryMode);
  win.webContents.send('sound-mute-toggle', soundMuted);
  win.webContents.send('ghost-mode-toggle', ghostLocked);
  win.webContents.send('play-mode-toggle', playModeEnabled);
  win.webContents.send('costume-changed', activeCostume, costumeSelection);
  win.webContents.send('reminder-state-changed', reminderState);
  win.webContents.send('fixed-appearance-toggle', wardrobeRotation.fixedAppearance);
  win.webContents.send('usagi-hidden-toggle', usagiHidden);
}

function createDashboardWindow(): void {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    sendFullStateToWindow(dashboardWindow);
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
    sendFullStateToWindow(dashboardWindow);
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

function createTrayWindow(): void {
  if (trayWindow && !trayWindow.isDestroyed()) {
    return;
  }

  trayWindow = new BrowserWindow({
    width: 320,
    height: 490,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const htmlPath = path.join(__dirname, '../tray/index.html');
  trayWindow.loadFile(htmlPath);

  trayWindow.on('blur', () => {
    if (trayWindow && !trayWindow.isDestroyed() && trayWindow.isVisible()) {
      lastTrayBlurMs = Date.now();
      trayWindow.hide();
    }
  });

  trayWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      trayWindow?.hide();
    }
  });

  trayWindow.webContents.on('did-finish-load', () => {
    sendFullStateToWindow(trayWindow);
  });
}

function toggleTrayWindow(): void {
  if (!trayWindow || trayWindow.isDestroyed()) {
    createTrayWindow();
  }

  if (trayWindow && trayWindow.isVisible()) {
    trayWindow.hide();
    return;
  }

  if (Date.now() - lastTrayBlurMs < 200) {
    return;
  }

  const trayBounds = tray ? tray.getBounds() : { x: 0, y: 0, width: 0, height: 0 };
  const activeDisplay =
    trayBounds.width > 0 && trayBounds.height > 0
      ? screen.getDisplayMatching(trayBounds)
      : screen.getPrimaryDisplay();
  const workArea = activeDisplay.workArea;
  const pos = computeTrayPopoverPosition(trayBounds, workArea, { width: 320, height: 490 });

  if (trayWindow) {
    trayWindow.setPosition(pos.x, pos.y);
    sendFullStateToWindow(trayWindow);
    trayWindow.show();
    trayWindow.focus();
  }
}

function setCostume(selection: OutfitSelection): void {
  const result = resolveOutfitSelectionChange(selection, activeCostume);
  costumeSelection = result.costumeSelection;
  activeCostume = result.activeCostume;
  wardrobeRotation = {
    ...wardrobeRotation,
    fixedAppearance: result.fixedAppearance,
    elapsedMs: 0,
  };
  broadcastToAllWindows('costume-changed', activeCostume, costumeSelection);
  broadcastToAllWindows('fixed-appearance-toggle', wardrobeRotation.fixedAppearance);
  updateTrayMenu();
  saveSettingsToDisk();
}

function updateTrayMenu(): void {
  if (!tray) return;

  const timeStr = formatPomodoroTime(pomodoroState.remainingMs);
  const titleText = ghostLocked ? `👻 ${timeStr}` : timeStr;
  tray.setTitle(titleText);
  tray.setToolTip(`Usagi Float — ${pomodoroState.phase.toUpperCase()} (${timeStr})`);
}

function applyModes(next: ModeFlags): void {
  const ghostChanged = ghostLocked !== next.ghostLocked;
  const playChanged = playModeEnabled !== next.playModeEnabled;
  const stationaryChanged = stationaryMode !== next.stationaryMode;
  const hiddenChanged = usagiHidden !== next.usagiHidden;

  ghostLocked = next.ghostLocked;
  playModeEnabled = next.playModeEnabled;
  stationaryMode = next.stationaryMode;
  usagiHidden = next.usagiHidden;

  if (ghostChanged) broadcastToAllWindows('ghost-mode-toggle', ghostLocked);
  if (playChanged) broadcastToAllWindows('play-mode-toggle', playModeEnabled);
  if (stationaryChanged) broadcastToAllWindows('stationary-mode-toggle', stationaryMode);
  if (hiddenChanged) broadcastToAllWindows('usagi-hidden-toggle', usagiHidden);

  updateTrayMenu();
  saveSettingsToDisk();
}

function toggleGhostMode(): void {
  const next = resolveModeTransition(
    { ghostLocked, playModeEnabled, stationaryMode, usagiHidden },
    { type: 'toggle-ghost' }
  );
  applyModes(next);
}

function togglePlayMode(): void {
  const next = resolveModeTransition(
    { ghostLocked, playModeEnabled, stationaryMode, usagiHidden },
    { type: 'toggle-play' }
  );
  applyModes(next);
}

function toggleStationaryMode(): void {
  const next = resolveModeTransition(
    { ghostLocked, playModeEnabled, stationaryMode, usagiHidden },
    { type: 'toggle-stationary' }
  );
  applyModes(next);
}

function toggleSoundMute(): void {
  soundMuted = !soundMuted;
  broadcastToAllWindows('sound-mute-toggle', soundMuted);
  updateTrayMenu();
  saveSettingsToDisk();
}

function toggleFixedAppearance(): void {
  wardrobeRotation = {
    ...wardrobeRotation,
    fixedAppearance: !wardrobeRotation.fixedAppearance,
    elapsedMs: 0,
  };
  broadcastToAllWindows('fixed-appearance-toggle', wardrobeRotation.fixedAppearance);
  saveSettingsToDisk();
}

function toggleUsagiHidden(): void {
  const next = resolveModeTransition(
    { ghostLocked, playModeEnabled, stationaryMode, usagiHidden },
    { type: 'toggle-hidden' }
  );
  applyModes(next);
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
  saveSettingsToDisk();
}

function triggerPreviewWellnessReminder(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('wellness-update', {
    mood: 'active',
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
    sendFullStateToWindow(mainWindow);
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

  tray.on('click', () => {
    toggleTrayWindow();
  });
  tray.on('right-click', () => {
    toggleTrayWindow();
  });
}

function setupPomodoroTicker(): void {
  pomodoroInterval = setInterval(() => {
    if (pomodoroState.phase === 'running') {
      const bounds = getScreenBounds();
      const { state: nextState, spawnedSnack } = tickPomodoro(pomodoroState, 1000, bounds);
      pomodoroState = nextState;

      if (spawnedSnack && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('trigger-giant-alarm');
        wellnessState = recordPomodoroCompleted(wellnessState);
        saveSettingsToDisk();
      }
    }
    updateTrayMenu();
    broadcastPomodoroState();
  }, 1000);
}

let lastWellnessTickMs = Date.now();

function setupWellnessCoachTicker(): void {
  lastWellnessTickMs = Date.now();
  wellnessInterval = setInterval(() => {
    const now = Date.now();
    const elapsedMs = Math.max(1000, Math.min(60_000, now - lastWellnessTickMs));
    lastWellnessTickMs = now;

    let idleSeconds = 0;
    try {
      idleSeconds = powerMonitor.getSystemIdleTime();
    } catch {
      idleSeconds = 0;
    }

    const result = tickWellnessCoach(wellnessState, elapsedMs, idleSeconds, {
      afkThresholdSeconds: 600,
    });
    wellnessState = result.state;

    // 30-Minute Wardrobe Auto-Rotate
    const wardrobeResult = tickWardrobeRotation(wardrobeRotation, activeCostume, elapsedMs);
    wardrobeRotation = wardrobeResult.state;
    if (wardrobeResult.nextCostume) {
      activeCostume = wardrobeResult.nextCostume;
      if (costumeSelection !== 'random') {
        costumeSelection = activeCostume;
      }
      broadcastToAllWindows('costume-changed', activeCostume, costumeSelection);
      updateTrayMenu();
      saveSettingsToDisk();
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
      } else if (result.welcomeBack) {
        mainWindow.webContents.send('wellness-update', {
          mood: 'active',
          message: 'Yaha! Welcome back~',
        });
      }
    }

    updateTrayMenu();
  }, 5000);
}

function setupCursorTrackingTicker(): void {
  cursorInterval = setInterval(() => {
    if (
      shouldFollowCursor({
        ghostLocked,
        playModeEnabled,
        stationaryMode,
        usagiHidden,
      }) &&
      mainWindow &&
      !mainWindow.isDestroyed()
    ) {
      const pt = screen.getCursorScreenPoint();
      const bounds = mainWindow.getBounds();
      mainWindow.webContents.send('cursor-position-updated', {
        x: pt.x - bounds.x,
        y: pt.y - bounds.y,
      });
    }
  }, 33);
}

app.whenReady().then(() => {
  loadSettingsFromDisk();
  loadRemindersFromDisk();
  createMainWindow();
  createStickyWindow();
  createTrayWindow();
  createSystemTray();
  setupPomodoroTicker();
  setupWellnessCoachTicker();
  setupCursorTrackingTicker();

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
    saveSettingsToDisk();
  });

  ipcMain.on('pause-pomodoro-timer', () => {
    if (pomodoroState.phase === 'running') {
      pomodoroState = pausePomodoro(pomodoroState);
    } else {
      pomodoroState = startPomodoro(pomodoroState);
    }
    updateTrayMenu();
    broadcastPomodoroState();
    saveSettingsToDisk();
  });

  ipcMain.on('reset-pomodoro-timer', () => {
    pomodoroState = resetPomodoro(pomodoroState);
    updateTrayMenu();
    broadcastPomodoroState();
    saveSettingsToDisk();
  });

  ipcMain.on('update-volume-config', (_e, nextConfig: VolumeConfig) => {
    volumeConfig = { ...nextConfig };
    broadcastVolumeConfig();
    updateTrayMenu();
    saveSettingsToDisk();
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

  ipcMain.on('toggle-fixed-appearance', () => {
    toggleFixedAppearance();
  });

  ipcMain.on('toggle-usagi-hidden', () => {
    toggleUsagiHidden();
  });

  ipcMain.on('open-dashboard-window', () => {
    if (trayWindow && !trayWindow.isDestroyed()) {
      trayWindow.hide();
    }
    createDashboardWindow();
  });

  ipcMain.on('quit-app', () => {
    app.quit();
  });

  ipcMain.on('close-tray-popover', () => {
    if (trayWindow && !trayWindow.isDestroyed()) {
      trayWindow.hide();
    }
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
  saveSettingsToDisk();
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
  if (cursorInterval) {
    clearInterval(cursorInterval);
    cursorInterval = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
