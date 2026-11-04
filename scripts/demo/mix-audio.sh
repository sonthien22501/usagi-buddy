#!/usr/bin/env bash
# Adds Usagi's real voice lines and a generated music bed to the silent screen
# capture. macOS screencapture cannot record system audio, so the app's own clips
# are re-laid onto the timeline at the moment each action happens.
#
# Usage: mix-audio.sh <silent-video> <output>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IN="${1:-$ROOT/demo-out/video-silent.mp4}"
OUT="${2:-$ROOT/demo-out/usagi-demo.mp4}"
BGM="${3:-$ROOT/demo-out/bgm.wav}"
A="$ROOT/assets"

[ -s "$IN" ] || { echo "missing input: $IN" >&2; exit 1; }
if [ ! -s "$BGM" ]; then
  python3 "$ROOT/scripts/demo/make-bgm.py" "$BGM" >/dev/null
fi

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
FADE_OUT=$(awk "BEGIN{printf \"%.2f\", $DUR - 4.5}")

# Voice cues. Times are video-relative: driver beat + ~0.45s so the sound lands
# just after the visual action instead of on top of it.
ffmpeg -y -i "$IN" -i "$BGM" \
  -i "$A/una.mp3" \
  -i "$A/huhhhh.mp3" \
  -i "$A/unayahayahauna.mp3" \
  -i "$A/bryy.mp3" \
  -i "$A/wuuulaaaa.mp3" \
  -filter_complex "\
[1:a]aresample=44100,volume=0.17,afade=t=in:st=0:d=2.2,afade=t=out:st=${FADE_OUT}:d=4.5[bg];\
[2:a]aresample=44100,asplit=4[u1][u2][u3][u4];\
[u1]adelay=800|800,volume=0.50[a1];\
[u2]adelay=5150|5150,volume=0.45[a2];\
[u3]adelay=23450|23450,volume=0.50[a3];\
[u4]adelay=78450|78450,volume=0.45[a4];\
[3:a]aresample=44100,adelay=10550|10550,volume=0.85[a5];\
[4:a]aresample=44100,adelay=47450|47450,volume=0.80[a6];\
[5:a]aresample=44100,adelay=44650|44650,volume=0.40[a7];\
[6:a]aresample=44100,adelay=69250|69250,volume=0.90[a8];\
[bg][a1][a2][a3][a4][a5][a6][a7][a8]amix=inputs=9:normalize=0:dropout_transition=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" \
  -c:v copy -c:a aac -b:a 192k -ar 44100 \
  -movflags +faststart -shortest \
  "$OUT"

echo "mixed -> $OUT"
