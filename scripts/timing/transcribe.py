"""Word timestamps for every song with faster-whisper (CPU, int8).

By default no window is skipped as "no speech" and no hotter temperature is
tried, so sung stretches buried under the mix still come out (noisier, but
align.py filters). --strict keeps Whisper's own thresholds instead: cleaner,
but it drops whole 30 s windows where the vocal is faint. align.py compares
every pass it finds (asr/, asr-strict/) and keeps the better one per song.

usage: python scripts/timing/transcribe.py [--strict] [--model small] [ids...]
"""

import argparse
import json
import os
import time

from faster_whisper import WhisperModel

from songs import HERE, load_songs

ap = argparse.ArgumentParser()
ap.add_argument("--strict", action="store_true")
ap.add_argument("--model", default="small")
ap.add_argument("ids", nargs="*")
args = ap.parse_args()

out_dir = HERE / ("asr-strict" if args.strict else "asr")
out_dir.mkdir(exist_ok=True)
options = (
    {}
    if args.strict
    else {
        "temperature": 0.0,
        "no_speech_threshold": None,
        "log_prob_threshold": None,
        "compression_ratio_threshold": None,
    }
)

model = WhisperModel(
    args.model, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4
)

for song_id, song in load_songs().items():
    if args.ids and song_id not in args.ids:
        continue
    out = out_dir / f"{song_id}.json"
    if out.exists():
        print("skip", song_id, "(already transcribed)", flush=True)
        continue
    t0 = time.time()
    segments, info = model.transcribe(
        str(song["audio"]),
        language="en",
        word_timestamps=True,
        beam_size=5,
        condition_on_previous_text=False,
        vad_filter=False,
        **options,
    )
    words = [
        {
            "word": w.word.strip(),
            "start": round(w.start, 3),
            "end": round(w.end, 3),
            "p": round(w.probability, 2),
        }
        for seg in segments
        for w in seg.words or []
    ]
    out.write_text(json.dumps({"id": song_id, "duration": info.duration, "words": words}, indent=1))
    print(song_id, len(words), "words", f"{time.time() - t0:.0f}s", flush=True)
