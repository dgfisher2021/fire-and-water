#!/usr/bin/env python3
"""Write src/data/audio-sizes.json: bytes per audio file in public/, so the
Downloads list can say what a tap will fetch. Run after adding a song.

    python3 scripts/audio-sizes.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUT = ROOT / "src" / "data" / "audio-sizes.json"

sizes = {
    p.name: p.stat().st_size
    for p in sorted(PUBLIC.iterdir())
    if p.suffix in {".mp3", ".m4a"}
}
OUT.write_text(json.dumps(sizes, indent=2) + "\n")
print(f"{len(sizes)} files -> {OUT.relative_to(ROOT)}")
