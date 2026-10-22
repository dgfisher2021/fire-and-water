import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { registerSW } from 'virtual:pwa-register'
import { AppearanceProvider } from '@dust-ui/ui'
import { startDebug } from '@/lib/debug'
import { usePlayer } from '@/store/player'
import { usePrefs } from '@/store/prefs'
import { routeTree } from './routeTree.gen'
import './styles/index.css'

registerSW({ immediate: true })
// The song and playhead, then what else was on screen when the log line was
// written: the background, the route, and how many videos were mounted.
startDebug(() => {
  const s = usePlayer.getState()
  const p = usePrefs.getState()
  return `${s.track ?? '-'} ${s.status} t=${s.currentTime.toFixed(1)} bg=${p.background} at=${location.pathname} video=${document.querySelectorAll('video').length}`
})

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: false,
  basepath: import.meta.env.BASE_URL.replace(/\/$/, '') || undefined,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* The storage key must match the pre-paint script in index.html. */}
    <AppearanceProvider
      storageKey='fire-and-water-appearance'
      defaults={{ theme: 'default', themeMode: 'dark', borderRadius: 1 }}
    >
      <RouterProvider router={router} />
    </AppearanceProvider>
  </StrictMode>
)
