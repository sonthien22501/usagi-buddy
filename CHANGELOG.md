# 📜 Usagi Buddy Changelog

All notable changes, release highlights, and fixes for **Usagi Buddy** (formerly Usagi Float) are documented in this file.

---

## [0.6.3] - 2026-11-04

### 🎬 Feature Demo Video
- **`docs/media/usagi-demo.mp4`**: An 84-second screen recording of the real shipping app — not a mock-up — covering the water reminder, dashboard, wardrobe, focus presets, live language switching, date-linked quests, calendar and the giant alarm.
- Recorded through `scripts/demo/record.sh`, which boots the real build against an isolated profile, replays the scripted walkthrough with a genuine OS pointer, captures the screen, then mixes in Usagi's voice lines and an original synthesized music bed.
- Usagi's voice clips and the music are laid in post, because macOS `screencapture` records the microphone rather than system output.

### 🛡️ Data Integrity & Durability
- **Corrupt recurrence no longer breaks loading**: Weekly recurrence data is sanitized and the weekday search is bounded, so a malformed quest cannot hang or crash the store.
- **Quests survive bad dates**: Quests with null or impossible due dates are kept on load and their date is dropped instead of the whole quest.
- **Atomic state writes**: Every state file is now written via a temp-file-and-rename with one recoverable backup, so an interrupted write cannot leave a truncated profile.
- **Single-instance enforcement**: A second launch exits instead of racing the first for the same shared state files.

### 📅 Calendar & Date Correctness
- Real calendar dates are validated, including month/day birthday pairs, so impossible values such as 31 February are rejected rather than rendered.

### 🐰 Behaviour & Lifecycle
- **Quest completion now actually spins Usagi**, matching the celebration the UI implies.
- **Add-quest failures are reported** and the typed text is retained, instead of failing silently and clearing the input.
- **Welcome-back snack plays once**, with the eating sound no longer stacking on every focus.
- **Sticky clock and schedule refresh at the minute boundary and at local midnight**, rather than drifting until the next interaction.
- **Sticky window opens on the nearest connected display** instead of a possibly disconnected one.
- **Wellness ticks are skipped while Usagi is hidden**, and daily wellness stats now persist and roll over at local midnight.
- **Long speech bubbles wrap with canvas-aware clamping** so text cannot overflow its bubble.

### 🔒 Hardening
- Untrusted pomodoro duration and volume IPC payloads are sanitized before use.
- Giant alarm sprites are preloaded, and sprite loading degrades safely instead of throwing.
- Removed the dead overdue-deadline stage and unused helpers, and aligned AFK documentation with the real 10-minute threshold.

---

## [0.6.2] - 2026-11-03

### 🐰 Rebrand & Native Icons
- **Rebranded to Usagi Buddy**: Formally unified desktop companion product name as **Usagi Buddy** across packaging, DMG volumes, and Windows installers.
- **Native macOS & Windows App Icons**:
  - macOS: Multi-resolution Retina `.icns` (`16x16` through `1024x1024`) generated from `assets/Usagi_logo.png`.
  - Windows: High-detail multi-resolution `.ico` icon (`16x16` through `256x256`).
  - Fallback: Crisp 512×512 PNG icon.

### 🔏 Ad-Hoc macOS Code-Signing (Gatekeeper Fix)
- **The bug**: The release pipeline built with `identity: null`, causing `electron-builder` to skip signing entirely. The `.app` kept only the Mach-O linker signature from prebuilt binaries with no valid bundle seal, causing macOS Gatekeeper to kill it as _"Usagi-Float is damaged and can't be opened."_
- **The fix**: Added `scripts/afterPack.js` (wired via `build.afterPack`). Recursively ad-hoc signs all nested bundles, frameworks, dylibs, and Mach-O helper binaries (deepest first, including Electron's `chrome_crashpad_handler`), then the outer `.app`, and gates packaging with `codesign --verify --strict`.
- **Result**: `codesign --verify --deep --strict` passes with a valid seal. macOS shows the standard one-time unidentified developer dialog instead of the unrecoverable damaged dialog.

---

## [0.6.1] - 2026-11-03

### 🗂️ Language & State Persistence Survives Restarts
- **Canonical userData Root**: Pinned `app.getPath('userData')` to `~/Library/Application Support/usagi-buddy` before app-ready via `app.setPath()`. Eliminates split-brain settings writes to `Application Support/Electron` when launched in dev mode or with generic executables.
- **Deterministic Storage**: `npm start`, `electron .`, and packaged builds all read and write the exact same settings root.

### ✅ Save Button Replaced with Elegant Auto-Save Indicator
- Removed full-width `💾 Save All Settings` bottom button from Dashboard in favor of instant per-change auto-persistence.
- Added a non-intrusive `✓ Saved` pill indicator fading in beside the Dashboard title for 1.2s on configuration changes (8.18:1 contrast, `aria-live="polite"`).
- Localized in all 8 languages via `dash.config.autosaved`.

---

## [0.6.0] - 2026-11-03

### 🌐 Multi-Language Support (8 Locales)
- **Zero-Dependency i18n Engine**: Fully localized across 8 languages:
  - 🇺🇸 English (`en`)
  - 🇻🇳 Vietnamese (`vi`)
  - 🇩🇪 German (`de`)
  - 🇫🇷 French (`fr`)
  - 🇪🇸 Spanish (`es`)
  - 🇯🇵 Japanese (`ja`)
  - 🇰🇷 Korean (`ko`)
  - 🇨🇳 Simplified Chinese (`zh`)
- **System Locale Auto-Detection**: Automatically detects and applies system locale on initial launch.
- **Instant Live Switching**: Change language on the fly in the Dashboard with real-time multi-window IPC synchronization across Dashboard, Sticky Note, and Tray Popover.
- **Multilingual Holiday Support**: Displays localized public holiday names (`localName`) when available.

### 📅 Unified Calendar, Public Holidays & Buddy Birthday
- **Dual-Surface Mini Calendar**: Identical Custard & Caramel mini calendar grid view available in both the Companion Dashboard and desktop Sticky Note.
- **Global Public Holidays**: Zero-permission country detection with automatic holiday fetching via the Nager.Date API, backed by resilient offline caching.
- **Buddy Profile & Birthday Countdown**: Chiikawa and Usagi birthday milestones injected directly into the calendar with special celebration countdowns and speech greetings.
- **Date-Linked Quests**: Dates reflect active deadlines; clicking any date filters or anchors quests seamlessly.

### ☀️ Cozy Date-Only Daily Digest & Smart Deadlines
- **Honest Date Precision (`YYYY-MM-DD`)**: Deadlines focus on dates rather than stressful minute precision, complete with natural shorthand parsing (`@today`, `@tomorrow`, `@+3d`, `@YYYY-MM-DD`).
- **Cozy Morning & Evening Digests**: Usagi gently informs you of upcoming quests through speech bubbles:
  - ☀️ **Morning Digest** (`hour >= 8`): Summarizes quests due today or overdue with an encouraging cheer.
  - 🌙 **Evening Preview** (`hour >= 19`): Summarizes tomorrow's quests ahead of time.
- **Visible-Only Delivery**: Alerts are only presented when Usagi is actively visible on screen, preventing missed notifications during Do Not Disturb mode.

### 🔁 Natural Multilingual Recurring Quests
- **Effortless Habit Parsing**: Type natural recurring phrases directly into the quest box across all 8 supported languages:
  - `"every day"`, `"daily"`, `"mỗi ngày"` ➔ Daily quest
  - `"every weekday"`, `"mỗi ngày trong tuần"` ➔ Weekday quest (Mon–Fri)
  - `"every Tuesday"`, `"mỗi thứ ba"` ➔ Weekly recurring quest anchored to that day of the week
- **Smart Automatic Rollover**: Checking off a completed recurring task automatically advances its due date to the next occurrence, resets notifications, and triggers Usagi's celebratory spin feat.
- **Subtle Visual Pill**: Displays a minimal `↻` badge on the Sticky Note (e.g., `↻ Tue, Nov 10`) without visual clutter.

### 🍮 Themed Taskbar Tray Popover & Kawaii SVG Icons
- **Custard & Caramel Tray Popover (`src/tray/`)**: Replaced standard OS menus with a custom anime popover matching the desktop companion's aesthetic.
- **3-Chip Focus Presets**: Quick one-click activation for 25m Pomodoro, 52m Deep Work, and 90m Ultradian Flow with live remaining time countdowns.
- **Unified Kawaii Icon System**: 100% theme-adaptive vector rounded SVG icons across Tray, Dashboard, and Sticky Note.
- **Multi-Monitor Display Clamping**: Popover automatically anchors to the active display bounds without overflowing screen edges.

### 💾 Cross-Session State & Geometry Memory
- **Sticky Note Geometry Memory**: Pinned Sticky Note window position and dimensions are remembered across restarts, with adaptive font scaling (`--font-scale`).
- **Tab State Hydration**: Restores your last active tab (Quests vs. Calendar) in both Sticky Note and Dashboard.
- **Companion Window Coordinates**: Usagi's screen position is saved across drag-and-pin sessions.

### 👗 Wardrobe Triple-Click Combo Polish
- **Spin & Morph**: Rapid triple-clicking triggers a super-spin costume morph while reliably preserving your auto-rotation preference.

---

## [0.5.0] - 2026-10-26

### 🍮 Usagi Custard & Caramel Anime Theme
- **Day Custard Theme (Default)**: Warm custard yellow (`#FFF9D2`) anime palette with rounded pill buttons, creamy cards, and Chiikawa-accurate badge styling across Dashboard and Sticky Note.
- **Cozy Night Mode Toggle**: One-click day/night theme toggle with deep warm navy tones for late-night study sessions without eye fatigue.

### 📝 Desktop-Pinned Sticky Quests Note
- **Frameless Pinned Checklist (`src/sticky/`)**: A dedicated desktop note window for quick tasks, daily goals, and quest tracking.
- **Comfy Strikethrough Interaction**: Instant click-to-complete with smooth strikethrough animation.
- **Task Celebration Feats**: Completing a quest triggers an excited Usagi spin boost and speech celebration (`"Yaha!! ✓ <task>"`).
- **Safe Persistence**: Automatically saves to `usagi-reminders.json` with multi-window synchronization across Sticky Note, Dashboard, and System Tray.

### 👗 30-Minute Wardrobe Auto-Rotation & Lock Toggle
- **Auto-Rotation**: Usagi automatically rotates between outfits (Classic, Study, Vest/Work, Sigma, and Star) every 30 minutes of active use.
- **Appearance Lock Toggle**: One-click `🔄 Auto-Change` vs. `🔒 Appearance Fixed` button in the Dashboard and Tray to pin your favorite outfit permanently.
- **Combo-Click Morph**: Rapid clicking triggers a super-spin tornado that randomly morphs Usagi's costume!

### 🙈 Do Not Disturb ("Hide Usagi") Mode
- **Zero-Distraction Focus**: Hide the floating buddy with one click (`🙈 Hide Usagi`) from Dashboard or System Tray when you need a clear screen.
- **Uninterrupted Timers**: Focus countdowns and ambient wellness tracking keep running silently in the background.
- **Guaranteed Alarms**: Giant Usagi Chaos Alarms still break through when your study session ends.

### 💧 Wellness & Treat Audio Polish
- **Reliable Water Reminders**: Ambient 20–40 minute water reminders now feature a 10-minute AFK detection threshold so short reading pauses never starve hydration alerts.
- **Extended Water Bubble**: Water reminder speech bubbles stay visible for 8 seconds.
- **Authentic Pudding Sound Timing**: The pudding treat audio (`unayahayahauna.mp3`) plays strictly upon Usagi grabbing and gobbling the pudding.

---

## [0.4.0] - 2026-10-22

### 👘 Usagi Wardrobe & Multi-Costume System
- **5 Hand-Drawn Costumes**: Classic Upright, Study Usagi, Work Vest Usagi, Sigma/Ngau Usagi, and Star Wand Usagi.
- **Interactive Wardrobe Grid**: Select costumes directly inside the Dashboard.
- **Shuffle / Random Mode**: Automatically picks a new costume on every interaction.

### 🚨 Multi-Sprite Giant Usagi Chaos Alarms
- Randomized alarm takeover alternating between Classic Giant Usagi (`Usagi_Big.png`) and Chaos Screaming Giant Usagi (`Usagi_Big2.png`).
- Dual-channel volume slider separating companion voice chirps from the Giant Alarm takeover.

---

## [0.3.0] - 2026-10-22

### 🎯 Scientific Focus Study Methods
- **🍅 25m Pomodoro (5m Break)**: Ideal for beginners, overcoming procrastination, and administrative tasks.
- **⚡ 52m Rule (17m Break)**: Designed for deep reading, writing, coding, and sustained knowledge work.
- **🌊 90m Ultradian Rhythm (20m Break)**: Best for complex problem-solving, marathon study sessions, and creative flow states.

### ⏱️ Zero-Base Manual Input with `+10m` Stepper
- Manual time input is minutes-only starting at `0`, with dedicated `+10m` increment button.
- Pressing `▶ Start` on `0` gracefully defaults to standard 25m Pomodoro.

### 🚨 Interactive Big Usagi Alarm Actions
- When study session ends, Big Usagi appears on screen with interactive action pills and keyboard shortcuts:
  - **🔁 Study Another [X]m** (`Space` / `Enter` / `R`)
  - **⏳ +5m Wrap-up** (`S` / `+`)
  - **☕ Smart Break** (`B`)
  - **Dismiss** (`ESC` / click outside)

### ⚡ Low-Spec Device Performance & Startup Optimizations
- **Lazy Dashboard Loading**: Dashboard window is created on-demand, cutting boot time by ~70% and saving ~120 MB RAM.
- **Fast 4-Sided Alpha Scan**: 50x faster bounding box algorithm skips transparent padding without looping over empty pixels.
- **320px High-DPI Texture Pre-scaling**: Downscales sprites once on load, reducing 60 FPS VRAM usage by 95%.
- **Zero-Latency Audio Instance Pooling**: Pre-cached audio elements eliminate click sound delay and avoid GC churn.
