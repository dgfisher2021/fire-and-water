import type { LucideIcon } from 'lucide-react'
import type { Point } from './geometry'

export type FanActionId = 'shuffle' | 'back' | 'next' | 'repeat' | 'cover'

export type FanAction = {
  id: FanActionId
  label: string
  icon: LucideIcon
  /** Shuffle or repeat is on. */
  pressed?: boolean
}

/** What the fan shows about the song it acts on. */
export type FanNow = {
  title: string
  elapsed: number
  duration: number
  cover: string
}

/** Every look draws from these; each control carries `data-fan-control={id}`. */
export type FanViewProps = {
  open: boolean
  reduced: boolean
  /** The play button's center, in the fan layer's px. */
  center: Point
  /** Shuffle, back, next, repeat. */
  actions: FanAction[]
  hot: string | null
  scrubbing: boolean
  now: FanNow
  onAction: (id: FanActionId) => void
  onSeek: (fraction: number) => void
}
