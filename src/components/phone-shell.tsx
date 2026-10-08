import type { ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'
import {
  Columns2,
  Disc3,
  Ellipsis,
  Pause,
  Play,
  ScrollText,
} from 'lucide-react'
import { MobileAppShell, useMobileShellRoot } from '@dust-ui/blocks'
import {
  MobileToastStack,
  useMobileToaster,
  type NavBottomProps,
} from '@dust-ui/ui'
import { toaster } from '@/lib/toaster'
import { comparePairFor, selectFocusTrack, usePlayer } from '@/store/player'
import { usePrefs } from '@/store/prefs'
import {
  MINI_PLAYER_GAP,
  MINI_PLAYER_H,
  useMiniPlayerVisible,
} from '@/hooks/use-mini-player'
import { usePulseVars } from '@/hooks/use-pulse'
import { MiniPlayer } from '@/components/mini-player'
import { RouterLink } from '@/components/router-link'
import { SongBackdrop } from '@/components/song-backdrop'

/**
 * A glow in the song's voice over the backdrop that swells with the bass.
 * Mounted inside the shell, where the root it writes the pulse onto exists
 * (--pulse-bass from usePulseVars; 0 when paused or under reduced motion).
 */
function PulseGlow() {
  const root = useMobileShellRoot()
  const musicReactive = usePrefs((s) => s.musicReactive)
  usePulseVars(musicReactive ? root : null)
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

/** The bottom nav: four tabs and the play toggle lifted in the middle. */
function useShellNav(): Omit<NavBottomProps, 'fixed'> {
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

  return {
    items: [
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
    ],
    activeKey: active,
    linkComponent: RouterLink,
    center: {
      icon: playing ? Pause : Play,
      label: playing ? 'Pause' : 'Play',
      size: 'lg',
      active: playing,
      onClick: () => toggle(loaded ?? focus),
      background:
        'linear-gradient(135deg, var(--track-bright), var(--track-deep))',
      color: 'var(--track-foreground)',
      // A lifted glow in the song's colour and a lit top edge.
      shadow:
        '0 10px 26px -6px var(--media-glow), 0 0 22px -2px var(--media-glow), inset 0 1px 0 color-mix(in oklab, var(--track-foreground) 30%, transparent)',
    },
    activeIndicator: 'capsule',
    labels: true,
  }
}

function ShellToasts() {
  const { toasts, dismiss } = useMobileToaster(toaster)
  return (
    <MobileToastStack toasts={toasts} onDismiss={dismiss} bottomOffset={96} />
  )
}

export type PhoneShellProps = {
  /** The active track id; drives the backdrop. */
  theme: string
  children: ReactNode
}

/**
 * The app's chrome on Dust UI's MobileAppShell: the song's backdrop under
 * film grain and the pulse glow, the screen, the bottom blur, the mini
 * player above the nav while a song is loaded, and in-frame toasts.
 */
export function PhoneShell({ theme, children }: PhoneShellProps) {
  const mini = useMiniPlayerVisible()
  return (
    <MobileAppShell
      nav={useShellNav()}
      backdrop={<SongBackdrop theme={theme} />}
      grain
      fade
      strip={mini ? MINI_PLAYER_H : undefined}
      overlay={
        <>
          {mini && (
            <div
              className='absolute inset-x-0 z-40 px-3'
              style={{
                bottom: `calc(var(--shell-nav) + ${MINI_PLAYER_GAP}px)`,
              }}
            >
              <MiniPlayer />
            </div>
          )}
          <ShellToasts />
        </>
      }
    >
      <PulseGlow />
      {children}
    </MobileAppShell>
  )
}
