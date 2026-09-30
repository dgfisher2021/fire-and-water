import type { ReactNode } from 'react'
import {
  MotionCarousel,
  MotionCarouselContent,
  MotionCarouselIndicators,
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
 * The album's artwork carousel: three covers crossfading inside a tilting
 * frame over a glow in the active track's voice, copy below, dots last.
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
        className='relative mb-5 size-[216px] short:mb-0 short:size-[150px] short:shrink-0'
      >
        <div
          aria-hidden
          data-slot='artwork-glow'
          className='absolute -inset-6 -z-10 rounded-[48px] bg-track-glow opacity-70 blur-[56px] transition-colors duration-[1800ms]'
        />
        <MotionCarouselContent className='size-full rounded-[20px] shadow-[0_24px_60px_rgb(0_0_0/0.55)]'>
          {TRACK_ORDER.map((id) => (
            <img
              key={id}
              src={TRACKS[id].art.full}
              alt={`${TRACKS[id].title} album artwork`}
              decoding='async'
              className='size-full rounded-[20px] object-cover'
            />
          ))}
        </MotionCarouselContent>
      </MotionTilt>
      <div className='short:min-w-0 short:flex-1'>{children}</div>
      {/* Each dot is a 20px target drawn as a 6px mark; thirteen fit a phone. */}
      <MotionCarouselIndicators
        className='static mt-3 translate-x-0 gap-1 py-1 short:hidden'
        dotClassName="size-5 min-h-0 bg-transparent before:block before:size-1.5 before:rounded-full before:bg-foreground/15 before:transition-[background-color,transform] before:duration-400 before:content-[''] data-active:bg-transparent data-active:before:scale-[1.3] data-active:before:bg-foreground/50"
      />
    </MotionCarousel>
  )
}
