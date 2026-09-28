import { create } from 'zustand'
import { TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { getAudio } from '@/lib/audio'

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused'

type PlayerState = {
  /** Track loaded in the audio element; null when nothing is loaded. */
  track: TrackId | null
  status: PlayerStatus
  currentTime: number
  duration: number
  /** Home artwork slide; follows the playing track. */
  carouselIndex: number
  /** Bumps when a track finishes, so views can advance the album. */
  endedCount: number
  /**
   * A track change asked for outside the UI (lock-screen prev/next). The
   * lyrics view follows it; `seq` distinguishes repeat requests.
   */
  requested: { track: TrackId; seq: number } | null

  setCarouselIndex: (index: number) => void
  play: (track: TrackId) => void
  pause: () => void
  toggle: (track: TrackId) => void
  seek: (seconds: number) => void
  stop: () => void
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
  endedCount: 0,
  requested: null,

  setCarouselIndex: (index) => set({ carouselIndex: index }),

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

  stop: () => {
    const audio = getAudio()
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    set({ track: null, status: 'idle', currentTime: 0, duration: 0 })
  },

  requestTrack: (track) => {
    get().play(track)
    set((s) => ({ requested: { track, seq: (s.requested?.seq ?? 0) + 1 } }))
  },

  _sync: (patch) => set(patch),
  _ended: () =>
    set((s) => ({
      status: 'paused',
      currentTime: s.duration,
      endedCount: s.endedCount + 1,
    })),
}))

export const selectProgress = (s: PlayerState) =>
  s.duration > 0 ? Math.min(1, s.currentTime / s.duration) : 0

/** Playing or buffering this track. */
export const selectIsActive = (track: TrackId) => (s: PlayerState) =>
  s.track === track && (s.status === 'playing' || s.status === 'loading')
