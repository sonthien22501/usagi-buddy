# Usagi Float — Architecture Cache (v0.2)

## 1. System Overview & Tech Stack
- **Product**: Cross-platform (macOS + Windows) frameless, transparent, always-on-top desktop companion ("Usagi Float").
- **Runtime & UI**: Electron + TypeScript + HTML5 2D Canvas (60 FPS continuous kick-and-glide swimming transforms, Web Audio MP3 playback, per-pixel `setIgnoreMouseEvents(true, { forward: true })` hit-testing).
- **Bundler & Compiler**: `typescript` (`tsc --noEmit`) + `esbuild` (bundles main, preload, renderer, and copies `.png` + `.mp3` assets).
- **Test & Format**: `vitest` (unit + asset integration tests) + `prettier`.

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
│   └── *.mp3                      # una, bryy, huhhhh?, urararusk, unayahayahauna, wuuulaaaa
├── src/
│   ├── core/
│   │   ├── alphaCropper.ts        # Alpha bounding-box scanner & auto-trimmer
│   │   ├── physicsEngine.ts       # 60fps kick-and-glide swimming, squash/stretch, cursor follow, combo spin
│   │   ├── ghostModeController.ts # Smart click-through & interactive hit-box forwarding logic
│   │   ├── pomodoroTimer.ts       # 25-min study countdown & snack drop generator
│   │   ├── giantAlarmController.ts # Chaos giant Usagi break alarm, speed lines, & click/key dismiss
│   │   ├── soundManager.ts        # Event-to-MP3 mapper, URL-safe encoder (huhhhh%3F.mp3), mute & cooldown
│   │   └── wellnessCoach.ts       # Random 30–40m water reminder, 2m AFK sleep mode, & daily tray stats
│   ├── main/
│   │   └── index.ts               # Electron Main: overlay window, Tray stats/toggles, powerMonitor idle poll
│   ├── preload/
│   │   └── index.ts               # Electron contextBridge (`window.usagiAPI`)
│   └── renderer/
│       ├── index.html             # Transparent full-screen overlay canvas
│       └── app.ts                 # Upright sprite renderer, 60fps swim transforms, Audio player, IPC handlers
└── tests/
    ├── alphaCropper.test.ts
    ├── physicsEngine.test.ts
    ├── ghostModeController.test.ts
    ├── pomodoroTimer.test.ts
    ├── soundManager.test.ts
    ├── wellnessCoach.test.ts
    └── assetsIntegration.test.ts
```

## 4. Core Data Contracts
- `UsagiState`: `{ x, y, vx, vy, rotation, angularVelocity, swimPhaseRad, scaleX, scaleY, frameIndex, frameTimerMs, spinBoostTimerMs, comboClicks, speechBubble, speechTimerMs, scaleFlipX, snacksEaten, sleeping }`
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
