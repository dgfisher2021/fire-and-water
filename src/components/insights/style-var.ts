import type { StyleName } from '@/data/creator-insights'

/** A style's colour token from index.css, e.g. `var(--style-dream-pop)`. */
export const styleVar = (style: StyleName) =>
  `var(--style-${style.toLowerCase().replace(/\s+/g, '-')})`

/** The style's colour washed over the panel, for fills behind text. */
export const styleWash = (style: StyleName, percent = 22) =>
  `color-mix(in oklab, ${styleVar(style)} ${percent}%, transparent)`
