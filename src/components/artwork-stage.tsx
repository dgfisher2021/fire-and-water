import type { ReactNode } from 'react'
import {
  MotionCarousel,
  MotionCarouselContent,
  MotionTilt,
} from '@dust-ui/motion'
import { hookFor } from '@/data/hooks'
import { TRACKS, TRACK_ORDER } from '@/data/tracks'
import { cn } from '@/lib/utils'
import { HookLoop } from '@/components/hook-video'

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
 * frame over a glow in the active track's voice, copy below. A song with a
 * hook plays it there, muted and looping, while it is the one showing.
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
          className='absolute -inset-6 -z-10 rounded-4xl bg-track-glow opacity-70 blur-[56px] transition-colors duration-[1800ms]'
        />
        <MotionCarouselContent className='size-full rounded-xl shadow-[0_24px_60px_rgb(0_0_0/0.55)]'>
          {TRACK_ORDER.map((id, i) => {
            const hook = hookFor(id)
            // Only the showing slide moves; the rest stay still art, so no
            // hidden clip ever plays.
            return hook && i === index ? (
              <HookLoop
                key={id}
                hook={hook}
                poster={TRACKS[id].art.full}
                className='size-full rounded-xl'
              />
            ) : (
              <img
                key={id}
                src={TRACKS[id].art.full}
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
