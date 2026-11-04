# 🔒 Privacy Notice — Usagi Buddy

**Short version: Usagi Buddy does not collect your data.** There are no accounts, no analytics,
no telemetry, no crash reporting, no advertising SDKs, and no cloud sync. Everything you type
stays on your computer.

This notice explains exactly what is stored locally and the single outbound network request the
app makes, so you can verify the claim yourself.

---

## 1. What is stored on your device

All application state is written as plain JSON to the OS user-data folder. Nothing is uploaded.

| Platform | Location |
|---|---|
| macOS | `~/Library/Application Support/usagi-buddy/` |
| Windows | `%APPDATA%\usagi-buddy\` |

| File | Contents |
|---|---|
| `usagi-settings.json` | Costume, volume, window position, mode toggles, timer state, language |
| `usagi-reminders.json` | Your quest/task text, due dates, subtasks, sticky-note size and position |
| `usagi-calendar.json` | Nickname, birthday (month + day only, no year), country code, cached holidays |
| `usagi-schedule.json` | Weekly class/study timetable entries |
| `usagi-wellness.json` | Local counters (snacks fed, pomodoros completed, breaks taken) |

Each file is written atomically with a `.bak` recovery copy. **They are not encrypted** — anyone
with access to your user account can read them. They contain no passwords, tokens, or payment
data. To erase everything, quit the app and delete that folder.

---

## 2. Network access

The app makes **one** kind of outbound request:

### Public holiday lookup (Nager.Date)

- **Endpoint:** `https://date.nager.at/api/v3/PublicHolidays/{year}/{country}`
- **When:** once at startup (for the current and next year), and again if you change your country
  in Settings.
- **What is sent:** the two-letter **country code** and the **year** — that's it. As with any
  HTTPS request, the server also sees your IP address and a standard User-Agent string.
- **Why:** to populate the mini-calendar with national public holidays.
- **Your country code is guessed from your operating system's locale/timezone**, never from GPS
  or IP geolocation, and defaults to `US` if it cannot be determined.
- **Offline behaviour:** if the request fails or you are offline, the app falls back to a built-in
  holiday list. The calendar still works.

No nickname, birthday, task text, schedule, timer, or wellness statistic is ever included in
this request.

> There is currently no in-app switch to disable this lookup. The request carries no personal
> data beyond your country code, and blocking `date.nager.at` at the firewall only costs you the
> online holiday list.

### What the app never does

- No usage analytics, event tracking, or session recording
- No crash reports or diagnostics uploads
- No device fingerprinting or advertising identifiers
- No auto-update checks or version pings
- No remote fonts, CDNs, images, or audio — all assets ship inside the app
- No reading of your clipboard, files, microphone, or camera

---

## 3. Operating-system access

| Access | Why | Scope |
|---|---|---|
| Screen bounds & cursor position | Place windows correctly and let Usagi follow your cursor | Coordinates only — screen **contents are never captured** |
| System idle time | Put Usagi to sleep when you step away (AFK mode) | Idle duration only |
| Global keyboard shortcuts | Toggle ghost/play/anchor modes and open the dashboard | Fixed shortcut combos only — keystrokes are not logged |
| App data folder | Save and load your settings, quests, and timetable | Its own folder only |

The app runs with your normal user privileges. It never requests administrator/root access.

---

## 4. Third parties

The only third party contacted is **Nager.Date**, a free open-source public-holiday API. No data
is sold, shared, or transferred to anyone else, because none is collected.

---

## 5. Children's privacy

The app collects no personal information from anyone, including children.

---

## 6. Changes

If this notice ever changes, the update will be committed to this repository with a clear
diff, and the "last updated" date below will change.

**Last updated:** 2026-11-04 · applies to Usagi Buddy v0.6.3 and later.

Questions? Open an issue: <https://github.com/sonthien22501/usagi-buddy/issues>
