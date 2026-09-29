"""Write a lyric sheet from a Whisper transcript for a song that shipped
without one. Words are split into lines at pauses and into stanzas at longer
pauses; low-confidence words are dropped. The file is written in the
`{ "source": "transcribed", "stanzas": [...] }` form so the app can say the
words were transcribed by ear. Prefer the largest transcript pass available
(asr-medium, then asr, then asr-strict, under scripts/timing).

usage: python3 scripts/lyrics/from-transcript.py [--force] <id> [id...]
"""

import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
TIMING = ROOT / "scripts/timing"
LYRICS = ROOT / "src/data/lyrics"

PASSES = ["asr-medium", "asr", "asr-strict"]
MIN_P = 0.35  # drop words Whisper was unsure of
LINE_GAP = 0.6  # seconds of silence that end a line
STANZA_GAP = 1.8  # seconds of silence that end a stanza
MAX_LINE_WORDS = 9
MAX_STANZA_LINES = 4


def transcript(song_id):
    for p in PASSES:
        path = TIMING / p / f"{song_id}.json"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8")), p
    return None, None


def tidy(line):
    text = " ".join(line).strip().strip(",;")
    return text[:1].upper() + text[1:] if text else text


def build(words):
    stanzas, stanza, line, last_end = [], [], [], None
    for w in words:
        word = w["word"].strip()
        if not word or w["p"] < MIN_P:
            continue
        gap = 0 if last_end is None else w["start"] - last_end
        if line and (gap >= LINE_GAP or len(line) >= MAX_LINE_WORDS):
            stanza.append(tidy(line))
            line = []
            if gap >= STANZA_GAP or len(stanza) >= MAX_STANZA_LINES:
                stanzas.append(stanza)
                stanza = []
        line.append(word)
        last_end = w["end"]
    if line:
        stanza.append(tidy(line))
    if stanza:
        stanzas.append(stanza)
    return stanzas


def main():
    force = "--force" in sys.argv
    for song_id in [a for a in sys.argv[1:] if not a.startswith("--")]:
        data, source = transcript(song_id)
        if not data:
            print(song_id, "has no transcript under scripts/timing/asr*/")
            continue
        out = LYRICS / f"{song_id}.json"
        if out.exists():
            current = json.loads(out.read_text(encoding="utf-8"))
            if (current if isinstance(current, list) else current.get("stanzas")) and not force:
                print(song_id, "already has a sheet, kept (use --force)")
                continue
        stanzas = build(data["words"])
        out.write_text(
            json.dumps({"source": "transcribed", "stanzas": stanzas}, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"{song_id}: {len(stanzas)} stanzas, {sum(len(s) for s in stanzas)} lines from {source}")


if __name__ == "__main__":
    main()
