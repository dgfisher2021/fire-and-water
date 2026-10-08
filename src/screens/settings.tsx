import { useNavigate } from '@tanstack/react-router'
import { Check, Image, Waves } from 'lucide-react'
import {
  Button,
  MobileListGroup,
  MobileListRow,
  MobilePageHeader,
  SegmentedControl,
  Switch,
} from '@dust-ui/ui'
import { ALBUM } from '@/data/tracks'
import {
  usePrefs,
  type BackgroundStyle,
  type FoldedPlayer,
} from '@/store/prefs'
import { AppearanceButton } from '@/components/appearance-button'
import { Screen } from '@/components/screen'
import { useFramed } from '@/components/shell-context'

/** Every background the app can draw, in the order the list shows them. */
const BACKGROUNDS: {
  value: BackgroundStyle
  label: string
  detail: string
  icon: typeof Image
}[] = [
  {
    value: 'artwork',
    label: 'Artwork',
    detail: 'The song’s cover, full-bleed and still',
    icon: Image,
  },
  {
    value: 'flow',
    label: 'Flowing colour',
    detail: 'A drifting field and a glow in the song’s colour',
    icon: Waves,
  },
]

/**
 * Everything the listener can set, kept on this device: theme and mode,
 * what fills the background and whether it moves with the music, and how
 * Now Playing looks with its card put away.
 */
export function SettingsScreen() {
  const framed = useFramed()
  const navigate = useNavigate()
  const background = usePrefs((s) => s.background)
  const setBackground = usePrefs((s) => s.setBackground)
  const musicReactive = usePrefs((s) => s.musicReactive)
  const setMusicReactive = usePrefs((s) => s.setMusicReactive)
  const foldedPlayer = usePrefs((s) => s.foldedPlayer)
  const setFoldedPlayer = usePrefs((s) => s.setFoldedPlayer)

  return (
    <Screen
      header={
        <MobilePageHeader
          eyebrow={ALBUM.artist}
          title={
            <span className='font-display text-[26px] font-medium'>
              Settings
            </span>
          }
          subtitle='Kept on this device'
          trailing={
            <Button
              variant='ghost'
              onClick={() => void navigate({ to: '/more' })}
              className='rounded-md bg-card/60 px-3 text-[13px] backdrop-blur-md'
            >
              Done
            </Button>
          }
          statusBarInset={framed}
        />
      }
    >
      <div className='flex flex-col gap-5 px-4 pt-1'>
        <MobileListGroup
          label='Appearance'
          footer='Light or dark, a theme preset, neutrals, corner radius and density. The song playing always colours the accent.'
        >
          <MobileListRow
            label='Theme and mode'
            value='Customize'
            trailing={<AppearanceButton />}
          />
        </MobileListGroup>

        <MobileListGroup
          label='Background'
          footer='What fills the screen behind the songs. The artwork is the default.'
        >
          {BACKGROUNDS.map((b) => (
            <MobileListRow
              key={b.value}
              icon={b.icon}
              label={b.label}
              value={
                <span className='block max-w-[180px] truncate'>{b.detail}</span>
              }
              aria-pressed={background === b.value}
              onClick={() => setBackground(b.value)}
              trailing={
                background === b.value ? (
                  <Check className='size-4 text-primary' aria-label='Chosen' />
                ) : (
                  <span className='size-4' />
                )
              }
            />
          ))}
        </MobileListGroup>

        <MobileListGroup
          label='Music'
          footer='While a song plays, the background glow swells with the bass and the art’s glow breathes with the voice. Always off with reduced motion.'
        >
          <MobileListRow
            label='Move with the music'
            trailing={
              <Switch
                checked={musicReactive}
                onCheckedChange={setMusicReactive}
                aria-label='Move with the music'
              />
            }
          />
        </MobileListGroup>

        <MobileListGroup
          label='Now Playing'
          footer='How Now Playing looks with its card put away: the waveform you can scrub, or the mini player from the Songs tab.'
        >
          <MobileListRow
            label='Folded player'
            trailing={
              <div className='w-[188px]'>
                <SegmentedControl
                  options={[
                    { value: 'bar', label: 'Waveform' },
                    { value: 'mini', label: 'Mini player' },
                  ]}
                  value={foldedPlayer}
                  onChange={(v) => setFoldedPlayer(v as FoldedPlayer)}
                  // Tall enough for the shell's 44px touch targets, so the
                  // labels centre in the thumb.
                  height={44}
                />
              </div>
            }
          />
        </MobileListGroup>
      </div>
    </Screen>
  )
}
