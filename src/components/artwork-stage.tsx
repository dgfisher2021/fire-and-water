import type { ReactNode } from 'react'
import {
  MotionCarousel,
  MotionCarouselContent,
  MotionTilt,
} from '@dust-ui/motion'
import { TRACKS, TRACK_ORDER } from '@/data/tracks'
import { cn } from '@/lib/utils'

export type ArtworkStageProps = {
  index: number
  onIndexChange: (index: number) => void
  /** Auto-advance interval; 0 disables. */
  autoplayMs?: number
  /** Copy and actions for the active slide, rendered below the art. */
  children?: ReactNode
  className?: string
}

/**
 * The album's artwork carousel: the covers crossfading inside a tilting
 * frame over a glow in the active track's voice, copy below. Covers stay
 * still; a song's hook plays behind the app while it plays, or full screen
 * from Watch hook.
 */
export function ArtworkStage({
  index,
  onIndexChange,
  autoplayMs = 0,
  children,
  className,
}: ArtworkStageProps) {
  return (
    <MotionCarousel
      index={index}
      onIndexChange={onIndexChange}
      variant='fade'
      autoplayInterval={autoplayMs}
      className={cn(
        'flex w-full flex-col items-center short:flex-row short:gap-5',
        className
      )}
    >
      <MotionTilt
        rotation={7}
        className='relative mb-4 size-[min(216px,28dvh)] short:mb-0 short:size-[150px] short:shrink-0'
      >
        <div
          aria-hidden
          data-slot='artwork-glow'
          className='absolute -inset-6 -z-10 rounded-4xl bg-track-glow blur-[56px] transition-[background-color,opacity,scale] duration-[1800ms,150ms,150ms]'
          // Breathes with the voice while a song plays (--pulse-vocal).
          style={{
            opacity: 'calc(0.6 + var(--pulse-vocal, 0) * 0.4)',
            scale: 'calc(1 + var(--pulse-vocal, 0) * 0.1)',
          }}
        />
        <MotionCarouselContent className='size-full rounded-xl shadow-[0_24px_60px_rgb(0_0_0/0.55)]'>
          {TRACK_ORDER.map((id, i) => {
            const n = TRACK_ORDER.length
            const near = (i - index + n) % n <= 1 || (index - i + n) % n <= 1
            // Art only on the showing slide and its neighbours (thumbs):
            // 95 covers decoded at once crash iOS tabs.
            if (!near)
              return <div key={id} className='size-full rounded-xl bg-muted' />
            return (
              <img
                key={id}
                src={i === index ? TRACKS[id].art.full : TRACKS[id].art.thumb}
                alt={`${TRACKS[id].title} album artwork`}
                decoding='async'
                className='size-full rounded-xl object-cover'
              />
            )
          })}
        </MotionCarouselContent>
      </MotionTilt>
      <div className='short:min-w-0 short:flex-1'>{children}</div>
    </MotionCarousel>
  )
}
