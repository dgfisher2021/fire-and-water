import type { ReactNode } from 'react'
import { SectionHeader } from '@dust-ui/ui'

export type InsightPanelProps = {
  /** Chapter number in the eyebrow, e.g. "02". */
  marker: string
  /** Eyebrow label beside the number. */
  tag: string
  title: string
  description?: ReactNode
  /** End of the title row: a toggle, a count. */
  actions?: ReactNode
  children: ReactNode
}

/** One insight on the app's glass: a numbered editorial header, then the figure. */
export function InsightPanel({
  marker,
  tag,
  title,
  description,
  actions,
  children,
}: InsightPanelProps) {
  return (
    <section
      aria-label={title}
      className='flex flex-col gap-4 rounded-lg border border-border bg-card/85 p-4 backdrop-blur-md'
    >
      <SectionHeader
        size='sm'
        variant='display'
        marker={marker}
        tag={tag}
        title={
          <span className='text-[23px] leading-tight font-medium'>{title}</span>
        }
        description={
          description && (
            <span className='mt-1 block text-[13px] leading-snug'>
              {description}
            </span>
          )
        }
        actions={actions}
      />
      {children}
    </section>
  )
}
