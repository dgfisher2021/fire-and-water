import {
  lazy,
  Suspense,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { MistBackdrop } from '@dust-ui/3d'
import { useMobileShellFramed, useMobileShellRoot } from '@dust-ui/blocks'
import { AmbientBackdrop, AmbientImageBackdrop } from '@dust-ui/ui'
import { usePrefs } from '@/store/prefs'
import { useBackdropImages } from '@/hooks/use-backdrop-images'
import { AuroraBackdrop } from '@/components/aurora-backdrop'

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
}

/**
 * Where this copy of the backdrop sits. Framed, MobileAppShell renders it
 * twice: inside the phone and blurred across the window. Null until the
 * first layout says which.
 */
function useBackdropPlace() {
  const framed = useMobileShellFramed()
  const root = useMobileShellRoot()
  const box = useRef<HTMLDivElement>(null)
  const [inside, setInside] = useState<boolean | null>(null)
  useLayoutEffect(() => {
    if (!root || !box.current) return
    setInside(root.contains(box.current))
  }, [root])
  const place: 'screen' | 'window' | null = !framed
    ? 'screen'
    : inside === null
      ? null
      : inside
        ? 'screen'
        : 'window'
  return { box, place }
}

/**
 * The screen's background, per the Background setting. Behind the frame it
 * stays the blurred artwork whatever the setting, so a WebGL background
 * never runs twice.
 */
export function SongBackdrop({ theme }: SongBackdropProps) {
  const background = usePrefs((s) => s.background)
  const images = useBackdropImages(theme)
  const { box, place } = useBackdropPlace()
  const artwork = (
    <AmbientImageBackdrop
      images={images}
      activeId={theme}
      drift={false}
      className='absolute z-0'
    />
  )
  let layer: ReactNode = null
  if (place === 'window') layer = artwork
  else if (place === 'screen') {
    if (background === 'flow') layer = <FlowBackdrop />
    else if (background === 'aurora') layer = <AuroraBackdrop theme={theme} />
    else if (background === 'nebula') layer = <NebulaBackdrop key={theme} />
    else if (background === 'stars')
      layer = (
        <Suspense
          fallback={<div className='absolute inset-0 z-0 bg-background' />}
        >
          <StarsBackdrop theme={theme} />
        </Suspense>
      )
    else layer = artwork
  }
  return (
    <div ref={box} className='contents'>
      {layer}
    </div>
  )
}
