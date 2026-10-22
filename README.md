# 🐰 Usagi Float (v0.2.0)

A delightful, transparent, always-on-top desktop companion for **macOS** and **Windows**. Usagi swims organically across your screen, cheers you up with authentic Chiikawa voice lines ("Una!", "Bryy!", "Huhhhh?"), reminds you to stay hydrated, and keeps you focused with a customizable Pomodoro timer and a dedicated companion dashboard!

<p align="center">
  <img src="assets/Usagi_logo.png" alt="Usagi Float Logo" width="160" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.0-ff7675.svg" alt="Version 0.2.0" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-ffeaa7.svg" alt="Platforms" />
  <img src="https://img.shields.io/badge/license-MIT-55efc4.svg" alt="License" />
</p>

---

## ✨ What's New in v0.2.0

### 🎛️ Standalone Usagi Buddy Dashboard
- **Dedicated Desktop Window**: Adjust all settings, timers, volume, and behaviors in a clean, modern GUI window.
- **Background Persistence**: Close the dashboard anytime (`✕`)—Usagi continues floating, swimming, and tracking your focus timer in the background!
- **Reopen Anytime**: Click **"🎛️ Open Usagi Dashboard..."** in the menu bar, tap the app icon, or press <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>.

### 🔊 Unified Sound & Loudness Normalization
- **Single Horizontal Slider**: Smooth left-to-right volume slider (0% to 100%) with dynamic track filling (unfilled right side is cleanly greyed out).
- **Equalized Audio**: Built-in audio normalizer balances soft whispers and energetic screams so sound effects never blow out your speakers.
- **Instant Testing**: Includes quick **"🎵 Test Sound"** (chirps a live Usagi voice line) and **"🔇 Mute"** toggles.

### 🍅 Flexible Focus Pomodoro Timer
- **Quick Preset Chips**: Jump straight to `25m Standard`, `40m Extended`, `60m (1h)`, `90m`, or `2h`.
- **Custom Time Input**: Type any number and choose **Minutes** or **Hours** from the dropdown (with stepper arrows removed for clean typing).
- **Streamlined Menu Bar**: Displays only the clean countdown timer (e.g. `25:00`) directly on your status bar with no clutter.

### 🚨 Giant Usagi Chaos Alarm
- When your focus timer finishes, **Usagi_Big.png** bursts onto the center of your screen with anime radial speed lines, a comic speech banner, and screen shake to celebrate your hard work!
- **Anywhere Dismissal**: Press any keyboard key or click anywhere on screen to dismiss the alarm and automatically drop a celebratory pudding snack.

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

| Shortcut | Action |
| :--- | :--- |
| <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | Open / Focus Usagi Buddy Dashboard |
| <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> | Toggle Stay Still (Anchor Mode) |
| <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> | Toggle Ghost Mode (Click-Through) |
| <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> | Toggle Play Mode (Cursor Follow) |
| <kbd>Any Key</kbd> / <kbd>Click Anywhere</kbd> | Dismiss Giant Usagi Alarm when triggered |

---

## 📥 Download & Install

Download pre-built packages from the [**GitHub Releases**](https://github.com/sonthien22501/usagi-buddy/releases) page:

- **macOS** (Apple Silicon & Intel):
  - Download `Usagi-Float-0.2.0-arm64.dmg` (M1/M2/M3/M4) or `Usagi-Float-0.2.0.dmg` (Intel).
  - Drag `Usagi Float.app` into your **Applications** folder.
  - *First launch note*: Right-click (Control-click) `Usagi Float.app` ➔ **Open** to approve the Gatekeeper security prompt once.
- **Windows**:
  - Download `Usagi-Float-Setup-0.2.0.exe` or portable `.exe`.

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

## ⚖️ Disclaimer

This is an **unofficial, non-commercial fan-made project** created solely for study and personal enjoyment.

All character designs, visual assets, and voice sounds associated with **Usagi / Chiikawa (ちいかわ)** belong to their original author **© Nagano (ナガノ)** and respective copyright holders. No copyright or trademark infringement is intended. If you are a rights holder and would like this fan project removed or modified, please open an issue or contact the maintainer.
