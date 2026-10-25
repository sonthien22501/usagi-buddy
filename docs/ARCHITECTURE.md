# Usagi Float — Architecture Cache (v0.5)

## 1. System Overview & Tech Stack

- **Product**: Cross-platform (macOS + Windows) frameless, transparent, desktop companion ("Usagi Float") featuring multi-window architecture: overlay buddy window, full-control dashboard window, and desktop-pinned sticky checklist window.
- **Runtime & UI**: Electron + TypeScript + HTML5 2D Canvas (60 FPS kick-and-glide swimming, cursor keychain hug physics, per-pixel `setIgnoreMouseEvents(true, { forward: true })` hit-testing, Web Audio MP3 playback, Usagi Custard & Caramel Anime Theme with day/night modes).
- **Bundler & Compiler**: `typescript` (`tsc --noEmit`) + `esbuild` (bundles main, preload, renderer, dashboard, sticky, and copies `.png` + `.mp3` assets).
- **Test & Format**: `vitest` (11 test suites covering core physics, reminders, cursor hugs, alarm, and asset integrity) + `prettier`.

## 2. Exact Commands (Law 1 & Law 2 Quiet Flags)

- **Typecheck**: `npx --no-install -p typescript tsc --noEmit --pretty false`
- **Unit Tests**: `npx --no-install vitest run`
- **Build**: `npm run build`
- **Format**: `npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts"`

## 3. Directory & Module Map

```
usagi-buddy/
├── assets/
│   ├── Usagi1.png .. Usagi6.png   # 1170x1560 RGBA sprites (Usagi3.png upright primary sprite)
│   ├── Usagi_Big.png              # 736x736 RGBA big fat Usagi for pomodoro takeover alarm
│   ├── Usagi_Big2.png             # 735x734 RGBA alternate chaos giant sprite
│   ├── Usagi_logo.png             # 755x755 RGBA official app logo & tray icon
│   ├── Usagi_{Study,Vest,Ngau,Star}.png # Costume PNG sprites
│   └── *.mp3                      # una, bryy, huhhhh?, urararusk, unayahayahauna, wuuulaaaa
├── src/
│   ├── core/
│   │   ├── alphaCropper.ts        # Alpha bounding-box scanner & auto-trimmer
│   │   ├── physicsEngine.ts       # 60fps kick-and-glide swimming, squash/stretch, cursor follow, combo spin
│   │   ├── cursorHugController.ts # Playful keychain hug physics, butt-wiggle pounce, pendulum inertia & shake-to-drop
│   │   ├── reminderStore.ts       # Desktop sticky reminders state machine, JSON disk persistence & task celebration detection
│   │   ├── costumeManager.ts      # Multi-costume wardrobe selector & shuffle system
│   │   ├── ghostModeController.ts # Smart click-through & interactive hit-box forwarding logic
│   │   ├── pomodoroTimer.ts       # 25-min study countdown & snack drop generator
│   │   ├── giantAlarmController.ts # Chaos giant Usagi break alarm, speed lines, & click/key dismiss
│   │   ├── soundManager.ts        # Event-to-MP3 mapper, URL-safe encoder (huhhhh%3F.mp3), mute & cooldown
│   │   └── wellnessCoach.ts       # Random 30–40m water reminder, 2m AFK sleep mode, & daily tray stats
│   ├── main/
│   │   └── index.ts               # Electron Main: overlay window, dashboard window, sticky window, tray menu, reminders IPC
│   ├── preload/
│   │   └── index.ts               # Electron contextBridge (`window.usagiAPI`)
│   ├── sticky/
│   │   ├── index.html             # Desktop-pinned frameless sticky note quest board
│   │   └── sticky.ts              # Sticky note controller with theme toggle & task CRUD
│   ├── dashboard/
│   │   ├── index.html             # Dedicated Usagi Buddy Dashboard GUI window (Custard & Caramel anime theme)
│   │   └── dashboard.ts           # Dashboard controller (reminders sync, cursor hug toggles, wardrobe grid, volume & timer)
│   └── renderer/
│       ├── index.html             # Transparent full-screen overlay canvas & quick floating controls
│       └── app.ts                 # 60fps swim transforms, cursor keychain hug physics, anime notes & task celebration spins
└── tests/
    ├── alphaCropper.test.ts
    ├── physicsEngine.test.ts
    ├── cursorHugController.test.ts
    ├── reminderStore.test.ts
    ├── costumeManager.test.ts
    ├── ghostModeController.test.ts
    ├── pomodoroTimer.test.ts
    ├── soundManager.test.ts
    ├── wellnessCoach.test.ts
    ├── giantAlarmController.test.ts
    └── assetsIntegration.test.ts
```

## 4. Core Data Contracts

- `UsagiState`: `{ x, y, vx, vy, rotation, angularVelocity, swimPhaseRad, scaleX, scaleY, frameIndex, frameTimerMs, spinBoostTimerMs, comboClicks, speechBubble, speechTimerMs, scaleFlipX, snacksEaten, sleeping, stationary }`
- `CursorHugState`: `{ enabled, phase, phaseTimerMs, pendulumAngleRad, pendulumAngularVel, shakeReversals, lastMoveDirX, lastReversalAtMs, lastCursorPos }`
- `ReminderState`: `{ items: ReminderItem[], stickyVisible: boolean, theme: 'custard' | 'night' }`
- `ReminderItem`: `{ id: string, text: string, completed: boolean, createdAtMs: number }`
- `WellnessState`: `{ activeScreenMs, mood: 'active' | 'sleeping', nextReminderAtMs, stats: { snacksFed, pomodorosCompleted, breaksTaken } }`
- `SoundEvent`: `'click-normal' | 'click-combo' | 'snack-eaten' | 'wellness-reminder' | 'welcome-back' | 'timer-complete'`
- `VolumeConfig`: `{ master, buddy, alarm, equalizeLoudness }`
- `GiantAlarmState`: `{ active, phase, elapsedMs, phaseElapsedMs, shakeIntensity, scale, opacity, wobbleRad, dismissTriggered }`

## 5. Milestone Progress Checklist

- [x] M1 (MVP): Alpha Cropper, Basic Physics, Ghost Mode, 25m Pomodoro, Electron Shell
- [x] M2 Task 1: 60 FPS Organic Kick-and-Glide Swimming, Squash/Stretch, Combo Spin & Cursor Follow (`src/core/physicsEngine.ts`)
- [x] M2 Task 2: Sound Effect Mapper, URL-Safe Encoder (`huhhhh?.mp3`) & Mute/Cooldown (`src/core/soundManager.ts`)
- [x] M2 Task 3: Gentle Non-Intrusive Wellness Reminder, AFK Sleep Mode & Daily Stats (`src/core/wellnessCoach.ts`)
- [x] M2 Task 4: Build Script MP3 Sync, Electron Main Tray/Idle Integration & 60 FPS Renderer (`scripts/build.mjs`, `src/main/`, `src/preload/`, `src/renderer/`)
- [x] M3: Voice/text sync, random 30–40 min water reminder, clean tray labels (`soundManager.ts`, `wellnessCoach.ts`, `main/index.ts`, `renderer/app.ts`)
- [x] M4: Cross-platform CI/CD release workflow (`.github/workflows/release.yml`, matrix macOS + Windows build, atomic release publishing via `softprops/action-gh-release@v2`)
- [x] M5: Full Chaos Giant Usagi Takeover Alarm with radial speed lines, screen shake, anywhere escape/click dismiss, asset fallback & tray test action (`giantAlarmController.ts`, `renderer/app.ts`, `main/index.ts`)
- [x] M6: Usagi_Big.png integration, dual-channel volume control (Buddy vs Giant Alarm), and per-clip loudness normalization (`soundManager.ts`, `assets/Usagi_Big.png`, `main/index.ts`, `renderer/app.ts`)
- [x] M7: Interactive pull-slider volume control, floating Usagi Control Center modal, custom Pomodoro duration input (minutes/hours) & presets (`pomodoroTimer.ts`, `renderer/index.html`, `renderer/app.ts`, `main/index.ts`)
- [x] M8: Drag & drop Usagi positioning, Stay Still (Anchor Mode) for deep focus, and fixed 20-40 min ambient water reminder with AFK time preservation (`physicsEngine.ts`, `wellnessCoach.ts`, `main/index.ts`, `renderer/app.ts`)
- [x] M9: Standalone Usagi Buddy Dashboard desktop application with unified volume slider, custom Pomodoro duration, Stay Still toggle, and background persistence on window close (`src/dashboard/`, `src/main/index.ts`, `src/preload/index.ts`, `scripts/build.mjs`)
- [x] M10: Menu bar tray alignment & timer presets submenu, interactive Big Usagi alarm actions bar with dynamic session repeat, +5m wrap-up snooze, 5m break, and keyboard shortcuts (`src/main/index.ts`, `src/core/giantAlarmController.ts`, `src/renderer/index.html`, `src/renderer/app.ts`)
- [x] M11: Scientific study method presets (Pomodoro 25/5, 52/17 Method, Ultradian Rhythm 90/20), dynamic alarm break matching, minute-only manual input starting at 0, and +10m rapid increment button (`src/dashboard/`, `src/renderer/`, `src/main/index.ts`, `src/core/`)
- [x] M12: Low-spec device performance & startup optimizations (lazy Dashboard window creation on startup, fast 4-sided alpha bounds scan, 320px high-DPI texture downscaling, audio element pooling, desynchronized canvas rendering) (`src/core/alphaCropper.ts`, `src/renderer/app.ts`, `src/main/index.ts`)
- [x] M13: Usagi Wardrobe & Multi-Costume System (Classic, Study, Work/Vest, Sigma, Star, and Shuffle/Random on Click), combo-click rapid spin outfit morphing, dedicated Dashboard wardrobe grid, minimal background tray menu, and randomized Giant Usagi Chaos Alarms (`Usagi_Big.png` + `Usagi_Big2.png`) (`src/core/costumeManager.ts`, `src/dashboard/`, `src/main/index.ts`, `src/renderer/app.ts`)
- [x] M14: Usagi Custard & Caramel Anime Theme (Day Custard default + Night cozy toggle), Desktop-Pinned Sticky Reminders Note (`src/sticky/`) with task celebration broadcast, Playful Cursor Keychain Hug mode (`src/core/cursorHugController.ts`) with pendulum swing, floating anime canvas notes, and shake-to-drop physics
