import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { VideoAspect } from '@/lib/lyric-video'

/** How Now Playing looks when its card is folded away. */
export type FoldedPlayer = 'bar' | 'mini'

/** What fills the screen behind everything. */
export type BackgroundStyle = 'artwork' | 'flow' | 'aurora' | 'nebula' | 'stars'

/** How long a lyric video runs: 30 or 60 seconds, or the whole song. */
export type VideoLength = '30' | '60' | 'full'

type Prefs = {
  foldedPlayer: FoldedPlayer
  videoAspect: VideoAspect
  videoLength: VideoLength
  setVideoAspect: (aspect: VideoAspect) => void
  setVideoLength: (length: VideoLength) => void
  background: BackgroundStyle
  /** The background and the art glow breathe with the bass and the voice. */
  musicReactive: boolean
  setFoldedPlayer: (style: FoldedPlayer) => void
  setBackground: (style: BackgroundStyle) => void
  setMusicReactive: (on: boolean) => void
}

/** The listener's own choices, kept on this device. */
export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      foldedPlayer: 'bar',
      videoAspect: '9:16',
      videoLength: '30',
      setVideoAspect: (videoAspect) => set({ videoAspect }),
      setVideoLength: (videoLength) => set({ videoLength }),
      background: 'artwork',
      musicReactive: true,
      setFoldedPlayer: (foldedPlayer) => set({ foldedPlayer }),
      setBackground: (background) => set({ background }),
      setMusicReactive: (musicReactive) => set({ musicReactive }),
    }),
    {
      name: 'fw-prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: ({
        foldedPlayer,
        background,
        musicReactive,
        videoAspect,
        videoLength,
      }) => ({
        foldedPlayer,
        background,
        musicReactive,
        videoAspect,
        videoLength,
      }),
    }
  )
)
