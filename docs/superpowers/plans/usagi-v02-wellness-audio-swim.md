# Usagi Float v0.2 (60 FPS Swimming, Voice Audio & Gentle Wellness Coach) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Usagi Float from stepped 6-frame rotation to buttery-smooth 60 FPS kick-and-glide swimming using the upright `Usagi3.png` frame, wire the 6 custom `.mp3` voice clips (`una`, `bryy`, `huhhhh?`, `urararusk`, `unayahayahauna`, `wuuulaaaa`), add an optional Play/Cursor-Follow mode, and integrate a gentle, non-intrusive Wellness & AFK Sleep Coach with daily stats in the System Tray.

**Architecture:** Extend `src/core/physicsEngine.ts` with 60 FPS continuous swim-stroke phase (`swimPhaseRad`), squash-and-stretch (`scaleX`, `scaleY`), banking tilt into the movement vector, rapid combo-click spin tornado detection, and optional cursor-target steering. Add pure core modules `src/core/soundManager.ts` (URL-safe MP3 asset resolver + cooldown/mute state) and `src/core/wellnessCoach.ts` (30-min gentle non-blocking reminder + 2-min OS idle sleep mode + daily stats), and wire them into Electron Main/Preload/Renderer.

**Tech Stack:** Electron, TypeScript, HTML5 2D Canvas, Web Audio (`HTMLAudioElement`), Vitest, esbuild, Prettier.

**Spec:** `docs/ARCHITECTURE.md` and `REQUIREMENTS.md`

## Global Constraints

- **Node / TS Tooling:** Always run local tools via `npx --no-install` (`npx --no-install vitest run`, `npx --no-install -p typescript tsc --noEmit --pretty false`, `npx --no-install prettier --write`).
- **60 FPS Upright Swimming:** Default swimming locks `frameIndex = 2` (`Usagi3.png`, the upright sprite) and uses continuous 60 FPS `rotation` (gentle banking tilt `[-0.28, 0.28]` rad when swimming, full 360° smooth spin when `spinBoostTimerMs > 0`) and squash-and-stretch (`scaleX`, `scaleY` in `[0.92, 1.08]`), eliminating the 10 FPS stepped slideshow spin.
- **Non-Intrusive Wellness Reminders:** Break prompts must NEVER block the screen or force the user to stand up—they simply show a cute speech bubble for a few seconds, play `huhhhh?.mp3` once, and immediately reset `activeScreenMs = 0`.
- **Special Filename Encoding:** `huhhhh?.mp3` contains a literal `?` character and MUST be encoded via `encodeURIComponent` (`huhhhh%3F.mp3`) when constructing audio URLs so Chromium/Electron does not strip `?` as a query string.

## Review Focus

1. **Filename with `?` in `huhhhh?.mp3` (`soundManager.ts`):** `resolveSoundAssetUrl('huhhhh?.mp3', '../assets')` must encode `?` as `%3F` (`'../assets/huhhhh%3F.mp3'`) so `new Audio(url)` loads the file on macOS and Windows instead of failing with `ERR_FILE_NOT_FOUND`.
2. **Sound cooldown & mute gate (`soundManager.ts`):** Rapid events within `cooldownMs` (default `250ms`) or while `muted === true` must return `played: false, file: null` so rapid clicks or overlapping triggers never spam audio channels.
3. **Non-nagging wellness reminder reset (`wellnessCoach.ts`):** Reaching the 30-minute active screen threshold emits a gentle reminder once and immediately resets `activeScreenMs` to `0` (never nagging repeatedly on subsequent ticks if the user continues working).
4. **AFK sleep-to-awake transition (`wellnessCoach.ts`):** Entering AFK (`systemIdleSeconds >= 120`) sets `mood: 'sleeping'` and pauses `activeScreenMs` accumulation; only transitioning from `'sleeping'` back to `'active'` (`systemIdleSeconds < 120`) increments `breaksTaken` by 1 and triggers `welcomeBack: true`.
5. **60 FPS upright swimming vs. combo spin damping (`physicsEngine.ts`):** During normal swimming (`spinBoostTimerMs === 0`), `frameIndex` stays locked to `2` (`Usagi3.png`) and `rotation` stays bounded within banking tilt `[-0.35, 0.35]` rad; clicking 3+ times while spinning (`comboClicks >= 3`) boosts `angularVelocity` to super-spin speed and smoothly normalizes `rotation` back toward `0` once `spinBoostTimerMs` expires.

---

### Task 1: 60 FPS Organic Kick-and-Glide Swimming, Combo Spin & Cursor Follow

**Files:**
- Modify: `src/core/physicsEngine.ts`
- Modify: `tests/physicsEngine.test.ts`

**Interfaces:**
- Produces in `src/core/physicsEngine.ts`:
  - `export interface UsagiState { x: number; y: number; vx: number; vy: number; rotation: number; angularVelocity: number; swimPhaseRad: number; scaleX: number; scaleY: number; frameIndex: number; frameTimerMs: number; spinBoostTimerMs: number; comboClicks: number; speechBubble: string | null; speechTimerMs: number; scaleFlipX: 1 | -1; snacksEaten: number; sleeping: boolean; }`
  - `export const UPRIGHT_SPRITE_INDEX = 2;`
  - `export function createInitialUsagiState(screen: ScreenBounds, config?: Partial<PhysicsConfig>): UsagiState`
  - `export function triggerUsagiInteraction(state: UsagiState, phraseIndex?: number, config?: Partial<PhysicsConfig>): UsagiState`
  - `export function stepUsagiPhysics(state: UsagiState, dtMs: number, screen: ScreenBounds, snack?: SnackTarget | null, config?: Partial<PhysicsConfig>, cursorTarget?: Vector2D | null): { state: UsagiState; snackConsumed: boolean }`

- [ ] **Step 1: Update `tests/physicsEngine.test.ts` with 60 FPS upright swimming, squash-and-stretch, combo click spin, and cursor-follow tests (RED)**

Add assertions verifying:
- In normal swimming (`spinBoostTimerMs === 0`), `state.frameIndex` remains `UPRIGHT_SPRITE_INDEX` (`2`, i.e., `Usagi3.png`), `state.swimPhaseRad` advances smoothly, `state.scaleX` and `state.scaleY` oscillate smoothly within `[0.9, 1.1]`, and `Math.abs(state.rotation)` stays bounded within `<= 0.35` radians (smooth banking tilt, NOT spinning 360° in place!).
- Clicking Usagi increments `comboClicks`; clicking 3 times while `spinBoostTimerMs > 0` boosts `Math.abs(state.angularVelocity)` higher than a single click (`> 18` rad/s) and sets an excited speech bubble.
- Passing `cursorTarget` (when Play Mode is active and no snack is active) steers `(vx, vy)` toward `cursorTarget`.
- When `state.sleeping === true`, Usagi drifts slowly with `"Zzz..."` speech bubble.

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/physicsEngine.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`

- [ ] **Step 3: Implement 60 FPS kick-and-glide swimming, squash-and-stretch, combo spin, and cursor steering in `src/core/physicsEngine.ts`**

- Set `UPRIGHT_SPRITE_INDEX = 2` (`Usagi3.png`).
- In `stepUsagiPhysics`:
  - Advance `swimPhaseRad = (state.swimPhaseRad + dtSec * (state.sleeping ? 1.5 : 4.2)) % (Math.PI * 2)`.
  - Compute rhythmic swim stroke pulse `stroke = Math.sin(swimPhaseRad)`:
    - `scaleX = 1 + stroke * 0.055`, `scaleY = 1 - stroke * 0.055` (subtle organic jellyfish/otter propulsion).
    - During normal swimming (no snack, no cursorTarget, not sleeping), apply a gentle rhythmic swim thrust along current heading plus a soft sine-wave vertical buoyancy wave (`Math.cos(swimPhaseRad) * 18 * dtSec`) so Usagi swims in graceful undulating arcs across the desktop instead of a rigid straight line.
  - If `snack && snack.active`: steer toward `snack`. Else if `cursorTarget`: steer smoothly toward `cursorTarget`.
  - When `spinBoostTimerMs > 0`: integrate `rotation += angularVelocity * dtSec`. When `spinBoostTimerMs === 0`: smoothly bank `rotation` toward `targetTilt = Math.max(-0.28, Math.min(0.28, (vy / cfg.maxSpeed) * 0.22 * scaleFlipX + Math.sin(swimPhaseRad) * 0.06))` so Usagi stays upright and tilts naturally into his swim curve!
- In `triggerUsagiInteraction`:
  - Increment `comboClicks = state.spinBoostTimerMs > 0 ? state.comboClicks + 1 : 1`.
  - If `comboClicks >= 3`, boost `angularVelocity` to `cfg.spinBoostAngularVelocity * 1.65` (`~20.6` rad/s) and set `spinBoostTimerMs = cfg.spinBoostDurationMs * 1.3`.

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/physicsEngine.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`

---

### Task 2: Sound Effect Mapper, URL-Safe Asset Resolver & Cooldown/Mute Gate

**Files:**
- Create: `src/core/soundManager.ts`
- Test: `tests/soundManager.test.ts`
- Modify: `tests/assetsIntegration.test.ts`

**Interfaces:**
- Produces in `src/core/soundManager.ts`:
  - `export type SoundEvent = 'click-normal' | 'click-combo' | 'snack-eaten' | 'wellness-reminder' | 'welcome-back';`
  - `export const SOUND_ASSET_FILES = ['una.mp3', 'bryy.mp3', 'huhhhh?.mp3', 'urararusk.mp3', 'unayahayahauna.mp3', 'wuuulaaaa.mp3'] as const;`
  - `export interface SoundState { muted: boolean; lastPlayedAtMs: number; normalClickCounter: number; comboClickCounter: number; cooldownMs: number; }`
  - `export function createSoundState(muted?: boolean, cooldownMs?: number): SoundState`
  - `export function resolveSoundAssetUrl(filename: string, baseDir?: string): string`
  - `export function selectSoundForEvent(state: SoundState, event: SoundEvent, nowMs: number): { state: SoundState; file: string | null; url: string | null }`

- [ ] **Step 1: Write the failing tests in `tests/soundManager.test.ts` and update `tests/assetsIntegration.test.ts` (RED)**

 verify:
- `resolveSoundAssetUrl('huhhhh?.mp3', '../../assets')` returns `'../../assets/huhhhh%3F.mp3'` (Review Focus #1).
- `'click-normal'` alternates between `'una.mp3'` and `'bryy.mp3'`.
- `'click-combo'` alternates between `'urararusk.mp3'` and `'wuuulaaaa.mp3'`.
- `'snack-eaten'` and `'welcome-back'` select `'unayahayahauna.mp3'`.
- `'wellness-reminder'` selects `'huhhhh?.mp3'` with URL `'../../assets/huhhhh%3F.mp3'`.
- Cooldown gate (`nowMs - lastPlayedAtMs < cooldownMs`) and `muted: true` return `file: null, url: null` (Review Focus #2).
- `tests/assetsIntegration.test.ts` verifies all 6 `.mp3` files in `SOUND_ASSET_FILES` exist in `assets/` and are non-empty (`size > 1000` bytes).

- [ ] **Step 2: Run tests to verify failure (RED)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/soundManager.test.ts tests/assetsIntegration.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`

- [ ] **Step 3: Implement `src/core/soundManager.ts`**

Implement `createSoundState`, `resolveSoundAssetUrl`, and `selectSoundForEvent`.

- [ ] **Step 4: Run tests to verify PASS (GREEN)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/soundManager.test.ts tests/assetsIntegration.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`

---

### Task 3: Gentle Non-Intrusive Wellness Reminder, AFK Sleep Mode & Daily Stats

**Files:**
- Create: `src/core/wellnessCoach.ts`
- Test: `tests/wellnessCoach.test.ts`

**Interfaces:**
- Produces in `src/core/wellnessCoach.ts`:
  - `export interface DailyStats { snacksFed: number; pomodorosCompleted: number; breaksTaken: number; }`
  - `export interface WellnessConfig { readonly reminderIntervalMs: number; readonly afkThresholdSeconds: number; }`
  - `export interface WellnessState { activeScreenMs: number; mood: 'active' | 'sleeping'; reminderIndex: number; stats: DailyStats; }`
  - `export interface WellnessTickResult { state: WellnessState; reminderMessage: string | null; enteredSleep: boolean; welcomeBack: boolean; }`
  - `export const DEFAULT_WELLNESS_CONFIG: WellnessConfig` (`reminderIntervalMs: 30 * 60 * 1000`, `afkThresholdSeconds: 120`)
  - `export const GENTLE_WELLNESS_MESSAGES: readonly string[]` (`['💧 Una! Sip some water~', '👀 Yaha! Rest your eyes for a bit~', '🧘 Ura~ Little stretch if you want!']`)
  - `export function createWellnessState(): WellnessState`
  - `export function recordSnackFed(state: WellnessState): WellnessState`
  - `export function recordPomodoroCompleted(state: WellnessState): WellnessState`
  - `export function formatStatsTrayLabel(stats: DailyStats): string`
  - `export function tickWellnessCoach(state: WellnessState, elapsedMs: number, systemIdleSeconds: number, config?: Partial<WellnessConfig>): WellnessTickResult`

- [ ] **Step 1: Write the failing test in `tests/wellnessCoach.test.ts` (RED)**

Verify:
- Accumulates `activeScreenMs` while `systemIdleSeconds < afkThresholdSeconds`.
- When `activeScreenMs >= reminderIntervalMs` (30 mins), emits a cute `reminderMessage` from `GENTLE_WELLNESS_MESSAGES` once and immediately resets `activeScreenMs = 0` so subsequent ticks do not nag or force the user (Review Focus #3).
- When `systemIdleSeconds >= afkThresholdSeconds` (120s), sets `mood: 'sleeping'`, `enteredSleep: true`, and stops accumulating `activeScreenMs` (Review Focus #4).
- When user returns (`systemIdleSeconds < 120` while `mood === 'sleeping'`), transitions `mood` to `'active'`, sets `welcomeBack: true`, resets `activeScreenMs = 0`, and increments `stats.breaksTaken` by 1.
- `recordSnackFed`, `recordPomodoroCompleted`, and `formatStatsTrayLabel` accurately track and format daily stats (`"🍮 Snacks: 2 | 🍅 Pomodoros: 1 | 💧 Breaks: 3"`).

- [ ] **Step 2: Run test to verify failure (RED)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/wellnessCoach.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`

- [ ] **Step 3: Implement `src/core/wellnessCoach.ts`**

Implement `createWellnessState`, `recordSnackFed`, `recordPomodoroCompleted`, `formatStatsTrayLabel`, and `tickWellnessCoach`.

- [ ] **Step 4: Run test to verify PASS (GREEN)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/wellnessCoach.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`

---

### Task 4: Build Script MP3 Sync, Electron Main Tray/Idle Integration & 60 FPS Renderer

**Files:**
- Modify: `scripts/build.mjs`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/app.ts`

**Interfaces:**
- `scripts/build.mjs`: Copies both `.png` and `.mp3` files from `assets/` to `dist/assets/`.
- `src/preload/index.ts`: Adds `onPlayModeChanged`, `onSoundMutedChanged`, `onWellnessUpdate` (`{ mood, message, soundEvent }`) to `window.usagiAPI`.
- `src/main/index.ts`:
  - Integrates `wellnessCoach` with `powerMonitor.getSystemIdleTime()` every 5s.
  - Registers `CommandOrControl+Shift+P` for Play Mode (Follow Cursor).
  - Updates Tray menu with Daily Stats header (`formatStatsTrayLabel`), `🪄 Play Mode (Follow Cursor)`, `🔊 Sound Effects`, and `💧 Cute Break Reminder (Preview)`.
- `src/renderer/app.ts`:
  - Uses `state.scaleX` and `state.scaleY` in `drawUsagi` for 60 FPS squash-and-stretch swimming on the upright frame (`Usagi3.png`).
  - Passes `playModeEnabled ? cursorPos : null` as `cursorTarget` into `stepUsagiPhysics`.
  - Plays `.mp3` audio via `selectSoundForEvent` and `new Audio(url)` on click (`click-combo` when `state.comboClicks >= 3`, else `click-normal`), snack consumption (`snack-eaten`), wellness reminder (`wellness-reminder`), and welcome-back (`welcome-back`).

- [ ] **Step 1: Update `scripts/build.mjs`, `src/preload/index.ts`, `src/main/index.ts`, and `src/renderer/app.ts`**

- [ ] **Step 2: Run full test suite, typecheck, build, and formatter**

Run:
```bash
CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)
CI=true GIT_TERMINAL_PROMPT=0 npm run build < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)
CI=true GIT_TERMINAL_PROMPT=0 npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts" < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS"
```

- [ ] **Step 3: Commit all changes**

```bash
GIT_EDITOR=true git add -A
GIT_EDITOR=true git commit -m "feat: add 60fps upright swimming, custom voice audio, play mode, and gentle wellness coach"
```
