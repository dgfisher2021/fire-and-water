import { cn } from '@/lib/utils'

export type AmbientImage = { id: string; src: string }

export type AmbientImageBackdropProps = {
  images: readonly AmbientImage[]
  /** The image shown; the rest stay mounted and crossfade out. */
  activeId: string
  /** Slow zoom on the active image. Default true; static under reduced motion. */
  drift?: boolean
  className?: string
}

/**
 * Full-bleed photographic atmosphere: every image stays mounted, the active
 * one fades in over the others (a true overlapping crossfade) and drifts a
 * few percent larger, under a radial vignette in the background token so
 * foreground type stays legible on any artwork. Decorative only.
 */
export function AmbientImageBackdrop({
  images,
  activeId,
  drift = true,
  className,
}: AmbientImageBackdropProps) {
  return (
    <div
      aria-hidden='true'
      data-slot='ambient-image-backdrop'
      className={cn(
        'pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background',
        className
      )}
    >
      {images.map((image, i) => {
        const active = image.id === activeId
        return (
          <img
            key={image.id}
            src={image.src}
            alt=''
            decoding='async'
            loading={i === 0 ? 'eager' : 'lazy'}
            data-active={active || undefined}
            className={cn(
              'absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-[1800ms] ease-out data-active:opacity-100',
              drift && 'data-active:animate-bg-drift motion-reduce:animate-none'
            )}
          />
        )
      })}
      <div
        data-slot='ambient-image-vignette'
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(ellipse 70% 70% at 50% 45%, color-mix(in oklab, var(--background) 15%, transparent) 0%, color-mix(in oklab, var(--background) 50%, transparent) 40%, color-mix(in oklab, var(--background) 85%, transparent) 100%)',
        }}
      />
    </div>
  )
}
