#!/usr/bin/env python3
"""Write src/data/pulse/<audio stem>.json: how hard each song's bass and
vocal range hit, ten readings a second, for the backdrop and artwork glow
that breathe with the music. ffmpeg splits the bands (a low-pass under
160 Hz for the bass, a band around 1 kHz for the voice) and decodes each to
mono 4 kHz PCM; each 100 ms window's RMS is scaled per song between its
quiet floor and its loud ceiling, eased (quick to rise, slow to fall) and
stored as one base-36 digit (0 to z) per reading. Run after adding a song.

    python3 scripts/audio-pulse.py            # every song without a pulse file
    python3 scripts/audio-pulse.py --force    # redo them all
"""
import array
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUT = ROOT / "src" / "data" / "pulse"
RATE = 4000
FPS = 10
DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"
BANDS = {
    "bass": "lowpass=f=160,lowpass=f=160",
    "vocal": "bandpass=f=1000:width_type=o:w=2",
}


def band_rms(path, filt):
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-af", filt, "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    samples = array.array("h")
    samples.frombytes(pcm[: len(pcm) - len(pcm) % 2])
    step = RATE // FPS
    out = []
    for i in range(0, len(samples) - step + 1, step):
        chunk = samples[i : i + step]
        out.append(math.sqrt(sum(s * s for s in chunk) / step))
    return out


def shape(rms):
    """Per-song floor-to-ceiling scale in decibels, then attack/release easing."""
    db = sorted(20 * math.log10(v + 1) for v in rms)
    floor, ceil = db[int(len(db) * 0.1)], db[int(len(db) * 0.98) - 1]
    span = max(ceil - floor, 1e-6)
    level, out = 0.0, []
    for v in rms:
        x = min(1.0, max(0.0, (20 * math.log10(v + 1) - floor) / span))
        level = x if x > level else level * 0.82 + x * 0.18
        out.append(DIGITS[round(level * 35)])
    return "".join(out)


def main():
    force = "--force" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    songs = sorted(p for p in PUBLIC.iterdir() if p.suffix in {".mp3", ".m4a"})
    done = 0
    for path in songs:
        target = OUT / f"{path.stem}.json"
        if target.exists() and not force:
            continue
        pulse = {"fps": FPS, **{name: shape(band_rms(path, f)) for name, f in BANDS.items()}}
        target.write_text(json.dumps(pulse, separators=(",", ":")) + "\n", encoding="utf-8")
        done += 1
        print(f"   + {path.stem}: {len(pulse['bass'])} readings")
    print(f"{done} pulse files written, {len(songs) - done} kept -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
