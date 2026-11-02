# UX Polish & App Memory/Storage Optimization Plan (`ux-polish-and-app-optimization`)

- **Base Commit SHA**: `9f073357a8b9afeff36323f12801b94a95d2edc8`
- **Target Stack**: Electron + TypeScript + HTML5 Canvas + ESBuild + Vitest

## 1. Root Cause Analysis & Objectives

1. **Single-Click Tab Activation in Dashboard (`acceptFirstMouse: true`)**:
   - **Root Cause**: `dashboardWindow` in `src/main/index.ts` is created without `acceptFirstMouse: true`, whereas `stickyWindow` has `acceptFirstMouse: true`. On macOS, clicking "Settings" or "Companion" when the Dashboard window is not focused requires 1 click to focus the window and a 2nd click to trigger the tab button.
   - **Fix**: Enable `acceptFirstMouse: true` on `dashboardWindow` and `trayWindow` in `src/main/index.ts`, and add `pointerdown` fallback or immediate click responsiveness on the tab switcher buttons so switching tabs always responds on the very first click.

2. **Remove Ghost Mode & Simplify Timer Presets in Taskbar Tray Dropdown**:
   - **Ghost Mode Removal**: Remove `#tray-toggle-ghost-btn` and its listener/icon/state from `src/tray/index.html` and `src/tray/tray.ts` (keep Ghost Mode in Dashboard and shortcut `Cmd/Ctrl+Shift+G`).
   - **Simplify Timer Options**: Reduce the 6 cluttered tray timer preset chips (`25m`, `52m`, `90m`, `5m Rest`, `17m Rest`, `1m Test`) down to the **3 core focus durations (`25m`, `52m`, `90m`)** in a clean 1-row grid. Adjust tray popover height from `490px` to `410px` so there is no dead whitespace.

3. **Storage, Bundle & RAM Optimization**:
   - **Lazy Tray Window Creation**: Stop pre-creating `trayWindow` on app startup (`app.whenReady`) in `src/main/index.ts`. Only instantiate `trayWindow` when the user clicks the tray icon (`toggleTrayWindow`). Similarly, only create `stickyWindow` on startup if `reminderState.stickyVisible` is `true`! This saves 1–2 full Chromium renderer processes (~60–120 MB RAM) at launch.
   - **Lazy Sprite & Giant Alarm Texture Loading (`src/renderer/app.ts`)**:
     - Currently `loadAllSprites()` decodes all 6 `1170x1560` PNGs (`Usagi1..6.png`, ~43 MB raw RGBA bitmap scan) + all 4 costumes + both giant alarm sprites eagerly at startup, even though `UPRIGHT_SPRITE_INDEX` (`Usagi3.png`) is the only classic sprite rendered!
     - **Fix**: Only load `Usagi3.png` at startup for instant launch and low RAM, load custom costumes on-demand when selected (caching in `costumeFrames`), and load `Usagi_Big.png` / `Usagi_Big2.png` on-demand or lazily when needed. Release temporary offscreen canvases immediately (`offscreen.width = 0; offscreen.height = 0;`).
   - **Idle / Hidden Renderer CPU & GPU Saver (`src/renderer/app.ts` & `src/main/index.ts`)**:
     - When `isUsagiHidden && !giantAlarmState.active`, throttle the loop via `setTimeout(..., 250)` instead of spinning `requestAnimationFrame` at 60 FPS clearing the full-screen canvas every 16ms.
     - In `src/main/index.ts`, only run the 33ms `cursorInterval` when `shouldFollowCursor(...)` is actually active (start/stop dynamically in `applyModes` / `setupCursorTrackingTicker`), eliminating a permanent 30Hz timer when Follow Mouse mode is off.
   - **Bundle & Packaging Diet (`scripts/build.mjs` & `package.json`)**:
     - Enable `minify: true` and `sourcemap: false` in `scripts/build.mjs` (eliminating `.js.map` bloat from `dist/` and packaged apps).
     - Exclude unused `Usagi1.png`, `Usagi2.png`, `Usagi4.png`, `Usagi5.png`, `Usagi6.png` from copying into `dist/assets/` in `scripts/build.mjs`, and remove redundant `"assets/**/*"` from `package.json` `build.files` (since `dist/assets/**/*` is already inside `dist/**/*`, preventing double-bundling 3.1 MB of assets twice in the installer!).

---

## 2. Step-by-Step TDD Implementation Plan

### Step 1 (RED): Update & Add Verification Tests in `tests/assetsIntegration.test.ts`
- Update `tests/assetsIntegration.test.ts` to assert:
  1. `src/main/index.ts` sets `acceptFirstMouse: true` on `dashboardWindow` and `trayWindow`.
  2. `src/tray/index.html` and `src/tray/tray.ts` do **not** contain `tray-toggle-ghost-btn`, `chip-5m`, `chip-17m`, or `chip-1m`, and **do** contain the 3 core focus presets (`chip-25m`, `chip-52m`, `chip-90m`).
  3. `scripts/build.mjs` minifies bundles (`minify: true`) and omits sourcemaps (`sourcemap: false`) and only copies active sprites into `dist/assets`.
  4. `package.json` `build.files` does not duplicate `assets/**/*` alongside `dist/**/*`.
- Run `npx --no-install vitest run` and verify it fails (RED).

### Step 2 (GREEN): Implement Fixes & Optimizations
1. **`src/main/index.ts`**:
   - Add `acceptFirstMouse: true` to `dashboardWindow` and `trayWindow` options.
   - In `app.whenReady()`, only call `createStickyWindow()` if `reminderState.stickyVisible` is `true`, and remove eager `createTrayWindow()` on startup (it is already created on demand inside `toggleTrayWindow()`).
   - Update `toggleTrayWindow()` popover height from `490` to `410` (matching the streamlined tray UI).
   - Optimize `setupCursorTrackingTicker()` so the 33ms `setInterval` is only active while `shouldFollowCursor(...)` is true, and stopped immediately when false.
2. **`src/dashboard/dashboard.ts`**:
   - Bind `pointerdown` (in addition to `click`) on `dashTabCompanion` and `dashTabConfig` so tab switching is instantaneous on first press without waiting for mouseup or focus bounce.
3. **`src/tray/index.html` & `src/tray/tray.ts`**:
   - Remove `#tray-toggle-ghost-btn` HTML block from `src/tray/index.html` and remove `toggleGhostBtn`, `ghostIcon`, `ghostText`, `ghostStatus`, `isGhostLocked`, `updateGhostUI`, and `onGhostModeChanged` from `src/tray/tray.ts`.
   - Remove `#chip-5m`, `#chip-17m`, `#chip-1m` from `src/tray/index.html`, keeping the 3 clean focus presets (`25m`, `52m`, `90m`) with slightly more comfortable padding (`padding: 5px 4px; font-size: 11px`).
   - Reduce `html, body` height in `src/tray/index.html` from `490px` to `410px`.
4. **`src/renderer/app.ts`**:
   - Optimize `processImageToFrame` to zero out `offscreen.width = 0; offscreen.height = 0;` after extracting/downscaling so the full-resolution temporary canvas buffer is garbage-collected immediately.
   - Optimize `loadAllSprites()` to load only `Usagi3.png` (and the active costume if not classic) at startup, plus lazy on-demand helpers `ensureCostumeLoaded(costumeId)` and `ensureGiantSpritesLoaded()`.
   - When `isUsagiHidden && !giantAlarmState.active`, use `setTimeout(() => requestAnimationFrame(animationLoop), 250)` so hidden mode uses near-zero CPU/GPU.
5. **`scripts/build.mjs` & `package.json`**:
   - In `scripts/build.mjs`, set `minify: true, sourcemap: false` on all `esbuild.build` targets, clean old `.map` files from `dist/`, and skip copying unused `Usagi1.png`, `Usagi2.png`, `Usagi4.png`, `Usagi5.png`, `Usagi6.png` into `dist/assets/`.
   - In `package.json`, change `"files": ["dist/**/*", "package.json"]` so `electron-builder` does not package two copies of `assets/`.

### Step 3: Format, Build & Full Verification
- Run `npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts" "scripts/**/*.mjs"`
- Run `npm run build`
- Run `npx --no-install vitest run`
- Run `python3 ~/.gemini/antigravity-cli/skills/ui-ux-pro-max/scripts/ui_audit.py src`

---

## 3. Review Focus (Top 5 Edge Cases & Failure Modes)
1. **First-click tab switch when window unfocused**: `acceptFirstMouse: true` on `dashboardWindow` + `pointerdown` tab switching must not double-fire `updateDashboardTab` IPC if `click` also fires (guard with `if (activeTab === tab) return` or idempotent check).
2. **Lazy `trayWindow` & `stickyWindow` state hydration**: When `trayWindow` or `stickyWindow` is created lazily on first click, `did-finish-load` must call `sendFullStateToWindow` so its timer, sticky status, and hidden status are immediately synced.
3. **On-demand costume & giant alarm sprite loading**: When switching to a costume or randomizing on combo click, `ensureCostumeLoaded(id)` must load the sprite if not yet cached while gracefully displaying `uprightFrame` for the 1 frame it takes to decode.
4. **Asset tests compatibility**: Existing `tests/assetsIntegration.test.ts` checks `assets/Usagi1..6.png` in source `assets/`; source `assets/` remains untouched while `dist/assets/` and `package.json` exclude duplicates.
5. **Tray popover height consistency**: `src/tray/index.html` CSS height (`410px`) and `src/main/index.ts` `BrowserWindow` / `computeTrayPopoverPosition` height (`410`) must match so the popover is neither clipped nor floating away from the taskbar.
