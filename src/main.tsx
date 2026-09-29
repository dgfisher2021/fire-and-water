import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { registerSW } from 'virtual:pwa-register'
import { AppearanceProvider } from '@dust-ui/ui'
import { routeTree } from './routeTree.gen'
import './styles/index.css'

registerSW({ immediate: true })

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
