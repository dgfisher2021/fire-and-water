import { Outlet, createRootRoute, useMatch } from '@tanstack/react-router'
import { MotionProvider } from '@dust-ui/motion'
import { useMediaSession } from '@dust-ui/ui'
import { ALBUM, TRACKS, TRACK_ORDER, adjacentTrack } from '@/data/tracks'
import { usePlayer } from '@/store/player'
import { useAudioEngine } from '@/hooks/use-audio-engine'
import { usePageMeta } from '@/hooks/use-page-meta'
import { PhoneShell } from '@/components/phone-shell'

/**
 * Lock-screen and media-key controls. Its own component: the position it
 * feeds the OS changes every second, and only this re-renders for it.
 */
function MediaSession() {
  const track = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  const duration = usePlayer((s) => s.duration)
  const second = usePlayer((s) => Math.floor(s.currentTime))
  const t = track ? TRACKS[track] : null
  const current = usePlayer.getState
  useMediaSession({
    metadata: t
      ? {
          title: t.title,
          artist: ALBUM.artist,
          album: ALBUM.title,
          artwork: [
            {
              src: new URL(t.art.thumb, document.baseURI).href,
              sizes: '512x512',
              type: 'image/webp',
            },
          ],
        }
      : undefined,
    playbackState: !t ? 'none' : status === 'playing' ? 'playing' : 'paused',
    onPlay: () => {
      const id = current().track
      if (id) current().play(id)
    },
    onPause: () => current().pause(),
    // Requests (not plain plays) so an open lyrics view follows the change.
    onPrevious: () => {
      const id = current().track
      if (id) current().requestTrack(adjacentTrack(id, -1))
    },
    onNext: () => {
      const id = current().track
      if (id) current().requestTrack(adjacentTrack(id, 1))
    },
    onSeekTo: (seconds) => current().seek(seconds),
    position:
      t && duration > 0
        ? { duration, position: Math.min(second, duration) }
        : undefined,
  })
  return null
}

export function RootComponent() {
  useAudioEngine()

  // The open lyrics track owns the theme; otherwise the album slide does.
  const lyricsTrack = useMatch({
    from: '/lyrics/$track',
    shouldThrow: false,
    select: (m) => m.params.track,
  })
  const carouselIndex = usePlayer((s) => s.carouselIndex)
  const theme = lyricsTrack ?? TRACK_ORDER[carouselIndex]

  const playingTitle = usePlayer((s) =>
    s.track && s.status === 'playing' ? TRACKS[s.track].title : null
  )
  usePageMeta(theme, playingTitle)

  return (
    <MotionProvider>
      <MediaSession />
      <PhoneShell theme={theme}>
        <Outlet />
      </PhoneShell>
    </MotionProvider>
  )
}

export function RootNotFound() {
  return (
    <main className='relative z-[1] flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center'>
      <p className='font-display text-3xl'>Not found</p>
      <a
        href='.'
        className='text-sm text-primary underline-offset-4 hover:underline'
      >
        Back to the album
      </a>
    </main>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: RootNotFound,
})
