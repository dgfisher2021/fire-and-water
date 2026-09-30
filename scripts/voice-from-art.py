#!/usr/bin/env python3
"""Print a song's voice from its cover art: the four OKLCH tokens and the
:root[data-track] block for src/styles/index.css, and the themeColor for
its entry in src/data/tracks.ts. The hue is the cover's most telling colour
(common, saturated, not black); pass --hue and --chroma to overrule it when
the cover is grey or the picker lands on the wrong thing.

    python3 scripts/voice-from-art.py <id> public/assets/<id>.webp [--hue 255] [--chroma 0.1]
"""
import argparse
import math

from PIL import Image


def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def unlin(c):
    c = max(0.0, min(1.0, c))
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def rgb_to_oklch(r, g, b):
    r, g, b = lin(r), lin(g), lin(b)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = l ** (1 / 3), m ** (1 / 3), s ** (1 / 3)
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    b2 = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, math.hypot(a, b2), math.degrees(math.atan2(b2, a)) % 360


def oklch_to_hex(L, C, h):
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    b3 = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return "#%02x%02x%02x" % tuple(round(unlin(c) * 255) for c in (r, g, b3))


def picked(path):
    """(hue, chroma) of the cover's most telling colour."""
    im = Image.open(path).convert("RGB")
    im.thumbnail((200, 200))
    q = im.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[: 8 * 3]
    best, best_score = None, -1
    for n, i in sorted(q.getcolors(), reverse=True):
        L, C, h = rgb_to_oklch(*pal[i * 3 : i * 3 + 3])
        score = n * (C**1.5) * (0.5 + min(L, 0.85))
        if C > 0.035 and score > best_score:
            best, best_score = (round(h), round(max(0.06, min(0.16, C * 1.15)), 2)), score
    return best or (80, 0.06)


ap = argparse.ArgumentParser()
ap.add_argument("id")
ap.add_argument("cover")
ap.add_argument("--hue", type=float)
ap.add_argument("--chroma", type=float)
args = ap.parse_args()

h, c = picked(args.cover)
h = round(args.hue) if args.hue is not None else h
c = args.chroma if args.chroma is not None else c
tid = args.id
print(f"/* {tid}: hue {h}, chroma {c} */")
print(f"  --{tid}: oklch(0.78 {c} {h});")
print(f"  --{tid}-deep: oklch(0.37 {round(min(0.19, c * 1.1), 2)} {h});")
print(f"  --{tid}-glow: oklch(0.66 {c} {h} / 42%);")
print(f"  --{tid}-ink: oklch(0.22 0.04 {h});")
print()
print(f":root[data-track='{tid}'] {{")
print(f"  --track-bright: var(--{tid});")
print(f"  --track-deep: var(--{tid}-deep);")
print(f"  --track-glow: var(--{tid}-glow);")
print(f"  --track-ink: var(--{tid}-ink);")
print("}")
print()
print(f"themeColor: '{oklch_to_hex(0.15, min(0.03, c / 3), h)}'")
