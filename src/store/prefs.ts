import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** How Now Playing looks when its card is folded away. */
export type FoldedPlayer = 'bar' | 'mini'

type Prefs = {
  foldedPlayer: FoldedPlayer
  setFoldedPlayer: (style: FoldedPlayer) => void
}

/** The listener's own choices, kept on this device. */
export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      foldedPlayer: 'bar',
      setFoldedPlayer: (foldedPlayer) => set({ foldedPlayer }),
    }),
    {
      name: 'fw-prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ foldedPlayer }) => ({ foldedPlayer }),
    }
  )
)
