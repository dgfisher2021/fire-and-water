import * as React from 'react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
  type Transition,
} from 'motion/react'
import { cn } from '@/lib/utils'

// Forked from @dust-ui-source/motion-carousel. Deltas (recorded in
// dust-ui/specs): a controlled `index`, a `variant='fade'` crossfade, the
// autoplay timer restarts after every change, and `dotClassName` on the
// indicators.

type MotionCarouselContextValue = {
  index: number
  count: number
  setCount: (n: number) => void
  direction: number
  prev: () => void
  next: () => void
  goTo: (i: number) => void
  transition: Transition
  swipe: boolean
  variant: 'slide' | 'fade'
}

const MotionCarouselContext =
  React.createContext<MotionCarouselContextValue | null>(null)

function useMotionCarousel() {
  const ctx = React.useContext(MotionCarouselContext)
  if (!ctx) {
    throw new Error(
      'MotionCarousel sub-components must be used inside <MotionCarousel>'
    )
  }
  return ctx
}

export type MotionCarouselProps = {
  children: React.ReactNode
  /** Controlled slide; pair with onIndexChange. Omit for uncontrolled. */
  index?: number
  defaultIndex?: number
  className?: string
  transition?: Transition
  /** Auto-advance interval in ms. Undefined or 0 disables autoplay. */
  autoplayInterval?: number
  /** Suspend autoplay while hovered or focused. Default true. */
  pauseOnHover?: boolean
  /** Enable drag/touch swipe between slides. Default false. */
  swipe?: boolean
  /** `slide` pushes the next slide in from the side; `fade` crossfades in place. */
  variant?: 'slide' | 'fade'
  onIndexChange?: (index: number) => void
}

const SLIDE_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 32,
}
const FADE_TRANSITION: Transition = { duration: 1.2, ease: 'easeInOut' }

export const MotionCarousel = function MotionCarousel({
  children,
  index: controlledIndex,
  defaultIndex = 0,
  className,
  transition,
  autoplayInterval,
  pauseOnHover = true,
  swipe = false,
  variant = 'slide',
  onIndexChange,
}: MotionCarouselProps) {
  const [count, setCount] = React.useState(0)
  const [uncontrolledIndex, setUncontrolledIndex] = React.useState(defaultIndex)
  const [direction, setDirection] = React.useState(1)
  const [interactionPaused, setInteractionPaused] = React.useState(false)
  const reducedMotion = useReducedMotion()

  const controlled = controlledIndex !== undefined
  const index = controlled ? controlledIndex : uncontrolledIndex
  const resolvedTransition =
    transition ?? (variant === 'fade' ? FADE_TRANSITION : SLIDE_TRANSITION)

  const setIndex = React.useCallback(
    (next: number, dir: number) => {
      setDirection(dir)
      if (!controlled) setUncontrolledIndex(next)
      onIndexChange?.(next)
    },
    [controlled, onIndexChange]
  )
  const goTo = React.useCallback(
    (i: number) => setIndex(i, i > index ? 1 : -1),
    [setIndex, index]
  )
  const next = React.useCallback(() => {
    if (count > 0) setIndex((index + 1) % count, 1)
  }, [setIndex, index, count])
  const prev = React.useCallback(() => {
    if (count > 0) setIndex((index - 1 + count) % count, -1)
  }, [setIndex, index, count])

  // Autoplay: suspended under OS reduced-motion, during hover/focus (when
  // pauseOnHover), and with fewer than two slides. `next` changes with the
  // index, so the timer restarts after every change, manual or automatic.
  const autoplayActive =
    !!autoplayInterval &&
    autoplayInterval > 0 &&
    !reducedMotion &&
    !(pauseOnHover && interactionPaused) &&
    count > 1
  React.useEffect(() => {
    if (!autoplayActive) return
    const id = window.setInterval(next, autoplayInterval)
    return () => window.clearInterval(id)
  }, [autoplayActive, autoplayInterval, next])

  const ctx = React.useMemo(
    () => ({
      index,
      count,
      setCount,
      direction,
      next,
      prev,
      goTo,
      transition: resolvedTransition,
      swipe,
      variant,
    }),
    [
      index,
      count,
      direction,
      next,
      prev,
      goTo,
      resolvedTransition,
      swipe,
      variant,
    ]
  )

  const pauseHandlers =
    autoplayInterval && pauseOnHover
      ? {
          onPointerEnter: () => setInteractionPaused(true),
          onPointerLeave: () => setInteractionPaused(false),
          onFocus: () => setInteractionPaused(true),
          onBlur: (e: React.FocusEvent<HTMLDivElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setInteractionPaused(false)
            }
          },
        }
      : {}

  return (
    <MotionCarouselContext.Provider value={ctx}>
      <div
        data-slot='motion-carousel'
        data-variant={variant}
        role='group'
        aria-roledescription='carousel'
        className={cn('relative', className)}
        {...pauseHandlers}
      >
        {children}
      </div>
    </MotionCarouselContext.Provider>
  )
}
MotionCarousel.displayName = 'MotionCarousel'

const SWIPE_OFFSET_THRESHOLD = 50
const SWIPE_VELOCITY_THRESHOLD = 400

const SLIDE_VARIANTS = {
  enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
}
const FADE_VARIANTS = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
}

export function MotionCarouselContent({
  children,
  className,
}: {
  children: React.ReactNode[]
  className?: string
}) {
  const { index, direction, transition, setCount, swipe, next, prev, variant } =
    useMotionCarousel()
  React.useEffect(() => {
    setCount(children.length)
  }, [children.length, setCount])

  const onDragEnd = React.useCallback(
    (_: unknown, info: PanInfo) => {
      const { offset, velocity } = info
      if (
        offset.x < -SWIPE_OFFSET_THRESHOLD ||
        velocity.x < -SWIPE_VELOCITY_THRESHOLD
      ) {
        next()
      } else if (
        offset.x > SWIPE_OFFSET_THRESHOLD ||
        velocity.x > SWIPE_VELOCITY_THRESHOLD
      ) {
        prev()
      }
    },
    [next, prev]
  )

  const fade = variant === 'fade'

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      {/* Fade stacks the outgoing and incoming slides so they overlap. */}
      <AnimatePresence
        mode={fade ? 'sync' : 'popLayout'}
        initial={false}
        custom={direction}
      >
        <motion.div
          key={index}
          custom={direction}
          variants={fade ? FADE_VARIANTS : SLIDE_VARIANTS}
          initial='enter'
          animate='center'
          exit='exit'
          transition={transition}
          className={fade ? 'absolute inset-0' : undefined}
          {...(swipe
            ? {
                drag: 'x' as const,
                dragConstraints: { left: 0, right: 0 },
                dragElastic: 0.15,
                onDragEnd,
              }
            : {})}
        >
          {children[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
MotionCarouselContent.displayName = 'MotionCarouselContent'

export function MotionCarouselPrevious({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { prev } = useMotionCarousel()
  return (
    <button
      type='button'
      onClick={prev}
      className={cn(
        'absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-full border bg-card p-2 text-foreground transition-colors hover:bg-accent',
        className
      )}
      aria-label='Previous slide'
    >
      {children}
    </button>
  )
}
MotionCarouselPrevious.displayName = 'MotionCarouselPrevious'

export function MotionCarouselNext({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { next } = useMotionCarousel()
  return (
    <button
      type='button'
      onClick={next}
      className={cn(
        'absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded-full border bg-card p-2 text-foreground transition-colors hover:bg-accent',
        className
      )}
      aria-label='Next slide'
    >
      {children}
    </button>
  )
}
MotionCarouselNext.displayName = 'MotionCarouselNext'

export function MotionCarouselIndicators({
  className,
  dotClassName,
}: {
  className?: string
  /** Restyles each dot; `data-active:` targets the active one. */
  dotClassName?: string
}) {
  const { index, count, goTo } = useMotionCarousel()
  return (
    <div
      className={cn(
        'absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-2',
        className
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type='button'
          onClick={() => goTo(i)}
          aria-label={`Go to slide ${i + 1}`}
          aria-current={i === index}
          data-active={i === index || undefined}
          className={cn(
            'h-1.5 w-4 rounded-full transition-colors',
            i === index ? 'bg-primary' : 'bg-muted-foreground/40',
            dotClassName
          )}
        />
      ))}
    </div>
  )
}
MotionCarouselIndicators.displayName = 'MotionCarouselIndicators'
