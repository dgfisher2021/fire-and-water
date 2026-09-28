import * as React from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react'
import { cn } from '@/lib/utils'

// Forked from @dust-ui-source/motion-tilt. Deltas (recorded in
// dust-ui/specs): pointer events instead of mouse events, touch ignored so
// a finger swipe never tilts, and `transformPerspective` so the rotation
// actually has depth (a `perspective` on the rotated element itself is inert).

export type MotionTiltProps = {
  children: React.ReactNode
  className?: string
  /** Maximum rotation in degrees on each axis. */
  rotation?: number
  /** Spring stiffness. Higher = snappier. */
  stiffness?: number
}

export function MotionTilt({
  children,
  className,
  rotation = 12,
  stiffness = 200,
}: MotionTiltProps) {
  const reducedMotion = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness, damping: 20 })
  const sy = useSpring(y, { stiffness, damping: 20 })
  const rx = useTransform(sy, [-0.5, 0.5], [rotation, -rotation])
  const ry = useTransform(sx, [-0.5, 0.5], [-rotation, rotation])

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // A finger is scrolling or swiping, not hovering.
    if (e.pointerType === 'touch') return
    const rect = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleLeave = () => {
    x.set(0)
    y.set(0)
  }

  // Reduced motion: no pointer tracking, children sit flat.
  if (reducedMotion) {
    return <div className={cn('relative', className)}>{children}</div>
  }

  return (
    <motion.div
      className={cn('relative', className)}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{
        rotateX: rx,
        rotateY: ry,
        transformStyle: 'preserve-3d',
        transformPerspective: 800,
      }}
    >
      {children}
    </motion.div>
  )
}
