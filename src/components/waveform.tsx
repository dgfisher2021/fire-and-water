import type { KeyboardEvent, PointerEvent } from 'react'
import { formatTime } from '@dust-ui/ui'
import { cn } from '@/lib/utils'

type WaveformProps = {
  /** Loudness per slice of the song, 0 to 100 (src/data/audio-envelopes.json). */
  bins: number[]
  /** Playhead, 0 to 1. */
  progress: number
  /** Tap, drag or arrow to a point in the song; the strip becomes the slider. */
  onSeek?: (ratio: number) => void
  /** Song length in seconds, for the slider's spoken value. */
  duration?: number
  /** Accessible name of the slider. */
  label?: string
  className?: string
}

/**
 * The song's shape as a strip of bars, filled to the playhead in the track's
 * voice. With `onSeek` it is the transport's scrubber: a slider that takes a
 * tap, a drag, and the arrow keys in five-second steps.
 */
export function Waveform({
  bins,
  progress,
  onSeek,
  duration = 0,
  label = 'Seek',
  className,
}: WaveformProps) {
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
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!onSeek || duration <= 0) return
    const step = 5 / duration
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      onSeek(Math.min(1, progress + step))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onSeek(Math.max(0, progress - step))
    }
  }
  return (
    <svg
      viewBox={`0 0 ${bins.length} 100`}
      preserveAspectRatio='none'
      data-slot='waveform'
      aria-hidden={onSeek ? undefined : true}
      role={onSeek ? 'slider' : undefined}
      aria-label={onSeek ? label : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? Math.round(duration) : undefined}
      aria-valuenow={onSeek ? Math.round(progress * duration) : undefined}
      aria-valuetext={onSeek ? formatTime(progress * duration) : undefined}
      tabIndex={onSeek ? 0 : undefined}
      className={cn(
        'block w-full touch-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        onSeek && 'cursor-pointer',
        className
      )}
      onPointerDown={seek}
      onPointerMove={(e) => e.buttons === 1 && seek(e)}
      onKeyDown={onKeyDown}
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
