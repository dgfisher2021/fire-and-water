import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** How Now Playing looks when its card is folded away. */
export type FoldedPlayer = 'bar' | 'mini'

/** What fills the screen behind everything. */
export type BackgroundStyle = 'artwork' | 'flow' | 'aurora'

type Prefs = {
  foldedPlayer: FoldedPlayer
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
      background: 'artwork',
      musicReactive: true,
      setFoldedPlayer: (foldedPlayer) => set({ foldedPlayer }),
      setBackground: (background) => set({ background }),
      setMusicReactive: (musicReactive) => set({ musicReactive }),
    }),
    {
      name: 'fw-prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ foldedPlayer, background, musicReactive }) => ({
        foldedPlayer,
        background,
        musicReactive,
      }),
    }
  )
)
