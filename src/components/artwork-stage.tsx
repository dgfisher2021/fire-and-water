import type { ReactNode } from 'react'
import { TRACKS, TRACK_ORDER } from '@/data/tracks'
import { cn } from '@/lib/utils'
import {
  MotionCarousel,
  MotionCarouselContent,
  MotionCarouselIndicators,
} from '@/components/ui/motion-carousel'
import { MotionTilt } from '@/components/ui/motion-tilt'

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
      className={cn('flex w-full flex-col items-center', className)}
    >
      <MotionTilt rotation={7} className='relative mb-5 size-[216px]'>
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
      {children}
      {/* Dots opt out of the 44px touch rule; the whole row is the target. */}
      <MotionCarouselIndicators
        className='static mt-4 translate-x-0 gap-3 py-2'
        dotClassName='size-2 min-h-0 bg-foreground/15 transition-[background-color,transform] duration-400 data-active:scale-[1.3] data-active:bg-foreground/50'
      />
    </MotionCarousel>
  )
}
