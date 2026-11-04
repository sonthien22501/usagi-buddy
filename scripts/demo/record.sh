#!/usr/bin/env bash
# Records the Usagi Buddy demo: real app, scripted timeline, real screen capture.
#
# Prerequisite (one time): System Settings > Privacy & Security > Screen Recording
# must be enabled for the app you run this from (Terminal / iTerm), then restart it.
#
# Usage:  scripts/demo/record.sh [duration-seconds]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DUR="${1:-85}"
OUT="$ROOT/demo-out"
ELECTRON="$ROOT/node_modules/.bin/electron"

rm -rf "$OUT"
mkdir -p "$OUT"

# --- 0. permission probe -------------------------------------------------------
if ! screencapture -x "$OUT/_probe.png" 2>/dev/null || [ ! -s "$OUT/_probe.png" ]; then
  cat >&2 <<'MSG'
ERROR: Screen Recording permission is denied for this process.

Fix it once:
  1. System Settings > Privacy & Security > Screen Recording
  2. Enable the app running this command (Terminal / iTerm)
  3. Quit and reopen that app, then re-run this script
MSG
  exit 1
fi
rm -f "$OUT/_probe.png"

# --- 1. build (guarantees the demo shows current code) -------------------------
if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "==> building"
  npm run build >"$OUT/build.log" 2>&1 || { tail -20 "$OUT/build.log"; exit 1; }
fi

# --- 2. launch the driver (real app + stage + captions) ------------------------
echo "==> launching app"
DEMO_OUT="$OUT" "$ELECTRON" scripts/demo/driver.js >"$OUT/driver.log" 2>&1 &
DRIVER_PID=$!

for _ in $(seq 1 300); do
  [ -f "$OUT/ready" ] && break
  sleep 0.1
done
if [ ! -f "$OUT/ready" ]; then
  echo "ERROR: driver never became ready" >&2
  tail -20 "$OUT/driver.log" >&2
  kill "$DRIVER_PID" 2>/dev/null || true
  exit 1
fi

sleep 1   # settle: windows painted, cursor parked

# --- 3. record, then start the timeline in the same instant --------------------
echo "==> recording ${DUR}s"
screencapture -x -v -V"$DUR" "$OUT/raw.mov" &
CAP_PID=$!
sleep 0.25
touch "$OUT/go"

wait "$CAP_PID" || true

for _ in $(seq 1 300); do
  [ -f "$OUT/done" ] && break
  sleep 0.1
done

if [ -f "$OUT/error.txt" ]; then
  echo "ERROR: timeline failed:" >&2
  cat "$OUT/error.txt" >&2
fi

wait "$DRIVER_PID" 2>/dev/null || true

if [ ! -s "$OUT/raw.mov" ]; then
  echo "ERROR: no recording produced" >&2
  exit 1
fi

# --- 4. encode: 16:9 1080p H.264 ----------------------------------------------
echo "==> encoding"
# Trim the tail: the app exits right after the timeline, so the last fraction of the
# raw capture can contain the desktop again.
TRIM=$(awk "BEGIN{printf \"%.2f\", $DUR - 1.0}")
ffmpeg -y -i "$OUT/raw.mov" -t "$TRIM" \
  -vf "scale=1920:-2:flags=lanczos,crop=1920:ih-60:0:60" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -movflags +faststart \
  "$OUT/video-silent.mp4" >"$OUT/ffmpeg.log" 2>&1

# --- 5. audio: music bed + Usagi's own voice lines -----------------------------
echo "==> mixing audio"
bash "$ROOT/scripts/demo/mix-audio.sh" "$OUT/video-silent.mp4" "$OUT/usagi-demo.mp4" "$OUT/bgm.wav"

echo "==> done: $OUT/usagi-demo.mp4"
ls -lh "$OUT/usagi-demo.mp4"
