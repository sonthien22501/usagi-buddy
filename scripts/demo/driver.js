/**
 * Demo driver for the Usagi Buddy screen-recording demo.
 *
 * Boots the *real* app (dist/main/index.js) against an isolated userData directory,
 * lays a designed stage behind it and a caption overlay above it, then replays a
 * scripted feature walkthrough. Buttons are clicked by a real OS pointer (cliclick),
 * so the recording shows the cursor travelling to each control before it reacts.
 *
 * Usage:  electron scripts/demo/driver.js
 * Handshake: writes <OUT>/ready, waits for <OUT>/go, runs the timeline, writes
 * <OUT>/done. The recording script owns the `go` file so capture and timeline start
 * together.
 */
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUT = process.env.DEMO_OUT || path.join(ROOT, 'demo-out');

fs.mkdirSync(OUT, { recursive: true });

// Isolate demo state: the user's real settings, quests and timers are never touched.
app.setPath('userData', path.join(OUT, 'userdata'));

const READY = path.join(OUT, 'ready');
const GO = path.join(OUT, 'go');
const DONE = path.join(OUT, 'done');
for (const f of [READY, GO, DONE]) {
  try {
    fs.unlinkSync(f);
  } catch {
    /* absent */
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[demo]', ...a);

// ---------- real pointer control ----------
const CLICLICK = '/opt/homebrew/bin/cliclick';
let cursor = { x: 1000, y: 500 };

function cliclick(args) {
  try {
    execFileSync(CLICLICK, args, { stdio: 'ignore', timeout: 4000 });
  } catch (e) {
    log('  cliclick failed:', e.message);
  }
}

/** Glide the OS cursor to a point, easing out so it reads as a human move. */
async function glide(x, y, steps = 12) {
  const from = { ...cursor };
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const eased = 1 - Math.pow(1 - t, 3);
    cliclick([`m:${Math.round(from.x + (x - from.x) * eased)},${Math.round(from.y + (y - from.y) * eased)}`]);
    await sleep(14);
  }
  cursor = { x, y };
}

function screenPoint(win, rect) {
  const b = win.getContentBounds();
  return { x: Math.round(b.x + rect.x), y: Math.round(b.y + rect.y) };
}

async function rectOf(win, selector) {
  return win.webContents.executeJavaScript(
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + Math.min(r.height / 2, 16)) };
    })()`
  );
}

async function hoverEl(win, selector) {
  const rect = await rectOf(win, selector);
  if (!rect) {
    log('  MISSING', selector);
    return false;
  }
  const p = screenPoint(win, rect);
  await glide(p.x, p.y);
  return true;
}

async function clickEl(win, selector) {
  if (!(await hoverEl(win, selector))) return 'missing';
  await sleep(150);
  cliclick([`c:${cursor.x},${cursor.y}`]);
  await sleep(300);
  return 'clicked';
}

async function clickPoint(win, rect) {
  const p = screenPoint(win, rect);
  await glide(p.x, p.y);
  await sleep(130);
  cliclick([`c:${p.x},${p.y}`]);
  await sleep(320);
}

async function parkMouse() {
  const b = screen.getPrimaryDisplay().bounds;
  await glide(Math.round(b.x + b.width * 0.5), Math.round(b.y + b.height * 0.14), 10);
}

// Boot the real app first so its own whenReady handlers register before ours.
require(path.join(ROOT, 'dist', 'main', 'index.js'));

let stageWin = null;
let capWin = null;

const display = () => screen.getPrimaryDisplay();

const findWindow = (fragment) =>
  BrowserWindow.getAllWindows().find(
    (w) => !w.isDestroyed() && w.webContents.getURL().includes(fragment)
  );

async function waitForWindow(fragment, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const w = findWindow(fragment);
    if (w) {
      await sleep(400);
      return w;
    }
    await sleep(120);
  }
  throw new Error(`window never appeared: ${fragment}`);
}

function createStage() {
  const { x, y, width, height } = display().bounds;
  stageWin = new BrowserWindow({
    x, y, width, height,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#170f24',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  stageWin.setMenuBarVisibility(false);
  stageWin.loadFile(path.join(__dirname, 'stage.html'));
}

function createCaption() {
  const { x, y, width, height } = display().bounds;
  capWin = new BrowserWindow({
    x, y, width, height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  capWin.setMenuBarVisibility(false);
  capWin.setIgnoreMouseEvents(true);
  capWin.setAlwaysOnTop(true, 'screen-saver');
  capWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  capWin.loadFile(path.join(__dirname, 'caption.html'));
}

// ---------- helpers ----------

const ymd = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dm = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

async function usagi(js) {
  const w = findWindow('renderer/index.html');
  if (!w) throw new Error('usagi window missing');
  return w.webContents.executeJavaScript(js, true);
}

async function dash(js) {
  const w = findWindow('dashboard/index.html');
  if (!w) throw new Error('dashboard window missing');
  return w.webContents.executeJavaScript(js, true);
}

async function sticky(js) {
  const w = findWindow('sticky/index.html');
  if (!w) throw new Error('sticky window missing');
  return w.webContents.executeJavaScript(js, true);
}

async function step(label, promise) {
  const value = await promise;
  log(`  ${label} -> ${value}`);
  return value;
}

async function caption(text, sub) {
  if (!capWin || capWin.isDestroyed()) return;
  await capWin.webContents.executeJavaScript(
    `window.caption(${JSON.stringify(text)}, ${JSON.stringify(sub || '')}); true;`,
    true
  );
  capWin.moveTop();
}

async function captionOff() {
  if (!capWin || capWin.isDestroyed()) return;
  await capWin.webContents.executeJavaScript('window.captionOff(); true;', true);
}

async function intro(show) {
  if (!capWin || capWin.isDestroyed()) return;
  await capWin.webContents.executeJavaScript(`window.intro(${show}); true;`, true);
}

/** Same payload the app's own wellness coach pushes when the water timer fires. */
async function waterReminder() {
  const w = findWindow('renderer/index.html');
  if (!w) return 'no window';
  w.webContents.send('wellness-update', {
    mood: 'active',
    message: '💧 Huhhhh? Sip some water~',
    soundEvent: 'wellness-reminder',
  });
  return 'fired';
}

async function openDashboard() {
  await usagi('window.usagiAPI.openDashboardWindow(); true;');
  const w = await waitForWindow('dashboard/index.html');
  const b = display().workArea;
  w.setBounds({ x: b.x + b.width - 556, y: b.y + 168, width: 496, height: 720 });
  w.setAlwaysOnTop(true, 'floating');
  w.show();
  // The dashboard remembers its last tab, so force the one this shot needs.
  await w.webContents.executeJavaScript(`(() => {
    const tab = document.getElementById('dashTabCompanion');
    if (tab) tab.click();
    window.scrollTo(0, 0);
    return 'companion';
  })()`);
  await sleep(450);
  return w;
}

async function openSticky() {
  const existing = findWindow('sticky/index.html');
  if (!existing || existing.isDestroyed() || !existing.isVisible()) {
    await usagi('window.usagiAPI.toggleStickyWindow(); true;');
  }
  const w = await waitForWindow('sticky/index.html');
  const b = display().workArea;
  w.setBounds({ x: b.x + 84, y: b.y + 150, width: 400, height: 640 });
  w.setAlwaysOnTop(true, 'floating');
  w.show();
  // The sticky note remembers its last tab too — always start on Quests.
  await w.webContents.executeJavaScript(`(() => {
    const tab = document.getElementById('tabBtnQuests');
    if (tab) tab.click();
    return 'quests';
  })()`);
  await sleep(450);
  return w;
}

async function hideSticky() {
  const w = findWindow('sticky/index.html');
  if (!w || w.isDestroyed() || !w.isVisible()) return;
  await usagi('window.usagiAPI.toggleStickyWindow(); true;');
  await sleep(250);
  if (w.isVisible()) w.hide();
  await sleep(250);
  log('  sticky hidden ->', !w.isVisible());
}

async function hideDashboard() {
  const w = findWindow('dashboard/index.html');
  if (w) w.hide();
  await sleep(350);
}

// ---------- timeline ----------

async function runTimeline() {
  const t0 = Date.now();
  const at = async (s) => {
    const wait = t0 + s * 1000 - Date.now();
    if (wait > 0) await sleep(wait);
  };
  const dw = () => findWindow('dashboard/index.html');
  const sw = () => findWindow('sticky/index.html');

  // 0:00 — branded open
  await at(0.2);
  await intro(true);

  // 0:04 — treat chase
  await at(4.4);
  await intro(false);
  await at(4.7);
  await step('snack', usagi('window.usagiAPI.dropSnackNow(); "dropped"'));
  await at(5.6);
  await caption('Drop a custard pudding and Usagi chases it down');

  // 0:10 — water reminder (the app's own wellness payload)
  await at(9.9);
  await captionOff();
  await at(10.1);
  await step('water-reminder', waterReminder());
  await at(10.9);
  await caption('Gentle hydration nudges — never intrusive', 'water · focus · rest');

  // 0:16 — dashboard
  await at(16.4);
  await captionOff();
  await openDashboard();
  await at(17.9);
  await caption('Everything lives in one warm, anime-styled dashboard', 'timers · wardrobe · calendar · behavior');

  // 0:23 — wardrobe, clicked with the real pointer
  await at(23.0);
  await step('costume', clickEl(dw(), '#costume-icon-study'));
  await at(24.0);
  await caption('Five hand-drawn costumes — or let Usagi rotate outfits on its own');

  // 0:28 — focus preset
  await at(28.8);
  await step('preset', clickEl(dw(), '#chip-preset-25'));
  await at(29.8);
  await caption('Scientific focus presets: Pomodoro, 52-minute rule, ultradian rhythm');

  // 0:34 — languages
  await at(34.8);
  await captionOff();
  await step('tab-config', clickEl(dw(), '#dashTabConfig'));
  await at(35.8);
  await step('locale-hover', hoverEl(dw(), '#buddy-language-select'));
  await step(
    'locale',
    dash(`(() => {
      const s = document.getElementById('buddy-language-select');
      if (!s) return 'MISSING select';
      s.value = 'vi';
      s.dispatchEvent(new Event('change', { bubbles: true }));
      return 'vi';
    })()`)
  );
  await at(36.8);
  await caption('Eight languages, switched live across every window');

  // 0:41 — quests with real dates
  await at(41.0);
  await captionOff();
  await hideDashboard();
  await openSticky();
  await parkMouse();
  await at(42.4);
  await caption('Pin quests straight onto your desktop');

  await at(44.2);
  await step('quest-focus', clickEl(sw(), '#questInput'));
  await sleep(200);
  cliclick([`t:Submit thesis draft ${dm(9)}`]);
  await sleep(300);
  await step('quest-add', clickEl(sw(), '#addQuestBtn'));
  await sleep(400);
  await step('quest-count', sticky("document.querySelectorAll('#questList .quest-item').length"));

  await at(47.0);
  const qrect = await sw().webContents.executeJavaScript(`(() => {
    const items = [...document.querySelectorAll('#questList .quest-item')];
    const el = items.find((i) => i.textContent.toLowerCase().includes('thesis draft'));
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x + 42), y: Math.round(b.y + b.height / 2) };
  })()`);
  if (qrect) {
    await clickPoint(sw(), qrect);
    await sleep(500);
    await step('quest-state', sticky("document.querySelector('#questList .quest-item.completed .quest-text')?.textContent || 'none'"));
  } else {
    log('  MISSING thesis quest');
  }
  await at(48.2);
  await caption('Natural dates, recurring quests, a celebration when you finish one');

  // 0:53 — calendar
  await at(53.0);
  await captionOff();
  await step('tab-cal', clickEl(sw(), '#tabBtnCalendar'));
  await at(54.2);
  await caption('A real calendar — public holidays, birthdays and your deadlines', 'quest dots · upcoming list');

  // 0:60 — schedule
  await at(59.8);
  await step('tab-sched', clickEl(sw(), '#tabBtnSchedule'));
  await at(60.8);
  await step('sched-title', clickEl(sw(), '#schedTitleInput'));
  await sleep(200);
  cliclick(['t:Thesis defence prep']);
  await sleep(250);
  await step(
    'sched-fields',
    sticky(`(() => {
      const set = (id, v) => {
        const el = document.getElementById(id);
        if (!el) return false;
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      const ok = [set('schedStartInput', '09:00'), set('schedEndInput', '10:30'), set('schedLocationInput', 'Library R3')].every(Boolean);
      return ok ? 'ok' : 'MISSING inputs';
    })()`)
  );
  await step('sched-add', clickEl(sw(), '#addSchedBtn'));
  await sleep(500);
  await step('sched-count', sticky("document.querySelectorAll('#stickyScheduleList > *').length"));
  await at(62.4);
  await caption('Plan your week with a timetable pinned to the desktop');

  // 1:07 — giant alarm, nothing else on screen
  await at(67.2);
  await captionOff();
  await hideSticky();
  await parkMouse();
  await at(68.8);
  await step('alarm', usagi('window.usagiAPI.triggerGiantAlarmNow(); "fired"'));
  await at(70.2);
  await caption('When focus time ends, giant Usagi takes the screen', 'R repeat · S snooze · ESC dismiss');

  await at(76.8);
  await step(
    'dismiss',
    usagi(`(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return 'escape sent';
    })()`)
  );
  await sleep(900);
  await at(78.0);
  await caption('Free and open source — macOS and Windows', 'github.com/sonthien22501/usagi-buddy');

  await at(83.0);
  await captionOff();
  await at(83.8);
}

async function seed() {
  const b = display().workArea;
  const x = Math.round(b.x + b.width * 0.42);
  const y = Math.round(b.y + b.height * 0.5);

  await usagi(`(() => {
    const api = window.usagiAPI;
    api.setLocale('en');
    api.setCostume('classic', false);
    api.resetPomodoroTimer();
    api.updateUsagiPosition(${x}, ${y});
    return 'seeded';
  })()`);

  // The app migrates legacy userData into a fresh profile, so purge first: the sticky
  // must show only the curated demo quests, each with a real due date.
  const result = await usagi(`(async () => {
    const api = window.usagiAPI;
    const before = await api.getReminderState();
    for (const item of before.items) api.deleteReminder(item.id);
    await new Promise((r) => setTimeout(r, 400));
    await api.addReminder('Reply to advisor', ${JSON.stringify(ymd(2))});
    await api.addReminder('Book lab slot', ${JSON.stringify(ymd(5))});
    await api.addReminder('Stretch break');
    await new Promise((r) => setTimeout(r, 400));
    const after = await api.getReminderState();
    return 'purged=' + before.items.length + ' seeded=' + after.items.length +
      ' [' + after.items.map((i) => i.text + '@' + (i.dueDate || 'none')).join(' | ') + ']';
  })()`);
  log('state seeded ->', result);

  // Hidden panels and a stopped timer: the take must start from a known screen.
  const stickyWin = findWindow('sticky/index.html');
  if (stickyWin && !stickyWin.isDestroyed() && stickyWin.isVisible()) {
    await usagi('window.usagiAPI.toggleStickyWindow(); true;');
    await sleep(300);
    if (stickyWin.isVisible()) stickyWin.hide();
  }
  log('sticky at boot ->', stickyWin && !stickyWin.isDestroyed() ? String(stickyWin.isVisible()) : 'not created');
}

app.whenReady().then(async () => {
  try {
    await sleep(2600);
    createStage();
    await sleep(600);
    createCaption();
    await sleep(700);
    await seed();

    // Park the pointer somewhere neutral before recording starts.
    cliclick([`m:${Math.round(display().bounds.width * 0.5)},${Math.round(display().bounds.height * 0.12)}`]);
    cursor = { x: Math.round(display().bounds.width * 0.5), y: Math.round(display().bounds.height * 0.12) };

    fs.writeFileSync(READY, String(Date.now()));
    log('READY — waiting for go');

    const deadline = Date.now() + 120000;
    while (!fs.existsSync(GO) && Date.now() < deadline) await sleep(100);
    if (!fs.existsSync(GO)) throw new Error('no go signal');

    log('GO');
    await runTimeline();
    fs.writeFileSync(DONE, String(Date.now()));
    log('DONE');
  } catch (err) {
    log('FAILED', err.stack || String(err));
    fs.writeFileSync(path.join(OUT, 'error.txt'), String(err.stack || err));
  } finally {
    await sleep(400);
    app.exit(0);
  }
});
