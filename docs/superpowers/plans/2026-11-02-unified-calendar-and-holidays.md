# Unified Calendar, Holiday Service, Date-Linked Quests & Dual UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` or follow the 4-Step RED-GREEN-FORMAT-COMMIT TDD loop to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the unified Calendar & Reminders suite covering GitHub Issues **#17** (Dual Holiday Calendar UI in Dashboard + Sticky Note Tab), **#16** (National & Public Holiday Service via Nager.Date API + Auto Country Detection + Offline Fallback), **#15** (Buddy Profile Nickname & Birthday Celebration Marker), **#14** (Cozy Mini Calendar View with Quest Dots & Date Filtering), and **#6/#9** (Date-linked Reminders with inline `@today`, `@tomorrow`, `@+Xd`, `@YYYY-MM-DD` parsing & quick-date chips), featuring an identical Custard & Caramel Kawaii UI across both Dashboard and Desktop Sticky Note.

**Architecture:**
- **Starting Commit Baseline (`BASE_SHA`)**: `53338ab`
- **Zero-Dependency Pure Core (`src/core/calendarStore.ts`)**:
  - `BuddyProfile`: `{ nickname: string, birthdayMonth: number | null, birthdayDay: number | null, countryCode: string }`
  - `HolidayEvent`: `{ id: string, date: string /* YYYY-MM-DD */, name: string, localName: string, countryCode: string, type: 'public_holiday' | 'birthday' }`
  - Auto-detection of country code from locale/timezone (`detectCountryCode(locale?, timeZone?)`) supporting `VN`, `US`, `GB`, `DE`, `FR`, `ES`, `JP`, `KR`, `AU`, `CA`, etc.
  - Bundled offline fallback holidays + Nager.Date v3 response normalizer (`normalizeNagerHolidays`) + birthday event injection (`buildCalendarEvents`) + upcoming countdown calculator (`getUpcomingEvents(events, quests, todayDateStr, limit)`).
  - Pure month grid builder (`buildMonthCalendarGrid(year, month, todayDateStr, selectedDateStr, events, quests)`) returning 42 day cells (6 rows × 7 cols) with flags for `isCurrentMonth`, `isToday`, `isSelected`, `holidays`, `hasBirthday`, and `questsDue` (`ReminderItem[]`).
- **Date-Aware Reminders (`src/core/reminderStore.ts`)**:
  - Extend `ReminderItem` with optional `dueDate?: string` (`YYYY-MM-DD`).
  - Add inline date token parser `extractDueDateToken(rawText: string, defaultDateStr?: string, now?: Date): { cleanText: string; dueDate?: string }` supporting `@today`, `@tomorrow`, `@+3d` (or `@+Nd`), and `@YYYY-MM-DD`, or falling back to `defaultDateStr` when selected in the calendar!
  - Backward-compatible JSON serialization/deserialization in `usagi-reminders.json`.
- **Identical Kawaii Calendar & Holiday UI (`src/dashboard/` & `src/sticky/`)**:
  - Extend `src/core/kawaiiIcons.ts` with `'calendar'`, `'cake'`, `'party'`, `'globe'`, `'chevron-left'`, `'chevron-right'`.
  - **Dashboard (`src/dashboard/index.html` & `src/dashboard/dashboard.ts`)**:
    - Unified **Cozy Calendar & Quests** experience: Month view grid with prev/next/Today navigation, day cells showing Pudding Quest dots (`🍮` / caramel dot), Holiday dots (`🎉` / coral dot), and Birthday badge (`🎂` / gold star dot).
    - Clicking any day selects/filters quests for that date (or click `[All / Today]` to clear filter), sets the quick-add target date (`Adding to YYYY-MM-DD`), and displays a cozy Holiday/Birthday detail banner when that date has an event!
    - Quick-date chips (`@Today`, `@Tomorrow`, `Clear Date`) below the quest input.
    - Compact **Buddy Profile & Country** bar inside the Calendar card: Nickname input, Birthday (`MM / DD`) selector, and Country selector (`VN`, `US`, `DE`, `FR`, `ES`, `GB`, `JP`, `KR`) persisted in `usagi-calendar.json` (or `usagi-settings.json`).
    - **Upcoming Holidays & Deadlines** countdown feed (`Today!`, `Tomorrow`, `In Xd`).
  - **Desktop Sticky Note (`src/sticky/index.html` & `src/sticky/sticky.ts`)**:
    - Clean 2-tab Kawaii pill switcher in the Sticky Note: `📝 Quests` | `📅 Calendar`.
    - In `📝 Quests` tab: Existing quest list enhanced with cute due-date pill badges (`Today`, `Tomorrow`, `MM/DD`), inline `@today`/`@tomorrow` support, and quick-date chips (`Today`, `Tmrw`, or active selected calendar date).
    - In `📅 Calendar` tab: Identical compact Custard & Caramel mini month grid (showing quest dots, holiday dots, and birthday markers; clicking a date lets you view its holidays/quests or jump to add a quest on that date!) + chronological **Upcoming Holidays, Birthday & Quests** countdown feed!

---

## Review Focus (Top 5 Edge Cases & Failure Modes)
1. **Timezone-Safe `YYYY-MM-DD` Formatting**: Never use `new Date('YYYY-MM-DD').getDate()` or `.toISOString().slice(0, 10)` on local midnight dates where UTC offset shifts the day backward/forward by 1 day. Always format and parse `YYYY-MM-DD` using explicit local year/month/day arithmetic (`formatDateYMD(year, month, day)`).
2. **Leap Year & Invalid Birthday Dates**: Validating `birthdayMonth` (1–12) and `birthdayDay` (1–31); on non-leap years, a Feb 29 birthday should safely map to `02-28` so users never miss their birthday countdown.
3. **Offline / Nager.Date API Failure Resilience**: When offline or if `https://date.nager.at/api/v3/PublicHolidays/{year}/{countryCode}` times out or fails, `calendarStore` must immediately fall back to deterministic built-in holidays for the selected country without throwing or blocking UI startup.
4. **Backward Compatibility of `usagi-reminders.json`**: Existing reminder items on disk lack `dueDate`. `parseRemindersJson` must preserve optional `dueDate` when valid (`YYYY-MM-DD`) and default to `undefined` when absent.
5. **Cross-Window Real-Time Sync**: Adding a quest with a due date or updating the Buddy Profile / Country in Dashboard must immediately broadcast `reminder-state-changed` and `calendar-state-changed` so both Dashboard and Sticky Note re-render their calendar dots and countdown feeds in lockstep.

---

## Task 1: Kawaii Calendar Icons (`src/core/kawaiiIcons.ts` & `tests/kawaiiIcons.test.ts`)

- [ ] **Step 1 (RED)**: Add tests in `tests/kawaiiIcons.test.ts` verifying new icon IDs `'calendar'`, `'cake'`, `'party'`, `'globe'`, `'chevron-left'`, and `'chevron-right'` exist in `KAWAII_ICONS` and render valid `<svg>` markup via `getKawaiiIcon`.
- [ ] **Step 2 (GREEN)**: Update `KawaiiIconId` and `KAWAII_ICONS` in `src/core/kawaiiIcons.ts` with matching rounded kawaii SVG icons.

---

## Task 2: Date-Linked Reminders & Natural Date Token Parser (`src/core/reminderStore.ts` & `tests/reminderStore.test.ts`)

- [ ] **Step 1 (RED)**: In `tests/reminderStore.test.ts`, add unit tests for:
  - `extractDueDateToken("Submit report @today", undefined, new Date(2026, 10, 2))` -> `{ cleanText: "Submit report", dueDate: "2026-11-02" }`
  - `extractDueDateToken("Buy cake @tomorrow", undefined, new Date(2026, 10, 2))` -> `{ cleanText: "Buy cake", dueDate: "2026-11-03" }`
  - `extractDueDateToken("Trip @+5d", undefined, new Date(2026, 10, 2))` -> `{ cleanText: "Trip", dueDate: "2026-11-07" }`
  - `extractDueDateToken("Exam @2026-12-15", undefined, new Date(2026, 10, 2))` -> `{ cleanText: "Exam", dueDate: "2026-12-15" }`
  - `addReminderItem(state, "Study math", 1000, "item-1", "2026-11-05")` -> stores `dueDate: "2026-11-05"`, or parses inline `@tomorrow` if present in `text`.
  - `parseRemindersJson` and `serializeRemindersJson` preserving `dueDate`.
- [ ] **Step 2 (GREEN)**: Implement `dueDate?: string` on `ReminderItem`, `extractDueDateToken`, and update `addReminderItem` & `parseRemindersJson` in `src/core/reminderStore.ts`.

---

## Task 3: Calendar, Holiday & Buddy Profile Engine (`src/core/calendarStore.ts` & `tests/calendarStore.test.ts`)

- [ ] **Step 1 (RED)**: Create `tests/calendarStore.test.ts` testing:
  - `formatDateYMD(year, month, day)` and `daysBetweenYMD(fromYMD, toYMD)` with zero timezone drift.
  - `detectCountryCode(locale, timeZone)` mapping e.g. `("en-US", "Asia/Ho_Chi_Minh") -> "VN"`, `("de-DE", "Europe/Berlin") -> "DE"`, `("vi-VN", "") -> "VN"`, fallback `"US"`.
  - `getStaticFallbackHolidays(countryCode, year)` returning key national & international holidays (New Year, Lunar New Year / Tet for VN, Valentine's, Labor Day, Halloween, Christmas, etc.).
  - `buildCalendarEvents(rawHolidays, profile, year)` injecting the user's birthday (`🎂 <nickname>'s Birthday!`, `type: 'birthday'`, handling Feb 29 on non-leap years safely) and deduplicating by `date + name`.
  - `buildMonthCalendarGrid(year, month, todayYMD, selectedYMD, events, reminders)` returning 42 cells with accurate `dateStr`, `dayOfMonth`, `isCurrentMonth`, `isToday`, `isSelected`, `holidays`, `hasBirthday`, and `questsDue` (uncompleted + completed quests matching `dueDate === dateStr`).
  - `getUpcomingCountdownItems(events, reminders, todayYMD, limit)` returning sorted upcoming holidays, birthday, and due quests with `daysUntil` (`0` = `"Today!"`, `1` = `"Tomorrow"`, `N` = `"In Nd"`).
  - `parseCalendarProfileJson` / `serializeCalendarProfileJson` for persisting `{ nickname, birthdayMonth, birthdayDay, countryCode, cachedHolidays }`.
- [ ] **Step 2 (GREEN)**: Implement `src/core/calendarStore.ts` with clean, pure, zero-dependency TypeScript functions.

---

## Task 4: Main Process Holiday Fetch, Disk Persistence & IPC (`src/main/index.ts` & `src/preload/index.ts`)

- [ ] **Step 1**: In `src/main/index.ts`:
  - Load/save `usagi-calendar.json` in `app.getPath('userData')` via `parseCalendarProfileJson` / `serializeCalendarProfileJson`.
  - Implement non-blocking `refreshHolidaysFromNager(countryCode, year)` fetching `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}` (and `year + 1`) with a 4s timeout, merging with `getStaticFallbackHolidays` so offline mode always works.
  - If today matches the user's birthday (`birthdayMonth` & `birthdayDay`), trigger a cheerful birthday greeting speech bubble on Usagi (`"🎂 Happy Birthday, <nickname>! Una~!!"`).
  - Add IPC handlers/listeners:
    - `ipcMain.handle('get-calendar-state', ...)` -> returns `{ profile, events }`.
    - `ipcMain.on('update-buddy-profile', (_e, partialProfile) => ...)` -> updates profile, refreshes holidays if `countryCode` changed, saves to disk, and broadcasts `'calendar-state-changed'` to all windows (`mainWindow`, `dashboardWindow`, `stickyWindow`).
    - Update `ipcMain.on('add-reminder', (_e, payload: string | { text: string; dueDate?: string }) => ...)` so callers can pass either a raw string or `{ text, dueDate }`.
  - Include `calendar-state-changed` in `sendFullStateToWindow`.
- [ ] **Step 2**: In `src/preload/index.ts`:
  - Update `addReminder(text: string, dueDate?: string)`
  - Add `getCalendarState()`, `updateBuddyProfile(profile)`, and `onCalendarStateChanged(callback)` on `window.usagiAPI`.

---

## Task 5: Identical Kawaii Calendar UI in Dashboard & Sticky Note (`src/dashboard/` & `src/sticky/`)

- [ ] **Step 1: Dashboard Calendar & Date-Linked Quests (`src/dashboard/index.html` & `src/dashboard/dashboard.ts`)**:
  - Add the **Cozy Calendar & Holidays** section inside the Reminders & Quests card (or right below the quest input):
    - **Mini Month Calendar Header**: Month/Year title (`November 2026`), Prev (`‹`), Today (`Today`), Next (`›`) buttons.
    - **7-Column Weekday + 42-Cell Day Grid**: Rounded Custard & Caramel day tiles. Today has a golden caramel ring; selected date has a warm coral-amber highlight. Day markers inside each cell:
      - Caramel pudding dot (`●`) when quests are due on that date
      - Coral party dot (`●`) when a public holiday falls on that date
      - Golden star/cake dot (`★`) on the user's birthday
    - **Interactive Day Selection & Popover Banner**:
      - Clicking any date sets `selectedDateStr` (clicking it again or clicking `All Dates` clears the filter).
      - When a date is selected:
        - Shows selected date pill (`📅 Filtering & adding to: YYYY-MM-DD [✕ Show All]`).
        - If that date has a holiday or birthday, shows a cozy detail banner (`🎉 Holiday Name (localName)` or `🎂 Nickname's Birthday!`).
        - Filters the quest list below to show quests for that date (or all quests when cleared).
    - **Quick-Date Chips on Quest Input**: `[📅 Today]`, `[🌤️ Tomorrow]`, `[+3 Days]` chips that toggle the target `dueDate` for the next quest added, plus rendering a cute date badge (`11/02` or `Today`) on each quest item in the list.
    - **Upcoming Holidays & Birthday Feed**: Compact list of the next 4 upcoming holidays/birthdays with countdown badges (`Today!`, `Tomorrow`, `In 5d`).
    - **Buddy Profile & Country Bar**: Collapsible or compact inline row for `Nickname`, `Birthday (Month / Day)`, and `Country` (`VN`, `US`, `GB`, `DE`, `FR`, `ES`, `JP`, `KR`, `AU`, `CA`).
- [ ] **Step 2: Desktop Sticky Note 2-Tab Switcher (`src/sticky/index.html` & `src/sticky/sticky.ts`)**:
  - Add a compact 2-tab pill switcher right below the Sticky header:
    - `📝 Quests` tab
    - `📅 Calendar` tab
  - In **`📝 Quests` tab**:
    - Quick-date chip bar (`[Today]`, `[Tmrw]`) next to or below the input box + inline `@today` / `@tomorrow` hint.
    - Quest items show a compact due-date badge (`Today`, `Tmrw`, `MM/DD`) matching the Custard/Night theme.
  - In **`📅 Calendar` tab**:
    - Identical mini monthly calendar grid (`‹` `Month YYYY` `Today` `›`) with the same Custard & Caramel styling, holiday dots, birthday star, and quest dots!
    - Clicking a day in the Sticky Note calendar shows the holiday/quest details for that day and a quick `[+ Add Quest on MM/DD]` button that switches to the Quests tab with that date pre-selected!
    - Below the mini grid, render the chronological **Upcoming Holidays, Birthday & Deadlines** list (next 5 items with `Today!`, `Tomorrow`, `In Xd` badge).
  - Increase sticky window height slightly in `src/main/index.ts` if needed (e.g. `310x420`) so the mini calendar + countdown feed fit comfortably with zero clipping.

---

## Task 6: Verification, UI Audit & Clean Commit

- [ ] Run TypeScript check: `npx --no-install -p typescript tsc --noEmit --pretty false`
- [ ] Run Vitest unit test suite: `npx --no-install vitest run`
- [ ] Run production build: `npm run build`
- [ ] Run Prettier on modified files: `npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts"`
- [ ] Stage and commit cleanly (`git commit -m "feat: add unified calendar, holiday service, buddy birthday, and date-linked quests"`).
