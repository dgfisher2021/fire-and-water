import { useState, type CSSProperties, type ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'
import {
  Columns2,
  Disc3,
  Ellipsis,
  Pause,
  Play,
  ScrollText,
} from 'lucide-react'
import {
  DeviceFrame,
  MobileToastStack,
  NavBottom,
  ProgressiveBlur,
} from '@dust-ui/ui'
import { TRACKS, TRACK_ORDER } from '@/data/tracks'
import { selectFocusTrack, usePlayer } from '@/store/player'
import { useToasts } from '@/store/toasts'
import { MINI_PLAYER_H, useMiniPlayerVisible } from '@/hooks/use-mini-player'
import { AmbientImageBackdrop } from '@/components/ambient-image-backdrop'
import { MiniPlayer } from '@/components/mini-player'
import { RouterLink } from '@/components/router-link'
import { ShellRootContext, useFramed } from '@/components/shell-context'

const BACKDROPS = TRACK_ORDER.map((id) => ({ id, src: TRACKS[id].art.full }))

// NavBottom is 60px plus its safe area: the hardware inset on phones, 18px
// in the frame. Screens read `--shell-bottom` to clear the bar and the strip.
const NAV_H_PHONE = 'calc(60px + env(safe-area-inset-bottom))'
const NAV_H_FRAME = '78px'

function shellVars(framed: boolean, mini: boolean): CSSProperties {
  const nav = framed ? NAV_H_FRAME : NAV_H_PHONE
  return {
    '--shell-bottom': mini ? `calc(${nav} + ${MINI_PLAYER_H}px)` : nav,
  } as CSSProperties
}

/** A soft blur where content runs under the nav and the mini player. */
function ShellFade() {
  return (
    <div
      aria-hidden
      className='pointer-events-none absolute inset-x-0 bottom-0 z-30'
      style={{ height: 'calc(var(--shell-bottom) + 12px)' }}
    >
      <ProgressiveBlur side='bottom' blur={10} layers={4} />
    </div>
  )
}

/** The mini player, pinned just above the nav inside the positioned root. */
function ShellMini({ framed }: { framed: boolean }) {
  return (
    <div
      className='absolute inset-x-0 z-40 px-3'
      style={{ bottom: `calc(${framed ? NAV_H_FRAME : NAV_H_PHONE} + 6px)` }}
    >
      <MiniPlayer />
    </div>
  )
}

function ShellNav({ fixed }: { fixed: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const focus = usePlayer(selectFocusTrack)
  const loaded = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  const toggle = usePlayer((s) => s.toggle)
  const playing = status === 'playing' || status === 'loading'

  const active = pathname.startsWith('/lyrics')
    ? 'lyrics'
    : pathname.startsWith('/compare')
      ? 'compare'
      : pathname.startsWith('/more')
        ? 'more'
        : 'album'

  return (
    <NavBottom
      items={[
        { key: 'album', icon: Disc3, label: 'Album', href: '/' },
        {
          key: 'lyrics',
          icon: ScrollText,
          label: 'Lyrics',
          href: `/lyrics/${focus}`,
        },
        { key: 'compare', icon: Columns2, label: 'Compare', href: '/compare' },
        { key: 'more', icon: Ellipsis, label: 'More', href: '/more' },
      ]}
      activeKey={active}
      linkComponent={RouterLink}
      center={{
        icon: playing ? Pause : Play,
        onClick: () => toggle(loaded ?? focus),
        background:
          'linear-gradient(135deg, var(--track-bright), var(--track-deep))',
        color: 'var(--track-foreground)',
        shadow: '0 8px 22px var(--track-glow)',
      }}
      activePill
      labels
      fixed={fixed}
    />
  )
}

function ShellToasts() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)
  return (
    <MobileToastStack toasts={toasts} onDismiss={dismiss} bottomOffset={96} />
  )
}

export type PhoneShellProps = {
  /** The active track id; drives the artwork atmosphere. */
  theme: string
  children: ReactNode
}

/**
 * The app's chrome. On phones the screen fills the viewport with a fixed
 * NavBottom; from tablet up it sits inside a DeviceFrame floating over a
 * blurred, full-window version of the same artwork. Either way the screen
 * root is positioned so in-frame overlays (SheetAction, toasts) pin to it.
 */
export function PhoneShell({ theme, children }: PhoneShellProps) {
  const framed = useFramed()
  const mini = useMiniPlayerVisible()
  const [root, setRoot] = useState<HTMLElement | null>(null)

  if (!framed) {
    return (
      <ShellRootContext.Provider value={root}>
        <div
          ref={setRoot}
          className='relative flex h-dvh flex-col overflow-hidden'
          style={shellVars(false, mini)}
        >
          <AmbientImageBackdrop
            images={BACKDROPS}
            activeId={theme}
            className='absolute z-0'
          />
          {children}
          <ShellFade />
          {mini && <ShellMini framed={false} />}
          <ShellNav fixed />
          <ShellToasts />
        </div>
      </ShellRootContext.Provider>
    )
  }

  return (
    <ShellRootContext.Provider value={root}>
      <div className='relative flex h-dvh items-center justify-center overflow-hidden'>
        <AmbientImageBackdrop
          images={BACKDROPS}
          activeId={theme}
          drift={false}
          className='fixed z-0 scale-110 blur-2xl'
        />
        <div className='relative z-[1]'>
          <DeviceFrame
            fitMargin={48}
            fitMaxHeight='viewport'
            statusBarOverlay
            bottomNav={
              <>
                <ShellNav fixed={false} />
                <ShellToasts />
              </>
            }
          >
            <div
              ref={setRoot}
              className='absolute inset-0 flex flex-col'
              style={shellVars(true, mini)}
            >
              <AmbientImageBackdrop
                images={BACKDROPS}
                activeId={theme}
                className='absolute z-0'
              />
              {children}
              <ShellFade />
              {mini && <ShellMini framed />}
            </div>
          </DeviceFrame>
        </div>
      </div>
    </ShellRootContext.Provider>
  )
}
