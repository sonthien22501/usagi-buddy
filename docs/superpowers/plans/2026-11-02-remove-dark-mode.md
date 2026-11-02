# Remove Dark / Night Mode Plan

**Base Commit SHA**: `6151812a08ef874fbba5dea6567e3478d1b55089`

## Goal
Remove Dark ("Night") Mode across Usagi Buddy (`src/core/reminderStore.ts`, `src/dashboard/`, `src/sticky/`, `src/tray/`, `src/main/index.ts`, `src/preload/index.ts`) so the entire application uses the high-contrast, legible **Custard & Caramel** theme exclusively, preventing hard-to-read text and low-contrast icon issues.

## Assumptions
1. Legacy saved `reminders.json` files that contain `"theme": "night"` must normalize cleanly to `"custard"` on load so existing users are automatically migrated to the bright Custard theme.
2. `ReminderState.theme` is locked to `'custard'` (and `setTheme` / `set-theme` IPC can either be removed or normalized to `'custard'` if kept, or cleanly removed from UI & IPC since no UI triggers it). Let's remove the Night Mode toggle buttons (`#theme-toggle-btn`, `#themeToggleBtn`, `#tray-theme-toggle-btn`), `[data-theme='night']` CSS blocks, and normalize `ReminderState.theme` to `'custard'`.
3. Keep `sun` and `moon` icons in `KAWAII_ICONS` (`src/core/kawaiiIcons.ts`) so `kawaiiIcons.test.ts` and the icon library remain intact.

## Review Focus (Top 5 Edge Cases / Failure Modes)
1. **Legacy Persisted State Migration**: If a user already had Night mode saved in `reminders.json` (`{"theme": "night"}`), `deserializeReminders()` in `src/core/reminderStore.ts` must normalize `theme` to `'custard'` instead of `'night'`.
2. **HTML & CSS Cleanup**: `[data-theme='night']` CSS rules and theme toggle buttons (`#theme-toggle-btn` in `src/dashboard/index.html`, `#themeToggleBtn` in `src/sticky/index.html`, `#tray-theme-toggle-btn` in `src/tray/index.html`) must be removed without breaking header flex alignment in Dashboard, Sticky Note, or Tray Popover.
3. **Controller Null-Safety & Dead Code Removal**: Remove `themeToggleBtn`, `updateThemeUI`, and `setTheme` listeners in `src/dashboard/dashboard.ts`, `src/sticky/sticky.ts`, and `src/tray/tray.ts`, keeping `data-theme="custard"` on `<body>`.
4. **Main & Preload Cleanliness**: In `src/main/index.ts` and `src/preload/index.ts`, either remove `set-theme` / `setTheme` or force `'custard'` so no dead night-mode IPC remains. Verify `tests/assetsIntegration.test.ts` and `tests/reminderStore.test.ts` are updated to assert dark mode is gone and `'night'` normalizes to `'custard'`.
5. **Computed-Layout & Contrast Verification**: Run `ui_audit.py` and full `vitest` + `tsc --noEmit` + `npm run build` to ensure zero broken selectors or layout regressions.

## Step-by-Step TDD Tasks

### Task 1: Normalize `ReminderState.theme` to `'custard'` in `src/core/reminderStore.ts` & Update `tests/reminderStore.test.ts`
- **Files**:
  - `tests/reminderStore.test.ts`
  - `src/core/reminderStore.ts`
- **Step 1 (RED)**:
  - Update `tests/reminderStore.test.ts`:
    - Change the serialization/deserialization test to verify that even if raw JSON contains `"theme": "night"`, `deserializeReminders` always returns `theme: 'custard'`.
  - Run `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/reminderStore.test.ts < /dev/null` and verify failure.
- **Step 2 (GREEN)**:
  - In `src/core/reminderStore.ts`:
    - Change `ReminderState['theme']` type to `'custard'`.
    - In `deserializeReminders`, set `const theme: 'custard' = 'custard';` so any legacy `'night'` value is coerced to `'custard'`.
  - Re-run `tests/reminderStore.test.ts` and verify PASS.

### Task 2: Remove Dark Mode CSS, Toggle Buttons, and Theme Switchers Across Dashboard, Sticky Note, Tray, Preload, and Main
- **Files**:
  - `tests/assetsIntegration.test.ts`
  - `src/dashboard/index.html`
  - `src/dashboard/dashboard.ts`
  - `src/sticky/index.html`
  - `src/sticky/sticky.ts`
  - `src/tray/index.html`
  - `src/tray/tray.ts`
  - `src/preload/index.ts`
  - `src/main/index.ts`
- **Step 1 (RED)**:
  - Update `tests/assetsIntegration.test.ts`:
    - In dashboard test: assert `html` contains `data-theme="custard"`, does NOT contain `[data-theme='night']`, and does NOT contain `theme-toggle-btn`.
    - In tray test: assert `trayHtml` contains `data-theme="custard"`, does NOT contain `[data-theme='night']`, and does NOT contain `tray-theme-toggle-btn`.
    - Also assert `sticky/index.html` does NOT contain `[data-theme='night']` or `themeToggleBtn`.
  - Run `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/assetsIntegration.test.ts < /dev/null` and verify failure.
- **Step 2 (GREEN)**:
  - In `src/dashboard/index.html`:
    - Remove `[data-theme='night'] { ... }` block and `.theme-btn` CSS rules.
    - Remove `<button id="theme-toggle-btn" class="theme-btn">🌙 Night</button>` from the header.
  - In `src/dashboard/dashboard.ts`:
    - Remove `themeToggleBtn`, `updateThemeUI`, and its click listener. Keep `document.body.setAttribute('data-theme', 'custard')`.
  - In `src/sticky/index.html`:
    - Remove `[data-theme='night'] { ... }` block.
    - Remove `<button id="themeToggleBtn" class="btn-icon" title="Toggle Theme">🌙</button>` from header actions.
  - In `src/sticky/sticky.ts`:
    - Remove `themeToggleBtn` reference, icon toggle logic in `render()`, and click listener.
  - In `src/tray/index.html`:
    - Remove `[data-theme='night'] { ... }` block and `.theme-btn` CSS rules.
    - Remove `<button id="tray-theme-toggle-btn" ...>...</button>` from the tray header.
  - In `src/tray/tray.ts`:
    - Remove `themeToggleBtn`, `themeIconWrap`, `themeText`, `updateThemeUI`, and click listener.
  - In `src/preload/index.ts` and `src/main/index.ts`:
    - Remove `setTheme` / `set-theme` IPC wiring (or keep unused if nothing references it; removing cleanly is preferred).
- **Step 3 (Verify, Format & Build)**:
  - Run `npx --no-install -p typescript tsc --noEmit --pretty false`
  - Run `npx --no-install vitest run`
  - Run `npm run build`
  - Run `npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts"`
- **Step 4 (Commit)**:
  - Update `docs/ARCHITECTURE.md` to reflect single Custard & Caramel theme (`theme: 'custard'`).
  - Commit cleanly with `git commit -m "refactor(theme): remove dark night mode and lock Custard & Caramel theme"`.
