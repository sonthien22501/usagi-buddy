# Clean Auto-Change Label & Remove Annoying Cursor Keychain Hug Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Update the Wardrobe auto-change button label from `🔄 Auto-Change (30m)` to `🔄 Auto-Change` (removing `(30m)`), and (2) cleanly remove the `Cursor Keychain Hug` feature across the Dashboard, Renderer, Preload, Main, and tests so Usagi never blocks the mouse pointer.

**Architecture:**
- In `src/dashboard/index.html` and `src/dashboard/dashboard.ts`:
  - Change `🔄 Auto-Change (30m)` to `🔄 Auto-Change`.
  - Remove the `🐾 Cursor Keychain Hug` row (`#cursor-hug-toggle-btn` and `#pounce-cursor-btn`) and its event listeners.
- In `src/renderer/app.ts`, `src/preload/index.ts`, and `src/main/index.ts`:
  - Remove `cursorHugController` usage, IPC listeners (`cursor-hug-toggle`, `trigger-cursor-hug-now`), and `drawClingingNotes`.
- Delete `src/core/cursorHugController.ts` and `tests/cursorHugController.test.ts`, and update `tests/assetsIntegration.test.ts` and `docs/ARCHITECTURE.md` accordingly.

**Tech Stack:** Electron, TypeScript, HTML/CSS, Vitest, Prettier.

---

### Task 1: Update Auto-Change Button Text & Remove Cursor Keychain Hug

**Files:**
- Delete: `src/core/cursorHugController.ts`
- Delete: `tests/cursorHugController.test.ts`
- Modify: `src/dashboard/index.html`
- Modify: `src/dashboard/dashboard.ts`
- Modify: `src/renderer/app.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Modify: `tests/assetsIntegration.test.ts`
- Modify: `docs/ARCHITECTURE.md`

- [x] **Step 1: Update `tests/assetsIntegration.test.ts` and remove `tests/cursorHugController.test.ts`**
  - Remove `tests/cursorHugController.test.ts` and `src/core/cursorHugController.ts`.
  - In `tests/assetsIntegration.test.ts`, update the Dashboard assertion to verify `🔄 Auto-Change` is present (and NOT `Auto-Change (30m)`), and remove assertions for `cursor-hug-toggle-btn` / `pounce-cursor-btn`.

- [x] **Step 2: Update `src/dashboard/index.html` and `src/dashboard/dashboard.ts`**
  - Change `🔄 Auto-Change (30m)` to `🔄 Auto-Change` in both `src/dashboard/index.html` and `src/dashboard/dashboard.ts`.
  - Remove the Cursor Keychain Hug row from `src/dashboard/index.html` and remove `cursorHugToggleBtn` / `pounceCursorBtn` from `src/dashboard/dashboard.ts`.

- [x] **Step 3: Clean up `src/renderer/app.ts`, `src/preload/index.ts`, `src/main/index.ts`, and `docs/ARCHITECTURE.md`**
  - Remove all imports and calls to `cursorHugController` from `src/renderer/app.ts`.
  - Remove `onCursorHugChanged`, `toggleCursorHug`, `triggerCursorHugNow`, `onTriggerCursorHugNow` from `src/preload/index.ts` and `src/main/index.ts`.
  - Update `docs/ARCHITECTURE.md` to reflect the clean architecture.

- [x] **Step 4: Run Vitest, TypeScript check, Prettier, Build, and Commit**
  - Run:
    ```bash
    CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run < /dev/null
    CI=true GIT_TERMINAL_PROMPT=0 npx --no-install -p typescript tsc --noEmit --pretty false < /dev/null
    CI=true GIT_TERMINAL_PROMPT=0 npm run build < /dev/null
    npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts"
    git add -A
    git commit -m "refactor(ui,wardrobe): simplify Auto-Change label and remove cursor keychain hug"
    ```
