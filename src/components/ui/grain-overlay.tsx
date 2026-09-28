import type * as React from 'react'
import { cn } from '@/lib/utils'

// Monochrome fractal noise tile (feTurbulence, desaturated), tiled by the
// browser; no runtime cost beyond one decoded 160px image.
const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

export type GrainOverlayProps = Omit<
  React.ComponentProps<'div'>,
  'children'
> & {
  /** Noise strength from 0 to 1. Film grain reads best at 0.03 to 0.08. */
  opacity?: number
}

/**
 * Fine film-grain noise laid over its `relative` parent. Blends with
 * overlay so it textures light and dark grounds alike; decorative only
 * (aria-hidden, ignores the pointer).
 */
export function GrainOverlay({
  opacity = 0.05,
  className,
  style,
  ...props
}: GrainOverlayProps) {
  return (
    <div
      aria-hidden='true'
      data-slot='grain-overlay'
      className={cn(
        'pointer-events-none absolute inset-0 mix-blend-overlay',
        className
      )}
      style={{ opacity, backgroundImage: NOISE, ...style }}
      {...props}
    />
  )
}
