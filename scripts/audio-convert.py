"""Convert Suno downloads (M4A) to MP3 or WAV with ffmpeg.

Takes files, folders or zips; the Suno full-download zips work as they are,
the audio is read straight out of the archive. Each song becomes
<out>/<stem>.mp3 (LAME V2, about 190 kbps, tags kept) or <out>/<stem>.wav
(16-bit, 44.1 kHz). A song whose output exists is skipped, so the script can
be re-run as the library grows. Covers embedded in the M4A are not carried
over. With --lyrics the "(lyrics).txt" beside each song is copied along.

usage: python3 scripts/audio-convert.py [--to mp3|wav] [--out DIR] [--jobs N] [--lyrics] [file|folder|zip ...]
       default input: downloads/ in the repo (ignored by git), else ~/Downloads/suno songs
       default out:   downloads/<format>/
"""

import argparse
import concurrent.futures
import pathlib
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_INPUTS = [ROOT / "downloads", pathlib.Path("/mnt/c/Users/dustinf/Downloads/suno songs")]
AUDIO = {".m4a", ".mp3", ".wav", ".flac", ".ogg", ".aac"}
CODEC = {
    "mp3": ["-codec:a", "libmp3lame", "-q:a", "2", "-id3v2_version", "3"],
    "wav": ["-codec:a", "pcm_s16le", "-ar", "44100"],
}


def sources(targets):
    """(label, open-able path or (zip, member)) for every audio file under the targets."""
    for t in targets:
        if t.is_dir():
            for p in sorted(t.rglob("*")):
                if p.suffix.lower() in AUDIO:
                    yield p.stem, p, None
                elif p.suffix.lower() == ".zip":
                    yield from zip_sources(p)
        elif t.suffix.lower() == ".zip":
            yield from zip_sources(t)
        elif t.suffix.lower() in AUDIO:
            yield t.stem, t, None
        else:
            print(f"   ? {t}: not audio, a folder or a zip", file=sys.stderr)


def zip_sources(path):
    with zipfile.ZipFile(path) as zf:
        for name in sorted(zf.namelist()):
            p = pathlib.PurePosixPath(name)
            if p.suffix.lower() in AUDIO:
                yield p.stem, path, name


def convert(stem, src, member, fmt, out_dir, lyrics):
    """One song to <out_dir>/<stem>.<fmt>; returns (stem, 'done' | 'skipped' | error)."""
    target = out_dir / f"{stem}.{fmt}"
    if target.exists():
        return stem, "skipped"
    with tempfile.TemporaryDirectory() as tmp:
        if member is None:
            audio = src
            sheet = src.with_name(f"{src.stem} (lyrics).txt")
        else:
            with zipfile.ZipFile(src) as zf:
                audio = pathlib.Path(tmp) / pathlib.PurePosixPath(member).name
                audio.write_bytes(zf.read(member))
                sheet_name = str(pathlib.PurePosixPath(member).with_suffix("")) + " (lyrics).txt"
                sheet = None
                if sheet_name in zf.namelist():
                    sheet = pathlib.Path(tmp) / f"{stem} (lyrics).txt"
                    sheet.write_bytes(zf.read(sheet_name))
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(audio), "-vn", "-map_metadata", "0", *CODEC[fmt], str(target)]
        run = subprocess.run(cmd, capture_output=True, text=True)
        if run.returncode != 0:
            target.unlink(missing_ok=True)
            return stem, run.stderr.strip().splitlines()[-1] if run.stderr.strip() else "ffmpeg failed"
        if lyrics and sheet and sheet.exists():
            shutil.copyfile(sheet, out_dir / sheet.name if member else out_dir / f"{stem} (lyrics).txt")
    return stem, "done"


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("inputs", nargs="*", type=pathlib.Path)
    ap.add_argument("--to", choices=CODEC, default="mp3")
    ap.add_argument("--out", type=pathlib.Path)
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--lyrics", action="store_true", help="copy the (lyrics).txt beside each song")
    args = ap.parse_args()
    if shutil.which("ffmpeg") is None:
        sys.exit("ffmpeg is not installed (sudo apt install ffmpeg)")
    targets = args.inputs or [d for d in DEFAULT_INPUTS if d.exists()][:1]
    if not targets:
        sys.exit("nothing to convert: pass a file, folder or zip, or put the downloads in downloads/")
    out_dir = args.out or ROOT / "downloads" / args.to
    out_dir.mkdir(parents=True, exist_ok=True)
    jobs = list(sources(targets))
    print(f"{len(jobs)} songs -> {out_dir} as {args.to}")
    counts = {"done": 0, "skipped": 0, "failed": 0}
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        futures = [pool.submit(convert, stem, src, member, args.to, out_dir, args.lyrics) for stem, src, member in jobs]
        for f in concurrent.futures.as_completed(futures):
            stem, result = f.result()
            if result in counts:
                counts[result] += 1
                print(f"   {'+' if result == 'done' else '='} {stem}")
            else:
                counts["failed"] += 1
                print(f"   ! {stem}: {result}", file=sys.stderr)
    print(f"{counts['done']} converted, {counts['skipped']} already there, {counts['failed']} failed")
    sys.exit(1 if counts["failed"] else 0)


if __name__ == "__main__":
    main()
