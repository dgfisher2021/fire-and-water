import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useFramed } from '@/components/shell-context'

export type ScreenProps = {
  /** A MobilePageHeader; gets the status-bar inset in the frame, safe-area on phones. */
  header?: ReactNode
  /** Wrap children in a hidden-scrollbar pane that clears the nav. Default true. */
  scroll?: boolean
  children: ReactNode
  className?: string
}

/** One app screen: header on top, content below, above the backdrop. */
export function Screen({
  header,
  scroll = true,
  children,
  className,
}: ScreenProps) {
  const framed = useFramed()
  return (
    <div
      data-slot='screen'
      className={cn('relative z-[1] flex min-h-0 flex-1 flex-col', className)}
    >
      <div className={cn('shrink-0', !framed && 'pt-safe')}>{header}</div>
      {scroll ? (
        <div className='no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-[calc(var(--shell-bottom)+36px)] transition-[padding] duration-300'>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  )
}
