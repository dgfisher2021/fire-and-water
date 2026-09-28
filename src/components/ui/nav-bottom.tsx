import type * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavBottomItem = {
  key: string
  icon: LucideIcon
  label?: string
  /** Renders the tab as a real link (via `linkComponent`) instead of a button. */
  href?: string
  /**
   * Extra active keys this tab lights up for - e.g. the Assist tab staying
   * active while the chat or voice screen is open.
   */
  matchKeys?: string[]
}

export type NavBottomCenter = {
  icon: LucideIcon
  onClick: () => void
  /** Defaults to the primary token pair. */
  background?: string
  color?: string
  shadow?: string
}

export type NavBottomProps = {
  items: NavBottomItem[]
  activeKey?: string
  onSelect?: (key: string) => void
  /** Link element for tabs with an `href`, e.g. a router Link adapter. */
  linkComponent?: React.ElementType<
    React.ComponentPropsWithoutRef<'a'> & { href: string }
  >
  /** Bar background, top border, and active/inactive icon colors. All default to tokens. */
  bg?: string
  border?: string
  activeColor?: string
  inactiveColor?: string
  /** Show text labels beneath the icons. */
  labels?: boolean
  iconSize?: number
  /** Optional elevated center action (scan / AI). Splits items into two halves. */
  center?: NavBottomCenter
  /**
   * Tinted pill behind the active icon instead of the color-only default -
   * the bolder tab-bar idiom.
   */
  activePill?: boolean
  /**
   * Home-indicator safe area below the bar. The default 18 matches the
   * `DeviceFrame` mockup; on a real device pass
   * `'env(safe-area-inset-bottom)'` so the bar clears the hardware inset.
   */
  safeArea?: number | string
  /**
   * Pin the bar to the viewport bottom (position fixed) instead of its
   * positioned ancestor. The safe area then defaults to
   * `env(safe-area-inset-bottom)`.
   */
  fixed?: boolean
  /** Hide the bar at this breakpoint and up (phone-only navigation). */
  hideAbove?: 'md' | 'lg'
}

// Guideline-aligned: a ~56dp (Material) / ~49pt (iOS) bar with 44-48px touch
// targets, plus a home-indicator safe area below. One spec for every screen.
const BAR_H = 60

/**
 * The standard mobile bottom tab bar: a flush, blurred bar pinned to the
 * bottom of its positioned ancestor (the `DeviceFrame` screen) with a
 * consistent height + home safe area, 48px touch targets, color-only active
 * state (or an opt-in `activePill`), and an optional lifted center action
 * button. Colors default to the Dust UI token contract; pass explicit colors
 * for a bespoke palette.
 */
export function NavBottom({
  items,
  activeKey,
  onSelect,
  linkComponent: LinkComponent = 'a',
  bg = 'color-mix(in srgb, var(--card) 82%, transparent)',
  border = 'var(--border)',
  activeColor = 'var(--primary)',
  inactiveColor = 'var(--muted-foreground)',
  labels = false,
  iconSize = 21,
  center,
  activePill = false,
  safeArea: safeAreaProp,
  fixed = false,
  hideAbove,
}: NavBottomProps) {
  const safeArea = safeAreaProp ?? (fixed ? 'env(safe-area-inset-bottom)' : 18)
  const splitAt = center ? Math.floor(items.length / 2) : items.length
  const left = items.slice(0, splitAt)
  const right = center ? items.slice(splitAt) : []
  const CenterIcon = center?.icon

  const renderItem = (it: NavBottomItem) => {
    const Icon = it.icon
    const active =
      it.key === activeKey ||
      (activeKey !== undefined && !!it.matchKeys?.includes(activeKey))
    const color = active ? activeColor : inactiveColor
    // Links and buttons share one prop shape here (href or type, onClick, style).
    const Tag = (it.href ? LinkComponent : 'button') as React.ElementType<
      React.ComponentPropsWithoutRef<'a'> & { href?: string; type?: 'button' }
    >
    return (
      <Tag
        key={it.key}
        {...(it.href ? { href: it.href } : { type: 'button' })}
        onClick={() => onSelect?.(it.key)}
        aria-label={it.label ?? it.key}
        aria-current={active ? 'page' : undefined}
        style={{
          flex: 1,
          minHeight: 48,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color,
          textDecoration: 'none',
          transition: 'color 0.2s ease',
          fontFamily: 'inherit',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: activePill ? 46 : undefined,
            height: activePill ? 28 : undefined,
            borderRadius: activePill ? 14 : undefined,
            background:
              activePill && active
                ? `color-mix(in srgb, ${activeColor} 16%, transparent)`
                : 'transparent',
            transition: 'background 0.2s ease',
          }}
        >
          <Icon
            size={iconSize}
            strokeWidth={activePill && active ? 2.3 : undefined}
          />
        </span>
        {labels && it.label && (
          <span
            style={{
              fontSize: '0.5rem',
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.02em',
            }}
          >
            {it.label}
          </span>
        )}
      </Tag>
    )
  }

  return (
    <div
      data-slot='nav-bottom'
      // display lives in the class so the hideAbove breakpoint can override it
      className={cn(
        'flex',
        hideAbove === 'md' && 'md:hidden',
        hideAbove === 'lg' && 'lg:hidden'
      )}
      style={{
        position: fixed ? 'fixed' : 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height:
          typeof safeArea === 'number'
            ? BAR_H + safeArea
            : `calc(${BAR_H}px + ${safeArea})`,
        paddingBottom: safeArea,
        background: bg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${border}`,
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: fixed ? 50 : 30,
      }}
    >
      {left.map(renderItem)}
      {center && CenterIcon && (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={center.onClick}
            aria-label='Primary action'
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              marginTop: -22,
              border: 'none',
              cursor: 'pointer',
              background: center.background ?? 'var(--primary)',
              color: center.color ?? 'var(--primary-foreground)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: center.shadow ?? '0 8px 22px rgba(0, 0, 0, 0.25)',
              flexShrink: 0,
            }}
          >
            <CenterIcon size={24} />
          </button>
        </div>
      )}
      {right.map(renderItem)}
    </div>
  )
}
