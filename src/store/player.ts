import { create } from 'zustand'
import {
  TRACKS,
  TRACK_ORDER,
  adjacentTrack,
  comparePartner,
  isLastTrack,
  type TrackId,
} from '@/data/tracks'
import { getAudio } from '@/lib/audio'

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused'

export type ComparePair = { left: TrackId; right: TrackId }

/** What follows a finished song: the next one, the same one again, or any other. */
export const PLAY_MODES = ['album', 'repeat', 'shuffle'] as const
export type PlayMode = (typeof PLAY_MODES)[number]

/** The song to play after `track` ends in `mode`; null when the album is over. */
export function nextAfterEnd(
  track: TrackId,
  mode: PlayMode,
  random: () => number = Math.random
): TrackId | null {
  if (mode === 'repeat') return track
  if (mode === 'shuffle') {
    const others = TRACK_ORDER.filter((id) => id !== track)
    return others[
      Math.min(others.length - 1, Math.floor(random() * others.length))
    ]
  }
  return isLastTrack(track) ? null : adjacentTrack(track, 1)
}

type PlayerState = {
  /** Track loaded in the audio element; null when nothing is loaded. */
  track: TrackId | null
  status: PlayerStatus
  currentTime: number
  duration: number
  /** Album artwork slide; follows the playing track. */
  carouselIndex: number
  /**
   * A track change asked for outside the current screen (lock screen,
   * album play-through). The lyrics screen follows it; `seq` distinguishes
   * repeat requests.
   */
  requested: { track: TrackId; seq: number } | null
  /** The last pair the Compare screen showed; the tab reopens it while it still holds the focus track. */
  comparePair: ComparePair | null
  playMode: PlayMode

  setCarouselIndex: (index: number) => void
  setComparePair: (pair: ComparePair) => void
  cyclePlayMode: () => void
  play: (track: TrackId) => void
  pause: () => void
  toggle: (track: TrackId) => void
  seek: (seconds: number) => void
  requestTrack: (track: TrackId) => void

  /** Engine-only: mirror element events into state. */
  _sync: (
    patch: Partial<Pick<PlayerState, 'status' | 'currentTime' | 'duration'>>
  ) => void
  _ended: () => void
}

export const usePlayer = create<PlayerState>()((set, get) => ({
  track: null,
  status: 'idle',
  currentTime: 0,
  duration: 0,
  carouselIndex: 0,
  requested: null,
  comparePair: null,
  playMode: 'album',

  setCarouselIndex: (index) => set({ carouselIndex: index }),
  setComparePair: (pair) => set({ comparePair: pair }),
  cyclePlayMode: () =>
    set((s) => ({
      playMode:
        PLAY_MODES[(PLAY_MODES.indexOf(s.playMode) + 1) % PLAY_MODES.length],
    })),

  play: (track) => {
    const audio = getAudio()
    if (get().track !== track) {
      audio.src = TRACKS[track].audioFile
      set({
        track,
        currentTime: 0,
        duration: TRACKS[track].duration,
        status: 'loading',
        carouselIndex: TRACK_ORDER.indexOf(track),
      })
    }
    void audio.play().catch(() => set({ status: 'paused' }))
  },

  pause: () => getAudio().pause(),

  toggle: (track) => {
    const state = get()
    if (state.track === track && state.status === 'playing') state.pause()
    else state.play(track)
  },

  seek: (seconds) => {
    const audio = getAudio()
    const duration = audio.duration || get().duration
    const time = Math.min(Math.max(0, seconds), duration)
    audio.currentTime = time
    set({ currentTime: time })
  },

  requestTrack: (track) => {
    get().play(track)
    set((s) => ({ requested: { track, seq: (s.requested?.seq ?? 0) + 1 } }))
  },

  _sync: (patch) => set(patch),
  // A finished track hands off to whatever the play mode says comes next.
  _ended: () => {
    const { track, playMode, requestTrack, seek, play } = get()
    const next = track ? nextAfterEnd(track, playMode) : null
    if (next === null)
      set((s) => ({ status: 'paused', currentTime: s.duration }))
    else if (next === track) {
      seek(0)
      play(next)
    } else requestTrack(next)
  },
}))

/** Playhead as 0 to 1, in thousandths so subscribers re-render a few times a second, not every frame. */
export const selectProgress = (s: PlayerState) =>
  s.duration > 0
    ? Math.round(Math.min(1, s.currentTime / s.duration) * 1000) / 1000
    : 0

/** Playing or buffering this track. */
export const selectIsActive = (track: TrackId) => (s: PlayerState) =>
  s.track === track && (s.status === 'playing' || s.status === 'loading')

/** The track the Lyrics tab should open: what is loaded, else the slide. */
export const selectFocusTrack = (s: PlayerState) =>
  s.track ?? TRACK_ORDER[s.carouselIndex]

/**
 * The pair the Compare tab should open: the last one while it still holds
 * the focus track, else the focus track and its partner. A plain function
 * (it builds an object) rather than a store selector.
 */
export const comparePairFor = (
  focus: TrackId,
  last: ComparePair | null
): ComparePair =>
  last && (last.left === focus || last.right === focus)
    ? last
    : { left: focus, right: comparePartner(focus) }
