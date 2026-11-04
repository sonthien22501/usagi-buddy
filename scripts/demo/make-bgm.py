#!/usr/bin/env python3
"""Generate a soft, cute background bed for the Usagi demo.

Pure-stdlib + numpy synthesis: warm pad chords under a sparse music-box arpeggio.
Completely original, so there is no licensing question. Output is a stereo WAV
that the mixer fades and sits under the video at low volume.
"""
import math
import wave
import sys

import numpy as np

SR = 44100
BPM = 92.0
BEAT = 60.0 / BPM
BAR = BEAT * 4
BARS = 33
DUR = BAR * BARS

# Cmaj7 - Am7 - Fmaj7 - G7, warm and uncluttered
CHORDS = [
    [60, 64, 67, 71],
    [57, 60, 64, 67],
    [53, 57, 60, 64],
    [55, 59, 62, 65],
]


def freq(midi):
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))


def bell(midi, dur, amp):
    """Music-box tone: a few harmonics with a fast attack and exponential decay."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.exp(-5.5 * t) * (1.0 - np.exp(-260.0 * t))
    s = np.zeros(n)
    for h, a in ((1, 1.0), (2, 0.28), (3, 0.10), (4, 0.04)):
        s += a * np.sin(2 * math.pi * freq(midi) * h * t)
    return s * env * amp


def pad(midi, dur, amp):
    """Soft sustained chord tone, slow swell so it never clicks."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.minimum(1.0, t / 0.9) * np.exp(-0.55 * t)
    s = np.sin(2 * math.pi * freq(midi) * t) + 0.18 * np.sin(2 * math.pi * freq(midi) * 2 * t)
    return s * env * amp


def bass(midi, dur, amp):
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.exp(-2.2 * t) * (1.0 - np.exp(-40.0 * t))
    return np.sin(2 * math.pi * freq(midi) * t) * env * amp


def add(buf, start_sample, samples):
    if samples is None:
        return
    end = min(len(buf), start_sample + len(samples))
    if end <= start_sample:
        return
    buf[start_sample:end] += samples[: end - start_sample]


def build():
    n = int(DUR * SR) + SR
    left = np.zeros(n)
    right = np.zeros(n)

    for bar in range(BARS):
        chord = CHORDS[bar % 4]
        bar_start = bar * BAR

        # sustained pad, quiet
        for i, m in enumerate(chord):
            p = pad(m, BAR * 1.05, 0.030)
            add(left, int(bar_start * SR), p)
            add(right, int((bar_start + 0.012) * SR), p)

        # bass on beats 1 and 3
        for b in (0, 2):
            v = bass(chord[0] - 12, BEAT * 1.6, 0.075)
            add(left, int((bar_start + b * BEAT) * SR), v)
            add(right, int((bar_start + b * BEAT) * SR), v)

        # music-box arpeggio on eighths: root, third, fifth, seventh, then up an octave
        pattern = [0, 1, 2, 3, 4, 3, 2, 1]
        for step, idx in enumerate(pattern):
            note = chord[idx % 4] + 12 * (1 if idx >= 4 else 0) + 12
            if step % 7 == 6:
                continue  # leave a little air
            t0 = bar_start + step * BEAT * 0.5
            v = bell(note, 1.5, 0.030)
            add(left, int(t0 * SR), v)
            add(right, int((t0 + 0.010) * SR), v * 0.92)

    # gentle stereo width + smoothing
    out = np.stack([left, right], axis=1)
    kernel = np.hanning(9)
    kernel /= kernel.sum()
    for ch in range(2):
        out[:, ch] = np.convolve(out[:, ch], kernel, mode="same")

    peak = float(np.max(np.abs(out))) or 1.0
    out = out / peak * 0.85
    return out


def write_wav(path, data):
    pcm = (np.clip(data, -1.0, 1.0) * 32767.0).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "bgm.wav"
    data = build()
    write_wav(path, data)
    print(f"wrote {path}  {len(data) / SR:.1f}s  peak={np.max(np.abs(data)):.2f}")
