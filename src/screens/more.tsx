import { CloudDownload, Download, Heart, Share2 } from 'lucide-react'
import {
  MobileListGroup,
  MobileListRow,
  MobilePageHeader,
  Pill,
} from '@dust-ui/ui'
import { ALBUM, TRACKS, TRACK_ORDER } from '@/data/tracks'
import { download, share } from '@/lib/share'
import { AppearanceButton } from '@/components/appearance-button'
import { Screen } from '@/components/screen'
import { useFramed } from '@/components/shell-context'

const DRIVE_TRACKS = TRACK_ORDER.filter((id) => TRACKS[id].driveLink)

export function MoreScreen() {
  const framed = useFramed()
  return (
    <Screen
      header={
        <MobilePageHeader
          eyebrow={ALBUM.artist}
          title={
            <span className='font-display text-[26px] font-normal'>More</span>
          }
          subtitle='Appearance, downloads and the story'
          statusBarInset={framed}
        />
      }
    >
      <div className='flex flex-col gap-5 px-4 pt-1'>
        <MobileListGroup
          label='Appearance'
          footer='Light or dark, a theme preset, neutrals, corner radius and density. The active song always colors the accent.'
        >
          <MobileListRow
            label='Theme and mode'
            value='Customize'
            trailing={<AppearanceButton />}
          />
        </MobileListGroup>

        <MobileListGroup
          label='Download'
          footer='The trilogy as M4A, the rest as MP3.'
        >
          {TRACK_ORDER.map((id) => (
            <MobileListRow
              key={id}
              icon={Download}
              label={TRACKS[id].title}
              value={TRACKS[id].voice}
              onClick={() => download(TRACKS[id].audioFile)}
            />
          ))}
        </MobileListGroup>

        <MobileListGroup label='Google Drive'>
          {DRIVE_TRACKS.map((id) => (
            <MobileListRow
              key={id}
              icon={CloudDownload}
              label={TRACKS[id].title}
              onClick={() =>
                window.open(TRACKS[id].driveLink, '_blank', 'noopener')
              }
            />
          ))}
        </MobileListGroup>

        <MobileListGroup label='Share'>
          <MobileListRow
            icon={Share2}
            label='Share the album'
            onClick={() =>
              void share({
                title: `${ALBUM.title} — ${ALBUM.artist}`,
                text: 'Songs exploring the bond between a brother and sister.',
                url: document.baseURI,
              })
            }
          />
        </MobileListGroup>

        <MobileListGroup label='About' footer={ALBUM.tagline}>
          <MobileListRow
            icon={Heart}
            color='var(--fire)'
            label='Written and performed by Dustin'
            value='2026'
          />
          {TRACK_ORDER.map((id) => (
            <MobileListRow
              key={id}
              label={TRACKS[id].title}
              value={<Pill color={`var(--${id})`}>{TRACKS[id].voice}</Pill>}
            />
          ))}
        </MobileListGroup>
      </div>
    </Screen>
  )
}
