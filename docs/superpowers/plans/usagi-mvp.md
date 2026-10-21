# Usagi Float MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Usagi Float", a cross-platform (macOS + Windows) transparent, frameless, always-on-top desktop companion with automatic alpha-bounding-box sprite cropping (`Usagi1.png`–`Usagi6.png`), smooth 6-frame floating physics with gentle wall bounces, Smart Click-Through ("Ghost Mode") with interactive spin/speech bubbles ("Ura!", "Yaha!"), and a 25-minute Pomodoro system tray timer that drops snacks on screen for Usagi to swim to.

**Architecture:** Pure, deterministic TypeScript core modules (`src/core/`) handle RGBA alpha-bounding-box trimming, 6-frame swimming/bounce/steering physics, Ghost Mode hit-box forwarding, and the 25-minute Pomodoro timer state machine, tested via `vitest`. An Electron shell (`src/main/index.ts`, `src/preload/index.ts`, `src/renderer/app.ts`) drives a full-screen transparent overlay `BrowserWindow` with dynamic `setIgnoreMouseEvents(ignore, { forward: true })` forwarding, global shortcut (`CommandOrControl+Shift+G`), and System Tray menu.

**Tech Stack:** Electron, TypeScript, HTML5 2D Canvas, Vitest, esbuild, Prettier.

**Spec:** `docs/ARCHITECTURE.md`

## Global Constraints

- **Node / TS Tooling:** Always run local tools via `npx --no-install` (`npx --no-install vitest run`, `npx --no-install -p typescript tsc --noEmit --pretty false`, `npx --no-install prettier --write`).
- **Sprite Assets:** Read from `assets/Usagi1.png` through `assets/Usagi6.png` (6 RGBA frames, 1170x1560 canvas each, where Usagi is offset at different coordinates).
- **Speech Bubble Copy:** Interactive clicks/hovers must trigger `"Ura!"` or `"Yaha!"` speech bubbles and a faster spin boost.
- **Pomodoro Duration:** Default duration is exactly 25 minutes (`25 * 60 * 1000 = 1500000` ms).

## Review Focus

1. **Fully transparent or malformed sprite buffer (`alphaCropper.ts`):** If a frame has zero pixels above `alphaThreshold`, `computeAlphaBounds` returns `null` and `cropSpriteToAlphaBounds` returns a safe 1x1 transparent sprite (`width: 1, height: 1, centerX: 0.5, centerY: 0.5`) rather than throwing or producing `NaN`/negative bounds; buffer length mismatches or invalid thresholds (`< 0` or `> 255`) throw `RangeError`.
2. **Large or negative delta-time frame spikes (`physicsEngine.ts`):** When the OS sleeps or background tabs throttle `requestAnimationFrame` (`dtMs > 1000` or `dtMs < 0`), `stepUsagiPhysics` clamps `dtMs` to `[0, 100]` ms so Usagi never tunnels outside screen bounds.
3. **Screen resize / small monitor clamping (`physicsEngine.ts`):** If a monitor disconnects or shrinks below Usagi's current `(x, y)` coordinates, `stepUsagiPhysics` clamps `(x, y)` back inside `[spriteRadius, screen.width - spriteRadius]` x `[spriteRadius, screen.height - spriteRadius]` and reflects inward velocity.
4. **Null or out-of-window cursor in Ghost Mode controller (`ghostModeController.ts`):** When `cursor` is `null` or has `NaN` coordinates, `shouldIgnoreMouseEvents` safely returns `true` (click-through enabled) so the transparent overlay never traps the user's desktop clicks.
5. **Pomodoro snack spawn margin clamping & multi-tick completion (`pomodoroTimer.ts`):** When the 25-minute timer finishes, `tickPomodoro` transitions `phase` to `'completed'` exactly once (subsequent ticks while `'completed'` do not spawn duplicate snacks) and clamps the spawned snack within `[margin, screen.width - margin]` x `[margin, screen.height - margin]`.

---

### Task 1: Project Scaffolding & Alpha Bounding-Box Auto-Cropper

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.prettierrc`
- Create: `src/core/alphaCropper.ts`
- Test: `tests/alphaCropper.test.ts`

**Interfaces:**
- Produces:
  - `export interface RGBAImageData { readonly width: number; readonly height: number; readonly data: Uint8ClampedArray | Uint8Array; }`
  - `export interface BoundingBox { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number; readonly width: number; readonly height: number; readonly centerX: number; readonly centerY: number; }`
  - `export interface CroppedSprite { readonly id: string; readonly sourceWidth: number; readonly sourceHeight: number; readonly bounds: BoundingBox; readonly trimmedData: Uint8ClampedArray; }`
  - `export function computeAlphaBounds(image: RGBAImageData, alphaThreshold?: number): BoundingBox | null`
  - `export function cropSpriteToAlphaBounds(id: string, image: RGBAImageData, alphaThreshold?: number): CroppedSprite`

- [ ] **Step 1: Initialize `package.json`, `tsconfig.json`, `.prettierrc`, and install dependencies**

Create `package.json` with scripts:
- `"build": "tsc --noEmit && node scripts/build.mjs"`
- `"test": "vitest run"`
- `"typecheck": "tsc --noEmit --pretty false"`
- `"format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\""`
- `"start": "npm run build && electron dist/main/index.js"`
Install devDependencies: `typescript`, `vitest`, `prettier`, `esbuild`, `electron`, `@types/node`.

- [ ] **Step 2: Write the failing test in `tests/alphaCropper.test.ts`**

```typescript
import { describe, expect, it } from 'vitest';
import { computeAlphaBounds, cropSpriteToAlphaBounds, RGBAImageData } from '../src/core/alphaCropper';

function createSyntheticCanvas(
  width: number,
  height: number,
  drawRect?: { x: number; y: number; w: number; h: number; rgba: [number, number, number, number] }
): RGBAImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  if (drawRect) {
    for (let y = drawRect.y; y < drawRect.y + drawRect.h; y++) {
      for (let x = drawRect.x; x < drawRect.x + drawRect.w; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = drawRect.rgba[0];
        data[idx + 1] = drawRect.rgba[1];
        data[idx + 2] = drawRect.rgba[2];
        data[idx + 3] = drawRect.rgba[3];
      }
    }
  }
  return { width, height, data };
}

describe('alphaCropper', () => {
  it('computes exact bounding box and center for offset sprite frames', () => {
    const frame1 = createSyntheticCanvas(100, 120, { x: 12, y: 80, w: 20, h: 16, rgba: [255, 220, 200, 255] });
    const frame2 = createSyntheticCanvas(100, 120, { x: 64, y: 10, w: 20, h: 16, rgba: [255, 220, 200, 255] });

    const b1 = computeAlphaBounds(frame1, 10);
    const b2 = computeAlphaBounds(frame2, 10);

    expect(b1).toEqual({
      minX: 12,
      minY: 80,
      maxX: 31,
      maxY: 95,
      width: 20,
      height: 16,
      centerX: 10,
      centerY: 8,
    });
    expect(b2?.width).toBe(20);
    expect(b2?.height).toBe(16);
    expect(b2?.centerX).toBe(b1?.centerX);
    expect(b2?.centerY).toBe(b1?.centerY);
  });

  it('crops RGBA pixel data tightly to bounding box and ignores sub-threshold alpha noise', () => {
    const img = createSyntheticCanvas(10, 10, { x: 3, y: 4, w: 2, h: 3, rgba: [250, 180, 190, 240] });
    // Add faint alpha noise (alpha = 5) at (0, 0)
    img.data[3] = 5;

    const cropped = cropSpriteToAlphaBounds('Usagi1', img, 10);
    expect(cropped.id).toBe('Usagi1');
    expect(cropped.bounds.width).toBe(2);
    expect(cropped.bounds.height).toBe(3);
    expect(cropped.trimmedData.length).toBe(2 * 3 * 4);
    expect(Array.from(cropped.trimmedData.slice(0, 4))).toEqual([250, 180, 190, 240]);
  });

  it('returns safe 1x1 transparent fallback when canvas is completely transparent (Review Focus #1)', () => {
    const empty = createSyntheticCanvas(30, 30);
    expect(computeAlphaBounds(empty)).toBeNull();

    const cropped = cropSpriteToAlphaBounds('EmptyFrame', empty);
    expect(cropped.bounds).toEqual({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 1,
      height: 1,
      centerX: 0.5,
      centerY: 0.5,
    });
    expect(cropped.trimmedData.length).toBe(4);
  });

  it('throws RangeError on invalid buffer length or out-of-range alphaThreshold', () => {
    const badBuffer: RGBAImageData = { width: 4, height: 4, data: new Uint8ClampedArray(10) };
    expect(() => computeAlphaBounds(badBuffer)).toThrow(RangeError);

    const valid = createSyntheticCanvas(4, 4);
    expect(() => computeAlphaBounds(valid, -1)).toThrow(RangeError);
    expect(() => computeAlphaBounds(valid, 256)).toThrow(RangeError);
  });
});
```

- [ ] **Step 3: Run test to verify it fails (RED)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/alphaCropper.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`
Expected: FAIL with module `../src/core/alphaCropper` not found.

- [ ] **Step 4: Implement `src/core/alphaCropper.ts`**

Implement `computeAlphaBounds` and `cropSpriteToAlphaBounds` with default `alphaThreshold = 10`, strict `RangeError` validation on `width <= 0 || height <= 0 || data.length !== width * height * 4` and `alphaThreshold < 0 || alphaThreshold > 255`, row-by-row copy of the cropped region into `trimmedData`, and the 1x1 transparent fallback when `bounds === null`.

- [ ] **Step 5: Run test and formatter to verify GREEN, then commit**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/alphaCropper.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`
Expected: `✅ PASS`

---

### Task 2: 6-Frame Swimming Physics, Wall Bounces, Snack Seeking & Interactive Spin/Speech

**Files:**
- Create: `src/core/physicsEngine.ts`
- Test: `tests/physicsEngine.test.ts`

**Interfaces:**
- Produces:
  - `export interface Vector2D { x: number; y: number; }`
  - `export interface ScreenBounds { width: number; height: number; }`
  - `export interface SnackTarget { x: number; y: number; active: boolean; radius: number; }`
  - `export interface UsagiState { x: number; y: number; vx: number; vy: number; rotation: number; angularVelocity: number; frameIndex: number; frameTimerMs: number; spinBoostTimerMs: number; speechBubble: string | null; speechTimerMs: number; scaleFlipX: 1 | -1; snacksEaten: number; }`
  - `export interface PhysicsConfig { readonly spriteRadius: number; readonly baseSpeed: number; readonly maxSpeed: number; readonly frameIntervalMs: number; readonly bounceRestitution: number; readonly spinBoostDurationMs: number; readonly spinBoostAngularVelocity: number; readonly speechDurationMs: number; }`
  - `export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig`
  - `export const USAGI_SPEECH_PHRASES: readonly ['Ura!', 'Yaha!', 'Haa?!', 'Una!']`
  - `export function createInitialUsagiState(screen: ScreenBounds, config?: Partial<PhysicsConfig>): UsagiState`
  - `export function triggerUsagiInteraction(state: UsagiState, phraseIndex?: number, config?: Partial<PhysicsConfig>): UsagiState`
  - `export function stepUsagiPhysics(state: UsagiState, dtMs: number, screen: ScreenBounds, snack?: SnackTarget | null, config?: Partial<PhysicsConfig>): { state: UsagiState; snackConsumed: boolean }`

- [ ] **Step 1: Write the failing test in `tests/physicsEngine.test.ts`**

```typescript
import { describe, expect, it } from 'vitest';
import {
  createInitialUsagiState,
  DEFAULT_PHYSICS_CONFIG,
  stepUsagiPhysics,
  triggerUsagiInteraction,
} from '../src/core/physicsEngine';

describe('physicsEngine', () => {
  const screen = { width: 1440, height: 900 };

  it('cycles smoothly through 6 sprite frames (0 -> 5 -> 0)', () => {
    let state = createInitialUsagiState(screen, { frameIntervalMs: 100 });
    expect(state.frameIndex).toBe(0);

    for (let expected = 1; expected <= 6; expected++) {
      state = stepUsagiPhysics(state, 100, screen).state;
      expect(state.frameIndex).toBe(expected % 6);
    }
  });

  it('bounces gently off left/right/top/bottom desktop boundaries and updates scaleFlipX', () => {
    const r = DEFAULT_PHYSICS_CONFIG.spriteRadius;
    const nearRight = {
      ...createInitialUsagiState(screen),
      x: screen.width - r + 5,
      y: 300,
      vx: 120,
      vy: 0,
    };
    const { state: bouncedRight } = stepUsagiPhysics(nearRight, 50, screen);
    expect(bouncedRight.x).toBeLessThanOrEqual(screen.width - r);
    expect(bouncedRight.vx).toBeLessThan(0);
    expect(bouncedRight.scaleFlipX).toBe(-1);

    const nearTop = {
      ...bouncedRight,
      y: r - 10,
      vy: -90,
    };
    const { state: bouncedTop } = stepUsagiPhysics(nearTop, 50, screen);
    expect(bouncedTop.y).toBeGreaterThanOrEqual(r);
    expect(bouncedTop.vy).toBeGreaterThan(0);
  });

  it('triggers spin boost and Ura!/Yaha! speech bubble on hover/click interaction', () => {
    const initial = createInitialUsagiState(screen);
    const s0 = triggerUsagiInteraction(initial, 0);
    expect(s0.speechBubble).toBe('Ura!');
    expect(s0.spinBoostTimerMs).toBeGreaterThan(0);
    expect(Math.abs(s0.angularVelocity)).toBeGreaterThan(5);

    const s1 = triggerUsagiInteraction(initial, 1);
    expect(s1.speechBubble).toBe('Yaha!');
  });

  it('steers toward active Pomodoro snack and consumes it upon arrival', () => {
    let state = {
      ...createInitialUsagiState(screen),
      x: 200,
      y: 200,
      vx: 10,
      vy: 10,
    };
    const snack = { x: 260, y: 200, active: true, radius: 28 };

    let consumed = false;
    for (let i = 0; i < 30; i++) {
      const res = stepUsagiPhysics(state, 50, screen, snack);
      state = res.state;
      if (res.snackConsumed) {
        consumed = true;
        break;
      }
    }
    expect(consumed).toBe(true);
    expect(state.snacksEaten).toBe(1);
    expect(state.speechBubble).toBe('Yaha!');
  });

  it('clamps extreme dtMs spikes and shrinking screen bounds safely (Review Focus #2 & #3)', () => {
    const initial = createInitialUsagiState(screen);
    // 60-second OS sleep spike should be clamped to 100ms
    const { state: afterSpike } = stepUsagiPhysics(initial, 60_000, screen);
    expect(afterSpike.x).toBeGreaterThanOrEqual(DEFAULT_PHYSICS_CONFIG.spriteRadius);
    expect(afterSpike.x).toBeLessThanOrEqual(screen.width - DEFAULT_PHYSICS_CONFIG.spriteRadius);

    // Shrunk screen bounds
    const smallScreen = { width: 400, height: 300 };
    const { state: clamped } = stepUsagiPhysics({ ...initial, x: 1200, y: 800 }, 16, smallScreen);
    expect(clamped.x).toBeLessThanOrEqual(smallScreen.width - DEFAULT_PHYSICS_CONFIG.spriteRadius);
    expect(clamped.y).toBeLessThanOrEqual(smallScreen.height - DEFAULT_PHYSICS_CONFIG.spriteRadius);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/physicsEngine.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`
Expected: FAIL with module `../src/core/physicsEngine` not found.

- [ ] **Step 3: Implement `src/core/physicsEngine.ts`**

Implement `createInitialUsagiState`, `triggerUsagiInteraction`, and `stepUsagiPhysics` with:
- `DEFAULT_PHYSICS_CONFIG = { spriteRadius: 56, baseSpeed: 95, maxSpeed: 210, frameIntervalMs: 130, bounceRestitution: 0.92, spinBoostDurationMs: 1200, spinBoostAngularVelocity: 12.5, speechDurationMs: 1800 }`.
- Clamping `dtMs` to `[0, 100]`.
- Advancing `frameTimerMs` and cycling `frameIndex = (frameIndex + 1) % 6` (using `frameIntervalMs * 0.4` when `spinBoostTimerMs > 0`).
- Steering toward `snack` at `maxSpeed` when `snack?.active` is true, and marking `snackConsumed = true` when distance `<= snack.radius + cfg.spriteRadius * 0.5`.
- Wall bounce reflection and clamping within `[minX, maxX]` and `[minY, maxY]`.

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/physicsEngine.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`
Expected: `✅ PASS`

---

### Task 3: Smart Click-Through ("Ghost Mode") & Hit-Box Forwarding

**Files:**
- Create: `src/core/ghostModeController.ts`
- Test: `tests/ghostModeController.test.ts`

**Interfaces:**
- Consumes: `Vector2D` from `src/core/physicsEngine.ts`
- Produces:
  - `export interface HitTarget { x: number; y: number; radius: number; }`
  - `export interface GhostModeState { ghostModeLocked: boolean; currentlyIgnoringMouse: boolean; }`
  - `export function createGhostModeState(initialLocked?: boolean): GhostModeState`
  - `export function isPointInTarget(px: number, py: number, target: HitTarget): boolean`
  - `export function shouldIgnoreMouseEvents(ghostModeLocked: boolean, cursor: Vector2D | null, usagiTarget: HitTarget, snackTarget?: HitTarget | null): boolean`
  - `export function toggleGhostMode(state: GhostModeState): GhostModeState`

- [ ] **Step 1: Write the failing test in `tests/ghostModeController.test.ts`**

```typescript
import { describe, expect, it } from 'vitest';
import {
  createGhostModeState,
  isPointInTarget,
  shouldIgnoreMouseEvents,
  toggleGhostMode,
} from '../src/core/ghostModeController';

describe('ghostModeController', () => {
  const usagi = { x: 500, y: 400, radius: 60 };
  const snack = { x: 800, y: 300, radius: 30 };

  it('passes clicks through when Ghost Mode is locked even if cursor is directly over Usagi', () => {
    expect(shouldIgnoreMouseEvents(true, { x: 500, y: 400 }, usagi, snack)).toBe(true);
  });

  it('captures mouse events only when cursor is inside Usagi or active snack bounds in Interactive Mode', () => {
    // Cursor over Usagi -> do NOT ignore mouse events (false)
    expect(shouldIgnoreMouseEvents(false, { x: 520, y: 410 }, usagi, snack)).toBe(false);
    // Cursor over Snack -> do NOT ignore mouse events (false)
    expect(shouldIgnoreMouseEvents(false, { x: 810, y: 300 }, usagi, snack)).toBe(false);
    // Cursor over empty desktop (VS Code / Browser) -> ignore mouse events (true)
    expect(shouldIgnoreMouseEvents(false, { x: 100, y: 100 }, usagi, snack)).toBe(true);
  });

  it('safely defaults to click-through when cursor is null or NaN (Review Focus #4)', () => {
    expect(shouldIgnoreMouseEvents(false, null, usagi)).toBe(true);
    expect(shouldIgnoreMouseEvents(false, { x: Number.NaN, y: 400 }, usagi)).toBe(true);
    expect(isPointInTarget(Number.NaN, 400, usagi)).toBe(false);
  });

  it('toggles Ghost Mode state cleanly', () => {
    const s0 = createGhostModeState(false);
    const s1 = toggleGhostMode(s0);
    expect(s1.ghostModeLocked).toBe(true);
    expect(s1.currentlyIgnoringMouse).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/ghostModeController.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`
Expected: FAIL with module `../src/core/ghostModeController` not found.

- [ ] **Step 3: Implement `src/core/ghostModeController.ts`**

Implement `createGhostModeState`, `isPointInTarget`, `shouldIgnoreMouseEvents`, and `toggleGhostMode`.

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/ghostModeController.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`
Expected: `✅ PASS`

---

### Task 4: 25-Minute Pomodoro Study Timer & Snack Spawner

**Files:**
- Create: `src/core/pomodoroTimer.ts`
- Test: `tests/pomodoroTimer.test.ts`

**Interfaces:**
- Consumes: `ScreenBounds`, `SnackTarget` from `src/core/physicsEngine.ts`
- Produces:
  - `export type PomodoroPhase = 'idle' | 'running' | 'paused' | 'completed';`
  - `export interface PomodoroState { phase: PomodoroPhase; remainingMs: number; durationMs: number; completedCount: number; }`
  - `export const DEFAULT_POMODORO_MS = 1_500_000;`
  - `export function createPomodoroTimer(durationMs?: number): PomodoroState`
  - `export function startPomodoro(state: PomodoroState): PomodoroState`
  - `export function pausePomodoro(state: PomodoroState): PomodoroState`
  - `export function resetPomodoro(state: PomodoroState): PomodoroState`
  - `export function formatPomodoroTime(remainingMs: number): string`
  - `export function spawnSnackOnScreen(screen: ScreenBounds, margin?: number, rng?: () => number): SnackTarget`
  - `export function tickPomodoro(state: PomodoroState, elapsedMs: number, screen: ScreenBounds, margin?: number, rng?: () => number): { state: PomodoroState; spawnedSnack: SnackTarget | null }`

- [ ] **Step 1: Write the failing test in `tests/pomodoroTimer.test.ts`**

```typescript
import { describe, expect, it } from 'vitest';
import {
  createPomodoroTimer,
  DEFAULT_POMODORO_MS,
  formatPomodoroTime,
  pausePomodoro,
  resetPomodoro,
  startPomodoro,
  tickPomodoro,
} from '../src/core/pomodoroTimer';

describe('pomodoroTimer', () => {
  const screen = { width: 1440, height: 900 };

  it('initializes with a 25-minute countdown and formats MM:SS accurately', () => {
    const timer = createPomodoroTimer();
    expect(timer.durationMs).toBe(DEFAULT_POMODORO_MS);
    expect(formatPomodoroTime(timer.remainingMs)).toBe('25:00');
    expect(formatPomodoroTime(65_000)).toBe('01:05');
    expect(formatPomodoroTime(500)).toBe('00:01');
    expect(formatPomodoroTime(0)).toBe('00:00');
    expect(formatPomodoroTime(-500)).toBe('00:00');
  });

  it('transitions idle -> running -> paused -> reset cleanly', () => {
    let timer = createPomodoroTimer();
    timer = startPomodoro(timer);
    expect(timer.phase).toBe('running');

    timer = tickPomodoro(timer, 60_000, screen).state;
    expect(timer.remainingMs).toBe(DEFAULT_POMODORO_MS - 60_000);

    timer = pausePomodoro(timer);
    expect(timer.phase).toBe('paused');
    // Ticking while paused does not decrement
    timer = tickPomodoro(timer, 60_000, screen).state;
    expect(timer.remainingMs).toBe(DEFAULT_POMODORO_MS - 60_000);

    timer = resetPomodoro(timer);
    expect(timer.phase).toBe('idle');
    expect(timer.remainingMs).toBe(DEFAULT_POMODORO_MS);
  });

  it('drops a clamped snack on screen exactly once when 25-min timer completes (Review Focus #5)', () => {
    let timer = startPomodoro(createPomodoroTimer(10_000));
    const res1 = tickPomodoro(timer, 10_500, screen, 80, () => 0.5);
    expect(res1.state.phase).toBe('completed');
    expect(res1.state.remainingMs).toBe(0);
    expect(res1.state.completedCount).toBe(1);
    expect(res1.spawnedSnack).toEqual({
      x: 720,
      y: 450,
      active: true,
      radius: 28,
    });

    // Subsequent ticks while completed must not spawn duplicate snacks
    const res2 = tickPomodoro(res1.state, 1_000, screen, 80, () => 0.5);
    expect(res2.spawnedSnack).toBeNull();
    expect(res2.state.completedCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/pomodoroTimer.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`
Expected: FAIL with module `../src/core/pomodoroTimer` not found.

- [ ] **Step 3: Implement `src/core/pomodoroTimer.ts`**

Implement `createPomodoroTimer`, `startPomodoro`, `pausePomodoro`, `resetPomodoro`, `formatPomodoroTime`, `spawnSnackOnScreen`, and `tickPomodoro`.

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/pomodoroTimer.test.ts < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`
Expected: `✅ PASS`

---

### Task 5: Real PNG Sprite Verification, Electron Shell, System Tray & Overlay Renderer

**Files:**
- Create: `scripts/build.mjs`
- Create: `src/preload/index.ts`
- Create: `src/main/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/app.ts`
- Test: `tests/assetsIntegration.test.ts`

**Interfaces:**
- Consumes: All `src/core/*` modules.
- Produces:
  - `window.usagiAPI` via `src/preload/index.ts`
  - Bundled `dist/main/index.js`, `dist/preload/index.js`, `dist/renderer/app.js`, and `dist/renderer/index.html` via `scripts/build.mjs`.

- [ ] **Step 1: Write integration test in `tests/assetsIntegration.test.ts` verifying `assets/Usagi1.png`–`assets/Usagi6.png` exist and have valid PNG headers + dimensions**

```typescript
import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Usagi PNG sprite assets verification', () => {
  it('verifies all 6 Usagi PNG sprites exist in assets/ with valid RGBA PNG headers', () => {
    for (let i = 1; i <= 6; i++) {
      const filePath = path.resolve(__dirname, `../assets/Usagi${i}.png`);
      expect(fs.existsSync(filePath)).toBe(true);
      const buf = fs.readFileSync(filePath);
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4e);
      expect(buf[3]).toBe(0x47);
      // IHDR width and height at bytes 16..23
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      expect(width).toBe(1170);
      expect(height).toBe(1560);
    }
  });
});
```

- [ ] **Step 2: Implement `src/preload/index.ts`, `src/main/index.ts`, `src/renderer/index.html`, `src/renderer/app.ts`, and `scripts/build.mjs`**

- `src/preload/index.ts`: Expose `usagiAPI` (`setIgnoreMouseEvents`, `onGhostModeChanged`, `onSnackSpawned`, `notifySnackConsumed`, `triggerManualInteraction`).
- `src/main/index.ts`:
  - Create full-screen transparent, frameless, `alwaysOnTop: true`, `hasShadow: false`, `skipTaskbar: true` `BrowserWindow`.
  - Call `win.setAlwaysOnTop(true, 'screen-saver')`, `win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`, and `win.setIgnoreMouseEvents(true, { forward: true })`.
  - Create System Tray icon (resized 18x18 from `assets/Usagi1.png`) with title updating every second (`🐰 25:00` or `👻 Ghost`) and context menu:
    - Toggle Ghost Mode (`CommandOrControl+Shift+G`)
    - Start / Pause 25m Pomodoro
    - Reset Pomodoro Timer
    - Drop Snack Now!
    - Quit Usagi Float
- `src/renderer/index.html` & `src/renderer/app.ts`:
  - Load `../../assets/Usagi1.png` .. `../../assets/Usagi6.png`, draw each onto an offscreen canvas to read `getImageData`, run `cropSpriteToAlphaBounds` to create 6 tightly trimmed, centered offscreen sprite canvases.
  - Run `requestAnimationFrame` loop calling `stepUsagiPhysics`, drawing the active cropped frame rotated/flipped at `(state.x, state.y)`, drawing the cute speech bubble (`"Ura!"`, `"Yaha!"`) when `state.speechBubble` is active, and drawing the cute strawberry pudding snack when `snack.active` is true.
  - On `mousemove` / `pointerdown`, check `shouldIgnoreMouseEvents` and call `window.usagiAPI.setIgnoreMouseEvents` whenever `currentlyIgnoringMouse` changes; trigger `triggerUsagiInteraction` on hover/click when in Interactive Mode.
- `scripts/build.mjs`: Bundle `src/main/index.ts`, `src/preload/index.ts`, and `src/renderer/app.ts` into `dist/`, and copy `src/renderer/index.html` to `dist/renderer/index.html`.

- [ ] **Step 3: Run full test suite, typecheck, build, and formatter**

Run:
```bash
CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)
CI=true GIT_TERMINAL_PROMPT=0 npm run build < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)
CI=true GIT_TERMINAL_PROMPT=0 npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts" < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS"
```
Expected: `✅ PASS` on all commands.

- [ ] **Step 4: Commit all changes**

```bash
GIT_EDITOR=true git add -A
GIT_EDITOR=true git commit -m "feat: implement Usagi Float MVP desktop companion"
```
