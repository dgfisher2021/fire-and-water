#!/usr/bin/env python3
"""Write a song's sheet, sing-along timing and pulse into a kinetic lyric page.

    python3 scripts/kinetic-data.py lift public/kinetic/lift-me-higher/index.html

Replaces the page's <script id="song" type="application/json"> block with the
lyric sheet (src/data/lyrics/<id>.json), its timing (src/data/timing.json),
the bass and vocal pulse (src/data/pulse/<audio stem>.json), the title,
album, duration and the song's media CDN URL. Re-run after re-timing a song.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src" / "data"
CDN = "https://media.dgfisher.com/"


def ts_field(body, name):
    match = re.search(rf"\n\s+{name}: '((?:[^'\\]|\\.)*)'", body)
    return match.group(1).replace("\\'", "'") if match else None


def track(track_id):
    src = (DATA / "tracks.ts").read_text()
    match = re.search(rf"\n  {re.escape(track_id)}: trackSchema\.parse\(\{{(.*?)\n  \}}\)", src, re.S)
    if not match:
        sys.exit(f"no track '{track_id}' in tracks.ts")
    body = match.group(1)
    artist = re.search(r"artist: '([^']*)'", src)
    return {
        "title": ts_field(body, "title"),
        "audioFile": ts_field(body, "audioFile"),
        "duration": int(re.search(r"duration: (\d+)", body).group(1)),
        "artist": artist.group(1) if artist else "",
    }


def album(track_id):
    src = (DATA / "collections.ts").read_text()
    key = re.search(rf"\n  {re.escape(track_id)}: '([^']+)'", src)
    if not key:
        return ""
    label = re.search(rf"key: '{key.group(1)}',.*?label: '([^']+)'", src, re.S)
    return label.group(1) if label else ""


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    track_id, page = sys.argv[1], ROOT / sys.argv[2]
    info = track(track_id)
    stem = Path(info["audioFile"]).stem
    pulse = json.loads((DATA / "pulse" / f"{stem}.json").read_text())
    versions = json.loads((DATA / "media.json").read_text())
    version = versions.get(info["audioFile"])
    song = {
        "id": track_id,
        "title": info["title"],
        "artist": info["artist"],
        "album": album(track_id),
        "duration": len(pulse["bass"]) / pulse["fps"] if pulse.get("bass") else info["duration"],
        "audio": f"{CDN}{info['audioFile']}" + (f"?v={version}" if version else ""),
        "sheet": json.loads((DATA / "lyrics" / f"{track_id}.json").read_text()),
        "timing": json.loads((DATA / "timing.json").read_text())[track_id],
        "pulse": pulse,
    }
    blob = json.dumps(song, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = page.read_text()
    tag = '<script id="song" type="application/json">'
    out, count = re.subn(re.escape(tag) + r".*?</script>", lambda _: f"{tag}{blob}</script>", html, flags=re.S)
    if count != 1:
        sys.exit(f"{page} has no {tag} block")
    page.write_text(out)
    print(f"{page.relative_to(ROOT)}: {info['title']}, {len(song['sheet'])} stanzas, {song['duration']:.1f}s")


if __name__ == "__main__":
    main()
