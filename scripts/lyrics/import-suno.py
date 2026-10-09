"""Pull lyric sheets out of Suno download zips into src/data/lyrics/<id>.json.

Suno ships `<slug>.mp3` (or .m4a) next to `<slug> (lyrics).txt`. Each sheet
is matched to a song by its audio file name in tracks.ts (accents, a
" [uuid]" tail and suffixes such as "-version" or "-extended-hope" are
tolerated), split into stanzas at blank lines, and written as the plain
stanza form the app loads. Empty sheets (a few bytes) are reported, not
written. An existing sheet that differs is left alone unless --force is
given, so a transcribed or hand-edited sheet survives; --only limits the
run to the songs named, so one zip can fix a few sheets without touching
the rest.

usage: python3 scripts/lyrics/import-suno.py [--force] [--only=id,id] [zip-or-folder ...]
       default folder: downloads/ in the repo (ignored by git), else
       /mnt/c/Users/dustinf/Downloads/suno songs
"""

import json
import pathlib
import re
import sys
import unicodedata
import zipfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "scripts/timing"))
from songs import LYRICS_DIR, load_songs  # noqa: E402

DEFAULTS = [ROOT / "downloads", pathlib.Path("/mnt/c/Users/dustinf/Downloads/suno songs")]


def slug(text):
    """Ascii, lower, dashed; apostrophes dropped (ain’t -> aint) so sheets match the audio stems."""
    text = re.sub(r"[’']", "", text)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def match_song(sheet_slug, songs):
    """The song whose audio stem shares the longest prefix (8+ chars) with the sheet's slug."""
    best, best_len = None, 7
    for song_id, song in songs.items():
        stem = slug(song["audio"].stem)
        n = 0
        for a, b in zip(stem, sheet_slug):
            if a != b:
                break
            n += 1
        if n > best_len and (n == len(stem) or n == len(sheet_slug)):
            best, best_len = song_id, n
    return best


SEPARATOR = re.compile(r"^[\s·•*\-_=~]+$")


def typeset(line):
    """Curly quotes, hyphens for em dashes (one for one, so word timing still
    counts the same words); a line wrapped in *asterisks* becomes a [label]."""
    line = line.replace("\u2014", "-")
    line = re.sub(r"(\w)'(\w)", "\\1\u2019\\2", line)  # it's, I'm
    line = re.sub(r"'(\w)", "\u2018\\1", line).replace("'", "\u2019")
    line = re.sub(r'"([^"]*)"', "\u201c\\1\u201d", line)
    m = re.fullmatch(r"\*+\s*(.+?)\s*\*+", line)
    if m:
        inner = m.group(1)
        line = inner if inner.startswith("[") else f"[{inner[:1].upper()}{inner[1:]}]"
    else:
        line = line.strip("*").strip()  # italics that span several lines
    return line


def parse_sheet(text):
    """Stanzas at blank lines; separator lines dropped; a paragraph that is
    only labels joins the stanza after it, or is dropped when nothing is sung
    after it (an outro cue)."""
    text = text.replace("\r\n", "\n").lstrip("\ufeff").strip()
    if len(text) < 20:
        return None
    stanzas, pending = [], []
    for block in re.split(r"\n\s*\n", text):
        lines = [typeset(ln.strip()) for ln in block.split("\n") if ln.strip() and not SEPARATOR.match(ln)]
        if not lines:
            continue
        if all(ln.startswith("[") and ln.endswith("]") for ln in lines):
            pending += lines
            continue
        stanzas.append(pending + lines)
        pending = []
    return stanzas


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    only = next((a.split("=", 1)[1].split(",") for a in sys.argv[1:] if a.startswith("--only=")), None)
    targets = [pathlib.Path(a) for a in args] or [d for d in DEFAULTS if d.exists()][:1]
    zips = []
    for t in targets:
        zips += sorted(t.glob("*.zip")) if t.is_dir() else [t]
    songs = load_songs()
    for z in zips:
        print(f"== {z.name}")
        with zipfile.ZipFile(z) as zf:
            for name in zf.namelist():
                if not name.lower().endswith("(lyrics).txt"):
                    continue
                sheet_slug = slug(name[: name.lower().rindex("(lyrics)")])
                song_id = match_song(sheet_slug, songs)
                if only and song_id not in only:
                    continue
                if not song_id:
                    print(f"   ? {name}: no song with a matching audio file")
                    continue
                stanzas = parse_sheet(zf.read(name).decode("utf-8", "replace"))
                if stanzas is None:
                    print(f"   - {song_id}: empty sheet in the zip")
                    continue
                out = LYRICS_DIR / f"{song_id}.json"
                if out.exists():
                    current = json.loads(out.read_text(encoding="utf-8"))
                    existing = current if isinstance(current, list) else current.get("stanzas", [])
                    if existing and existing != stanzas and not force:
                        print(f"   = {song_id}: sheet differs from the existing file, kept (use --force)")
                        continue
                    if existing == stanzas:
                        print(f"   = {song_id}: unchanged")
                        continue
                out.write_text(json.dumps(stanzas, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
                print(f"   + {song_id}: {len(stanzas)} stanzas, {sum(len(s) for s in stanzas)} lines")


if __name__ == "__main__":
    main()
