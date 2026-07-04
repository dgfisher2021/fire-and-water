# Fire & Water — Dustin & Alex

**Live site:** [https://dgfisher2021.github.io/fire-and-water/](https://dgfisher2021.github.io/fire-and-water/)

---

A music experience featuring three original songs exploring the bond between a brother and sister — Dustin and Alex.

## Tracks

- **Pencil and Pen** — A boy who only trusted pencil — erasable, safe, fixable — watches his sister fill journals in permanent ink. Her anger, sadness, and grief poured out fearlessly while he suppressed everything.
- **Fire and Water** — She was fire — bold, roaring, untamed. He was water — patient, adaptive, persistent. She gave him the courage to speak. He showed her that temperance isn't weakness.
- **Water and Fire** — The same story through her eyes. Her fire was never theirs to tame. She channels what used to explode into raising her girls, building a home, and letting go of weight that was never hers to hold.

## Features

- Interactive carousel with album artwork for each track
- Built-in audio player with progress tracking and per-track download
- Side-by-side lyrics comparison between Dustin's and Alex's perspectives
- Themed visuals — each track has its own color palette and animated background
- Lock-screen / hardware media controls via the Media Session API
- Full keyboard support — arrow keys switch tracks, Space plays/pauses, Escape closes the lyrics view
- Fully responsive, mobile-friendly, and installable (web app manifest)

## Project structure

```
index.html          The entire app — markup, styles, and scripts (no build step)
site.webmanifest    Web app manifest for installability
assets/             Album artwork (full size + 512px thumbnails) and icons
*.m4a               The three audio tracks
```

## Developing locally

No build step or dependencies — serve the folder and open it in a browser:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

Deployed automatically via GitHub Pages from the `main` branch.
