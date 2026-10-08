import { useState, type ReactNode } from 'react'
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
  AmbientImageBackdrop,
  DeviceFrame,
  GrainOverlay,
  MobileToastStack,
  NavBottom,
  ProgressiveBlur,
  useShellInsets,
} from '@dust-ui/ui'
import { comparePairFor, selectFocusTrack, usePlayer } from '@/store/player'
import { usePrefs } from '@/store/prefs'
import { useToasts } from '@/store/toasts'
import { useBackdropImages } from '@/hooks/use-backdrop-images'
import {
  MINI_PLAYER_GAP,
  MINI_PLAYER_H,
  useMiniPlayerVisible,
} from '@/hooks/use-mini-player'
import { usePulseVars } from '@/hooks/use-pulse'
import { MiniPlayer } from '@/components/mini-player'
import { RouterLink } from '@/components/router-link'
import { ShellRootContext, useFramed } from '@/components/shell-context'
import { SongBackdrop } from '@/components/song-backdrop'

// Film grain over the artwork, faint enough to read as paper, not noise.
const GRAIN = 0.05

/**
 * A glow in the song's voice over the artwork that swells with the bass
 * (--pulse-bass from usePulseVars; 0 when paused or under reduced motion).
 */
function PulseGlow() {
  return (
    <div
      aria-hidden
      data-slot='pulse-glow'
      className='pointer-events-none absolute inset-0 z-0 transition-opacity duration-150 ease-out'
      style={{
        background:
          'radial-gradient(ellipse 85% 65% at 50% 38%, var(--track-glow), transparent 72%)',
        opacity: 'calc(var(--pulse-bass, 0) * 0.6)',
      }}
    />
  )
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
function ShellMini() {
  return (
    <div
      className='absolute inset-x-0 z-40 px-3'
      style={{ bottom: `calc(var(--shell-nav) + ${MINI_PLAYER_GAP}px)` }}
    >
      <MiniPlayer />
    </div>
  )
}

function ShellNav({ fixed }: { fixed: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const focus = usePlayer(selectFocusTrack)
  const pair = comparePairFor(
    focus,
    usePlayer((s) => s.comparePair)
  )
  const loaded = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  const toggle = usePlayer((s) => s.toggle)
  const playing = status === 'playing' || status === 'loading'

  // The tap-to-time tool lives with the lyrics.
  const active =
    pathname.startsWith('/lyrics') || pathname.startsWith('/time')
      ? 'lyrics'
      : pathname.startsWith('/compare')
        ? 'compare'
        : pathname.startsWith('/more') || pathname.startsWith('/settings')
          ? 'more'
          : 'album'

  return (
    <NavBottom
      items={[
        { key: 'album', icon: Disc3, label: 'Songs', href: '/' },
        {
          key: 'lyrics',
          icon: ScrollText,
          label: 'Lyrics',
          href: `/lyrics/${focus}`,
        },
        {
          key: 'compare',
          icon: Columns2,
          label: 'Compare',
          href: `/compare?left=${pair.left}&right=${pair.right}`,
        },
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
        shadow: 'var(--nav-center-glow)',
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
  // --shell-nav and --shell-bottom on the root; screens pad by the latter.
  const insets = useShellInsets({
    framed,
    strip: mini ? MINI_PLAYER_H : undefined,
  })
  const [root, setRoot] = useState<HTMLElement | null>(null)
  const backdrops = useBackdropImages(theme)
  const musicReactive = usePrefs((s) => s.musicReactive)
  usePulseVars(musicReactive ? root : null)

  if (!framed) {
    return (
      <ShellRootContext.Provider value={root}>
        <div
          ref={setRoot}
          className='relative flex h-dvh flex-col overflow-hidden'
          style={insets.style}
        >
          {/* Sized to the large viewport so the URL bar showing or hiding
              never re-crops the art; no drift, so it never rescales. */}
          <SongBackdrop theme={theme} className='fixed bottom-auto h-lvh' />
          <GrainOverlay opacity={GRAIN} />
          <PulseGlow />
          {children}
          <ShellFade />
          {mini && <ShellMini />}
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
          images={backdrops}
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
              style={insets.style}
            >
              <SongBackdrop theme={theme} />
              <GrainOverlay opacity={GRAIN} />
              <PulseGlow />
              {children}
              <ShellFade />
              {mini && <ShellMini />}
            </div>
          </DeviceFrame>
        </div>
      </div>
    </ShellRootContext.Provider>
  )
}
