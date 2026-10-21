# Usagi Float — Architecture Cache

## 1. System Overview & Tech Stack
- **Product**: Cross-platform (macOS + Windows) frameless, transparent, always-on-top desktop companion ("Usagi Float").
- **Runtime & UI**: Electron + TypeScript + HTML5 2D Canvas (full-screen overlay with per-pixel `setIgnoreMouseEvents(true, { forward: true })` hit-testing).
- **Bundler & Compiler**: `typescript` (`tsc --noEmit`) + `esbuild` (bundles main, preload, and renderer).
- **Test & Format**: `vitest` (unit + integration tests) + `prettier`.

## 2. Exact Commands (Law 1 & Law 2 Quiet Flags)
- **Typecheck**: `npx --no-install -p typescript tsc --noEmit --pretty false`
- **Unit Tests**: `npx --no-install vitest run`
- **Build**: `npm run build`
- **Format**: `npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts"`

## 3. Directory & Module Map
```
usagi-buddy/
├── assets/
│   └── Usagi1.png .. Usagi6.png   # 1170x1560 RGBA sprites with offset Usagi frames
├── src/
│   ├── core/
│   │   ├── alphaCropper.ts        # Alpha bounding-box scanner & auto-trimmer
│   │   ├── physicsEngine.ts       # 6-frame animation, floating physics, bounces, snack steering, spin/speech
│   │   ├── ghostModeController.ts # Smart click-through & interactive hit-box forwarding logic
│   │   └── pomodoroTimer.ts       # 25-min study countdown & snack drop generator
│   ├── main/
│   │   └── index.ts               # Electron Main: overlay BrowserWindow, Tray menu, global hotkey, IPC
│   ├── preload/
│   │   └── index.ts               # Electron contextBridge (`window.usagiAPI`)
│   └── renderer/
│       ├── index.html             # Transparent full-screen overlay canvas & speech bubble UI
│       └── app.ts                 # Sprite loader, alpha-trim pipeline, 60fps loop, pointer hit forwarding
└── tests/
    ├── alphaCropper.test.ts       # Bounding box, offset centering, empty canvas fallback tests
    ├── physicsEngine.test.ts      # Frame loop, wall bounce, dt clamping, snack eating, spin/speech tests
    ├── ghostModeController.test.ts# Ghost Mode lock vs dynamic hit-box click-through tests
    └── pomodoroTimer.test.ts      # 25-min timer state machine, MM:SS formatting, clamped snack drop tests
```

## 4. Core Data Contracts
- `RGBAImageData`: `{ width: number; height: number; data: Uint8ClampedArray | Uint8Array }`
- `BoundingBox`: `{ minX, minY, maxX, maxY, width, height, centerX, centerY }`
- `UsagiState`: `{ x, y, vx, vy, rotation, angularVelocity, frameIndex, frameTimerMs, spinBoostTimerMs, speechBubble, speechTimerMs, scaleFlipX, snacksEaten }`
- `PomodoroState`: `{ phase: 'idle' | 'running' | 'paused' | 'completed'; remainingMs: number; durationMs: number; completedCount: number }`

## 5. Milestone Progress Checklist
- [x] Task 1: Project Scaffolding & Alpha Bounding-Box Auto-Cropper (`src/core/alphaCropper.ts`)
- [x] Task 2: 6-Frame Swimming Physics, Wall Bounces, Snack Seeking & Interactive Spin/Speech (`src/core/physicsEngine.ts`)
- [x] Task 3: Smart Click-Through ("Ghost Mode") & Hit-Box Forwarding (`src/core/ghostModeController.ts`)
- [x] Task 4: 25-Minute Pomodoro Study Timer & Snack Spawner (`src/core/pomodoroTimer.ts`)
- [x] Task 5: Electron Main, System Tray, Preload Bridge & HTML5 Overlay Renderer (`src/main/`, `src/preload/`, `src/renderer/`)
