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
  DashboardTabId,
} from '../core/settingsStore';
import {
  ReminderState,
  createInitialReminderState,
  addReminderItem,
  toggleReminderItem,
  deleteReminderItem,
  clearCompletedReminders,
  cycleReminderFontScale,
  updateReminderPreferences,
  ReminderPreferencesUpdate,
  parseRemindersJson,
  serializeRemindersJson,
  clampStickyDimensions,
} from '../core/reminderStore';
import {
  BuddyProfile,
  HolidayEvent,
  buildCalendarEvents,
  createDefaultBuddyProfile,
  getStaticFallbackHolidays,
  normalizeNagerHolidays,
  parseCalendarProfileJson,
  serializeCalendarProfileJson,
} from '../core/calendarStore';
import {
  ScheduleState,
  createInitialScheduleState,
  addScheduleEntry,
  deleteScheduleEntry,
  parseScheduleJson,
  serializeScheduleJson,
  NewScheduleEntryInput,
} from '../core/scheduleStore';
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
let usagiX: number | null = null;
let usagiY: number | null = null;
let activeDashboardTab: DashboardTabId = 'companion';

let pomodoroState: PomodoroState = createPomodoroTimer();
let wellnessState: WellnessState = createWellnessState();
let reminderState: ReminderState = createInitialReminderState();
let calendarProfile: BuddyProfile = createDefaultBuddyProfile();
let calendarHolidays: HolidayEvent[] = [];
let scheduleState: ScheduleState = createInitialScheduleState();

let pomodoroInterval: NodeJS.Timeout | null = null;
let wellnessInterval: NodeJS.Timeout | null = null;
let cursorInterval: NodeJS.Timeout | null = null;

try {
  app.setName('usagi-buddy');
} catch {
  // Ignore in test environments if app is not available
}

function migrateLegacyUserData(): void {
  try {
    const currentDir = app.getPath('userData');
    const appData = app.getPath('appData');
    const legacyDir = path.join(appData, 'Electron');
    if (legacyDir !== currentDir && fs.existsSync(legacyDir)) {
      const filesToMigrate = [
        'usagi-settings.json',
        'usagi-reminders.json',
        'usagi-calendar.json',
        'usagi-schedule.json',
      ];
      if (!fs.existsSync(currentDir)) {
        fs.mkdirSync(currentDir, { recursive: true });
      }
      for (const file of filesToMigrate) {
        const src = path.join(legacyDir, file);
        const dest = path.join(currentDir, file);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to migrate legacy userData:', err);
  }
}

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
      usagiX = settings.usagiX ?? null;
      usagiY = settings.usagiY ?? null;
      activeDashboardTab = settings.activeDashboardTab ?? 'companion';
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
      usagiX,
      usagiY,
      activeDashboardTab,
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

function getCalendarFilePath(): string {
  try {
    return path.join(app.getPath('userData'), 'usagi-calendar.json');
  } catch {
    return path.resolve(__dirname, '../../usagi-calendar.json');
  }
}

function loadCalendarFromDisk(): void {
  try {
    const p = getCalendarFilePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      const state = parseCalendarProfileJson(raw);
      calendarProfile = state.profile;
      calendarHolidays = state.cachedHolidays;
    }
  } catch (err) {
    console.warn('Failed to load calendar from disk:', err);
    calendarProfile = createDefaultBuddyProfile();
    calendarHolidays = [];
  }

  // If no cached holidays yet, load fallbacks immediately
  if (calendarHolidays.length === 0) {
    const year = new Date().getFullYear();
    calendarHolidays = [
      ...getStaticFallbackHolidays(calendarProfile.countryCode, year),
      ...getStaticFallbackHolidays(calendarProfile.countryCode, year + 1),
    ];
  }
}

function saveCalendarToDisk(): void {
  try {
    const p = getCalendarFilePath();
    fs.writeFileSync(p, serializeCalendarProfileJson(calendarProfile, calendarHolidays), 'utf-8');
  } catch (err) {
    console.warn('Failed to save calendar to disk:', err);
  }
}

async function refreshHolidaysFromNager(countryCode: string, year: number): Promise<void> {
  const years = [year, year + 1];
  let fetchedEvents: HolidayEvent[] = [];

  for (const y of years) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/${countryCode}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          const norm = normalizeNagerHolidays(json, countryCode);
          fetchedEvents = [...fetchedEvents, ...norm];
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      // Offline fallback
    }
  }

  const fallbackThisYear = getStaticFallbackHolidays(countryCode, year);
  const fallbackNextYear = getStaticFallbackHolidays(countryCode, year + 1);
  const combined = [...fetchedEvents, ...fallbackThisYear, ...fallbackNextYear];

  const seen = new Set<string>();
  const unique: HolidayEvent[] = [];
  for (const ev of combined) {
    const key = `${ev.date}__${ev.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(ev);
    }
  }

  if (countryCode !== calendarProfile.countryCode) return;

  calendarHolidays = unique;
  saveCalendarToDisk();
  broadcastCalendarState();
}

function getActiveCalendarEvents(): HolidayEvent[] {
  const currentYear = new Date().getFullYear();
  const events = buildCalendarEvents(calendarHolidays, calendarProfile, currentYear);
  return buildCalendarEvents(events, calendarProfile, currentYear + 1);
}

function broadcastCalendarState(): void {
  broadcastToAllWindows('calendar-state-changed', {
    profile: calendarProfile,
    events: getActiveCalendarEvents(),
  });
}

function checkBirthdayGreeting(): void {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  if (
    calendarProfile.birthdayMonth === currentMonth &&
    calendarProfile.birthdayDay === currentDay
  ) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('wellness-update', {
        mood: 'active',
        message: `🎂 Happy Birthday, ${calendarProfile.nickname || 'Buddy'}! Una~!! ✨`,
        soundEvent: 'welcome-back',
      });
    }
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

function getScheduleFilePath(): string {
  try {
    return path.join(app.getPath('userData'), 'usagi-schedule.json');
  } catch {
    return path.resolve(__dirname, '../../usagi-schedule.json');
  }
}

function loadScheduleFromDisk(): void {
  try {
    const p = getScheduleFilePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      scheduleState = parseScheduleJson(raw);
    }
  } catch (err) {
    console.warn('Failed to load schedule from disk:', err);
    scheduleState = createInitialScheduleState();
  }
}

function saveScheduleToDisk(): void {
  try {
    const p = getScheduleFilePath();
    fs.writeFileSync(p, serializeScheduleJson(scheduleState), 'utf-8');
  } catch (err) {
    console.warn('Failed to save schedule to disk:', err);
  }
}

function broadcastScheduleState(): void {
  broadcastToAllWindows('schedule-state-changed', scheduleState);
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
  win.webContents.send('calendar-state-changed', {
    profile: calendarProfile,
    events: getActiveCalendarEvents(),
  });
  win.webContents.send('schedule-state-changed', scheduleState);
  win.webContents.send('fixed-appearance-toggle', wardrobeRotation.fixedAppearance);
  win.webContents.send('usagi-hidden-toggle', usagiHidden);
  if (usagiX !== null && usagiY !== null) {
    win.webContents.send('usagi-position-changed', { x: usagiX, y: usagiY });
  }
  win.webContents.send('dashboard-tab-changed', activeDashboardTab);
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
      stickyWindow.setAlwaysOnTop(Boolean(reminderState.stickyAlwaysOnTop), 'floating');
      stickyWindow.show();
    } else {
      stickyWindow.hide();
    }
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  const dims = clampStickyDimensions(reminderState.stickyWidth, reminderState.stickyHeight);
  const width = dims.width;
  const height = dims.height;

  let x: number;
  let y: number;
  if (
    typeof reminderState.stickyX === 'number' &&
    Number.isFinite(reminderState.stickyX) &&
    typeof reminderState.stickyY === 'number' &&
    Number.isFinite(reminderState.stickyY)
  ) {
    x = Math.max(workArea.x, Math.min(workArea.x + workArea.width - width, reminderState.stickyX));
    y = Math.max(
      workArea.y,
      Math.min(workArea.y + workArea.height - height, reminderState.stickyY)
    );
  } else {
    x = Math.max(0, workArea.x + workArea.width - width - 24);
    y = Math.max(0, workArea.y + 48);
  }

  stickyWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 290,
    minHeight: 380,
    maxWidth: 640,
    maxHeight: 880,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: Boolean(reminderState.stickyAlwaysOnTop),
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

  const handleStickyBoundsChanged = () => {
    if (!stickyWindow || stickyWindow.isDestroyed()) return;
    const bounds = stickyWindow.getBounds();
    const clamped = clampStickyDimensions(bounds.width, bounds.height);
    let changed = false;
    if (
      reminderState.stickyWidth !== clamped.width ||
      reminderState.stickyHeight !== clamped.height
    ) {
      reminderState.stickyWidth = clamped.width;
      reminderState.stickyHeight = clamped.height;
      changed = true;
    }
    if (reminderState.stickyX !== bounds.x || reminderState.stickyY !== bounds.y) {
      reminderState.stickyX = bounds.x;
      reminderState.stickyY = bounds.y;
      changed = true;
    }
    if (changed) {
      saveRemindersToDisk();
      broadcastReminderState();
    }
  };

  stickyWindow.on('resized', handleStickyBoundsChanged);
  stickyWindow.on('moved', handleStickyBoundsChanged);

  const htmlPath = path.join(__dirname, '../sticky/index.html');
  stickyWindow.loadFile(htmlPath);

  if (reminderState.stickyAlwaysOnTop) {
    stickyWindow.setAlwaysOnTop(true, 'floating');
  }

  stickyWindow.webContents.on('did-finish-load', () => {
    if (stickyWindow && !stickyWindow.isDestroyed()) {
      stickyWindow.webContents.send('reminder-state-changed', reminderState);
      stickyWindow.webContents.send('calendar-state-changed', {
        profile: calendarProfile,
        events: getActiveCalendarEvents(),
      });
      stickyWindow.webContents.send('schedule-state-changed', scheduleState);
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
    height: 410,
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
  const pos = computeTrayPopoverPosition(trayBounds, workArea, { width: 320, height: 410 });

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

  setupCursorTrackingTicker();
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
    checkBirthdayGreeting();
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

      // Periodically persist timer remaining time so restarts never lose progress
      if (Math.round(pomodoroState.remainingMs / 1000) % 5 === 0) {
        saveSettingsToDisk();
      }

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
  const follow = shouldFollowCursor({
    ghostLocked,
    playModeEnabled,
    stationaryMode,
    usagiHidden,
  });

  if (follow && !cursorInterval) {
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
      } else {
        if (cursorInterval) {
          clearInterval(cursorInterval);
          cursorInterval = null;
        }
      }
    }, 33);
  } else if (!follow && cursorInterval) {
    clearInterval(cursorInterval);
    cursorInterval = null;
  }
}

app.whenReady().then(() => {
  migrateLegacyUserData();
  loadSettingsFromDisk();
  loadRemindersFromDisk();
  loadCalendarFromDisk();
  loadScheduleFromDisk();
  createMainWindow();
  if (reminderState.stickyVisible) {
    createStickyWindow();
  }
  createSystemTray();
  setupPomodoroTicker();
  setupWellnessCoachTicker();
  setupCursorTrackingTicker();
  refreshHolidaysFromNager(calendarProfile.countryCode, new Date().getFullYear()).catch(() => {});

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

  ipcMain.handle('get-calendar-state', () => ({
    profile: calendarProfile,
    events: getActiveCalendarEvents(),
  }));

  ipcMain.handle('get-schedule-state', () => scheduleState);

  ipcMain.on('add-schedule-entry', (_e, input: NewScheduleEntryInput) => {
    try {
      scheduleState = addScheduleEntry(scheduleState, input);
      saveScheduleToDisk();
      broadcastScheduleState();
    } catch (err) {
      console.warn('Failed to add schedule entry:', err);
    }
  });

  ipcMain.on('delete-schedule-entry', (_e, id: string) => {
    scheduleState = deleteScheduleEntry(scheduleState, id);
    saveScheduleToDisk();
    broadcastScheduleState();
  });

  ipcMain.on('resize-sticky-window', (_e, width: number, height: number) => {
    const clamped = clampStickyDimensions(width, height);
    reminderState.stickyWidth = clamped.width;
    reminderState.stickyHeight = clamped.height;
    if (stickyWindow && !stickyWindow.isDestroyed()) {
      stickyWindow.setSize(clamped.width, clamped.height);
      const bounds = stickyWindow.getBounds();
      reminderState.stickyX = bounds.x;
      reminderState.stickyY = bounds.y;
    }
    saveRemindersToDisk();
    broadcastReminderState();
  });

  ipcMain.on('update-usagi-position', (_e, x: number, y: number) => {
    if (
      typeof x === 'number' &&
      Number.isFinite(x) &&
      typeof y === 'number' &&
      Number.isFinite(y)
    ) {
      usagiX = Math.round(x);
      usagiY = Math.round(y);
      saveSettingsToDisk();
    }
  });

  ipcMain.on('update-dashboard-tab', (_e, tab: 'companion' | 'config') => {
    if (tab === 'companion' || tab === 'config') {
      activeDashboardTab = tab;
      saveSettingsToDisk();
      broadcastToAllWindows('dashboard-tab-changed', activeDashboardTab);
    }
  });

  ipcMain.on('update-buddy-profile', (_e, partialProfile: Partial<BuddyProfile>) => {
    if (typeof partialProfile !== 'object' || partialProfile === null) return;
    const oldCountry = calendarProfile.countryCode;
    calendarProfile = {
      ...calendarProfile,
      ...(typeof partialProfile.nickname === 'string'
        ? { nickname: partialProfile.nickname.trim().slice(0, 32) || 'Buddy' }
        : {}),
      ...(partialProfile.birthdayMonth !== undefined
        ? {
            birthdayMonth:
              partialProfile.birthdayMonth === null
                ? null
                : typeof partialProfile.birthdayMonth === 'number' &&
                    !Number.isNaN(partialProfile.birthdayMonth)
                  ? Math.max(1, Math.min(12, Math.round(partialProfile.birthdayMonth)))
                  : null,
          }
        : {}),
      ...(partialProfile.birthdayDay !== undefined
        ? {
            birthdayDay:
              partialProfile.birthdayDay === null
                ? null
                : typeof partialProfile.birthdayDay === 'number' &&
                    !Number.isNaN(partialProfile.birthdayDay)
                  ? Math.max(1, Math.min(31, Math.round(partialProfile.birthdayDay)))
                  : null,
          }
        : {}),
      ...(typeof partialProfile.countryCode === 'string' && partialProfile.countryCode.length === 2
        ? { countryCode: partialProfile.countryCode.toUpperCase() }
        : {}),
    };

    saveCalendarToDisk();
    broadcastCalendarState();
    checkBirthdayGreeting();

    if (calendarProfile.countryCode !== oldCountry) {
      refreshHolidaysFromNager(calendarProfile.countryCode, new Date().getFullYear()).catch(
        () => {}
      );
    }
  });

  ipcMain.on('add-reminder', (_e, payload: string | { text: string; dueDate?: string }) => {
    if (typeof payload === 'string') {
      reminderState = addReminderItem(reminderState, payload);
    } else if (payload && typeof payload === 'object' && typeof payload.text === 'string') {
      reminderState = addReminderItem(
        reminderState,
        payload.text,
        Date.now(),
        undefined,
        payload.dueDate
      );
    }
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

  ipcMain.on('cycle-sticky-font-scale', () => {
    reminderState = cycleReminderFontScale(reminderState);
    saveRemindersToDisk();
    broadcastReminderState();
  });

  ipcMain.on('update-reminder-preferences', (_e, prefs: ReminderPreferencesUpdate) => {
    if (prefs && typeof prefs === 'object') {
      reminderState = updateReminderPreferences(reminderState, prefs);
      if (stickyWindow && !stickyWindow.isDestroyed()) {
        stickyWindow.setAlwaysOnTop(Boolean(reminderState.stickyAlwaysOnTop), 'floating');
      }
      saveRemindersToDisk();
      broadcastReminderState();
    }
  });

  ipcMain.on('toggle-sticky-window', () => {
    toggleStickyWindow();
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
