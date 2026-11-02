# Plan: Themed Taskbar Tray Popover & Kawaii SVG Icon Set

- **Branch**: `feat/themed-tray-popover-and-kawaii-icons`
- **BASE_SHA**: `a3a22f9eace7298922b6e45db56c41ca1a2a62c5`

## 1. Objective
1. Build a unified **Kawaii SVG Icon Set** (`src/core/kawaiiIcons.ts`) with warm caramel outlines (`currentColor` / `var(--border-color)`), rounded caps/joins, and soft pastel accent fills (`var(--accent-strawberry)`, `#ffe699`, `#a8e6cf`, etc.) that adapt seamlessly between **Custard Day (`custard`)** and **Cozy Night (`night`)** themes.
2. Replace bland/generic emoji icons across the **Dashboard** (`src/dashboard/index.html` & `src/dashboard/dashboard.ts`), **Sticky Note** (`src/sticky/index.html` & `src/sticky/sticky.ts`), and **Taskbar Dropdown** with this identical, cohesive kawaii SVG icon set.
3. Replace the bland native OS tray menu with a custom **Custard & Caramel Anime Tray Popover Window** (`src/tray/index.html` & `src/tray/tray.ts`) anchored to the system tray icon (`src/core/trayPositioner.ts` + `src/main/index.ts`) that shares the exact Dashboard theme (`custard` / `night`), updates live in real-time, and uses the identical kawaii SVG icon set.

## 2. Core Modules & Signatures

### A. `src/core/kawaiiIcons.ts` (New Pure Module)
- `export type KawaiiIconId =`
  - `'sun' | 'moon' | 'note' | 'volume' | 'volume-low' | 'mute' | 'music'`
  - `| 'timer' | 'tomato' | 'bolt' | 'wave' | 'coffee' | 'play' | 'pause' | 'reset'`
  - `| 'wardrobe' | 'usagi' | 'book' | 'tie' | 'shades' | 'star' | 'dice' | 'lock' | 'rotate'`
  - `| 'gamepad' | 'pin' | 'wand' | 'ghost' | 'pudding' | 'eye-hide' | 'dashboard' | 'door-quit' | 'plus' | 'check' | 'sparkle'`
- `export const KAWAII_ICONS: Record<KawaiiIconId, string>` — Validated `<svg class="kawaii-svg" viewBox="0 0 24 24" ...>` strings with `stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"` and soft theme-aware fills (`var(--accent-strawberry)`, `#ffe699`, etc.).
- `export function getKawaiiIcon(id: KawaiiIconId, size?: number): string` — Returns the SVG string for `id` (with optional `width`/`height` override, default `18`).
- `export function renderIconLabel(id: KawaiiIconId, label: string, size?: number): string` — Returns `<span class="kawaii-icon-wrap">${getKawaiiIcon(id, size)}</span><span>${label}</span>` for safe button rendering.

### B. `src/core/trayPositioner.ts` (New Pure Module)
- `export interface Rect { x: number; y: number; width: number; height: number; }`
- `export interface PopoverSize { width: number; height: number; }`
- `export function computeTrayPopoverPosition(trayBounds: Rect, workArea: Rect, popoverSize: PopoverSize): { x: number; y: number }`
  - Centers popover horizontally on `trayBounds.x + trayBounds.width / 2` (or top-right fallback if `trayBounds.width === 0 && trayBounds.x === 0`).
  - If tray icon is in the top half of screen (`trayBounds.y < workArea.y + workArea.height / 2`, e.g., macOS menu bar), positions popover just below tray (`trayBounds.y + trayBounds.height + 6`).
  - If tray icon is in the bottom half (e.g., Windows taskbar), positions popover just above tray (`trayBounds.y - popoverSize.height - 6`).
  - Clamps `x` and `y` strictly within `[workArea.x + 8, workArea.x + workArea.width - popoverSize.width - 8]` and `[workArea.y + 8, workArea.y + workArea.height - popoverSize.height - 8]`.

### C. `src/tray/index.html` & `src/tray/tray.ts` (New Custom Taskbar Popover Window)
- Shares the exact CSS variables (`[data-theme='custard']` and `[data-theme='night']`), polka-dot background, caramel borders (`2.5px solid var(--border-color)`), and rounded cards from `src/dashboard/index.html`.
- Compact popover layout (`width: 320px`, `height: 490px`):
  - **Header**: Usagi mini logo + `"Usagi Float"` + live status pill + Theme toggle button (`Custard` / `Night` with `sun`/`moon` kawaii SVG).
  - **Focus Timer Section**: Live countdown display (`25:00`), Phase badge (`IDLE`/`RUNNING`/`PAUSED`), Play/Pause toggle button (`#tray-start-pause-btn`) + Reset button (`#tray-reset-btn`), and Quick Duration Presets grid (`25m`, `52m`, `90m`, `5m Break`, `17m Break`, `1m Test` with kawaii SVG icons: `tomato`, `bolt`, `wave`, `coffee`).
  - **Quick Companion Actions**:
    - `#tray-open-dashboard-btn` (`dashboard` icon + `"Open Usagi Dashboard"`)
    - `#tray-toggle-sticky-btn` (`note` icon + `"Show/Hide Sticky Quests"`)
    - `#tray-toggle-hidden-btn` (`eye-hide` / `usagi` icon + `"Hide/Show Usagi Buddy"`)
    - `#tray-drop-snack-btn` (`pudding` icon + `"Drop Pudding Snack"`)
    - `#tray-toggle-ghost-btn` (`ghost` icon + `"Ghost Mode"`)
  - **Footer**: `#tray-quit-btn` (`door-quit` icon + `"Quit Usagi Float"`).
- Automatically syncs with `window.usagiAPI` (`onPomodoroStateChanged`, `onReminderStateChanged`, `onUsagiHiddenChanged`, `onGhostModeChanged`, `getReminderState`).

### D. `src/preload/index.ts`, `src/main/index.ts`, `scripts/build.mjs`
- Add to `UsagiAPI` in `src/preload/index.ts`:
  - `openDashboardWindow: () => void` (`ipcRenderer.send('open-dashboard-window')`)
  - `quitApp: () => void` (`ipcRenderer.send('quit-app')`)
  - `closeTrayPopover: () => void` (`ipcRenderer.send('close-tray-popover')`)
- In `src/main/index.ts`:
  - Add `trayWindow: BrowserWindow | null = null`.
  - Include `trayWindow` in `broadcastToAllWindows`.
  - Create `createTrayWindow()` and `toggleTrayWindow()` using `computeTrayPopoverPosition(tray.getBounds(), screen.getPrimaryDisplay().workArea, { width: 320, height: 500 })`.
  - Hide `trayWindow` on `blur` so clicking outside dismisses the dropdown naturally like a native taskbar menu.
  - On `tray.on('click')` and `tray.on('right-click')`, toggle `trayWindow` instead of showing the bland OS menu.
  - Handle IPC events `open-dashboard-window` (hides tray popover and calls `createDashboardWindow()`), `quit-app` (`app.quit()`), and `close-tray-popover` (`trayWindow?.hide()`).
- In `scripts/build.mjs`:
  - Create `dist/tray`, copy `src/tray/index.html` -> `dist/tray/index.html`, and bundle `src/tray/tray.ts` -> `dist/tray/tray.js`.

### E. Dashboard & Sticky Note Icon Upgrade (`src/dashboard/*`, `src/sticky/*`)
- Add `.kawaii-svg` and `.kawaii-icon-wrap` helper CSS in `src/dashboard/index.html`, `src/sticky/index.html`, and `src/tray/index.html` (`display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; flex-shrink: 0;`).
- Replace the emoji icons in `src/dashboard/index.html` and `src/dashboard/dashboard.ts` (Theme toggle, Card titles, Volume icons, Test Sound/Mute buttons, Timer preset chips, Start/Pause/Reset buttons, Wardrobe costume cards `classic`/`study`/`vest`/`sigma`/`star`/`random`, Outfit Rotation button, Companion Modes titles & buttons) with the unified `kawaiiIcons.ts` SVG set.
- Upgrade `src/sticky/index.html` & `src/sticky/sticky.ts` header/theme toggle icon with the same `kawaiiIcons.ts` SVG set so all 3 windows (Dashboard, Sticky Quests, Taskbar Dropdown) share the exact same icon system and theme.

## 3. TDD Plan & Verification Steps
1. **RED**:
   - Create `tests/kawaiiIcons.test.ts` testing that every `KawaiiIconId` returns a valid `<svg` with `viewBox="0 0 24 24"`, `class="kawaii-svg"`, custom size support, and `renderIconLabel` formatting.
   - Create `tests/trayPositioner.test.ts` testing `computeTrayPopoverPosition` for top menu bar (macOS), bottom taskbar (Windows), left/right screen edge clamping, and zero-bounds fallback.
   - Update `tests/assetsIntegration.test.ts` to assert that `src/tray/index.html`, `src/tray/tray.ts`, and `src/core/kawaiiIcons.ts` exist, share the `data-theme="custard"` / `[data-theme='night']` tokens, and are wired into `scripts/build.mjs`.
2. **GREEN**:
   - Implement `src/core/kawaiiIcons.ts`, `src/core/trayPositioner.ts`, `src/tray/index.html`, `src/tray/tray.ts`, and update `src/dashboard/*`, `src/sticky/*`, `src/preload/index.ts`, `src/main/index.ts`, and `scripts/build.mjs`.
3. **Format & Audit**:
   - Run `npx --no-install -p typescript tsc --noEmit --pretty false`
   - Run `npx --no-install vitest run`
   - Run `npm run build`
   - Run `python3 ~/.gemini/antigravity-cli/skills/ui-ux-pro-max/scripts/ui_audit.py src/`
   - Run `npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts"`

## 4. Review Focus (Top 5 Edge Cases)
1. **Theme Synchronization Across All Windows**: Toggling Day (`custard`) / Night (`night`) in either the Dashboard, Sticky Note, or Taskbar Tray Popover must immediately update `reminderState.theme` and broadcast to all open windows (`dashboardWindow`, `stickyWindow`, `trayWindow`).
2. **Cross-Platform Taskbar Positioning**: `computeTrayPopoverPosition` must handle both top menu bars (macOS `y < workArea.height / 2`) and bottom/side taskbars (Windows `y >= workArea.height / 2`) without overflowing screen boundaries.
3. **Click-Outside Auto-Dismiss**: The custom tray popover must hide cleanly on `blur` and when launching the full Dashboard (`open-dashboard-window`) so it never gets stuck over other apps.
4. **Identical Kawaii SVG Icon Rendering**: Buttons whose labels change dynamically in TS (`dashboard.ts`, `tray.ts`, `sticky.ts` — e.g. Start/Pause, Mute/Unmute, Pin/Pinned, Theme Day/Night) must use `innerHTML` with `renderIconLabel(...)` rather than overwriting `textContent` with plain emojis.
5. **Computed-Layout & Contrast Compliance**: All SVG icons must have explicit bounded dimensions (`width <= 28px`), flex buttons must maintain `display: inline-flex; align-items: center; gap: 6px`, and both Custard & Night themes must pass `ui_audit.py` with 0 errors.
