import { Repeat1, Shuffle, type LucideIcon } from 'lucide-react'
import type { PlayMode } from '@/store/player'

type ModeToggle = Exclude<PlayMode, 'album'>

/** The two play-mode toggles: shuffle and repeat; off is album order. */
export const PLAY_MODE_TOGGLES: Record<
  ModeToggle,
  { icon: LucideIcon; label: string; on: string; off: string }
> = {
  shuffle: {
    icon: Shuffle,
    label: 'Shuffle',
    on: 'Shuffle on',
    off: 'Shuffle off',
  },
  repeat: {
    icon: Repeat1,
    label: 'Repeat this song',
    on: 'Repeating this song',
    off: 'Repeat off',
  },
}

/** Pressing shuffle or repeat: on switches to that mode, off back to album order. */
export function togglePlayMode(
  current: PlayMode,
  mode: ModeToggle
): { mode: PlayMode; message: string } {
  const on = current === mode
  const toggle = PLAY_MODE_TOGGLES[mode]
  return { mode: on ? 'album' : mode, message: on ? toggle.off : toggle.on }
}
