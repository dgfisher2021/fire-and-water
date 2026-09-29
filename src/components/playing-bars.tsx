import { cn } from '@/lib/utils'

export type PlayingBarsProps = {
  /** Bars dance while true, rest low while paused. */
  active?: boolean
  className?: string
}

/**
 * The three-bar "now playing" glyph every music app uses beside the song
 * in progress: bars bounce in the accent color while it plays and settle
 * while it is paused. Still under reduced motion.
 */
export function PlayingBars({ active = true, className }: PlayingBarsProps) {
  return (
    <span
      data-slot='playing-bars'
      role='img'
      aria-label={active ? 'Playing' : 'Paused'}
      className={cn('flex h-3.5 items-end gap-[2px]', className)}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            'block w-[3px] rounded-full bg-primary',
            active
              ? 'h-full animate-playing-bar motion-reduce:animate-none'
              : 'h-[30%]'
          )}
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  )
}
