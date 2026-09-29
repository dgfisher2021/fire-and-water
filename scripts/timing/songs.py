"""The songs as tracks.ts declares them: id, audio file, lyrics (stanzas of
lines). Inline lyric arrays are read from tracks.ts itself, the longer ones
from src/data/lyrics/<id>.json, so this stays the single source of truth."""

import ast
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PUBLIC = ROOT / "public"
TRACKS_TS = ROOT / "src/data/tracks.ts"
LYRICS_DIR = ROOT / "src/data/lyrics"
TIMING_JSON = ROOT / "src/data/timing.json"


def is_label(line):
    return line.startswith("[") and line.endswith("]")


def load_songs():
    src = TRACKS_TS.read_text(encoding="utf-8")
    heads = list(re.finditer(r"^    id: '(\w+)',", src, re.M))
    songs = {}
    for k, head in enumerate(heads):
        song_id = head.group(1)
        end = heads[k + 1].start() if k + 1 < len(heads) else len(src)
        block = src[head.start() : end]
        audio = re.search(r"audioFile: '([^']+)'", block).group(1)
        inline = re.search(r"lyrics: (\[\n.*?\n    \]),\n", block, re.S)
        if inline:
            lyrics = ast.literal_eval(inline.group(1))
        else:
            lyrics = json.loads((LYRICS_DIR / f"{song_id}.json").read_text(encoding="utf-8"))
        songs[song_id] = {"audio": PUBLIC / audio, "lyrics": lyrics}
    return songs
