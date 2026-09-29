import type { ComponentPropsWithoutRef } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'

/** Adapter for Dust UI `linkComponent` slots (href in, router Link out). */
export function RouterLink({
  href,
  ...props
}: ComponentPropsWithoutRef<'a'> & { href: string }) {
  return <Link {...props} to={href as LinkProps['to']} />
}
