# Session Persistence & Multi-Feature Harmony Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Base SHA:** `4b27950`

**Goal:** Persist user preferences (outfit, timer duration/phase/remaining, volume, mute, companion modes) across app sessions via `usagi-settings.json`, and eliminate multi-feature conflicts so Ghost Mode + Follow Cursor, Stationary vs. Follow Cursor, Hide Usagi + Snacks, and Wardrobe Selection vs. Auto-Rotation work seamlessly together.

**Architecture:** Introduce a pure, zero-dependency `src/core/settingsStore.ts` module for validating, serializing, and resolving multi-mode transitions (`resolveModeTransitions`), backed by `usagi-settings.json` in `app.getPath('userData')`. Stream system-level screen cursor coordinates (`screen.getCursorScreenPoint()`) from Main to the overlay Renderer when Follow Cursor (`playModeEnabled`) is active so Ghost Mode (`setIgnoreMouseEvents(true)`) and OS click-through never starve Usagi of cursor position updates.

**Tech Stack:** Electron, TypeScript, HTML5 Canvas, Vitest, Prettier.

**Spec:** User bug report — session persistence for outfits/timer/modes and multi-feature compatibility (Ghost Mode + Follow Mouse, Stationary + Follow Mouse, Hide Usagi + Snacks, Wardrobe Selection + Auto-Change, and cross-window state hydration).

## Global Constraints

- Silent test/build execution: Always run commands wrapped with `CI=true GIT_TERMINAL_PROMPT=0 <cmd> < /dev/null > /tmp/agy-cmd.log 2>&1` per Law 1 & Law 2.
- Strict RED-GREEN TDD: Write failing unit tests in `tests/` first, verify RED, implement minimal pure logic, verify GREEN, format with `npx --no-install prettier --write`, and commit cleanly.
- Zero regressions across all existing 12 test suites.

## Review Focus

1. **Corrupted or partial `usagi-settings.json` on disk**: `parseUserSettingsJson` must safely fall back to defaults for missing/invalid fields (e.g., invalid `costumeSelection`, negative `timerDurationMs`, out-of-range `volumeConfig.master`, or `timerPhase === 'running'` restored as `'paused'` so an alarm doesn't unexpectedly fire before the user is ready, while preserving `timerRemainingMs` and `timerDurationMs`).
2. **Ghost Mode + Follow Cursor active simultaneously**: `shouldFollowCursor(playModeEnabled, stationaryMode, usagiHidden)` must remain `true` when `ghostModeLocked === true`, and `src/renderer/app.ts` must NOT null out `cursorTarget` when `ghostState.ghostModeLocked` is true; furthermore, Main must broadcast OS cursor coordinates (`cursor-position-updated`) when `playModeEnabled` is active so `cursorPos` updates even when the overlay window ignores mouse events or loses hover (`mouseleave`).
3. **Mutually exclusive movement modes (Stationary vs. Follow Cursor)**: Enabling `playModeEnabled` while `stationaryMode` is `true` must automatically unpin `stationaryMode = false`, and enabling `stationaryMode` while `playModeEnabled` is `true` must automatically disable `playModeEnabled = false`, broadcasting both states to all windows so UI buttons never show conflicting active states.
4. **Manual outfit selection vs. 30-minute auto-rotation**: Selecting a specific outfit (`'classic' | 'study' | 'vest' | 'sigma' | 'star'`) must lock `fixedAppearance = true` (so the 30-min timer doesn't unexpectedly overwrite the user's chosen outfit), while selecting `'random'` or clicking the `Auto-Change` toggle unlocks `fixedAppearance = false`. When 30-min auto-rotation advances the outfit, `costumeSelection` and `activeCostume` stay aligned in Dashboard UI.
5. **Re-opening existing Dashboard or Tray windows &Overlay `muteToggleBtn`**: Calling `createDashboardWindow()` or `toggleTrayWindow()` when the window already exists must still push the full current state snapshot (`sendFullStateToDashboard` / `sendFullStateToTray`), and clicking `#mute-toggle-btn` in the overlay modal (`src/renderer/app.ts`) must call `window.usagiAPI?.toggleSoundMute()` so Main and Dashboard stay in sync.

---

### Task 1: Pure Settings Store & Multi-Feature Transition Resolver (`src/core/settingsStore.ts`)

**Files:**

- Create: `src/core/settingsStore.ts`
- Test: `tests/settingsStore.test.ts`

**Interfaces:**

- Consumes: `CostumeId`, `OutfitSelection`, `isKnownCostumeId`, `isKnownOutfitSelection` from `src/core/costumeManager.ts`; `DEFAULT_POMODORO_MS`, `PomodoroPhase` from `src/core/pomodoroTimer.ts`; `DEFAULT_VOLUME_CONFIG`, `VolumeConfig` from `src/core/soundManager.ts`.
- Produces:
  - `export interface UserSettings { costumeSelection: OutfitSelection; activeCostume: CostumeId; fixedAppearance: boolean; timerDurationMs: number; timerRemainingMs: number; timerPhase: PomodoroPhase; volumeConfig: VolumeConfig; soundMuted: boolean; ghostLocked: boolean; playModeEnabled: boolean; stationaryMode: boolean; usagiHidden: boolean; }`
  - `export function createDefaultUserSettings(): UserSettings`
  - `export function parseUserSettingsJson(raw: string | null | undefined): UserSettings`
  - `export function serializeUserSettingsJson(settings: UserSettings): string`
  - `export interface ModeFlags { ghostLocked: boolean; playModeEnabled: boolean; stationaryMode: boolean; usagiHidden: boolean; }`
  - `export type ModeToggleAction = { type: 'toggle-ghost' } | { type: 'toggle-play' } | { type: 'toggle-stationary' } | { type: 'toggle-hidden' };`
  - `export function resolveModeTransition(current: ModeFlags, action: ModeToggleAction): ModeFlags`
  - `export function shouldFollowCursor(modes: ModeFlags): boolean`

- [ ] **Step 1: Write the failing test in `tests/settingsStore.test.ts`**

Cover:

1. `createDefaultUserSettings()` returns expected defaults (`classic`, `fixedAppearance: false`, `25m`, `idle`, `ghostLocked: false`, `playModeEnabled: false`, `stationaryMode: false`, `usagiHidden: false`).
2. `serializeUserSettingsJson` and `parseUserSettingsJson` round-trip all fields (outfit, timer duration/remaining/phase, volume, mute, modes).
3. `parseUserSettingsJson` normalizes `timerPhase: 'running'` on disk to `'paused'` (if `timerRemainingMs > 0` and `< timerDurationMs`) or `'idle'` so a restarted app keeps the exact last timer duration and remaining time ready without ticking down unseen, and clamps invalid durations/volumes/costumes to safe defaults.
4. `resolveModeTransition` allows `ghostLocked` and `playModeEnabled` to both be `true` simultaneously (Ghost Mode + Follow Cursor harmony), while enforcing mutual exclusion between `playModeEnabled` and `stationaryMode` (turning on `play` turns off `stationary`; turning on `stationary` turns off `play`; turning on `play` or `stationary` when `usagiHidden` is true un-hides Usagi so the user sees the companion they just activated).
5. `shouldFollowCursor(modes)` returns `true` when `playModeEnabled: true, ghostLocked: true, stationaryMode: false, usagiHidden: false`, and `false` when `stationaryMode: true` or `usagiHidden: true`.

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/settingsStore.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && tail -n 25 /tmp/agy-cmd.log)`
Expected: FAIL (`Cannot find module '../src/core/settingsStore'`).

- [ ] **Step 3: Implement `src/core/settingsStore.ts`**

Implement the pure functions with strict validation:

- `timerDurationMs`: finite number clamped to `[60_000, 43_200_000]`, fallback `DEFAULT_POMODORO_MS`.
- `timerRemainingMs`: finite number clamped to `[0, timerDurationMs]`, fallback `timerDurationMs` (if `0`, reset to `timerDurationMs`).
- `timerPhase`: if `'running'` or `'paused'`, restore as `'paused'` when `timerRemainingMs < timerDurationMs && timerRemainingMs > 0`, otherwise `'idle'`.
- `resolveModeTransition`:
  - `'toggle-ghost'`: toggles `ghostLocked` without disabling `playModeEnabled` or `stationaryMode`.
  - `'toggle-play'`: sets `playModeEnabled = !current.playModeEnabled`; if enabling (`true`), sets `stationaryMode = false` and `usagiHidden = false`.
  - `'toggle-stationary'`: sets `stationaryMode = !current.stationaryMode`; if enabling (`true`), sets `playModeEnabled = false` and `usagiHidden = false`.
  - `'toggle-hidden'`: toggles `usagiHidden`.

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/settingsStore.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && tail -n 25 /tmp/agy-cmd.log)`
Expected: `✅ PASS`

---

### Task 2: Wardrobe Selection vs. Auto-Rotation Harmony & Physics/Ghost Mode Updates (`src/core/costumeManager.ts`, `tests/costumeManager.test.ts`, `tests/physicsEngine.test.ts`)

**Files:**

- Modify: `src/core/costumeManager.ts`
- Modify: `tests/costumeManager.test.ts`
- Modify: `tests/physicsEngine.test.ts`

**Interfaces:**

- Produces in `src/core/costumeManager.ts`:
  - `export function resolveOutfitSelectionChange(selection: OutfitSelection, currentCostume: CostumeId, randomFn?: () => number): { costumeSelection: OutfitSelection; activeCostume: CostumeId; fixedAppearance: boolean }`
    - When a specific costume (`'classic' | 'study' | 'vest' | 'sigma' | 'star'`) is selected, `activeCostume = selection` and `fixedAppearance = true` so the user's explicit outfit choice is preserved across sessions and not overwritten by the 30-min auto-rotation timer unless they toggle `Auto-Change` or pick `'random'`.
    - When `'random'` is selected, `activeCostume = pickRandomCostume(currentCostume, randomFn)` and `fixedAppearance = false`.

- [ ] **Step 1: Write failing tests in `tests/costumeManager.test.ts`**

Add tests for `resolveOutfitSelectionChange`:

- Selecting a specific costume (`'vest'`, `'star'`, etc.) sets `activeCostume: 'vest'`, `costumeSelection: 'vest'`, and `fixedAppearance: true`.
- Selecting `'random'` picks a random costume, sets `costumeSelection: 'random'`, and sets `fixedAppearance: false`.

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/costumeManager.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && tail -n 25 /tmp/agy-cmd.log)`
Expected: FAIL (`resolveOutfitSelectionChange is not a function`).

- [ ] **Step 3: Implement `resolveOutfitSelectionChange` in `src/core/costumeManager.ts`**

Implement `resolveOutfitSelectionChange` and export it.

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/costumeManager.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && tail -n 25 /tmp/agy-cmd.log)`
Expected: `✅ PASS`

---

### Task 3: Electron Main, Preload, Renderer & Dashboard Integration (`src/main/index.ts`, `src/preload/index.ts`, `src/renderer/app.ts`, `src/dashboard/dashboard.ts`)

**Files:**

- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/app.ts`
- Modify: `src/dashboard/dashboard.ts`

**Interfaces:**

- In `src/preload/index.ts`:
  - Add `onCursorPositionUpdated: (callback: (pos: Vector2D) => void) => () => void` listening to `'cursor-position-updated'` IPC channel.
- In `src/main/index.ts`:
  - Load `usagi-settings.json` on startup via `loadSettingsFromDisk()` and save on every setting change via `saveSettingsToDisk()` (costume, fixedAppearance, pomodoro duration/pause/reset/complete, volumeConfig, soundMuted, ghostLocked, playModeEnabled, stationaryMode, usagiHidden) and on `before-quit`.
  - Add `sendFullStateToWindow(win: BrowserWindow | null)`: pushes `volumeConfig`, `pomodoroState`, `stationaryMode`, `soundMuted`, `ghostLocked`, `playModeEnabled`, `activeCostume`/`costumeSelection`, `reminderState`, `wardrobeRotation.fixedAppearance`, and `usagiHidden` whenever `mainWindow`, `dashboardWindow`, or `trayWindow` finishes loading OR is re-shown (`createDashboardWindow` when already created, `toggleTrayWindow` when shown).
  - Add a 33ms (~30 FPS) cursor poller `setupCursorTrackingTicker()` in Main that runs `screen.getCursorScreenPoint()` when `playModeEnabled && !stationaryMode && !usagiHidden`, converting screen coordinates relative to `mainWindow.getBounds()` (`{ x: pt.x - bounds.x, y: pt.y - bounds.y }`) and sending `'cursor-position-updated'` to `mainWindow`. This guarantees Follow Cursor works smoothly even when Ghost Mode (`setIgnoreMouseEvents(true)`) is enabled or the cursor moves over other apps!
  - Use `resolveModeTransition` in `toggleGhostMode`, `togglePlayMode`, `toggleStationaryMode`, and `toggleUsagiHidden`, broadcasting all changed mode flags and saving settings to disk.
  - Use `resolveOutfitSelectionChange` in `setCostume`, broadcasting both `'costume-changed'` and `'fixed-appearance-toggle'`, and saving settings to disk. When 30-min `tickWardrobeRotation` advances `activeCostume` (when `fixedAppearance === false`), if `costumeSelection !== 'random'`, update `costumeSelection = activeCostume` so Dashboard highlights the new active costume card accurately, and save to disk.
- In `src/renderer/app.ts`:
  - Fix line 1141: change `const cursorTarget = playModeEnabled && !ghostState.ghostModeLocked ? cursorPos : null;` to `const cursorTarget = shouldFollowCursor({ ghostLocked: ghostState.ghostModeLocked, playModeEnabled, stationaryMode: state.stationary, usagiHidden: isUsagiHidden }) ? cursorPos : null;`!
  - Subscribe to `window.usagiAPI.onCursorPositionUpdated((pos) => { cursorPos = pos; updateMouseIgnoreState(); })` so OS-level cursor position updates `cursorPos` even during Ghost Mode click-through.
  - In `window.addEventListener('mouseleave', ...)`: only clear `cursorPos = null` if `!playModeEnabled`.
  - When `isUsagiHidden && !giantAlarmState.active` in `animationLoop`: pass `null` instead of `activeSnack` to `stepUsagiPhysics` so hidden Usagi doesn't invisibly eat snacks or play snack sounds while hidden.
  - In `muteToggleBtn` click handler (`src/renderer/app.ts:458`): call `window.usagiAPI?.toggleSoundMute()` so Main and Dashboard stay synced with overlay mute toggles.
- In `src/dashboard/dashboard.ts`:
  - In `updatePomodoroUI(state: PomodoroState)`: sync `manualTimeInput.placeholder` or initial value with `Math.round(state.durationMs / 60000)` and highlight the matching preset `.chip-btn` (`25`, `52`, `90`) so the saved timer duration is visually reflected in the Dashboard timer section on startup.

- [ ] **Step 1: Update `src/preload/index.ts`, `src/main/index.ts`, `src/renderer/app.ts`, and `src/dashboard/dashboard.ts`**

Apply the changes cleanly following existing code conventions.

- [ ] **Step 2: Run typecheck, unit tests, and build**

Run:
`CI=true GIT_TERMINAL_PROMPT=0 npx --no-install -p typescript tsc --noEmit --pretty false < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ TSC PASS" || (echo "❌ TSC FAIL:" && tail -n 35 /tmp/agy-cmd.log)`
`CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ VITEST PASS" || (echo "❌ VITEST FAIL:" && tail -n 35 /tmp/agy-cmd.log)`
`CI=true GIT_TERMINAL_PROMPT=0 npm run build < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ BUILD PASS" || (echo "❌ BUILD FAIL:" && tail -n 35 /tmp/agy-cmd.log)`

- [ ] **Step 3: Format, update `docs/ARCHITECTURE.md`, and commit**

Run `npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts"`, update `docs/ARCHITECTURE.md` with `settingsStore.ts` and M17 milestone entry, and commit with `git commit -m "feat: persist session settings and resolve multi-feature mode conflicts"`.
