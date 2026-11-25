#!/usr/bin/env python3
"""Write what a shared link shows: src/data/share.json and the preview images.

    python3 scripts/share-data.py            # new songs only
    python3 scripts/share-data.py --force    # redo every image

share.json lists each song's title, description and cover for the build,
which writes a page per song link (vite.config.ts) so a message app shows
that song's art and name. The images are public/assets/og/<id>.jpg: the
cover over a blurred copy of itself at 1200x630 (ffmpeg), since link
previews want a wide JPEG, not a square WebP. Run after adding a song.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src" / "data"
PUBLIC = ROOT / "public"
OUT = PUBLIC / "assets" / "og"
FILTER = (
    "[0:v]scale=1200:1200,crop=1200:630,gblur=sigma=42,eq=brightness=-0.16:saturation=1.1[bg];"
    "[0:v]scale=566:566[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2"
)


def unquote(text):
    return text.replace("\\'", "'").replace('\\"', '"')


def tracks():
    src = (DATA / "tracks.ts").read_text()
    order = re.search(r"TRACK_ORDER: readonly TrackId\[\] = \[(.*?)\]", src, re.S)
    ids = re.findall(r"'([^']+)'", order.group(1))
    found = {}
    for match in re.finditer(r"\n  (\w+): trackSchema\.parse\(\{(.*?)\n  \}\)", src, re.S):
        body = match.group(2)

        def field(name):
            hit = re.search(rf"\n\s+{name}:\s*'((?:[^'\\]|\\.)*)'", body)
            return unquote(hit.group(1)) if hit else ""

        full = re.search(r"art: \{\s*full: '([^']+)'", body)
        found[match.group(1)] = {
            "id": match.group(1),
            "title": field("title"),
            "description": field("description"),
            "art": full.group(1) if full else "",
        }
    return [found[i] for i in ids]


def kinetic_ids():
    src = (ROOT / "src" / "kinetic" / "songs.ts").read_text()
    hit = re.search(r"KINETIC_SONGS[^=]*=\s*\{([^}]*)\}", src)
    return set(re.findall(r"\w+", hit.group(1))) if hit else set()


def main():
    force = "--force" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    films = kinetic_ids()
    songs = tracks()
    made = 0
    for song in songs:
        song["film"] = song["id"] in films
        target = OUT / f"{song['id']}.jpg"
        source = PUBLIC / song.pop("art")
        if target.exists() and not force:
            continue
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(source), "-filter_complex", FILTER, "-frames:v", "1", "-q:v", "4", str(target)],
            check=True,
        )
        made += 1
    (DATA / "share.json").write_text(json.dumps(songs, ensure_ascii=False, indent=2) + "\n")
    print(f"share.json: {len(songs)} songs, {made} images written")


if __name__ == "__main__":
    main()
