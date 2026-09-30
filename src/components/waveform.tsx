import type { PointerEvent } from 'react'
import { cn } from '@/lib/utils'

type WaveformProps = {
  /** Loudness per slice of the song, 0 to 100 (src/data/audio-envelopes.json). */
  bins: number[]
  /** Playhead, 0 to 1. */
  progress: number
  /** Tap or drag to a point in the song. */
  onSeek?: (ratio: number) => void
  className?: string
}

/**
 * The song's shape as a strip of bars, filled to the playhead in the track's
 * voice. Decorative beside the player's slider, which stays the accessible
 * control, but a tap lands on that point of the song too.
 */
export function Waveform({ bins, progress, onSeek, className }: WaveformProps) {
  const bars = bins.map((h, i) => {
    const height = Math.max(6, h)
    return (
      <rect
        key={i}
        x={i + 0.2}
        y={(100 - height) / 2}
        width={0.6}
        height={height}
        rx={0.3}
      />
    )
  })
  const seek = (e: PointerEvent<SVGSVGElement>) => {
    if (!onSeek) return
    const r = e.currentTarget.getBoundingClientRect()
    onSeek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)))
  }
  return (
    <svg
      viewBox={`0 0 ${bins.length} 100`}
      preserveAspectRatio='none'
      aria-hidden
      data-slot='waveform'
      className={cn(
        'block w-full touch-none',
        onSeek && 'cursor-pointer',
        className
      )}
      onPointerDown={seek}
      onPointerMove={(e) => e.buttons === 1 && seek(e)}
    >
      <g className='fill-foreground/20'>{bars}</g>
      <g
        className='fill-track-bright transition-[clip-path] duration-150 ease-linear motion-reduce:transition-none'
        style={{ clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}
      >
        {bars}
      </g>
    </svg>
  )
}
