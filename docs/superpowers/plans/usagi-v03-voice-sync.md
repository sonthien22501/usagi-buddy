# Usagi Float v0.3 (Voice/Text Sync, 30–40 min Water Reminder, Clean Tray Labels) Implementation Plan

> **For agentic workers:** Execute task-by-task with strict RED-GREEN TDD. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make every speech bubble show exactly the word of the `.mp3` that plays, fire the water reminder at a random 30–40 minute interval, and remove parenthetical hints from tray labels.

**Architecture:** `src/core/soundManager.ts` becomes the single source of truth for voice lines: each `.mp3` filename maps to its bubble text, and `selectSoundForEvent` returns the `text` together with `file`/`url`. The renderer sets `state.speechBubble` from that `text`. `src/core/wellnessCoach.ts` replaces the fixed 30-min interval with a random `nextReminderAtMs` drawn in `[30, 40]` min.

**Tech Stack:** Electron, TypeScript, Vitest, Prettier.

**Spec:** User request (v0.3) + `REQUIREMENTS.md`

## Root Cause (why sound and text were off)
1. Bubble text came from `USAGI_SPEECH_PHRASES` (`['Ura!','Yaha!','Haa?!','Una!']`, random index) in `physicsEngine.ts`, while the sound came from an independent alternating counter in `soundManager.ts` (`una`/`bryy`, `urararusk`/`wuuulaaaa`). The two never agreed.
2. Snack eating hardcoded `'Yaha!'` while playing `unayahayahauna.mp3`; the reminder text (`'💧 Una! Sip some water~'`) played `huhhhh?.mp3`.

## Global Constraints
- Run tools via `npx --no-install`; wrap with `CI=true GIT_TERMINAL_PROMPT=0 <cmd> < /dev/null > /tmp/agy-cmd.log 2>&1 && echo "✅ PASS" || (echo "❌ FAIL:" && grep -iE "(fail|error|exception|panic|assert)" -C 4 /tmp/agy-cmd.log | tail -n 35)`.
- Voice text = filename without `.mp3`, first letter capitalized, `!` appended unless it already ends with `?`. Exact table:
  - `una.mp3` → `Una!` · `bryy.mp3` → `Bryy!` · `huhhhh?.mp3` → `Huhhhh?` · `urararusk.mp3` → `Urararusk!` · `unayahayahauna.mp3` → `Unayahayahauna!` · `wuuulaaaa.mp3` → `Wuuulaaaa!`
- Water reminder text (exact): `'💧 Huhhhh? Sip some water~'` (contains the `huhhhh?.mp3` word). Only the water reminder is shown (eye/stretch messages removed).
- Reminder interval: uniform random in `[30 * 60_000, 40 * 60_000]` ms, redrawn after each reminder and after waking from AFK.
- Tray labels contain NO parenthetical text.
- Surgical diffs only; do not touch physics movement/swimming code.

## Review Focus
1. **Cooldown click:** A click within `cooldownMs` returns `text: null, url: null` and the renderer keeps the current bubble (it must not swap text while the previous clip is still playing).
2. **Muted:** When muted, `url` is `null` but `text` is still returned so the bubble still shows a valid voice word.
3. **Interval bounds:** `rng = () => 0` → reminder at exactly 30 min; `rng = () => 0.999999` → before 40 min; never fires at 29:59.
4. **Reminder redraw:** After firing, `activeScreenMs` resets to `0` and `nextReminderAtMs` is redrawn from `rng`.
5. **Snack bubble:** Eating a snack sets bubble `'Unayahayahauna!'` to match `unayahayahauna.mp3`.

---

### Task 1: Voice line table in `soundManager.ts`

**Files:** Modify `src/core/soundManager.ts`, `tests/soundManager.test.ts`

**Interfaces (Produces):**
- `export function voiceTextForFile(file: string): string`
- `selectSoundForEvent(...)` now returns `{ state: SoundState; file: string | null; url: string | null; text: string | null }`
  - Muted: `file` and `text` set to the selected line, `url: null`, counters advance, `lastPlayedAtMs` unchanged.
  - Cooldown: `{ state, file: null, url: null, text: null }` (counters unchanged).
  - Otherwise: all set.

- [ ] **Step 1 (RED):** Add tests:
  - `voiceTextForFile` returns every value in the Global Constraints table.
  - `click-normal` twice → texts `'Una!'`, `'Bryy!'` matching files `una.mp3`, `bryy.mp3` (use `nowMs` 0 and 1000).
  - `click-combo` → `'Urararusk!'` then `'Wuuulaaaa!'`.
  - `snack-eaten` / `welcome-back` → `'Unayahayahauna!'`; `wellness-reminder` → `'Huhhhh?'`.
  - Muted → `url === null`, `text === 'Una!'`. Cooldown → `text === null`.
  - Update existing muted test to the new contract.
- [ ] **Step 2:** Run `npx --no-install vitest run tests/soundManager.test.ts` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Re-run → PASS.

### Task 2: Physics phrases match voice lines

**Files:** Modify `src/core/physicsEngine.ts`, `tests/physicsEngine.test.ts`

- [ ] **Step 1 (RED):** Change tests: `triggerUsagiInteraction(initial, 0).speechBubble === 'Una!'`, index 1 → `'Bryy!'`; snack consumption test expects `'Unayahayahauna!'`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Set `USAGI_SPEECH_PHRASES = ['Una!', 'Bryy!', 'Urararusk!', 'Wuuulaaaa!'] as const`; snack bubble `'Unayahayahauna!'`.
- [ ] **Step 4:** Run → PASS.

### Task 3: Random 30–40 min water reminder in `wellnessCoach.ts`

**Files:** Modify `src/core/wellnessCoach.ts`, `tests/wellnessCoach.test.ts`

**Interfaces (Produces):**
- `WellnessConfig { reminderMinMs: number; reminderMaxMs: number; afkThresholdSeconds: number }`; `DEFAULT_WELLNESS_CONFIG = { reminderMinMs: 1_800_000, reminderMaxMs: 2_400_000, afkThresholdSeconds: 120 }`
- `WellnessState { activeScreenMs; mood; nextReminderAtMs: number; stats }` (remove `reminderIndex`)
- `export const WATER_REMINDER_MESSAGE = '💧 Huhhhh? Sip some water~'` (remove `GENTLE_WELLNESS_MESSAGES`)
- `export function drawReminderIntervalMs(rng?: () => number, config?: Partial<WellnessConfig>): number` = `min + rng() * (max - min)`
- `createWellnessState(rng?: () => number): WellnessState`
- `tickWellnessCoach(state, elapsedMs, systemIdleSeconds, config?, rng?: () => number)`

- [ ] **Step 1 (RED):** Tests:
  - `drawReminderIntervalMs(() => 0) === 1_800_000`, `(() => 0.5) === 2_100_000`, `(() => 1) === 2_400_000`.
  - With `createWellnessState(() => 0)`: tick 1_799_999 ms → no reminder; tick +1 ms → `reminderMessage === WATER_REMINDER_MESSAGE`, `activeScreenMs === 0`, and new `nextReminderAtMs` equals the value from the passed `rng` (e.g. `() => 0.5` → `2_100_000`).
  - Waking from AFK redraws `nextReminderAtMs` with `rng`; existing AFK/stats tests keep passing (adapt names only).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.

### Task 4: Wire renderer + main, clean tray labels

**Files:** Modify `src/renderer/app.ts`, `src/main/index.ts`

- [ ] `src/renderer/app.ts`: in `playSound(event)` return the `text`; on click (pointerdown and `onTriggerInteraction`): `const prev = state.speechBubble; state = triggerUsagiInteraction(state); const text = playSound(event); state.speechBubble = text ?? prev ?? state.speechBubble;`. On snack eaten, welcome-back, and reminder, if `text` is returned use it (reminder keeps the full `payload.message`, which already contains `Huhhhh?`; welcome-back shows `'Unayahayahauna!'`).
- [ ] `src/main/index.ts`: replace `GENTLE_WELLNESS_MESSAGES`/`reminderIndex` usage in the preview handler with `WATER_REMINDER_MESSAGE`; labels:
  - `'🪄 Play Mode (Follow Cursor)'` → `'🪄 Play Mode'`
  - `'👻 Disable Ghost Mode (Interactive)'` → `'👻 Disable Ghost Mode'`; `'👻 Enable Ghost Mode (Click-Through)'` → `'👻 Enable Ghost Mode'`
  - `'💧 Cute Break Reminder (Preview)'` → `'💧 Water Reminder'`
  - Verify: `grep -n "label: .*(" src/main/index.ts` returns only ternaries/function calls, no `(...)` text in label strings.
- [ ] Run full suite, `npm run build`, then `npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts"`.
- [ ] Commit: `GIT_EDITOR=true git add -A && GIT_EDITOR=true git commit -m "feat: sync voice clips with speech text, 30-40m water reminder, clean tray labels"`
