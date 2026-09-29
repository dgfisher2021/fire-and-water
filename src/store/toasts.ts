import { create } from 'zustand'
import type { MobileToastItem, MobileToastKind } from '@dust-ui/ui'

type ToastState = {
  toasts: MobileToastItem[]
  push: (message: string, kind?: MobileToastKind) => void
  dismiss: (id: number) => void
}

const AUTO_DISMISS_MS = 3500

/** In-frame toasts for the MobileToastStack; callable from anywhere. */
export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (message, kind = 'success') => {
    const id = Date.now() + Math.random()
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }))
    window.setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS)
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
