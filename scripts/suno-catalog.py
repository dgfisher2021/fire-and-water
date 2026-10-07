#!/usr/bin/env python3
"""Enrich src/data/suno-catalog.json, the Suno library as logged from the
library screenshots (Desktop/songs/song-library-metadata-v1.md), with what
the app knows, and write it back:

  appId / addedToApp  the album track the entry is (matched by title, and by
                      length where a title repeats; OVERRIDES settle the
                      quirks), or null / false
  description         the album's description of the song
  files.app           the audio file in public/
  files.downloads     every "zip/member" in downloads/ (and any --zips given)
                      whose file stem is the song's title slug; a repeated
                      title lists the same candidates on each version
  source: "app"       appended entries for album songs the log never showed
                      (ids continue after the log's), carrying the data the
                      app has

--dates also writes the library's creation dates into tracks.ts as `written`
for matched songs, except HAND_DATED (the March songs, dated by hand).
--copy-to DIR writes a copy of the JSON as song-library-metadata.json there,
beside the downloads.

usage: python3 scripts/suno-catalog.py [--dates] [--copy-to DIR] [--zips DIR ...]
"""

import argparse
import datetime
import json
import pathlib
import re
import shutil
import unicodedata
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src/data/suno-catalog.json"
TRACKS_TS = ROOT / "src/data/tracks.ts"
DOWNLOADS = ROOT / "downloads"
AUDIO = {".m4a", ".mp3", ".wav"}

# Library id -> album id where the title alone cannot say (versions sharing a
# title, Suno's own typos and glyphs): the baritone cut, "Exended Hope", the
# French and English L'espoir, the guitar Devil, the neo-folk I Love You, the
# curly apostrophes, the multiplication sign in the mashup.
OVERRIDES = {
    70: "baritone",
    80: "change",
    10: "espoir",
    9: "anglais",
    40: "guitar",
    50: "neofolk",
    49: "quiet",
    53: "mashup",
    99: "shanty",
    16: "untamed",
    36: "lament",
    65: "dont",
    77: "bitter",
}
# Songs whose `written` is the day the words were written, not the render.
HAND_DATED = {"baritone", "fire", "water"}
# A title match needs the lengths to agree this closely (seconds).
DURATION_SLACK = 5


def norm(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", text.replace("&", " and ")).strip()


def slug(text):
    text = re.sub(r"[’']", "", text)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def load_tracks():
    """id -> the fields of each TRACKS entry, in TRACK_ORDER."""
    src = TRACKS_TS.read_text(encoding="utf-8")
    order = re.findall(r"'(\w+)'", re.search(r"TRACK_ORDER: readonly TrackId\[\] = \[(.*?)\]", src, re.S).group(1))
    heads = list(re.finditer(r"^    id: '(\w+)',", src, re.M))
    tracks = {}
    for k, head in enumerate(heads):
        end = heads[k + 1].start() if k + 1 < len(heads) else len(src)
        block = src[head.start() : end]

        def field(key, pattern=r"'((?:[^'\\]|\\.)*)'"):
            m = re.search(key + r":\s*\n?\s*" + pattern, block)
            return m.group(1) if m else None

        tracks[head.group(1)] = {
            "title": field("title"),
            "dedication": field("dedication"),
            "written": field("written"),
            "voice": field("voice"),
            "description": field("description"),
            "audio": field("audioFile"),
            "duration": int(field("duration", r"(\d+)")),
        }
    return {i: tracks[i] for i in order}


def match(songs, tracks):
    """library id -> album id."""
    by_title = {}
    for s in songs:
        by_title.setdefault(norm(s["title"]), []).append(s)
    mapping = dict(OVERRIDES)
    taken = set(mapping.values())
    for app_id, t in tracks.items():
        if app_id in taken:
            continue
        cands = [c for c in by_title.get(norm(t["title"]), []) if c["id"] not in mapping]
        cands = [c for c in cands if abs(c["durationSeconds"] - t["duration"]) <= DURATION_SLACK]
        if cands:
            best = min(cands, key=lambda c: abs(c["durationSeconds"] - t["duration"]))
            mapping[best["id"]] = app_id
    return mapping


def zip_index(dirs):
    """title slug -> ["zip/member", ...] over every audio member of every zip."""
    index = {}
    for d in dirs:
        for z in sorted(pathlib.Path(d).glob("*.zip")):
            with zipfile.ZipFile(z) as zf:
                for name in zf.namelist():
                    p = pathlib.PurePosixPath(name)
                    if p.suffix.lower() in AUDIO:
                        stem = re.sub(r"\s*\[[0-9a-f-]{36}\]$", "", p.stem)  # the per-song zips add a uuid
                        index.setdefault(slug(stem), []).append(f"{z.name}/{name}")
    return index


def weekday(date):
    return datetime.date.fromisoformat(date).strftime("%A")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--dates", action="store_true", help="write the library dates into tracks.ts")
    ap.add_argument("--copy-to", type=pathlib.Path, help="also write song-library-metadata.json here")
    ap.add_argument("--zips", nargs="*", type=pathlib.Path, default=[], help="more folders of zips to index")
    args = ap.parse_args()

    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    library = [s for s in data["songs"] if s.get("source") != "app"]
    # What a hand edit added to an app entry (a style read off the song page) survives a rerun.
    kept = {
        s["appId"]: {k: s[k] for k in ("version", "type", "style", "styleTruncated", "tag") if s.get(k)}
        for s in data["songs"]
        if s.get("source") == "app"
    }
    tracks = load_tracks()
    mapping = match(library, tracks)
    index = zip_index([d for d in [DOWNLOADS, *args.zips] if d.exists()])

    def by_prefix(key):
        """Members whose stem and `key` share one as a prefix of the other (16+ chars): Suno
        cuts long titles short and a song renamed since keeps its first stem."""
        return [
            m
            for stem, members in index.items()
            if min(len(stem), len(key)) >= 16 and (stem.startswith(key) or key.startswith(stem))
            for m in members
        ]

    def files(app_id, title):
        downloads = index.get(slug(title), [])
        if not downloads and app_id:
            downloads = index.get(slug(pathlib.PurePosixPath(tracks[app_id]["audio"]).stem), [])
        if not downloads:
            downloads = by_prefix(slug(title))
        return {
            "app": f"public/{tracks[app_id]['audio']}" if app_id else None,
            "downloads": downloads,
        }

    for s in library:
        app_id = mapping.get(s["id"])
        s["appId"] = app_id
        s["addedToApp"] = app_id is not None
        s["description"] = tracks[app_id]["description"] if app_id else None
        s["files"] = files(app_id, s["title"])

    next_id = max(s["id"] for s in library) + 1
    extra = []
    for app_id, t in tracks.items():
        if app_id in mapping.values():
            continue
        extra.append(
            {
                "id": next_id,
                "title": t["title"],
                "date": t["written"],
                "weekday": weekday(t["written"]),
                "version": None,
                "type": None,
                "duration": f"{t['duration'] // 60}:{t['duration'] % 60:02d}",
                "durationSeconds": t["duration"],
                "style": None,
                "styleTruncated": False,
                "tag": None,
                "status": "Published",
                "batch": None,
                "source": "app",
                "appId": app_id,
                "addedToApp": True,
                "description": t["description"],
                "files": files(app_id, t["title"]),
            }
            | kept.get(app_id, {})
        )
        next_id += 1

    data["songs"] = library + extra
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    CATALOG.write_text(text, encoding="utf-8")
    in_app = sum(1 for s in library if s["addedToApp"])
    print(f"{len(library)} library songs, {in_app} in the album, {len(extra)} album songs the log missed; {sum(len(v) for v in index.values())} files indexed")
    for s in extra:
        print(f"   + #{s['id']} {s['title']} ({s['appId']})")

    if args.dates:
        src = TRACKS_TS.read_text(encoding="utf-8")
        by_app = {v: k for k, v in mapping.items()}
        dates = {s["id"]: s["date"] for s in library}
        for app_id, t in tracks.items():
            if app_id in HAND_DATED or app_id not in by_app:
                continue
            new = dates[by_app[app_id]]
            if new == t["written"]:
                continue
            src, n = re.subn(
                rf"(^    id: '{app_id}',\n(?:.*\n)*?    written: )'{t['written']}'",
                rf"\g<1>'{new}'",
                src,
                count=1,
                flags=re.M,
            )
            print(f"   {app_id:14} written {t['written']} -> {new}" + ("" if n else "  (not found)"))
        TRACKS_TS.write_text(src, encoding="utf-8")

    if args.copy_to:
        args.copy_to.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(CATALOG, args.copy_to / "song-library-metadata.json")
        print("copied to", args.copy_to / "song-library-metadata.json")


if __name__ == "__main__":
    main()
