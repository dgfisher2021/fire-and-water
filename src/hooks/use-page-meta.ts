import { useEffect } from 'react'
import { ALBUM, TRACKS, type TrackId } from '@/data/tracks'

const BASE_TITLE = `${ALBUM.title} — ${ALBUM.artist}`

/**
 * Document-level theming: the active track colors the browser chrome and
 * the token contract (html[data-track]); a playing title shows in the tab.
 */
export function usePageMeta(theme: TrackId, playingTitle: string | null) {
  useEffect(() => {
    document.documentElement.dataset.track = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', TRACKS[theme].themeColor)
  }, [theme])

  useEffect(() => {
    document.title = playingTitle
      ? `▶ ${playingTitle} — ${ALBUM.artist}`
      : BASE_TITLE
  }, [playingTitle])
}
