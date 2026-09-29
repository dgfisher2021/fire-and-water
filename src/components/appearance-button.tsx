import { AppearanceDrawer, type ThemeOption } from '@dust-ui/ui'

// 'default' is the brand; explicit preview colors keep its card truthful
// while a preset is active on <html>.
const THEMES: ThemeOption[] = [
  {
    value: 'default',
    label: 'Fire & Water',
    preview: {
      background: 'oklch(0.15 0.025 265)',
      foreground: 'oklch(0.94 0.012 75)',
      primary: 'oklch(0.85 0.09 225)',
    },
  },
  { value: 'cool-slate', label: 'Cool slate' },
  { value: 'clean-slate', label: 'Clean slate' },
  { value: 'dark-teal', label: 'Dark teal' },
  { value: 'portal', label: 'Portal' },
]

/**
 * The appearance picker: mode, theme preset, neutrals, radius, density.
 * Accent and fonts are pinned (the active track owns the accent; the
 * brand faces are part of the album), so those sections stay hidden.
 */
export function AppearanceButton() {
  return (
    <AppearanceDrawer
      themes={THEMES}
      sections={['mode', 'theme', 'neutral', 'radius', 'density']}
    />
  )
}
