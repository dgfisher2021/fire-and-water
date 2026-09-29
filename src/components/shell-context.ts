import { createContext, useContext } from 'react'
import { useIsMobile } from '@dust-ui/ui'

/** The positioned screen root, for overlays that must pin inside it. */
export const ShellRootContext = createContext<HTMLElement | null>(null)
export const useShellRoot = () => useContext(ShellRootContext)

/** True when the app renders inside the desktop phone mockup. */
export const useFramed = () => !useIsMobile()
