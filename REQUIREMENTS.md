# Usagi Float — Product Requirements (v0.2)

## Core Capabilities
1. **Alpha Bounding-Box Sprite Auto-Cropper (`src/core/alphaCropper.ts`)**
   - Automatically scans RGBA pixel buffers for `assets/Usagi1.png`–`assets/Usagi6.png` and trims transparent canvas offsets so sprites are tightly centered.
2. **60 FPS Organic Swimming Physics & Combo Spin (`src/core/physicsEngine.ts`)**
   - Uses the upright trimmed sprite (`Usagi3.png`) with uniform scaling and 60 FPS continuous Canvas transforms:
     - **Kick-and-Glide Swimming**: Rhythmic propulsion cycles with subtle squash-and-stretch (`scaleX`, `scaleY`), sine-wave buoyancy bobbing, and smooth banking tilt into the movement direction.
     - **Click & Combo Spin Tornado**: Clicking Usagi triggers a smooth 60 FPS spin boost + hop; rapid multi-clicks (`comboClicks >= 3`) trigger a faster super-spin tornado.
     - **Play Mode (Cursor Follow)**: Optional toggle (`Cmd/Ctrl+Shift+P` or Tray) where Usagi swims after the user's cursor.
3. **Custom Voice Sound Effects (`src/core/soundManager.ts`)**
   - Plays user-provided `.mp3` clips in `assets/` with URL-safe encoding (handling `huhhhh?.mp3` -> `huhhhh%3F.mp3`), cooldown throttling, and a System Tray Mute toggle:
     - Normal click: `una.mp3` / `bryy.mp3`
     - Combo spin (3+ rapid clicks): `urararusk.mp3` / `wuuulaaaa.mp3`
     - Snack eaten / Welcome back from break: `unayahayahauna.mp3`
     - Gentle wellness reminder: `huhhhh?.mp3`
4. **Gentle Wellness & AFK Idle Coach (`src/core/wellnessCoach.ts`)**
   - **Non-Intrusive Gentle Water Reminder**: At a random 30–40 minute interval of active screen time, Usagi shows a brief, cute, non-blocking speech bubble (`"💧 Huhhhh? Sip some water~"`) and immediately resets the timer so it never nags or forces the user.
   - **AFK Sleepy Mode**: When OS idle time (`powerMonitor.getSystemIdleTime()`) exceeds 2 minutes (`120s`), Usagi floats lazily with `"Zzz..."` and welcomes the user back with a snack and `unayahayahauna.mp3` upon return.
   - **Quiet System Tray Daily Stats**: Tracks `snacksFed`, `pomodorosCompleted`, and `breaksTaken` inside the Tray menu.
5. **Smart Click-Through ("Ghost Mode") & 25-Min Pomodoro Timer**
   - Per-pixel hit-box forwarding (`setIgnoreMouseEvents(true, { forward: true })`) plus global Ghost Mode lock (`Cmd/Ctrl+Shift+G`) and 25-minute Pomodoro timer that drops pudding snacks on screen.
6. **Voice/Text Sync (v0.3)**
   - Every speech bubble shows exactly the word of the `.mp3` that plays (filename without `.mp3`, capitalized, `!` appended unless it ends with `?`).
   - Tray labels contain no parenthetical hints.
