import { Outlet, createRootRoute, useMatch } from '@tanstack/react-router'
import { MotionProvider } from '@dust-ui/motion'
import { TRACKS, TRACK_ORDER } from '@/data/tracks'
import { usePlayer } from '@/store/player'
import { useAudioEngine } from '@/hooks/use-audio-engine'
import { useMediaSession } from '@/hooks/use-media-session'
import { usePageMeta } from '@/hooks/use-page-meta'
import { PhoneShell } from '@/components/phone-shell'

export function RootComponent() {
  useAudioEngine()
  useMediaSession()

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
