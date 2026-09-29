import type { ComponentPropsWithoutRef } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'

/**
 * Adapter for Dust UI `linkComponent` slots (href in, router Link out).
 * A query string in the href becomes the Link's `search` so the router
 * validates it (`/compare?left=fire&right=water`).
 */
export function RouterLink({
  href,
  ...props
}: ComponentPropsWithoutRef<'a'> & { href: string }) {
  const [to, query] = href.split('?')
  const search = query ? Object.fromEntries(new URLSearchParams(query)) : {}
  return (
    <Link
      {...props}
      to={to as LinkProps['to']}
      search={search as LinkProps['search']}
    />
  )
}
