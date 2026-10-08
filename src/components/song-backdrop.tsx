import { lazy, Suspense } from 'react'
import { MistBackdrop } from '@dust-ui/3d'
import { AmbientBackdrop, AmbientImageBackdrop } from '@dust-ui/ui'
import { TRACKS, TRACK_ORDER } from '@/data/tracks'
import { cn } from '@/lib/utils'
import { usePrefs } from '@/store/prefs'
import { AuroraBackdrop } from '@/components/aurora-backdrop'

const IMAGES = TRACK_ORDER.map((id) => ({ id, src: TRACKS[id].art.full }))

// three.js, fiber and drei load only when the starfield is chosen.
const StarsBackdrop = lazy(() => import('@/components/stars-backdrop'))

/**
 * Dust UI's mist: fog planes and drifting dust in three.js (loaded lazily by
 * the package), tinted the song's colour; remounted per song so the tint
 * follows. Brighter with the bass.
 */
function NebulaBackdrop() {
  return (
    <div
      aria-hidden
      data-slot='nebula-backdrop'
      className='pointer-events-none absolute inset-0 isolate z-0 overflow-hidden bg-background'
    >
      <div
        className='absolute inset-0 transition-opacity duration-150'
        style={{ opacity: 'calc(0.7 + var(--pulse-bass, 0) * 0.3)' }}
      >
        <MistBackdrop tint='var(--track-bright)' />
      </div>
    </div>
  )
}

/**
 * The flowing background: Dust UI's ambient field with its drifting sheen
 * and dot texture, and a soft glow, in the song's colour (the theme's
 * primary follows the track). The field brightens with the voice and the
 * glow swells with the bass (--pulse-vocal and --pulse-bass; both 0 when
 * paused or with music reaction off). No floating paths: their 36 animated
 * layers starved the page of paint.
 */
function FlowBackdrop() {
  return (
    <div
      aria-hidden
      data-slot='flow-backdrop'
      className='pointer-events-none absolute inset-0 z-0 overflow-hidden bg-background'
    >
      {/* The field brightens with the voice. */}
      <div
        className='absolute inset-0 transition-opacity duration-150'
        style={{ opacity: 'calc(0.75 + var(--pulse-vocal, 0) * 0.25)' }}
      >
        <AmbientBackdrop drift pattern='dots' className='z-0' />
      </div>
      {/* A plain gradient, not a blurred element: cheap to repaint as it
          scales with the bass, and it never starves the glass above it. */}
      <div
        className='absolute top-[8%] left-1/2 size-[90vmin] -translate-x-1/2 rounded-full transition-[scale,opacity] duration-150'
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in oklab, var(--track-bright) 45%, transparent), color-mix(in oklab, var(--track-glow) 60%, transparent) 45%, transparent)',
          opacity: 'calc(0.45 + var(--pulse-bass, 0) * 0.4)',
          scale: 'calc(0.85 + var(--pulse-bass, 0) * 0.3)',
        }}
      />
    </div>
  )
}

export type SongBackdropProps = {
  /** The song whose art or colour fills the screen. */
  theme: string
  className?: string
}

/** The screen's background, per the Background setting. */
export function SongBackdrop({ theme, className }: SongBackdropProps) {
  const background = usePrefs((s) => s.background)
  // The colour field has nothing to re-crop, so it stays an ordinary layer
  // inside the shell; only the photo takes the large-viewport sizing.
  if (background === 'flow') return <FlowBackdrop />
  if (background === 'aurora') return <AuroraBackdrop theme={theme} />
  if (background === 'nebula') return <NebulaBackdrop key={theme} />
  if (background === 'stars')
    return (
      <Suspense
        fallback={<div className='absolute inset-0 z-0 bg-background' />}
      >
        <StarsBackdrop theme={theme} />
      </Suspense>
    )
  return (
    <AmbientImageBackdrop
      images={IMAGES}
      activeId={theme}
      drift={false}
      className={cn('absolute z-0', className)}
    />
  )
}
