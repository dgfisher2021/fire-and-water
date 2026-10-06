import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  BookOpen,
  CloudDownload,
  Download,
  ExternalLink,
  Heart,
  Share2,
} from 'lucide-react'
import {
  MobileListGroup,
  MobileListRow,
  MobilePageHeader,
  QRCode,
} from '@dust-ui/ui'
import sizes from '@/data/audio-sizes.json'
import { ALBUM, TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { audioFormat, formatBytes } from '@/lib/format'
import { download, share } from '@/lib/share'
import { useToasts } from '@/store/toasts'
import { AppearanceButton } from '@/components/appearance-button'
import { Screen } from '@/components/screen'
import { useFramed } from '@/components/shell-context'
import { SongPicker } from '@/components/song-picker'
import { TagPill } from '@/components/tag-pill'

const DRIVE_TRACKS = TRACK_ORDER.filter((id) => TRACKS[id].driveLink)

/** The album's front door, wherever the app is served from. */
const albumUrl = () =>
  new URL(import.meta.env.BASE_URL, window.location.origin).href

/** "M4A · 3.2 MB" as a format pill and a size, for a download row. */
function downloadDetail(id: TrackId) {
  const file = TRACKS[id].audioFile
  return (
    <span className='inline-flex items-center gap-2'>
      <TagPill color={`var(--${id}-deep)`} colorDark={`var(--${id})`}>
        {audioFormat(file)}
      </TagPill>
      {formatBytes(sizes[file as keyof typeof sizes])}
    </span>
  )
}

export function MoreScreen() {
  const framed = useFramed()
  const navigate = useNavigate()
  const [picking, setPicking] = useState<'download' | 'drive' | null>(null)

  return (
    <Screen
      header={
        <MobilePageHeader
          eyebrow={ALBUM.artist}
          title={
            <span className='font-display text-[26px] font-medium'>More</span>
          }
          subtitle='Appearance, sharing, downloads and the story'
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
          label='Share'
          footer='Scan the code to open the album on another phone.'
        >
          <MobileListRow
            icon={Share2}
            label='Share the album'
            onClick={() =>
              void share({
                title: `${ALBUM.title} — ${ALBUM.artist}`,
                text: 'Songs exploring the bond between a brother and sister.',
                url: albumUrl(),
              })
            }
          />
          <div className='flex justify-center py-4'>
            {/* Ink on paper in both modes: scanners want dark modules on a light ground. */}
            <div className='rounded-xl bg-background p-3 text-foreground shadow-[0_10px_28px_-18px_var(--track-glow)] dark:bg-foreground dark:text-background'>
              <QRCode value={albumUrl()} size={128} aria-label='Album link' />
            </div>
          </div>
        </MobileListGroup>

        <MobileListGroup
          label='Songs'
          footer='Each download is the recording as it was made. Now Playing’s menu offers the same for the open song, plus its lyrics file.'
        >
          <MobileListRow
            icon={Download}
            label='Download a song'
            value={`${TRACK_ORDER.length} songs`}
            onClick={() => setPicking('download')}
          />
          {DRIVE_TRACKS.length > 0 && (
            <MobileListRow
              icon={CloudDownload}
              label='Open in Google Drive'
              value={`${DRIVE_TRACKS.length} ${DRIVE_TRACKS.length === 1 ? 'song' : 'songs'}`}
              onClick={() => setPicking('drive')}
            />
          )}
        </MobileListGroup>

        <MobileListGroup label='About'>
          <MobileListRow
            icon={Heart}
            color='var(--fire)'
            label='Written and performed by Dustin'
            value='2026'
          />
          <MobileListRow
            icon={BookOpen}
            label='The story so far'
            value={`${TRACK_ORDER.length} songs`}
            onClick={() => void navigate({ to: '/story' })}
          />
        </MobileListGroup>
      </div>

      {picking === 'download' && (
        <SongPicker
          title='Download a song'
          detail={downloadDetail}
          trailing={
            <Download className='size-4 text-muted-foreground' aria-hidden />
          }
          onSelect={(id) => {
            download(TRACKS[id].audioFile)
            useToasts.getState().push(`Downloading ${TRACKS[id].title}`)
          }}
          onClose={() => setPicking(null)}
        />
      )}
      {picking === 'drive' && (
        <SongPicker
          title='Open in Google Drive'
          songs={DRIVE_TRACKS}
          trailing={
            <ExternalLink
              className='size-4 text-muted-foreground'
              aria-hidden
            />
          }
          onSelect={(id) =>
            window.open(TRACKS[id].driveLink, '_blank', 'noopener')
          }
          onClose={() => setPicking(null)}
        />
      )}
    </Screen>
  )
}
