import type { TrackId } from './tracks'

/** A Suno hook: a short portrait music-video clip for a song, in public/hooks/. */
export type Hook = {
  src: string
  /** Length in seconds. */
  duration: number
}

/** The songs that have a hook; the rest keep their still art. */
export const HOOKS: Partial<Record<TrackId, Hook>> = {
  beginning: { src: 'hooks/beginning.mp4', duration: 15 },
  devil: { src: 'hooks/devil.mp4', duration: 37 },
  node: { src: 'hooks/node.mp4', duration: 60 },
  plot: { src: 'hooks/plot.mp4', duration: 15 },
  bending: { src: 'hooks/bending.mp4', duration: 24 },
}

export const hookFor = (id: TrackId) => HOOKS[id]
