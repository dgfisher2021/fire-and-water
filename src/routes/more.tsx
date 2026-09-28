import { createFileRoute } from '@tanstack/react-router'
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
          footer='M4A audio, 190 to 400 seconds each.'
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
          {TRACK_ORDER.map((id) => (
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
                text: 'Three original songs exploring the bond between a brother and sister.',
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
            value='March 2026'
          />
          <MobileListRow
            label='Pencil and Pen'
            value={<Pill color='var(--pencil)'>Dustin</Pill>}
          />
          <MobileListRow
            label='Fire and Water'
            value={<Pill color='var(--fire)'>Dustin</Pill>}
          />
          <MobileListRow
            label='Water and Fire'
            value={<Pill color='var(--water)'>as Alex</Pill>}
          />
        </MobileListGroup>
      </div>
    </Screen>
  )
}

export const Route = createFileRoute('/more')({
  component: MoreScreen,
})
