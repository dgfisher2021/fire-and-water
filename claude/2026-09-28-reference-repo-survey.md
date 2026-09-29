# Reference repo survey (2026-09-28)

What the four sibling repos contributed to the React conversion, and what
was deliberately not copied. Condensed from the exploration that preceded
`2026-09-28-react-dust-ui-conversion.md`.

## real-estate-app (the scaffold recipe)

Taken: Vite 8 + React 19.2.5 pinned (pnpm override + `resolve.dedupe`),
TS strict, TanStack Router file routes with `zodValidator` + `fallback`
(plain `.catch()` makes params required on every link), `<base
href="%BASE_URL%">` + `404.html` copy + router `basepath` for Pages deep
links, the `?/path` restore script, `@source` globs over `@dust-ui/*/dist`
(Tailwind skips node_modules), brand tokens scoped `:root:not([data-theme])`,
`render={<a/>}` + `nativeButton={false}` polymorphism, eslint flat config
with `allowExportNames: ['Route']`, prettier no-semi/single-quote +
sort-imports + tailwind plugin, and the Pages deploy workflow with the
`DUST_UI_READ_TOKEN` secret.

Not taken: its `CLAUDE.md` still describes `link:` deps and `fs.allow`;
the repo moved to published packages in commit `c8c5c24`. Its
`importOrder` has a stale `^@dust/` entry. No `viewport-fit=cover`,
`dvh` or safe-area insets anywhere; this app adds them.

## ppm-mobile-ai (mobile chrome patterns)

Taken as ideas: the PhoneFrame flex-column shell (`flex:1; min-height:0;
overflow:hidden` content pane, non-scrolling siblings), per-screen scroll
panes with a hidden scrollbar, `button:active { scale }` press feedback,
`overscroll-behavior: contain`, accent as CSS custom properties on the
root so re-theming never re-renders React, the inline pre-paint dark
script, glass surfaces mixed from tokens, skeleton shimmer via
`color-mix`.

Not taken: zustand, react-router, R3F and leaflet are installed but never
imported; state is three god-contexts (one re-renders every consumer per
keystroke); ~490 inline `style={{}}` against ~80 classNames; two token
systems side by side; hard-coded `52px`/`94px` offsets instead of
`env(safe-area-inset-*)`; a browser-side `api.anthropic.com` call.

## ppm-mobile (Expo, offline-first manufacturing)

Taken as ideas: the facade-hook shape (`useSyncStatus` collapses several
selectors into one status object; here `usePlayer` selectors), the
root route-guard layout, header presets, the 4px spacing / type / shadow
scales and the 44px minimum touch target.

Not taken: RTK + redux-persist + hand-written thunk lifecycles (overkill
for a player), unmemoized parameterized selectors created per render,
singletons that import the store (circular), `Alert.alert` for all
feedback, unused deps (lodash, moment, two icon libraries). Nothing for
audio, scrubbing, carousels or gestures.

## dust-ui (what shipped, what was missing)

Import door used as-is: `Button`, `LoaderSpinner`, `Drawer*` (vaul),
`SegmentedControl`, `ToastStack` (sonner), `MotionProvider`.

Forked through `@dust-ui-source` because a player could not compose
them: `mobile-media-player` (no buffering state, no actions slot, no
compact layout, inline styles), `motion-carousel` (uncontrolled, slide
only), `motion-tilt` (mouse only, inert `perspective`), `grain-overlay`
(newer than the published 0.9.0).

Not in the library at all, built here to blocks rules: ambient image
backdrop, lyrics reader with reading focus, synced split view, swipe
hook, share helper, audio engine and media session hooks. All proposed
upstream in `dust-ui/specs/20-mobile-media-kit-fire-and-water-2026-09-28.md`.

Kit gaps worth knowing: `mobile.css` is keyframes only and the
`no-scrollbar` utility its components need is not shipped; `SheetBottom`
and `MobileToastStack` position inside a `DeviceFrame`, so a viewport
app wants vaul + sonner instead; `DrawerContent` exposes neither an
overlay className nor a handle className. The GitHub Pages registry was
disabled (`has_pages: false`) at the time, so `components.json` targets a
local mirror on `127.0.0.1:4180`.
