import { useEffect, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { SkipBack, SkipForward } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useMobileShellRoot } from '@dust-ui/blocks'
import { useMediaQuery } from '@dust-ui/ui'
import { adjacentTrack, TRACKS } from '@/data/tracks'
import { PLAY_MODE_TOGGLES, togglePlayMode } from '@/lib/play-mode'
import { toaster } from '@/lib/toaster'
import { cn } from '@/lib/utils'
import { usePlayer } from '@/store/player'
import { usePrefs } from '@/store/prefs'
import { useMiniPlayerVisible } from '@/hooks/use-mini-player'
import { useNavTarget } from '@/hooks/use-nav-target'
import { FanDial } from './fan-dial'
import { FanOrbit } from './fan-orbit'
import { dialHit, type Point } from './geometry'
import type { FanAction, FanActionId, FanViewProps } from './types'
import { CENTER_SELECTOR, useFanGesture } from './use-fan-gesture'

/** The play button's center in the shell root's px, and the frame's scale. */
type Geo = { c: Point; scale: number }

function measure(root: HTMLElement): Geo | null {
  const button = document.querySelector(CENTER_SELECTOR)
  if (!button) return null
  const r = root.getBoundingClientRect()
  const scale = root.offsetWidth ? r.width / root.offsetWidth : 1
  const b = button.getBoundingClientRect()
  return {
    c: {
      x: (b.left + b.width / 2 - r.left) / scale,
      y: (b.top + b.height / 2 - r.top) / scale,
    },
    scale,
  }
}

/**
 * The fan the nav's play button opens: hold it or swipe up, slide onto
 * shuffle, back, next or repeat, and let go. Drawn in-frame over a scrim,
 * in the look chosen in Settings, acting on the button's own song.
 */
export function PlayFan() {
  const root = useMobileShellRoot()
  const look = usePrefs((s) => s.playFan)
  const hintSeen = usePrefs((s) => s.fanHintSeen)
  const miniVisible = useMiniPlayerVisible()
  const { target } = useNavTarget()
  const playMode = usePlayer((s) => s.playMode)
  const navigate = useNavigate()
  const routeId = useRouterState({ select: (s) => s.matches.at(-1)?.routeId })
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [geo, setGeo] = useState<Geo | null>(null)

  useEffect(() => {
    if (!root) return
    const update = () => setGeo(measure(root))
    const frame = requestAnimationFrame(update)
    const observer = new ResizeObserver(update)
    observer.observe(root)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [root])

  const seek = (fraction: number) => {
    const s = usePlayer.getState()
    const duration =
      (s.track === target && s.duration) || TRACKS[target].duration
    if (s.track !== target) s.play(target)
    s.seek(fraction * duration)
  }

  const fire = (id: string) => {
    const s = usePlayer.getState()
    if (id === 'shuffle' || id === 'repeat') {
      const r = togglePlayMode(s.playMode, id)
      s.setPlayMode(r.mode)
      toaster.push(r.message)
    } else if (id === 'back' || id === 'next') {
      s.requestTrack(adjacentTrack(target, id === 'next' ? 1 : -1))
    } else if (id === 'cover') {
      void navigate({ to: '/lyrics/$track', params: { track: target } })
    }
  }

  const fan = useFanGesture({
    rimHit:
      look === 'dial' && root && geo
        ? (x, y) => {
            const r = root.getBoundingClientRect()
            return dialHit(geo.c, {
              x: (x - r.left) / geo.scale,
              y: (y - r.top) / geo.scale,
            })
          }
        : undefined,
    onFire: fire,
    onSeek: seek,
    onOpenChange: (open) => {
      if (!open) return
      if (root) setGeo(measure(root))
      if (!usePrefs.getState().fanHintSeen) usePrefs.getState().setFanHintSeen()
    },
  })
  const { closeFan } = fan

  // Another screen folds it; Lyrics following the player is the same screen.
  useEffect(() => closeFan(), [routeId, closeFan])

  // Lets CSS dim the tabs and the mini player, wherever the nav renders.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-fan-open', fan.open)
    return () => document.documentElement.removeAttribute('data-fan-open')
  }, [fan.open])

  const elapsed = usePlayer((s) =>
    fan.open && s.track === target ? s.currentTime : 0
  )

  if (!root || !geo) return null

  const actions: FanAction[] = [
    {
      id: 'shuffle',
      label: 'Shuffle',
      icon: PLAY_MODE_TOGGLES.shuffle.icon,
      pressed: playMode === 'shuffle',
    },
    { id: 'back', label: 'Back', icon: SkipBack },
    { id: 'next', label: 'Next', icon: SkipForward },
    {
      id: 'repeat',
      label: 'Repeat',
      icon: PLAY_MODE_TOGGLES.repeat.icon,
      pressed: playMode === 'repeat',
    },
  ]
  const track = TRACKS[target]
  const view: FanViewProps = {
    open: fan.open,
    reduced,
    center: geo.c,
    actions,
    hot: fan.hot,
    scrubbing: fan.scrubbing,
    now: {
      title: track.title,
      elapsed,
      duration: track.duration,
      cover: track.art.thumb,
    },
    onAction: (id: FanActionId) => {
      fire(id)
      if (id === 'cover') closeFan()
    },
    onSeek: seek,
  }
  const hint = !hintSeen && !miniVisible && !fan.open

  return createPortal(
    <div data-slot='play-fan' className='pointer-events-none absolute inset-0'>
      <div
        aria-hidden
        onClick={closeFan}
        className={cn(
          // Over the mini player (40), under the nav (60) and its button.
          'absolute inset-0 z-50 bg-[radial-gradient(120%_75%_at_50%_100%,color-mix(in_oklab,var(--background)_82%,transparent),color-mix(in_oklab,var(--background)_40%,transparent))] backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none',
          fan.open ? 'pointer-events-auto opacity-100' : 'opacity-0'
        )}
      />
      <div
        role='toolbar'
        aria-label='Playback controls'
        aria-hidden={!fan.open}
        className='pointer-events-none absolute inset-0 z-[65]'
      >
        {look === 'orbit' ? <FanOrbit {...view} /> : <FanDial {...view} />}
      </div>
      {hint && (
        <svg
          aria-hidden
          viewBox='0 0 40 12'
          className='absolute z-[65] h-3 w-10 fill-foreground/55'
          style={{ left: geo.c.x - 20, top: geo.c.y - 50 }}
        >
          <circle cx='9' cy='9' r='1.7' />
          <circle cx='20' cy='4.5' r='1.7' />
          <circle cx='31' cy='9' r='1.7' />
        </svg>
      )}
    </div>,
    root
  )
}
