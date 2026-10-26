# Wardrobe Fixed/30m Auto-Rotate & Hide Usagi Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add (1) a Wardrobe "Fix Appearance vs 30-Minute Auto-Rotate" option where Usagi automatically changes outfits every 30 minutes when Fix Appearance is OFF (and locks his outfit when ON), and (2) a "Hide Usagi" toggle in both the Dashboard and System Tray so users can hide the floating desktop companion without quitting the application.

**Architecture:**
- Pure state logic in `src/core/costumeManager.ts`: `COSTUME_AUTO_ROTATE_INTERVAL_MS = 30 * 60 * 1000`, `WardrobeRotationState`, `createWardrobeRotationState`, and `tickWardrobeRotation`.
- Electron Main (`src/main/index.ts`) runs the wardrobe rotation tick alongside the existing intervals, manages `fixedAppearance: boolean` and `usagiHidden: boolean`, updates the System Tray menu (`🙈 Hide Usagi Buddy` / `🐰 Show Usagi Buddy`), and syncs state across windows via `src/preload/index.ts`.
- Renderer (`src/renderer/app.ts`) respects `fixedAppearance` (preventing combo-click outfit morphs when `fixedAppearance` is true) and `usagiHidden` (hiding Usagi on the overlay canvas and enforcing click-through when hidden).
- Dashboard (`src/dashboard/index.html`, `src/dashboard/dashboard.ts`) adds `#fix-appearance-toggle-btn` in the Wardrobe card and `#hide-usagi-toggle-btn` in the Companion Modes & Actions card.

**Tech Stack:** Electron, TypeScript, HTML/CSS, Vitest, Prettier.

---

### Task 1: Wardrobe 30-Minute Auto-Rotate & Fixed Appearance Logic (`src/core/costumeManager.ts`)

**Files:**
- Modify: `src/core/costumeManager.ts`
- Create: `tests/costumeManager.test.ts`

**Interfaces:**
- Produces in `src/core/costumeManager.ts`:
  ```ts
  export const COSTUME_AUTO_ROTATE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  export interface WardrobeRotationState {
    fixedAppearance: boolean;
    elapsedMs: number;
  }

  export function createWardrobeRotationState(fixedAppearance = false): WardrobeRotationState;

  export function tickWardrobeRotation(
    state: WardrobeRotationState,
    currentCostume: CostumeId,
    dtMs: number,
    randomFn?: () => number
  ): { state: WardrobeRotationState; nextCostume: CostumeId | null };
  ```

- [x] **Step 1: Write failing unit tests in `tests/costumeManager.test.ts`**
  - Verify `COSTUME_AUTO_ROTATE_INTERVAL_MS` is `1_800_000` (30 minutes).
  - Verify when `fixedAppearance === false`, accumulating `dtMs` below 30m returns `nextCostume: null`, and reaching `>= 30 * 60 * 1000` picks a new different costume (`nextCostume !== currentCostume`) and wraps `elapsedMs`.
  - Verify when `fixedAppearance === true`, `tickWardrobeRotation` resets `elapsedMs` to `0` and always returns `nextCostume: null` even after 60 minutes.

- [x] **Step 2: Run test to verify it fails**
  - Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/costumeManager.test.ts < /dev/null`

- [x] **Step 3: Implement `WardrobeRotationState`, `createWardrobeRotationState`, and `tickWardrobeRotation` in `src/core/costumeManager.ts`**

- [x] **Step 4: Run test to verify it passes**
  - Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/costumeManager.test.ts < /dev/null`

---

### Task 2: Wire Fixed Appearance, 30m Auto-Rotation & Hide Usagi Across Main, Preload, Renderer & Dashboard

**Files:**
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/app.ts`
- Modify: `src/dashboard/index.html`
- Modify: `src/dashboard/dashboard.ts`
- Modify: `tests/assetsIntegration.test.ts`

**Interfaces:**
- Extend `UsagiAPI` in `src/preload/index.ts`:
  - `toggleFixedAppearance: () => void`
  - `onFixedAppearanceChanged: (callback: (fixed: boolean) => void) => () => void`
  - `toggleUsagiHidden: () => void`
  - `onUsagiHiddenChanged: (callback: (hidden: boolean) => void) => () => void`

- [x] **Step 1: Add integration test assertions in `tests/assetsIntegration.test.ts`**
  - Assert `src/dashboard/index.html` contains `fix-appearance-toggle-btn` and `hide-usagi-toggle-btn`.
  - Assert `src/preload/index.ts` exposes `toggleFixedAppearance` and `toggleUsagiHidden`.

- [x] **Step 2: Implement IPC & Tray/Timer wiring in `src/preload/index.ts` and `src/main/index.ts`**
  - In `src/main/index.ts`:
    - Track `wardrobeRotation = createWardrobeRotationState(false)` and `usagiHidden = false`.
    - In the 5-second wellness ticker (or pomodoro 1s ticker), call `tickWardrobeRotation(wardrobeRotation, activeCostume, elapsedMs)`. When `nextCostume` is returned (every 30 minutes when `!wardrobeRotation.fixedAppearance`), update `activeCostume = nextCostume` and broadcast `'costume-changed'`.
    - Add `toggleFixedAppearance()` (`ipcMain.on('toggle-fixed-appearance')`) which flips `wardrobeRotation.fixedAppearance`, resets `elapsedMs = 0`, and broadcasts `'fixed-appearance-toggle'`.
    - Add `toggleUsagiHidden()` (`ipcMain.on('toggle-usagi-hidden')`) which flips `usagiHidden`, broadcasts `'usagi-hidden-toggle'`, and updates the Tray menu (adding a tray item `usagiHidden ? '🐰 Show Usagi Buddy' : '🙈 Hide Usagi Buddy'`).
    - Send initial `'fixed-appearance-toggle'` and `'usagi-hidden-toggle'` in `did-finish-load` for both `mainWindow` and `dashboardWindow`.

- [x] **Step 3: Update `src/renderer/app.ts`, `src/dashboard/index.html`, and `src/dashboard/dashboard.ts`**
  - In `src/renderer/app.ts`:
    - Track `isFixedAppearance = false` and `isUsagiHidden = false` via `window.usagiAPI.onFixedAppearanceChanged` and `window.usagiAPI.onUsagiHiddenChanged`.
    - When `isFixedAppearance === true`, do NOT morph outfits on 3-click combo spin (unless `currentOutfitSelection === 'random'`).
    - When `isUsagiHidden === true` (and `!giantAlarmState.active`), clear the canvas, skip drawing Usagi/snacks, and force `window.usagiAPI.setIgnoreMouseEvents(true, { forward: true })` so Usagi is completely invisible and click-through.
  - In `src/dashboard/index.html` & `src/dashboard/dashboard.ts`:
    - In the **👗 Wardrobe & Outfits** card, add a mode row with `#fix-appearance-toggle-btn` showing `🔄 Auto-Change (30m)` when `fixed === false` and `🔒 Appearance Fixed` (with `.active` class) when `fixed === true`.
    - In the **🎮 Companion Modes & Actions** card, add a mode row `🙈 Hide Usagi (Do Not Disturb)` with button `#hide-usagi-toggle-btn` showing `🙈 Hide Usagi` when visible and `🐰 Show Usagi` (with `.active` class) when hidden.

- [x] **Step 4: Run Vitest, TypeScript check, Prettier, and Build, then Commit**
  - Run:
    ```bash
    CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run < /dev/null
    CI=true GIT_TERMINAL_PROMPT=0 npx --no-install -p typescript tsc --noEmit --pretty false < /dev/null
    CI=true GIT_TERMINAL_PROMPT=0 npm run build < /dev/null
    npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts"
    git add src/ tests/ docs/superpowers/plans/2026-10-26-wardrobe-fixed-rotation-and-hide-usagi.md
    git commit -m "feat(wardrobe,visibility): add 30m outfit auto-rotation with fix toggle and hide Usagi mode"
    ```
