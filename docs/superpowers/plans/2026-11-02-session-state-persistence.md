# Full Cross-Session State Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Base SHA:** `a4710ef`

**Goal:** Persist and restore every user-configurable and interactive state across sessions and rebuilds—including sticky note window size (`stickyWidth`, `stickyHeight`), screen position (`stickyX`, `stickyY`), active sticky tab (`activeStickyTab`), font scale across every sticky element, active Dashboard tab (`activeDashboardTab`), Usagi companion screen coordinates (`usagiX`, `usagiY`), and unify dev vs production `userData` storage directory so no new feature or restart ever resets a previous session's state.

**Architecture:**
1. Extend `ReminderState` and `ReminderPreferencesUpdate` in `src/core/reminderStore.ts` with `stickyWidth` (290..640, default 350), `stickyHeight` (380..880, default 480), `stickyX` (`number | null`), `stickyY` (`number | null`), and `activeStickyTab` (`'quests' | 'calendar' | 'schedule'`, default `'quests'`).
2. Extend `UserSettings` in `src/core/settingsStore.ts` with `usagiX` (`number | null`), `usagiY` (`number | null`), and `activeDashboardTab` (`'companion' | 'config'`, default `'companion'`).
3. Ensure `src/sticky/index.html` scales all headers, tabs, buttons, calendar titles, weekday headers, schedule pills, inputs, and footers proportionally with `var(--font-scale)`, and ensure `src/sticky/sticky.ts` and `src/dashboard/dashboard.ts` persist and hydrate window size, active tabs, and Usagi drag/pin coordinates via Electron IPC in `src/main/index.ts` and `src/preload/index.ts`. Also migrate existing `Electron` dev userData files into a dedicated `usagi-buddy` userData folder so dev (`npm start`) and packaged builds share consistent persistence.

**Tech Stack:** Electron, TypeScript, Vitest, HTML5/CSS3

**Spec:** `docs/ARCHITECTURE.md`

## Global Constraints

- Zero external runtime dependencies added.
- Backward-compatible JSON deserialization: existing `usagi-reminders.json` and `usagi-settings.json` files without the new fields must keep all existing items/preferences intact and fall back gracefully for new fields.
- Clamping: `stickyWidth` clamped to `[290, 640]`, `stickyHeight` clamped to `[380, 880]`.
- All existing unit tests must continue to pass without weakening assertions.

## Review Focus

1. **Sticky window resize persistence (`resize-sticky-window` + native `resized`/`moved` events)**: Dragging the sticky resize handles, clicking the `⤢` header button, or clicking the Dashboard "Sticky Window Size" button must immediately update `reminderState.stickyWidth` and `reminderState.stickyHeight`, save to `usagi-reminders.json`, and broadcast `reminder-state-changed` so reopening or restarting the app creates the `BrowserWindow` at the exact saved `stickyWidth × stickyHeight` and `(stickyX, stickyY)`.
2. **Proportional `fontScale` across all Sticky Note elements**: Changing font scale (`sm` / `md` / `lg`) must scale not only `.quest-text` and `.cal-day-cell`, but also `.header-title`, `.sticky-tab-btn`, `.sticky-chip-btn`, `#stickyCalMonthTitle`, `.cal-weekdays-grid`, `#stickyCalDetailBanner`, `.upcoming-badge`, `#stickyScheduleNowBanner`, `.sched-time-pill`, `.sched-location`, schedule form inputs, `.empty-state`, and `.sticky-footer` via `calc(... * var(--font-scale))`.
3. **Sticky & Dashboard active tab persistence**: Switching between `quests`, `calendar`, and `schedule` in the Sticky Note or between `companion` and `config` in the Dashboard must persist and restore the active tab on startup.
4. **Usagi companion position (`usagiX`, `usagiY`) & live Pomodoro timer persistence**: Dragging Usagi or pinning Usagi still saves `(usagiX, usagiY)` to `UserSettings` (`usagi-settings.json`) and restores Usagi's position on launch (clamped to screen bounds); active Pomodoro timer countdown saves remaining time so unexpected restarts never lose progress.
5. **Backward compatibility & legacy Electron userData migration**: Existing `usagi-*.json` files in `~/Library/Application Support/Electron/` (from `electron dist/main/index.js`) are preserved/migrated cleanly if `app.setName('usagi-buddy')` is used or kept in consistent `userData` without losing any existing reminders, settings, schedule, or calendar data.

---

### Task 1: Sticky Window Geometry & Active Tab Persistence in `reminderStore.ts`

**Files:**
- Modify: `src/core/reminderStore.ts`
- Test: `tests/reminderStore.test.ts`

**Interfaces:**
- Produces in `src/core/reminderStore.ts`:
  - `export type StickyTabId = 'quests' | 'calendar' | 'schedule';`
  - `export const DEFAULT_STICKY_WIDTH = 350;`
  - `export const DEFAULT_STICKY_HEIGHT = 480;`
  - `export const MIN_STICKY_WIDTH = 290;`
  - `export const MAX_STICKY_WIDTH = 640;`
  - `export const MIN_STICKY_HEIGHT = 380;`
  - `export const MAX_STICKY_HEIGHT = 880;`
  - `export function clampStickyDimensions(width: unknown, height: unknown): { width: number; height: number }`
  - `ReminderState` extended with:
    - `stickyWidth?: number;`
    - `stickyHeight?: number;`
    - `stickyX?: number | null;`
    - `stickyY?: number | null;`
    - `activeStickyTab?: StickyTabId;`
  - `ReminderPreferencesUpdate` extended with:
    - `stickyWidth?: number;`
    - `stickyHeight?: number;`
    - `stickyX?: number | null;`
    - `stickyY?: number | null;`
    - `activeStickyTab?: StickyTabId;`

- [ ] **Step 1: Write failing tests in `tests/reminderStore.test.ts`**
  Add tests verifying:
  - `createInitialReminderState()` sets `stickyWidth: 350`, `stickyHeight: 480`, `stickyX: null`, `stickyY: null`, `activeStickyTab: 'quests'`.
  - `updateReminderPreferences()` updates and clamps `stickyWidth` (`[290, 640]`), `stickyHeight` (`[380, 880]`), `stickyX`, `stickyY`, and `activeStickyTab`.
  - `parseRemindersJson()` round-trips `stickyWidth`, `stickyHeight`, `stickyX`, `stickyY`, and `activeStickyTab`, and defaults missing/invalid values to `350`, `480`, `null`, `null`, `'quests'` while preserving existing `items` and `fontScale`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx --no-install vitest run tests/reminderStore.test.ts`

- [ ] **Step 3: Implement sticky geometry & tab fields in `src/core/reminderStore.ts`**
  Implement `clampStickyDimensions`, update `ReminderState`, `ReminderPreferencesUpdate`, `createInitialReminderState`, `updateReminderPreferences`, and `parseRemindersJson`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx --no-install vitest run tests/reminderStore.test.ts`

---

### Task 2: Usagi Position & Dashboard Tab Persistence in `settingsStore.ts`

**Files:**
- Modify: `src/core/settingsStore.ts`
- Test: `tests/settingsStore.test.ts`

**Interfaces:**
- Produces in `src/core/settingsStore.ts`:
  - `export type DashboardTabId = 'companion' | 'config';`
  - `UserSettings` extended with:
    - `usagiX?: number | null;`
    - `usagiY?: number | null;`
    - `activeDashboardTab?: DashboardTabId;`

- [ ] **Step 1: Write failing tests in `tests/settingsStore.test.ts`**
  Add tests verifying:
  - `createDefaultUserSettings()` includes `usagiX: null`, `usagiY: null`, `activeDashboardTab: 'companion'`.
  - `parseUserSettingsJson()` preserves finite numeric `usagiX` and `usagiY` (or defaults invalid/missing to `null`), and preserves valid `activeDashboardTab` (`'companion' | 'config'`, defaulting to `'companion'`).

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx --no-install vitest run tests/settingsStore.test.ts`

- [ ] **Step 3: Implement `usagiX`, `usagiY`, and `activeDashboardTab` in `src/core/settingsStore.ts`**
  Update `UserSettings`, `createDefaultUserSettings()`, and `parseUserSettingsJson()`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx --no-install vitest run tests/settingsStore.test.ts`

---

### Task 3: Full Font Scale Coverage, Sticky Window Bounds & Tab Sync across Main, Preload, Sticky, Dashboard & Renderer

**Files:**
- Modify: `src/sticky/index.html`
- Modify: `src/sticky/sticky.ts`
- Modify: `src/dashboard/dashboard.ts`
- Modify: `src/renderer/app.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Modify: `docs/ARCHITECTURE.md`

**Interfaces:**
- `UsagiAPI` in `src/preload/index.ts` extended with:
  - `updateUsagiPosition: (x: number, y: number) => void;`
  - `onUsagiPositionChanged: (callback: (pos: { x: number; y: number }) => void) => () => void;`
  - `updateDashboardTab: (tab: 'companion' | 'config') => void;`
  - `onDashboardTabChanged: (callback: (tab: 'companion' | 'config') => void) => () => void;`
- `src/main/index.ts`:
  - In `createStickyWindow()`: reads `reminderState.stickyWidth ?? 350` and `reminderState.stickyHeight ?? 480` (clamped via `clampStickyDimensions`), and if `reminderState.stickyX != null && reminderState.stickyY != null`, positions the sticky window at `(stickyX, stickyY)` (clamped within visible display `workArea` so it is never off-screen).
  - Listens to `stickyWindow.on('resized', ...)` and `stickyWindow.on('moved', ...)` as well as `ipcMain.on('resize-sticky-window', ...)` to update `reminderState.stickyWidth`, `reminderState.stickyHeight`, `reminderState.stickyX`, `reminderState.stickyY`, call `saveRemindersToDisk()`, and `broadcastReminderState()`.
  - Persists `usagiX`, `usagiY`, and `activeDashboardTab` in `loadSettingsFromDisk()` / `saveSettingsToDisk()`, sends `'usagi-position-changed'` (when non-null) and `'dashboard-tab-changed'` in `sendFullStateToWindow()`, and saves settings periodically in `setupPomodoroTicker()` when timer is running.
- `src/sticky/index.html`:
  - Convert fixed pixel font sizes on `.header-title`, `.sticky-tab-btn`, `.sticky-chip-row`, `.sticky-chip-btn`, `#stickyCalMonthTitle`, `#stickyCalTodayBtn`, `.cal-weekdays-grid`, `#stickyCalDetailBanner`, `#stickyCalJumpAddBtn`, `.upcoming-badge`, `#stickyScheduleNowBanner`, `.sched-time-pill`, `.sched-location`, `#schedStartInput`, `#schedEndInput`, `#schedLocationInput`, `#schedTitleInput`, `.empty-state`, `.sticky-footer`, `.btn-clear` to `calc(<px> * var(--font-scale))` so every text element scales harmoniously with `sm` / `md` / `lg`.
- `src/sticky/sticky.ts`:
  - In `switchTab(tab, persist = true)`: if `persist` is true and `tab !== currentState.activeStickyTab`, call `window.usagiAPI?.updateReminderPreferences({ activeStickyTab: tab })`.
  - In `render(state)`: if `state.activeStickyTab && state.activeStickyTab !== activeTab`, sync tab UI without re-triggering IPC loop.
  - In `windowSizeBtn` click handler: read `currentState.stickyWidth || window.innerWidth` to cycle `350×480 -> 410×560 -> 480×650` and call `window.usagiAPI?.resizeStickyWindow(target.w, target.h)`.
- `src/dashboard/dashboard.ts`:
  - In `renderReminderConfigUI(state)`: sync `configStickySizeBtn` label and `currentStickySizeIdx` with `state.stickyWidth` and `state.stickyHeight` (matching preset or showing `Custom (${w}×${h})`).
  - Persist and restore `activeDashboardTab` via `window.usagiAPI.updateDashboardTab(tab)` and `window.usagiAPI.onDashboardTabChanged(...)`.
- `src/renderer/app.ts`:
  - When user finishes dragging Usagi (`wasDragged` in `handlePointerUp`), call `window.usagiAPI?.updateUsagiPosition(Math.round(state.x), Math.round(state.y))`.
  - Listen to `window.usagiAPI.onUsagiPositionChanged((pos) => ...)` to restore `state.x` and `state.y` clamped to `screenBounds`.

- [ ] **Step 1: Implement changes across `src/sticky/index.html`, `src/sticky/sticky.ts`, `src/dashboard/dashboard.ts`, `src/renderer/app.ts`, `src/preload/index.ts`, and `src/main/index.ts`**
- [ ] **Step 2: Run typecheck, unit tests, UI audit, formatter, and build**
  Run:
  - `npx --no-install -p typescript tsc --noEmit --pretty false`
  - `npx --no-install vitest run`
  - `npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts"`
  - `npm run build`
- [ ] **Step 3: Update `docs/ARCHITECTURE.md` and commit**
