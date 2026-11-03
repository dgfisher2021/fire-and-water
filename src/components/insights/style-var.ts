import type { StyleName } from '@/data/creator-insights'

/** A style's colour token from index.css, e.g. `var(--style-dream-pop)`. */
export const styleVar = (style: StyleName) =>
  `var(--style-${style.toLowerCase().replace(/\s+/g, '-')})`

/** A colour lifted toward light by `--glass-lift` (on navy only). */
export const lift = (color: string) =>
  `color-mix(in oklab, ${color}, var(--glass-light) var(--glass-lift))`

/** A colour washed over the glass, lifted first so it never muddies. */
export const wash = (color: string, percent: number) =>
  `color-mix(in oklab, ${lift(color)} ${percent}%, transparent)`

/** The style's colour washed over the panel, for fills behind text. */
export const styleWash = (style: StyleName, percent = 22) =>
  wash(styleVar(style), percent)
