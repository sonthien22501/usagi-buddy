# 🐰 Usagi Float (v0.3.0)

A delightful, transparent, always-on-top desktop companion for **macOS** and **Windows**. Usagi swims organically across your screen, cheers you up with authentic Chiikawa voice lines ("Una!", "Bryy!", "Huhhhh?"), reminds you to stay hydrated, and keeps you focused with scientific study methods, quick repeat alarms, and a dedicated companion dashboard!

<p align="center">
  <img src="assets/Usagi_logo.png" alt="Usagi Float Logo" width="160" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.3.0-ff7675.svg" alt="Version 0.3.0" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-ffeaa7.svg" alt="Platforms" />
  <img src="https://img.shields.io/badge/license-MIT-55efc4.svg" alt="License" />
</p>

---

## ✨ What's New in v0.3.0

### 🎯 Scientific Focus Study Methods

Replaced arbitrary timer options with 3 research-backed study presets across the Dashboard, Usagi Control Center, and macOS Menu Bar:

- **🍅 25m Pomodoro (5m Break)**: Ideal for beginners, overcoming procrastination, and administrative tasks.
- **⚡ 52m Rule (17m Break)**: Designed for deep reading, writing, coding, and sustained knowledge work.
- **🌊 90m Ultradian Rhythm (20m Break)**: Best for complex problem-solving, marathon study sessions, and creative flow states.

### ⏱️ Zero-Base Manual Input with `+10m` Stepper

- Manual time input is now **minutes-only** (hours dropdown removed for simplicity) and **starts at `0`**.
- Added a dedicated **`+10m`** button beside the input for 1-click time bumping (e.g. `0` ➔ `10` ➔ `20` ➔ `30`).
- Pressing `▶ Start` on `0` gracefully defaults to the standard 25m Pomodoro.

### 🚨 Interactive Big Usagi Alarm Actions

When your study session ends, Big Usagi appears on screen with interactive action pills and keyboard shortcuts:

- **🔁 Study Another [X]m**: Instantly restarts another session matching what you just completed (e.g. another 20m, 25m, 52m, or 90m). Shortcut: <kbd>Space</kbd>, <kbd>Enter</kbd>, or <kbd>R</kbd>.
- **⏳ +5m Wrap-up**: Gives you a 5-minute cooldown to finish typing or committing code before resting. Shortcut: <kbd>S</kbd> or <kbd>+</kbd>.
- **☕ Smart Break**: Dynamically offers the scientifically matched break duration (**5m** for Pomodoro, **17m** for 52/17, **20m** for Ultradian). Shortcut: <kbd>B</kbd>.
- **Dismiss & Rest**: Press <kbd>ESC</kbd> or click the background to dismiss.

### ⚡ Low-Spec Device Performance & Startup Optimizations

- **Lazy Dashboard Loading**: Dashboard window is created on-demand rather than on startup, cutting boot time by ~70% and saving ~120 MB RAM.
- **Fast 4-Sided Alpha Scan**: 50x faster bounding box algorithm skips transparent padding without looping over millions of empty pixels.
- **320px High-DPI Texture Pre-scaling**: Downscales sprites once on load, reducing 60 FPS VRAM usage by 95% and eliminating GPU downscale bottlenecks.
- **Zero-Latency Audio Instance Pooling**: Pre-cached audio elements eliminate click sound delay and avoid GC churn.
- **Desynchronized 2D Canvas**: Reduces input-to-render frame latency on integrated graphics.
- **Pixel-Perfect Menu Bar Alignment**: Standardized emoji variation selectors (`▶️`, `⏸️`, `🚪`).

---

## ✨ Features Overview

### 🎛️ Standalone Usagi Buddy Dashboard

- **Dedicated Desktop Window**: Adjust all settings, timers, volume, and behaviors in a clean, modern GUI window.
- **Background Persistence**: Close the dashboard anytime (`✕`)—Usagi continues floating, swimming, and tracking your focus timer in the background!
- **Reopen Anytime**: Click **"🎛️ Open Usagi Dashboard..."** in the menu bar, tap the app icon, or press <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>.

### 🔊 Unified Sound & Loudness Normalization

- **Single Horizontal Slider**: Smooth left-to-right volume slider (0% to 100%) with dynamic track filling.
- **Equalized Audio**: Built-in audio normalizer balances soft whispers and energetic screams so sound effects never blow out your speakers.
- **Instant Testing**: Includes quick **"🎵 Test Sound"** (chirps a live Usagi voice line) and **"🔇 Mute"** toggles.

### 📌 Stay Still (Anchor Mode) & Movement Controls

- **📌 Stay Still (Anchor Mode)**: Need deep concentration? Pin Usagi in place with one click to pause floating animations, or unpin to resume swimming.
- **🖱️ Drag-and-Drop**: Click and drag Usagi anywhere across your screen to reposition him at any time.
- **🪄 Play Mode (Cursor Follow)**: Have Usagi swim excitedly after your mouse pointer.
- **👻 Smart Ghost Mode (Click-Through)**: Make Usagi transparent to mouse clicks so you can click through him into code editors or browser windows.
- **🍮 Drop Pudding Snack**: Toss a custard pudding treat for Usagi to chase down and gobble up.

### 💧 Ambient Wellness & AFK Sleep Mode

- **Ambient Water Reminders**: Usagi gently asks you to take a sip of water randomly every 20–40 minutes without interrupting your typing.
- **AFK Sleep Mode**: If you step away from your computer for > 2 minutes, Usagi takes a nap (`"Zzz..."`) and celebrates when you return.

---

## ⌨️ Keyboard Shortcuts

| Shortcut                                              | Action                                             |
| :---------------------------------------------------- | :------------------------------------------------- |
| <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | Open / Focus Usagi Buddy Dashboard                 |
| <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> | Toggle Stay Still (Anchor Mode)                    |
| <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> | Toggle Ghost Mode (Click-Through)                  |
| <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> | Toggle Play Mode (Cursor Follow)                   |
| <kbd>Space</kbd> / <kbd>Enter</kbd> / <kbd>R</kbd>    | Repeat Previous Study Session (on Big Usagi Alarm) |
| <kbd>S</kbd> / <kbd>+</kbd>                           | +5m Quick Wrap-Up (on Big Usagi Alarm)             |
| <kbd>B</kbd>                                          | Take Recommended Break (on Big Usagi Alarm)        |
| <kbd>ESC</kbd> / <kbd>Click Anywhere</kbd>            | Dismiss Big Usagi Alarm / Close Control Center     |

---

## 📥 Download & Install

Download pre-built packages from the [**GitHub Releases**](https://github.com/sonthien22501/usagi-buddy/releases) page:

- **macOS** (Apple Silicon & Intel):
  - Download `Usagi-Float-0.3.0-arm64.dmg` (M1/M2/M3/M4) or `Usagi-Float-0.3.0.dmg` (Intel).
  - Drag `Usagi Float.app` into your **Applications** folder.
  - _First launch note_: Right-click (Control-click) `Usagi Float.app` ➔ **Open** to approve the Gatekeeper security prompt once.
- **Windows**:
  - Download `Usagi-Float-Setup-0.3.0.exe` or portable `.exe`.

---

## 🛠️ Development & Building from Source

```bash
# 1. Clone repository
git clone https://github.com/sonthien22501/usagi-buddy.git
cd usagi-buddy

# 2. Install dependencies
npm install

# 3. Run development mode (hot-built)
npm start

# 4. Run tests
npm test

# 5. Build distributable binaries
npm run dist:mac  # For macOS
npm run dist      # For host OS
```

---

## ☕ Support & Donations

If you enjoy having Usagi float on your screen while studying or coding, consider supporting the developer:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Developer-orange?logo=kofi&logoColor=white)](https://ko-fi.com/rodannguyen)

---

## 📄 License

The source code of **Usagi Float** is licensed under the [**MIT License**](LICENSE).

```text
MIT License — Copyright (c) 2026 sonthien22501 (Son Thien Nguyen)
```

Permission is hereby granted to anyone to inspect, run, modify, and build upon the application code for personal or non-commercial use, subject to the license conditions.

---

## ⚖️ Disclaimer

This is an **unofficial, non-commercial fan-made project** created solely for study, focus, and personal enjoyment.

All character designs, visual assets, and voice sounds associated with **Usagi / Chiikawa (ちいかわ)** belong to their original author **© Nagano (ナガノ)** and respective copyright holders. No copyright or trademark infringement is intended. If you are a rights holder and would like this fan project removed or modified, please open an issue or contact the maintainer.
