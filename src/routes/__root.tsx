import { Outlet, createRootRoute, useMatch } from '@tanstack/react-router'
import { MotionProvider } from '@dust-ui/motion'
import { ToastStack } from '@dust-ui/ui'
import { TRACKS, TRACK_ORDER } from '@/data/tracks'
import { usePlayer } from '@/store/player'
import { useAudioEngine } from '@/hooks/use-audio-engine'
import { useMediaSession } from '@/hooks/use-media-session'
import { usePageMeta } from '@/hooks/use-page-meta'
import { AmbientImageBackdrop } from '@/components/ambient-image-backdrop'
// grain-overlay is newer than the published @dust-ui/ui, so it is vendored.
import { GrainOverlay } from '@/components/ui/grain-overlay'

const BACKDROPS = TRACK_ORDER.map((id) => ({ id, src: TRACKS[id].art.full }))

export function RootComponent() {
  useAudioEngine()
  useMediaSession()

  // The open lyrics track owns the theme; otherwise the home slide does.
  const lyricsTrack = useMatch({
    from: '/_player/lyrics/$track',
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
      <div className='relative isolate flex h-dvh flex-col overflow-hidden'>
        <AmbientImageBackdrop images={BACKDROPS} activeId={theme} />
        <GrainOverlay className='fixed z-0' opacity={0.035} />
        <Outlet />
      </div>
      <ToastStack position='top-center' theme='dark' offset={16} />
    </MotionProvider>
  )
}

export function RootNotFound() {
  return (
    <main className='flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center'>
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
