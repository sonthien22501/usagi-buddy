# Usagi Anime Theme, Desktop Sticky Reminders & Playful Cursor Hug Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver v0.5.0 featuring (1) a persistent Desktop-Pinned Sticky Reminder / Checklist widget that sits behind normal application windows and triggers Usagi celebrations on task completion, (2) a Playful Cursor Keychain Hug physics mode with cat-wiggle pounce, pendulum swing, and mouse-shake-to-drop, and (3) a Warm Usagi Custard & Caramel Anime Theme overhaul across the Dashboard, Sticky Widget, and Floating Controls (with a Cozy Night Mode toggle).

**Architecture:**
- Pure, deterministic TypeScript state machines in `src/core/reminderStore.ts` (task CRUD, completion detection, JSON serialization) and `src/core/cursorHugController.ts` (pounce telegraph, keychain pendulum physics, mouse-shake direction reversal counter, and auto-release cooldown) tested thoroughly via Vitest.
- Electron Main process (`src/main/index.ts`) manages a new desktop-level frameless window (`stickyWindow` with `alwaysOnTop: false`, `skipTaskbar: true`, macOS `type: 'desktop'`/behind-apps window placement, and disk persistence in `userData/usagi-reminders.json`), plus IPC synchronization across Dashboard, Sticky Note, and Overlay Renderer.
- Dashboard (`src/dashboard/index.html`, `src/dashboard/dashboard.ts`), Sticky Note (`src/sticky/index.html`, `src/sticky/sticky.ts`), and Renderer (`src/renderer/index.html`, `src/renderer/app.ts`) receive the Usagi Custard & Caramel Anime Theme (`#FFF8E7` cream polka-dot background, `#FFF0C2` custard cards, `2.5px solid #5C3A21` manga borders, `#FF8FA3` strawberry blush accents, and `[data-theme="night"]` toggle).

**Tech Stack:** Electron, TypeScript, HTML5 2D Canvas, Esbuild, Vitest, Prettier.

**Spec:** User requirements from conversation (2026-10-26):
1. Desktop reminder/to-do checklist positioned on the desktop wallpaper level (not blocking active foreground apps), synced with Dashboard and rewarding task completion with Usagi cheering.
2. Usagi Custard & Caramel Anime Theme default (`custard` day default + `night` cozy toggle).
3. Cute Playful Cursor Keychain Hug mode: butt-wiggle pounce telegraph, dangling keychain pendulum physics underneath cursor, and shake-mouse-3-times to make Usagi dizzy (`@ _ @`) and drop off.

## Global Constraints

- Zero external npm runtime dependencies added (pure TypeScript + Node built-ins + Electron).
- Desktop Sticky Reminder window MUST NOT set `alwaysOnTop: true` so it never blocks foreground browsers or IDEs.
- Real OS cursor is never locked or hijacked; Cursor Hug attaches Usagi visually underneath the pointer (`cursorY + 44px`) with `setIgnoreMouseEvents(true, { forward: true })` while clinging so normal mouse clicks pass right through to underlying apps!
- All existing 80+ unit and integration tests must continue passing.

## Review Focus

1. **Corrupted or empty reminder JSON on disk**: `parseRemindersJson` must gracefully recover from malformed JSON, non-array payloads, or blank strings by returning default starter Usagi reminders without throwing.
2. **Blank / whitespace-only task titles**: `addReminderItem` must trim input, reject empty/whitespace-only strings without mutating the list, and cap length at 120 characters.
3. **Click-through blocking during Cursor Hug**: When Usagi is clinging right under the user's cursor (`phase === 'clinging'`), `shouldIgnoreMouseDuringHug` must return `true` so the user can still click buttons/links in their browser while Usagi dangles underneath their pointer!
4. **Mouse-shake false positives vs intentional shake**: Slow horizontal movement in one direction must NOT count as a shake; `recordCursorMovementForShake` must require rapid horizontal direction reversals (`|dx| >= 18px` with sign flip within `600ms`) reaching 3 reversals to trigger dizzy drop (`@ _ @`).
5. **Stationary or Sleeping override during Cursor Hug**: Activating `stationary` (Stay Still) or `sleeping` mode must immediately cancel any active Cursor Hug and return Usagi to calm state.

---

### Task 1: Reminder Store & Task Celebration Logic (`src/core/reminderStore.ts`)

**Files:**
- Create: `src/core/reminderStore.ts`
- Test: `tests/reminderStore.test.ts`

**Interfaces:**
- Produces:
  - `ReminderItem`: `{ id: string; text: string; completed: boolean; createdAtMs: number }`
  - `ReminderState`: `{ items: ReminderItem[]; stickyVisible: boolean; theme: 'custard' | 'night' }`
  - `createInitialReminderState(): ReminderState`
  - `addReminderItem(state: ReminderState, text: string, nowMs?: number): ReminderState`
  - `toggleReminderItem(state: ReminderState, id: string): { state: ReminderState; newlyCompleted: ReminderItem | null }`
  - `deleteReminderItem(state: ReminderState, id: string): ReminderState`
  - `clearCompletedReminders(state: ReminderState): ReminderState`
  - `parseRemindersJson(raw: string | null | undefined): ReminderState`
  - `serializeRemindersJson(state: ReminderState): string`

- [x] **Step 1: Write the failing test in `tests/reminderStore.test.ts`**

Cover starter tasks, adding valid vs whitespace/overlong tasks, toggling completion (`newlyCompleted` returned only when transitioning `false -> true`), deleting, clearing completed, theme & sticky visibility persistence, and corrupted JSON recovery (Review Focus #1 & #2).

- [x] **Step 2: Run test to verify it fails**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/reminderStore.test.ts < /dev/null`
Expected: FAIL with module `../src/core/reminderStore` not found.

- [x] **Step 3: Implement `src/core/reminderStore.ts`**

Implement pure state functions with max 120 chars per task, max 30 items, default `theme: 'custard'`, `stickyVisible: true`, and 3 cute starter tasks (`Drink a glass of water 💧`, `25m Focus Session with Usagi 🍮`, `Stretch shoulders & eyes ✨`).

- [x] **Step 4: Run test to verify it passes**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/reminderStore.test.ts < /dev/null`
Expected: PASS

- [x] **Step 5: Format & Commit**

```bash
npx --no-install prettier --write src/core/reminderStore.ts tests/reminderStore.test.ts
git add src/core/reminderStore.ts tests/reminderStore.test.ts
git commit -m "feat(reminders): add reminder store with task celebration detection and safe persistence"
```

---

### Task 2: Playful Cursor Keychain Hug & Shake-to-Drop Physics (`src/core/cursorHugController.ts`)

**Files:**
- Create: `src/core/cursorHugController.ts`
- Test: `tests/cursorHugController.test.ts`

**Interfaces:**
- Consumes: `Vector2D` from `src/core/physicsEngine.ts`
- Produces:
  - `CursorHugPhase`: `'idle' | 'pounce-wiggle' | 'clinging' | 'dizzy-drop' | 'cooldown'`
  - `CursorHugState`:
    ```ts
    export interface CursorHugState {
      enabled: boolean;
      phase: CursorHugPhase;
      phaseTimerMs: number;
      pendulumAngleRad: number;
      pendulumAngularVel: number;
      shakeReversals: number;
      lastMoveDirX: -1 | 0 | 1;
      lastReversalAtMs: number;
      lastCursorPos: Vector2D | null;
    }
    ```
  - `createCursorHugState(enabled?: boolean): CursorHugState`
  - `triggerCursorPounce(state: CursorHugState): CursorHugState`
  - `stepCursorHug(state: CursorHugState, usagiPos: Vector2D, cursorPos: Vector2D | null, dtMs: number, nowMs: number, blockedByMode?: boolean): { hugState: CursorHugState; targetPos: Vector2D | null; rotationOverride: number | null; speechBubbleOverride: string | null; soundTrigger?: 'hug-attach' | 'dizzy-drop' }`
  - `shouldIgnoreMouseDuringHug(state: CursorHugState): boolean`

- [x] **Step 1: Write the failing test in `tests/cursorHugController.test.ts`**

Test:
1. `triggerCursorPounce` enters `'pounce-wiggle'` for `550ms` with `!!` speech bubble and rapid wiggle rotation.
2. Transitions from `'pounce-wiggle'` to `'clinging'`, positioning Usagi at `{ x: cursor.x, y: cursor.y + 44 }` and swinging `pendulumAngleRad` proportionally to horizontal cursor velocity.
3. Rapid horizontal mouse shake (3 direction reversals with `|dx| >= 18` within `600ms`) transitions `'clinging' -> 'dizzy-drop'` with `'@ _ @ Wuuulaaaa!'` bubble and `'dizzy-drop'` sound trigger (Review Focus #4).
4. Auto-release after `9000ms` of clinging into `'cooldown'`.
5. `shouldIgnoreMouseDuringHug` returns `true` when `phase === 'clinging'` so OS clicks are never blocked (Review Focus #3), and `blockedByMode` (`stationary` or `sleeping`) immediately resets to `'idle'` (Review Focus #5).

- [x] **Step 2: Run test to verify it fails**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/cursorHugController.test.ts < /dev/null`
Expected: FAIL with module not found.

- [x] **Step 3: Implement `src/core/cursorHugController.ts`**

Implement the 5-phase state machine (`idle -> pounce-wiggle -> clinging -> dizzy-drop -> cooldown`) with spring-damped keychain pendulum physics (`pendulumAngleRad` bounded to `[-0.65, 0.65]`) and shake reversal detector.

- [x] **Step 4: Run test to verify it passes**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/cursorHugController.test.ts < /dev/null`
Expected: PASS

- [x] **Step 5: Format & Commit**

```bash
npx --no-install prettier --write src/core/cursorHugController.ts tests/cursorHugController.test.ts
git add src/core/cursorHugController.ts tests/cursorHugController.test.ts
git commit -m "feat(physics): add playful cursor keychain hug, pendulum swing, and shake-to-drop controller"
```

---

### Task 3: Desktop Sticky Reminder Window, IPC Bridge & Build Pipeline

**Files:**
- Create: `src/sticky/index.html`
- Create: `src/sticky/sticky.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Modify: `scripts/build.mjs`

**Interfaces:**
- Extends `UsagiAPI` in `src/preload/index.ts`:
  - `getReminderState: () => Promise<ReminderState>`
  - `onReminderStateChanged: (callback: (state: ReminderState) => void) => () => void`
  - `addReminder: (text: string) => void`
  - `toggleReminder: (id: string) => void`
  - `deleteReminder: (id: string) => void`
  - `clearCompletedReminders: () => void`
  - `toggleStickyWindow: () => void`
  - `setTheme: (theme: 'custard' | 'night') => void`
  - `onTaskCelebration: (callback: (taskText: string) => void) => () => void`
  - `onCursorHugChanged: (callback: (enabled: boolean) => void) => () => void`
  - `toggleCursorHug: () => void`
  - `triggerCursorHugNow: () => void`
  - `onTriggerCursorHugNow: (callback: () => void) => () => void`

- [x] **Step 1: Update `scripts/build.mjs` to bundle `src/sticky/sticky.ts` and copy `src/sticky/index.html` to `dist/sticky/`**
- [x] **Step 2: Create `src/sticky/index.html` and `src/sticky/sticky.ts`**
  - Styled as an authentic **Usagi Custard Sticky Quest Board** (`300x360` compact desktop note with draggable header bar, pudding/ear icon, quick `+` task input, interactive comic checkboxes, `Clear Done` button, and a hide-to-desktop button).
  - Supports `[data-theme="custard"]` (default) and `[data-theme="night"]`.
- [x] **Step 3: Wire IPC & Desktop-Pinned `stickyWindow` in `src/main/index.ts` and `src/preload/index.ts`**
  - Configure `stickyWindow` with `alwaysOnTop: false`, `skipTaskbar: true`, `frame: false`, `transparent: true`, `resizable: false`, positioned neatly at top-right of primary workArea (`width - 330`, `y: 48`). On macOS, set `fullscreenable: false` and keep `alwaysOnTop: false` so active apps naturally cover it while it remains pinned on the desktop space.
  - Persist `ReminderState` to `path.join(app.getPath('userData'), 'usagi-reminders.json')`.
  - When `toggleReminderItem` returns `newlyCompleted`, broadcast `'task-celebration'` to `mainWindow` so Usagi cheers and spins!

- [x] **Step 4: Verify TypeScript compilation and build**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npm run build < /dev/null && CI=true GIT_TERMINAL_PROMPT=0 npx --no-install -p typescript tsc --noEmit --pretty false < /dev/null`
Expected: PASS

- [x] **Step 5: Commit**

```bash
npx --no-install prettier --write src/preload/index.ts src/main/index.ts src/sticky/sticky.ts scripts/build.mjs
git add src/preload/index.ts src/main/index.ts src/sticky/index.html src/sticky/sticky.ts scripts/build.mjs
git commit -m "feat(sticky): add desktop-pinned Usagi reminder note window and IPC sync"
```

---

### Task 4: Usagi Custard Anime Theme Dashboard, Overlay Celebration & Cursor Hug Integration

**Files:**
- Modify: `src/dashboard/index.html`
- Modify: `src/dashboard/dashboard.ts`
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/app.ts`
- Modify: `tests/assetsIntegration.test.ts`

- [x] **Step 1: Write integration tests in `tests/assetsIntegration.test.ts`**
  - Assert that `src/sticky/index.html` and `src/sticky/sticky.ts` exist, Dashboard contains the Usagi Custard theme variables, Reminder Checklist controls, and Cursor Keychain Hug controls.

- [x] **Step 2: Redesign `src/dashboard/index.html` & `src/dashboard/dashboard.ts` with Usagi Custard & Caramel Anime Theme**
  - Default theme: **Usagi Custard Day** (`#FFF8E7` background with pastel polka-dots, `#FFF1C1` / `#FFFFFF` cards, `2.5px solid #5C3A21` comic borders, `0 4px 0 #E6C88A` neo-manga shadows, `#FF8FA3` strawberry buttons, `#5C3A21` caramel brown text) + header toggle button `☀️ Custard / 🌙 Night` (`[data-theme="night"]`).
  - Add **"Usagi Sticky Reminders (On Desktop)"** card in Dashboard: add/check tasks directly from Dashboard, toggle the Desktop Sticky Note visibility, and clear finished tasks.
  - Add **"Playful Cursor Hug 🐾"** toggle + **"Pounce Cursor Now!"** button in Usagi Actions card.

- [x] **Step 3: Integrate `CursorHugController` and Task Celebration into `src/renderer/app.ts` and `src/renderer/index.html`**
  - In `app.ts`, run `stepCursorHug` in the 60 FPS loop:
    - During `'pounce-wiggle'`, Usagi wiggles rapidly with a `!!` bubble.
    - During `'clinging'`, Usagi attaches under the cursor with pendulum swing, floating `♪ ★ ♥` anime notes drawn on the 2D canvas, and click-through enabled (`shouldIgnoreMouseDuringHug`) so the user's clicks never get blocked.
    - During `'dizzy-drop'`, Usagi shows `@ _ @ Wuuulaaaa!`, plays an audio clip, and tumbles safely back into swimming mode.
  - On `onTaskCelebration(taskText)`, Usagi triggers a happy spin boost, displays `"Yaha!! ✓ " + taskText`, and plays a cheerful sound effect!
  - Restyle the quick floating settings modal in `src/renderer/index.html` to match the Usagi Custard Anime theme.

- [x] **Step 4: Run full test suite, typecheck, and production build**

Run:
```bash
CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run < /dev/null
CI=true GIT_TERMINAL_PROMPT=0 npx --no-install -p typescript tsc --noEmit --pretty false < /dev/null
CI=true GIT_TERMINAL_PROMPT=0 npm run build < /dev/null
```
Expected: All test suites PASS, zero TypeScript errors, clean build.

- [x] **Step 5: Update `docs/ARCHITECTURE.md` and Commit**

```bash
npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts"
git add src/ tests/ docs/ARCHITECTURE.md
git commit -m "feat(theme,hug): ship Usagi Custard Anime theme, cursor keychain hug, and task celebrations"
```
