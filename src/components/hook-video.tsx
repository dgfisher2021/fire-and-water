import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useMobileShellRoot } from '@dust-ui/blocks'
import { Button, useMediaQuery } from '@dust-ui/ui'
import type { Hook } from '@/data/hooks'
import { cn } from '@/lib/utils'
import { usePlayer } from '@/store/player'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

export type HookLoopProps = {
  hook: Hook
  /** The still art, shown until the clip plays and under reduced motion. */
  poster: string
  className?: string
}

/**
 * A song's hook as moving artwork: muted, looping, inline. Under reduced
 * motion it stays on the still art and never starts.
 */
export function HookLoop({ hook, poster, className }: HookLoopProps) {
  const still = useMediaQuery(REDUCED_MOTION)
  return (
    <video
      src={still ? undefined : hook.src}
      poster={poster}
      autoPlay={!still}
      muted
      loop
      playsInline
      preload={still ? 'none' : 'metadata'}
      aria-hidden
      className={cn('object-cover', className)}
    />
  )
}

export type HookViewerProps = {
  hook: Hook
  title: string
  poster: string
  onClose: () => void
}

/**
 * The hook full screen, with sound. It pins inside the phone (the shell
 * root), pauses the song so the two never play over each other, and closes
 * on its button, Escape, or when the clip ends.
 */
export function HookViewer({ hook, title, poster, onClose }: HookViewerProps) {
  const root = useMobileShellRoot()
  const pause = usePlayer((s) => s.pause)
  const close = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    pause()
    close.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pause, onClose])

  if (!root) return null
  return createPortal(
    <div
      role='dialog'
      aria-modal='true'
      aria-label={`${title} hook`}
      data-slot='hook-viewer'
      className='absolute inset-0 z-[160] flex animate-in items-center justify-center bg-background duration-200 fade-in-0 motion-reduce:animate-none'
    >
      <video
        src={hook.src}
        poster={poster}
        autoPlay
        controls
        playsInline
        onEnded={onClose}
        className='size-full object-contain'
      />
      <Button
        ref={close}
        variant='ghost'
        size='icon'
        aria-label='Close hook'
        onClick={onClose}
        className='absolute top-[max(env(safe-area-inset-top),3rem)] right-3 size-10 rounded-md bg-card/70 text-foreground backdrop-blur-md hover:bg-card'
      >
        <X aria-hidden />
      </Button>
    </div>,
    root
  )
}
