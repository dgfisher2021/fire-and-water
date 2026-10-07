import { MotionTextMorph } from '@dust-ui/motion'
import { cn } from '@/lib/utils'

export type TitleMorphProps = {
  children: string
  as: 'h1' | 'h2'
  /** Longest title, in characters, that still fits one line here. */
  maxChars: number
  className?: string
}

/**
 * A song title that morphs letter by letter when the song changes. The kit's
 * morph sets each letter as its own inline block, so a title that wraps would
 * break mid-word; a title longer than one line renders as text that wraps
 * between words and fades in instead.
 */
export function TitleMorph({
  children,
  as: Tag,
  maxChars,
  className,
}: TitleMorphProps) {
  if (children.length <= maxChars) {
    return (
      <MotionTextMorph as={Tag} className={className}>
        {children}
      </MotionTextMorph>
    )
  }
  return (
    <Tag
      key={children}
      className={cn(
        'animate-in duration-500 fade-in-0 motion-reduce:animate-none',
        className
      )}
    >
      {children}
    </Tag>
  )
}
