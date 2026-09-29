"""The songs as tracks.ts declares them: id and audio file, plus the lyric
sheet from src/data/lyrics/<id>.json (stanzas of lines, in either the plain
form or `{ source, stanzas }`), so the app's data stays the single source."""

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
        songs[song_id] = {"audio": PUBLIC / audio, "lyrics": load_sheet(song_id)}
    return songs


def load_sheet(song_id):
    """Stanzas from src/data/lyrics/<id>.json, or [] when the song has no sheet."""
    path = LYRICS_DIR / f"{song_id}.json"
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else data.get("stanzas", [])
