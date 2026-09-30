#!/usr/bin/env python3
"""Write src/data/audio-envelopes.json: the loudness of each song in public/
as BINS values from 0 to 100, for the waveform strip under the Now Playing
slider. Decodes through ffmpeg to mono 8 kHz PCM and takes the RMS of each
bin. Run after adding a song.

    python3 scripts/audio-envelope.py
"""
import array
import json
import math
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUT = ROOT / "src" / "data" / "audio-envelopes.json"
BINS = 160
RATE = 8000


def envelope(path):
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    samples = array.array("h")
    samples.frombytes(pcm[: len(pcm) - len(pcm) % 2])
    n = len(samples)
    rms = []
    for b in range(BINS):
        lo, hi = n * b // BINS, n * (b + 1) // BINS
        chunk = samples[lo:hi]
        rms.append(math.sqrt(sum(s * s for s in chunk) / len(chunk)) if len(chunk) else 0.0)
    peak = max(rms) or 1.0
    # Square root of the ratio: quiet passages still show, loud ones do not flatten.
    return [round(100 * math.sqrt(v / peak)) for v in rms]


envelopes = {
    p.name: envelope(p)
    for p in sorted(PUBLIC.iterdir())
    if p.suffix in {".mp3", ".m4a"}
}
OUT.write_text(json.dumps(envelopes, separators=(",", ":")) + "\n")
print(f"{len(envelopes)} files x {BINS} bins -> {OUT.relative_to(ROOT)}")
