import { useEffect } from 'react'
import { mediaAccentVars } from '@dust-ui/ui'
import { ALBUM, TRACKS, type TrackId } from '@/data/tracks'

const BASE_TITLE = `${ALBUM.title} - ${ALBUM.artist}`

/**
 * The song's voice (--<id>, --<id>-deep, --<id>-glow, --<id>-ink in
 * index.css) as the --track-* tokens, and the Media* accent contract from
 * them, deep and glow from the voice rather than mixed.
 */
function trackVars(id: TrackId): Record<string, string> {
  return {
    '--track-bright': `var(--${id})`,
    '--track-deep': `var(--${id}-deep)`,
    '--track-glow': `var(--${id}-glow)`,
    '--track-ink': `var(--${id}-ink)`,
    ...(mediaAccentVars('var(--track-bright)', {
      foreground: 'var(--track-foreground)',
    }) as Record<string, string>),
    '--media-accent-deep': 'var(--track-deep)',
    '--media-glow': 'var(--track-glow)',
  }
}

/**
 * Document-level theming: the active track colors the browser chrome and
 * the token contract (html[data-track] and its voice inline); a playing
 * title shows in the tab.
 */
export function usePageMeta(theme: TrackId, playingTitle: string | null) {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.track = theme
    const vars = trackVars(theme)
    for (const [name, value] of Object.entries(vars))
      root.style.setProperty(name, value)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', TRACKS[theme].themeColor)
  }, [theme])

  useEffect(() => {
    document.title = playingTitle
      ? `▶ ${playingTitle} - ${ALBUM.artist}`
      : BASE_TITLE
  }, [playingTitle])
}
