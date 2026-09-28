import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { registerSW } from 'virtual:pwa-register'
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
    <RouterProvider router={router} />
  </StrictMode>
)
