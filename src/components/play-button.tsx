import { Pause, Play } from 'lucide-react'
import { Button, LoaderSpinner } from '@dust-ui/ui'
import { cn } from '@/lib/utils'

export type PlayButtonProps = {
  playing: boolean
  loading?: boolean
  onClick: () => void
  className?: string
}

/** The album screen's labelled play pill in the active track's gradient. */
export function PlayButton({
  playing,
  loading = false,
  onClick,
  className,
}: PlayButtonProps) {
  const Glyph = playing ? Pause : Play
  return (
    <Button
      onClick={onClick}
      className={cn(
        'h-11 gap-2 rounded-[14px] bg-linear-to-br from-track-bright to-track-deep px-6 text-[13px] font-medium tracking-[1px] text-track-foreground shadow-[0_8px_24px_-8px_var(--track-glow)] transition-[transform,filter] duration-200 hover:scale-[1.03] hover:brightness-110 active:scale-[0.97]',
        className
      )}
    >
      {loading ? (
        <LoaderSpinner variant='ring' label='Buffering' />
      ) : (
        <Glyph className='size-4 fill-current' aria-hidden />
      )}
      {playing ? 'Pause' : 'Play'}
    </Button>
  )
}
