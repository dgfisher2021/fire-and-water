import { TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { cn } from '@/lib/utils'

export type TrackTabsProps = {
  value: TrackId
  onChange: (track: TrackId) => void
  className?: string
}

/** Artwork thumbnails as tabs; the active one lifts and glows in its voice. */
export function TrackTabs({ value, onChange, className }: TrackTabsProps) {
  return (
    <div
      role='tablist'
      aria-label='Tracks'
      className={cn('flex items-center justify-center gap-3.5', className)}
    >
      {TRACK_ORDER.map((id) => {
        const track = TRACKS[id]
        const active = id === value
        return (
          <button
            key={id}
            type='button'
            role='tab'
            aria-selected={active}
            aria-label={track.title}
            data-active={active || undefined}
            onClick={() => onChange(id)}
            className={cn(
              'size-[60px] shrink-0 overflow-hidden rounded-[14px] border-[2.5px] border-transparent p-0 opacity-40 shadow-[0_4px_20px_rgb(0_0_0/0.5)] transition-[transform,opacity,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none hover:opacity-70 focus-visible:ring-[3px] focus-visible:ring-ring/50 md:size-[68px]',
              'data-active:scale-[1.12] data-active:border-primary data-active:opacity-100 data-active:shadow-[0_4px_28px_var(--track-glow)]'
            )}
          >
            <img
              src={track.art.thumb}
              alt=''
              decoding='async'
              className='size-full object-cover'
            />
          </button>
        )
      })}
    </div>
  )
}
