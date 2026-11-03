# 🐰 Usagi Buddy (v0.6.2)

A delightful, transparent, always-on-top desktop companion for **macOS** and **Windows**. Usagi swims organically across your screen, cheers you up with authentic Chiikawa voice lines ("Una!", "Bryy!", "Huhhhh?"), reminds you to stay hydrated, and keeps you focused with scientific study methods, quick repeat alarms, wardrobe costumes, desktop sticky notes, a unified calendar with holidays, multi-language support (8 locales), and a dedicated anime-themed companion dashboard!

<p align="center">
  <img src="assets/Usagi_logo.png" alt="Usagi Buddy Logo" width="160" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.6.2-ff7675.svg" alt="Version 0.6.2" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-ffeaa7.svg" alt="Platforms" />
  <img src="https://img.shields.io/badge/license-MIT-55efc4.svg" alt="License" />
</p>

---

## ✨ Features Overview

### 🎛️ Standalone Companion Dashboard
- **Dedicated Desktop Window**: Adjust all settings, timers, wardrobe costumes, volume, and behaviors in a clean, anime-styled Custard & Caramel dashboard window.
- **Background Persistence**: Close the dashboard anytime (`✕`)—Usagi continues floating, swimming, and tracking your focus timer in the background!
- **Instant Auto-Save**: Settings automatically persist with a subtle `✓ Saved` pill indicator.
- **Reopen Anytime**: Click **"🎛️ Open Usagi Dashboard..."** in the menu bar/system tray or press <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>.

### 📝 Desktop-Pinned Sticky Quests & Mini Calendar
- **Frameless Pinned Checklist (`src/sticky/`)**: A dedicated desktop note window for quick tasks, daily goals, and quest tracking.
- **Natural Multilingual Habits**: Type natural recurring phrases (`"every day"`, `"every weekday"`, `"every Tuesday"`, `"mỗi ngày"`, etc.) with automatic due-date rollover on check-off.
- **Dual-Surface Mini Calendar**: Unified calendar with national public holidays (via Nager.Date API) and Chiikawa birthday milestones.
- **Task Celebrations**: Completing a quest triggers an excited Usagi spin boost and speech celebration (`"Yaha!! ✓ <task>"`).

### 🌐 Multi-Language Support (8 Locales)
- Zero-dependency i18n engine supporting **English**, **Vietnamese** (Việt), **German** (Deutsch), **French** (Français), **Spanish** (Español), **Japanese** (日本語), **Korean** (한국어), and **Simplified Chinese** (简体中文).
- Live switching across Dashboard, Sticky Note, and System Tray with instant IPC broadcast.

### 🎯 Scientific Focus Study Methods & Giant Usagi Alarms
- **Scientific Presets**: One-click 🍅 **25m Pomodoro** (5m Break), ⚡ **52m Rule** (17m Break), and 🌊 **90m Ultradian Rhythm** (20m Break).
- **Interactive Giant Usagi Alarm**: Big Usagi takes over the screen when time expires with quick action pills (<kbd>R</kbd> Repeat, <kbd>S</kbd> +5m Wrap-up, <kbd>B</kbd> Break, <kbd>ESC</kbd> Dismiss).
- **Multi-Sprite Chaos Alarms**: Alternates between Classic Giant Usagi and Screaming Chaos Usagi.

### 👗 Usagi Wardrobe & Costumes
- **5 Hand-Drawn Costumes**: Classic Upright, Study Usagi, Work Vest Usagi, Sigma/Ngau Usagi, and Star Wand Usagi.
- **30-Minute Auto-Rotation**: Automatically rotates outfits periodically or lock your favorite style with the **Appearance Lock** toggle.
- **Combo-Click Morph**: Rapid clicking triggers a super-spin tornado that randomly morphs Usagi's costume!

### 📌 Anchor, Movement & Ghost Controls
- **📌 Stay Still (Anchor Mode)**: Pin Usagi in place when you need uninterrupted focus (<kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd>).
- **🖱️ Drag-and-Drop**: Reposition Usagi anywhere across your screens.
- **🪄 Play Mode**: Have Usagi swim playfully after your cursor (<kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>).
- **👻 Smart Ghost Mode**: Make Usagi click-through so you can interact with code or windows underneath (<kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd>).
- **🍮 Treat Snack**: Drop custard puddings for Usagi to chase down and gobble up!

### 💧 Ambient Wellness & AFK Sleep Mode
- **Water Reminders**: Ambient 20–40 minute reminders encourage hydration without breaking concentration.
- **AFK Sleep Mode**: Steps away for > 10 minutes? Usagi takes a nap (`"Zzz..."`) and preserves your timer state.
- **🙈 Do Not Disturb ("Hide Usagi")**: Hide Usagi with one click during meetings; timers and alarms still operate silently in the background.

---

## 📥 Download & Install

Download pre-built packages from the [**GitHub Releases**](https://github.com/sonthien22501/usagi-buddy/releases) page:

- **macOS** (Apple Silicon & Intel):
  - Download `Usagi Buddy-0.6.2-arm64.dmg` (M1/M2/M3/M4) or `Usagi Buddy-0.6.2.dmg` (Intel).
  - Also available as portable `.zip`: `Usagi Buddy-0.6.2-arm64-mac.zip` or `Usagi Buddy-0.6.2-mac.zip`.
  - Drag `Usagi Buddy.app` into your **Applications** folder.
  - _First launch note_: The build is ad-hoc signed. On macOS 15+ (Sequoia), open **System Settings ➔ Privacy & Security**, scroll to the blocked-app notice, and click **Open Anyway**.
  - If macOS ever reports the app is _"damaged"_, clear the quarantine flag in Terminal:
    ```bash
    xattr -dr com.apple.quarantine "/Applications/Usagi Buddy.app"
    ```
- **Windows**:
  - Download `Usagi Buddy.Setup.0.6.2.exe` (installer) or `Usagi Buddy.0.6.2.exe` (portable).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | Open / Focus Usagi Buddy Dashboard |
| <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> | Toggle Stay Still (Anchor Mode) |
| <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> | Toggle Ghost Mode (Click-Through) |
| <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> | Toggle Play Mode (Cursor Follow) |
| <kbd>Space</kbd> / <kbd>Enter</kbd> / <kbd>R</kbd> | Repeat Previous Study Session (on Big Usagi Alarm) |
| <kbd>S</kbd> / <kbd>+</kbd> | +5m Quick Wrap-Up (on Big Usagi Alarm) |
| <kbd>B</kbd> | Take Recommended Break (on Big Usagi Alarm) |
| <kbd>ESC</kbd> / <kbd>Click Anywhere</kbd> | Dismiss Big Usagi Alarm / Close Control Center |

---

## 🛠️ Development & Building from Source

```bash
# 1. Clone repository
git clone https://github.com/sonthien22501/usagi-buddy.git
cd usagi-buddy

# 2. Install dependencies
npm install

# 3. Run development mode
npm start

# 4. Run tests
npm test

# 5. Build distributable binaries
npm run dist:mac  # For macOS
npm run dist      # For host OS
```

---

## 📜 Version History & Changelog

### Latest Release: [v0.6.2](https://github.com/sonthien22501/usagi-buddy/releases/tag/v0.6.2)
- **Rebranded to Usagi Buddy** across applications, packages, and installer volumes.
- **Native App Icons**: Embedded high-resolution `.icns` (macOS) and `.ico` (Windows) using the official Usagi logo.
- **Ad-Hoc Code-Signing**: Automatic recursive signing of all nested frameworks and Mach-O helpers, fixing Gatekeeper rejection on macOS.

> 📖 **Full Changelog**: For detailed notes and historical milestones from v0.1.0 to present, see [**CHANGELOG.md**](CHANGELOG.md).

---

## ☕ Support & Donations

If you enjoy having Usagi float on your screen while studying or coding, consider supporting the developer:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Developer-orange?logo=kofi&logoColor=white)](https://ko-fi.com/rodannguyen)

---

## 📄 License

The source code of **Usagi Buddy** is licensed under the [**MIT License**](LICENSE).

```text
MIT License — Copyright (c) 2026 sonthien22501 (Son Thien Nguyen)
```

Permission is hereby granted to anyone to inspect, run, modify, and build upon the application code for personal or non-commercial use, subject to the license conditions.

---

## ⚖️ Disclaimer

This is an **unofficial, non-commercial fan-made project** created solely for study, focus, and personal enjoyment.

All character designs, visual assets, and voice sounds associated with **Usagi / Chiikawa (ちいかわ)** belong to their original author **© Nagano (ナガノ)** and respective copyright holders. No copyright or trademark infringement is intended. If you are a rights holder and would like this fan project removed or modified, please open an issue or contact the maintainer.
