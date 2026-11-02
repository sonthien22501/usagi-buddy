# Impeccable Distill — Strip Redundant Descriptions & Excessive Icons

## Goal
Apply `impeccable distill` across `usagi-buddy`'s 4 UI windows (`dashboard`, `tray`, `sticky`, `renderer`) to eliminate redundant descriptions, helper subtitles, instructional footers, and double/triple-stacked icons & emojis while preserving all functional controls, IDs, and the Usagi Custard theme.

## Base Commit
`0b75b3266d405bc0de8e176d24dd3a22d3d53067`

## Step 1: Write Failing Tests (RED) in `tests/assetsIntegration.test.ts`
Add a new test block `'verifies UI is distilled (no redundant helper descriptions, footer tips, or stacked preset/tab icons)'`:
1. **Dashboard (`src/dashboard/index.html` & `src/dashboard/dashboard.ts`)**:
   - Header subtitle `<p>Custard Anime Companion & Quests</p>` is removed.
   - Footer tip `💡 Close this window anytime` (`<div class="app-footer">`) is removed.
   - Tab buttons (`#dashTabCompanion`, `#dashTabConfig`) use clean text (`Companion`, `Settings`) without `🏠`/`⚙️` emoji prefixes.
   - All 9 secondary `.config-label` helper `<span style="font-size: 11px; color: var(--text-muted)">` lines (`Your preferred display name`, `Usagi celebrates your special day!`, `Calendar public holiday countdowns`, `Display across quests & calendar`, `Calendar grid header order`, `Font scaling on sticky window`, `Compact / Medium / Large preset`, `Float above all apps or stay on desktop`, `Auto-change costume every 30m or fix`) are removed so each `.config-row` has a single clean label.
   - Preset chips (`25m`, `52m`, `90m`) and action buttons (`Start`, `Pause`, `Reset`, `Pin Still`, `Follow Mouse`, `Ghost Mode`, `Drop Snack`, `Hide Usagi`, `Test Sound`, `Mute`, `Auto-Change`, `Desktop Widget`) use clean text without injecting `renderIconLabel` or emoji prefixes (`📌`, `🖥️`, `🔄`) inside `src/dashboard/dashboard.ts` / `index.html`.
   - Mode rows (`#sticky-title-icon`, `#pin-title-icon`, `#wand-title-icon`, `#ghost-title-icon`, `#pudding-title-icon`, `#hide-title-icon`) are removed from `src/dashboard/index.html` and `src/dashboard/dashboard.ts` so mode rows are clean text + button.
   - Keep `costume-icon-*` on the 6 wardrobe cards (visual outfit selector) and keep `.kawaii-svg` CSS class in `index.html`.
2. **Tray (`src/tray/index.html` & `src/tray/tray.ts`)**:
   - Remove the 6 kawaii icon spans inside `.preset-chip` (`#chip-tomato-icon`, `#chip-bolt-icon`, `#chip-wave-icon`, `#chip-coffee-icon-1`, `#chip-coffee-icon-2`, `#chip-test-icon`) and their population in `src/tray/tray.ts`.
   - Remove decorative trailing `✨` span on `#tray-drop-snack-btn` and `↗` on `#tray-open-dashboard-btn`.
3. **Sticky (`src/sticky/index.html` & `src/sticky/sticky.ts`)**:
   - Tab buttons (`#tabBtnQuests`, `#tabBtnCalendar`, `#tabBtnSchedule`) use clean text (`Quests`, `Calendar`, `Schedule`) without `📝`, `📅`, `📚` emojis.
   - Remove `📅` / `⏳` emojis from `#stickySelectedDateLabel`, `#stickyCalDetailText`, `Upcoming` header, and `#stickyScheduleNowText` (`Now:` / `Next:` / `No more classes today`).
4. **Renderer (`src/renderer/index.html`)**:
   - Remove `Keep Usagi still in one spot while focusing (can drag anytime)` verbose description text, `[ Press ESC or click outside to close ]` footer, and emoji clutter (`🍅`, `⚡`, `🌊`, `🎵`, `🔇`, `📌`, `🔁`, `⏳`, `☕`) on buttons/chips.

Run `npx --no-install vitest run` and verify the new test fails (RED).

## Step 2: Implement UI Distillation (GREEN)
1. Update `src/dashboard/index.html` and `src/dashboard/dashboard.ts` to strip all items listed in Step 1.1 ( Note: update `expect(html).toContain('🔄 Auto-Change')` in `tests/assetsIntegration.test.ts` to `'Auto-Change'`).
2. Update `src/tray/index.html` and `src/tray/tray.ts` to strip preset chip icons and trailing decorative symbols listed in Step 1.2.
3. Update `src/sticky/index.html` and `src/sticky/sticky.ts` to strip tab/banner emojis listed in Step 1.3.
4. Update `src/renderer/index.html` to strip the verbose description, footer, and button emojis listed in Step 1.4.

## Step 3: Verify & Format
1. Run `npx --no-install -p typescript tsc --noEmit --pretty false`
2. Run `npx --no-install vitest run`
3. Run `npm run build`
4. Run `npx --no-install prettier --write "src/**/*.ts" "src/**/*.html" "tests/**/*.ts"`
5. Commit with `git commit -m "refactor(ui): distill redundant descriptions and icon clutter across windows"`
