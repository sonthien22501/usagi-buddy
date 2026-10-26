# Fix Water Reminder & Pudding Grab Sound Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in strict RED-GREEN TDD order. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure water reminders reliably trigger during 1-hour usage sessions without being replaced by AFK wakeup pudding drops, and ensure the pudding treat sound (`unayahayahauna.mp3`) plays ONLY after Usagi grabs the pudding, never at the moment the treat drops.

**Architecture:**
1. Decouple AFK wakeup (`welcomeBack`) in `src/main/index.ts` from `dropSnackNow()` and `soundEvent: 'welcome-back'`, track real elapsed wall-clock delta in `setupWellnessCoachTicker()` with a realistic 10-minute (`600s`) AFK threshold, and accumulate `elapsedMs` on wakeup ticks in `src/core/wellnessCoach.ts`.
2. Ensure no sound plays when a pudding drops (including on Giant Alarm dismissal in `src/renderer/app.ts` and avoiding duplicate snack spawn during Giant Alarm takeover in `src/main/index.ts`), and bypass click cooldown for `'snack-eaten'` and `'wellness-reminder'` in `src/core/soundManager.ts` so the sound reliably plays right after Usagi grabs the pudding.

**Tech Stack:** Electron, TypeScript, Vitest

---

### Task 1: Wellness Coach Wakeup Accumulation & Sound Cooldown Bypass for Snack Grab / Water Reminder

**Files:**
- Modify: `src/core/wellnessCoach.ts`
- Modify: `src/core/soundManager.ts`
- Modify: `src/core/physicsEngine.ts`
- Test: `tests/wellnessCoach.test.ts`
- Test: `tests/soundManager.test.ts`
- Test: `tests/physicsEngine.test.ts`

- [x] **Step 1: Write failing tests in `tests/wellnessCoach.test.ts`, `tests/soundManager.test.ts`, and `tests/physicsEngine.test.ts`**
  1. In `tests/wellnessCoach.test.ts`, add a test verifying that when waking up from `'sleeping'` (`!isIdle`) and `activeScreenMs + elapsedMs >= nextReminderAtMs`, `tickWellnessCoach` emits `WATER_REMINDER_MESSAGE`, resets `activeScreenMs` to `0`, and sets `mood: 'active'`.
  2. In `tests/soundManager.test.ts`, add a test verifying that `'snack-eaten'` and `'wellness-reminder'` bypass the `cooldownMs` throttle even if a `'click-normal'` sound played 50ms earlier, so pudding grab and water reminder sounds are never swallowed.
  3. In `tests/physicsEngine.test.ts`, add a test verifying that if `snack` is active while `state.sleeping` is `true`, `stepUsagiPhysics` wakes Usagi (`sleeping: false`) and steers toward the snack to consume it.

- [x] **Step 2: Run tests to verify RED**
  Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`

- [x] **Step 3: Implement changes in `src/core/wellnessCoach.ts`, `src/core/soundManager.ts`, and `src/core/physicsEngine.ts`**
  1. In `src/core/wellnessCoach.ts`:
     - In `tickWellnessCoach`, when `state.mood === 'sleeping'` and `!isIdle`:
       Check if `state.activeScreenMs + Math.max(0, elapsedMs) >= state.nextReminderAtMs`. If so, emit `reminderMessage: WATER_REMINDER_MESSAGE`, reset `activeScreenMs: 0`, and redraw `nextReminderAtMs: drawReminderIntervalMs(rand, cfg)` while setting `mood: 'active'`, `welcomeBack: true`, and incrementing `breaksTaken`.
  2. In `src/core/soundManager.ts`:
     - In `selectSoundForEvent`, bypass the cooldown check (`nowMs - state.lastPlayedAtMs < state.cooldownMs`) when `event === 'snack-eaten' || event === 'wellness-reminder' || event === 'timer-complete'`.
  3. In `src/core/physicsEngine.ts`:
     - In `stepUsagiPhysics`, check `else if (snack && snack.active)` BEFORE `else if (state.sleeping)`, and set `sleeping: state.sleeping && !(snack && snack.active)` so an active treat wakes Usagi up to go grab it.

- [x] **Step 4: Run tests to verify GREEN**
  Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`

---

### Task 2: Stop Pudding Spam on AFK Wakeup & Play Pudding Sound Only After Grab

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/renderer/app.ts`

- [x] **Step 1: Update `src/main/index.ts`**
  1. In `triggerPreviewWellnessReminder()` (around line 453), send `mood: 'active'` so previewing the water reminder wakes Usagi and is never overwritten by `'Zzz...'`.
  2. In `setupPomodoroTicker()` (around line 526), when `spawnedSnack` is returned on Pomodoro completion, only send `'trigger-giant-alarm'` and record the completed Pomodoro (do NOT send `'spawn-snack'` while the Giant Alarm overlay is active, because `'giant-alarm-dismissed'` already calls `dropSnackNow()` when the user dismisses the alarm).
  3. In `setupWellnessCoachTicker()` (around line 537):
     - Track actual wall-clock elapsed time (`let lastWellnessTickMs = Date.now()`) instead of hardcoded `5000` so OS timer throttling never slows down water reminders, clamping each tick delta to `[1000, 60_000]`.
     - Pass `{ afkThresholdSeconds: 600 }` (10 minutes) to `tickWellnessCoach(wellnessState, elapsedMs, idleSeconds, { afkThresholdSeconds: 600 })` so brief 2-minute reading/video pauses do not freeze the water reminder timer.
     - In `if (result.welcomeBack)` (around line 572), remove `dropSnackNow()` and remove `soundEvent: 'welcome-back'` so returning from idle does NOT drop a pudding or play the pudding sound on drop.

- [x] **Step 2: Update `src/renderer/app.ts`**
  1. In `handleRepeatSession`, `handleSnoozeWrapUp`, `handleTakeBreak`, and `handleGiantAlarmDismiss` (around lines 205, 215, 230, 274), remove `playSound('click-normal')` right before `window.usagiAPI?.notifyGiantAlarmDismissed()` so no sound plays at the moment the reward pudding drops.
  2. In `window.usagiAPI.onWellnessUpdate` (around line 613), when `payload.soundEvent === 'wellness-reminder'` (or `payload.message` is present with `wellness-reminder`), set `state.speechTimerMs = 8000` (8 seconds) and `state.sleeping = false` so the water reminder bubble stays clearly visible.
  3. In `animationLoop` (around line 1144), when `result.snackConsumed && activeSnack` is true, ensure `playSound('snack-eaten')` plays the sound after Usagi grabs the pudding and sets `state.speechBubble = text ?? 'Unayahayahauna!'` and `state.speechTimerMs = DEFAULT_PHYSICS_CONFIG.speechDurationMs * 1.5`.

- [x] **Step 3: Typecheck, Test, Build, and Format**
  Run:
  - `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install -p typescript tsc --noEmit --pretty false < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && tail -n 35 /tmp/agy-cmd.log)`
  - `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && tail -n 35 /tmp/agy-cmd.log)`
  - `CI=true GIT_TERMINAL_PROMPT=0 npm run build < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && tail -n 35 /tmp/agy-cmd.log)`
  - `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts" < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS"`
