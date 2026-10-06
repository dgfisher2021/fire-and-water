import type { CSSProperties, ReactNode } from 'react'
import { Pill } from '@dust-ui/ui'

export type TagPillProps = {
  /** CSS color on light surfaces (a song's deep tone); tints the wash and the text. */
  color: string
  /** CSS color on dark surfaces (the bright tone). Defaults to `color`. */
  colorDark?: string
  children: ReactNode
}

/** A `Pill` at the kit's smallest readable step, uppercase: a format or a source tag. */
export function TagPill({ color, colorDark = color, children }: TagPillProps) {
  return (
    <span
      className='contents [--tag:var(--tag-light)] dark:[--tag:var(--tag-dark)]'
      style={{ '--tag-light': color, '--tag-dark': colorDark } as CSSProperties}
    >
      <Pill
        color='var(--tag)'
        style={{
          fontSize: 'var(--mobile-text-2xs, 0.625rem)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Pill>
    </span>
  )
}
