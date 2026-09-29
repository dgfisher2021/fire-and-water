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
LINE_MIN_P = 0.7  # drop a whole line Whisper guessed at (a sung syllable, noise)
CORRECTIONS = HERE / "corrections.json"  # { "<id>": [[pattern, replacement], ...] }
LINE_GAP = 0.6  # seconds of silence that end a line
STANZA_GAP = 1.8  # seconds of silence that end a stanza
MAX_LINE_WORDS = 10
MIN_LINE_WORDS = 3  # punctuation and capitals only break a line this long
MAX_STANZA_LINES = 4
PRONOUNS = {"I", "I'm", "I'll", "I've", "I'd"}


def starts_segment(word):
    """Whisper capitalises the first word of every segment it decodes."""
    return word[:1].isupper() and word not in PRONOUNS


def transcript(song_id):
    for p in PASSES:
        path = TIMING / p / f"{song_id}.json"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8")), p
    return None, None


def tidy(line):
    import re

    text = " ".join(line).replace(" -", "-")  # "self -reflection"
    text = re.sub(r"(\w) '(\w)", "\\1'\\2", text)  # French "L 'espoir", "qu 'elle"
    text = text.replace("'", "’").strip().strip(",;")
    return text[:1].upper() + text[1:] if text else text


def build(words):
    """Lines end at a pause, at closing punctuation, before a segment-start
    capital, or at the word cap; stanzas at a longer pause or four lines."""
    stanzas, stanza, line, probs, last_end = [], [], [], [], None

    def close_line():
        nonlocal line, probs
        if line and sum(probs) / len(probs) >= LINE_MIN_P:
            stanza.append(tidy(line))
        line, probs = [], []

    for w in words:
        word = w["word"].strip()
        if not word or w["p"] < MIN_P:
            continue
        gap = 0 if last_end is None else w["start"] - last_end
        long_enough = len(line) >= MIN_LINE_WORDS
        prev = line[-1] if line else ""
        cut = line and (
            gap >= LINE_GAP
            or len(line) >= MAX_LINE_WORDS
            or (long_enough and (prev[-1:] in ".!?" or prev.endswith(",")))
            or (long_enough and starts_segment(word))
            # First-person lines: "I hold the fear, I hold the fire" splits at the second I.
            or (len(line) >= 4 and word in PRONOUNS)
        )
        if cut:
            close_line()
            if stanza and (gap >= STANZA_GAP or len(stanza) >= MAX_STANZA_LINES):
                stanzas.append(stanza)
                stanza = []
        line.append(word)
        probs.append(w["p"])
        last_end = w["end"]
    close_line()
    if stanza:
        stanzas.append(stanza)
    return stanzas


def correct(stanzas, rules):
    """Spot fixes for words Whisper misheard, kept in corrections.json so a
    rebuild reproduces them: case-insensitive regex pairs per song."""
    import re

    fixed = []
    for stanza in stanzas:
        lines = []
        for line in stanza:
            for pattern, replacement in rules:
                line = re.sub(pattern, replacement, line, flags=re.IGNORECASE)
            if line.strip():
                lines.append(line)
        if lines:
            fixed.append(lines)
    return fixed


def main():
    force = "--force" in sys.argv
    corrections = json.loads(CORRECTIONS.read_text(encoding="utf-8")) if CORRECTIONS.exists() else {}
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
        stanzas = correct(build(data["words"]), corrections.get(song_id, []))
        out.write_text(
            json.dumps({"source": "transcribed", "stanzas": stanzas}, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"{song_id}: {len(stanzas)} stanzas, {sum(len(s) for s in stanzas)} lines from {source}")


if __name__ == "__main__":
    main()
