import { useNavigate } from '@tanstack/react-router'
import { Check, Cloudy, Image, Sparkles, Stars, Waves } from 'lucide-react'
import {
  Button,
  MobileListGroup,
  MobileListRow,
  MobilePageHeader,
  SegmentedControl,
  Switch,
} from '@dust-ui/ui'
import { ALBUM } from '@/data/tracks'
import type { VideoAspect } from '@/lib/lyric-video'
import {
  usePrefs,
  type BackgroundStyle,
  type FoldedPlayer,
  type VideoLength,
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
  {
    value: 'aurora',
    label: 'Aurora curtains',
    detail: 'Curtains of light in the song’s colours, lit by the bass',
    icon: Sparkles,
  },
  {
    value: 'nebula',
    label: 'Nebula mist',
    detail: 'Fog and drifting dust in 3D, from Dust UI 3D',
    icon: Cloudy,
  },
  {
    value: 'stars',
    label: 'Starfield',
    detail: 'Stars and gas clouds in 3D, drifting faster with the bass',
    icon: Stars,
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
  const videoAspect = usePrefs((s) => s.videoAspect)
  const setVideoAspect = usePrefs((s) => s.setVideoAspect)
  const videoLength = usePrefs((s) => s.videoLength)
  const setVideoLength = usePrefs((s) => s.setVideoLength)

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
          footer='What fills the screen behind the songs. The artwork is the default; the 3D ones load three.js when chosen and work the phone harder.'
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
        <MobileListGroup
          label='Lyric video'
          footer='Make one from the “…” menu on Now Playing: the art, the title and the sung lines over the song, recorded in your browser and ready to share.'
        >
          <MobileListRow
            label='Shape'
            trailing={
              <div className='w-[188px]'>
                <SegmentedControl
                  options={[
                    { value: '9:16', label: '9:16' },
                    { value: '1:1', label: '1:1' },
                    { value: '16:9', label: '16:9' },
                  ]}
                  value={videoAspect}
                  onChange={(v) => setVideoAspect(v as VideoAspect)}
                  height={44}
                />
              </div>
            }
          />
          <MobileListRow
            label='Length'
            trailing={
              <div className='w-[188px]'>
                <SegmentedControl
                  options={[
                    { value: '30', label: '30 s' },
                    { value: '60', label: '60 s' },
                    { value: 'full', label: 'Song' },
                  ]}
                  value={videoLength}
                  onChange={(v) => setVideoLength(v as VideoLength)}
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
