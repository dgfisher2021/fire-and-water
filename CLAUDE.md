# CLAUDE.md

Guidance for Claude Code in this repository.

## Commands

```bash
pnpm dev        # Vite on 4600 (check nothing already listens first)
pnpm build      # tsc -b && vite build - THE verification gate
pnpm lint       # eslint, 0 warnings expected
pnpm typecheck  # tsc -b --noEmit
pnpm format     # prettier on src/
```

## What this is

A mobile-first album player for three songs: artwork stage on the home
screen, a full-screen frosted lyrics drawer with reading focus, a
side-by-side view for the two mirrored songs, and an audio bar with a
draggable scrubber. React 19 + TypeScript strict + Vite 8 + TanStack
Router + Tailwind v4 on Dust UI (`@dust-ui/ui`, `@dust-ui/motion`,
`@dust-ui/tokens`) from GitHub Packages. Dark-only by design: the artwork
dictates the ground, so `<html class="dark">` is static.

- `src/routes/` file routes. `/` is home, `/lyrics/$track` opens the
  drawer (deep-linkable), `?view=split` is side by side. The URL is the
  source of truth for what is open; the store owns playback.
- `src/store/player.ts` zustand player state bound to the one `<audio>`
  element (`src/lib/audio.ts`) by `useAudioEngine`. Subscribe with
  selectors: `currentTime` updates every frame while playing.
- `src/data/tracks.ts` zod-validated track data and lyrics.
- `src/components/` app compositions built to Dust UI blocks rules
  (props-only, semantic tokens, `data-slot`, reduced-motion fallbacks) so
  they stay promotable. `src/components/ui/` holds Dust UI components
  vendored through the `@dust-ui-source` door and modified here; each
  delta is recorded in the dust-ui spec (see below).
- `src/styles/index.css` the token contract, brand values (scoped
  `:root:not([data-theme])`), the three voice tokens (`--pencil`, `--fire`,
  `--water`) and the per-track override on `html[data-track]`.
- `public/` audio at the root (existing download links keep working) and
  `assets/` artwork.

## Dust UI rules (house rules, non-negotiable)

- Semantic tokens only: `bg-primary`, `text-muted-foreground`,
  `var(--track-glow)`. No raw palette utilities, hex, or pixel radii.
- Import from `@dust-ui/*` first. New UI checks the library before it is
  written. The `@dust-ui-source/<name>` door only to fork, and a fork
  records its delta in `../dust-ui/specs/`.
- No `asChild`: polymorphism is `render={<Link/>}`. Base UI state hooks
  are `data-active:` style, never `data-[state=...]` (vaul and sonner keep
  theirs).
- `MotionProvider` mounts once at the root; under reduced motion show the
  end state, never leave content at `opacity: 0`.

## The dust-ui MCP

`.mcp.json` ships the shadcn MCP server and `components.json` declares the
`@dust-ui` and `@dust-ui-source` registries. Approve the server once with
`/mcp`. While dust-ui's GitHub Pages is disabled the registries point at a
local static server (`127.0.0.1:4180`) serving dust-ui's compiled registry;
swap the URLs back to `https://dgfisher2021.github.io/dust-ui/r/...` when
Pages is re-enabled.

## Deploy

GitHub Pages from `main` via `.github/workflows/deploy.yml`
(`VITE_BASE_PATH=/fire-and-water/`, `404.html` copy for SPA deep links).
Needs the repo secret `DUST_UI_READ_TOKEN` (classic PAT, `read:packages`).

## Docs

Specs, analysis and plans live in `claude/`. The README explains the
features; keep code comments short.
