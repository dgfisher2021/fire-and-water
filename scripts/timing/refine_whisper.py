"""Optional cross-check for refine.py: Whisper word timestamps on the vocal
stems refine.py has already separated, written beside them as
stems/<id>.whisper.json. refine.py then marks each proposed line with
whether Whisper heard its words there. Runs in transcribe.py's venv.

usage: scripts/timing/.venv/bin/python scripts/timing/refine_whisper.py [ids...]
"""

import json
import os
import sys

from faster_whisper import WhisperModel

from songs import HERE

STEMS = HERE / "stems"
ids = sys.argv[1:] or sorted(p.stem for p in STEMS.glob("*.wav"))
model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=int(os.environ.get("REFINE_THREADS", "6")))
for song_id in ids:
    out = STEMS / f"{song_id}.whisper.json"
    if out.exists():
        continue
    segments, info = model.transcribe(
        str(STEMS / f"{song_id}.wav"), word_timestamps=True, beam_size=5, condition_on_previous_text=False, vad_filter=False
    )
    words = [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)} for s in segments for w in s.words or []]
    out.write_text(json.dumps({"id": song_id, "language": info.language, "words": words}, indent=1))
    print(song_id, len(words), "words", flush=True)
