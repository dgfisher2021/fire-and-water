import { createContext, useContext } from 'react'
import { useMediaQuery } from '@dust-ui/ui'

/** The positioned screen root, for overlays that must pin inside it. */
export const ShellRootContext = createContext<HTMLElement | null>(null)
export const useShellRoot = () => useContext(ShellRootContext)

// Wide and tall enough for the phone mockup; a phone turned sideways is wide
// but short, and keeps the fluid layout.
const FRAME_QUERY = '(min-width: 768px) and (min-height: 700px)'

/** True when the app renders inside the desktop phone mockup. */
export const useFramed = () => useMediaQuery(FRAME_QUERY)
