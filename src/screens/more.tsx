import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  BookOpen,
  CloudDownload,
  Download,
  ExternalLink,
  Share2,
} from 'lucide-react'
import {
  MobileListGroup,
  MobileListRow,
  MobilePageHeader,
  QRCode,
  SegmentedControl,
} from '@dust-ui/ui'
import sizes from '@/data/audio-sizes.json'
import { ALBUM, TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { audioFormat, formatBytes } from '@/lib/format'
import { download, share } from '@/lib/share'
import { usePrefs, type FoldedPlayer } from '@/store/prefs'
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
  const foldedPlayer = usePrefs((s) => s.foldedPlayer)
  const setFoldedPlayer = usePrefs((s) => s.setFoldedPlayer)

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
          footer='Light or dark, a theme preset, neutrals, corner radius and density; the active song always colors the accent. The folded player is how Now Playing looks with its card put away: the waveform you can scrub, or the mini player from the Songs tab.'
        >
          <MobileListRow
            label='Theme and mode'
            value='Customize'
            trailing={<AppearanceButton />}
          />
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
          label='Share'
          footer='Point a camera at the code to open the album on another phone, or tap the row to send the link.'
        >
          <button
            type='button'
            onClick={() =>
              void share({
                title: `${ALBUM.title} — ${ALBUM.artist}`,
                text: 'Songs exploring the bond between a brother and sister.',
                url: albumUrl(),
              })
            }
            className='flex w-full cursor-pointer items-center gap-4 px-3 py-3 text-left transition-colors hover:bg-accent/50'
          >
            {/* Ink on paper in both modes: scanners want dark modules on a
                light ground. The cover sits in the middle, modules cleared
                around it, with the error correction to spare. */}
            <div className='shrink-0 rounded-md bg-background p-2 text-foreground dark:bg-foreground dark:text-background'>
              <QRCode
                value={albumUrl()}
                size={92}
                level='H'
                marginSize={0}
                imageSettings={{
                  src: TRACKS[TRACK_ORDER[0]].art.thumb,
                  width: 24,
                  height: 24,
                  excavate: true,
                }}
                aria-label='Album link'
              />
            </div>
            <div className='min-w-0 flex-1'>
              <div className='font-display text-[18px] leading-tight font-medium text-foreground'>
                Share the album
              </div>
              <div className='mt-0.5 text-[12px] text-muted-foreground'>
                {ALBUM.title} · {TRACK_ORDER.length} songs
              </div>
              <div className='mt-1 truncate text-[11px] text-muted-foreground-subtle'>
                {albumUrl().replace(/^https?:\/\//, '')}
              </div>
            </div>
            <Share2
              className='size-4 shrink-0 text-muted-foreground'
              aria-hidden
            />
          </button>
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
          {/* The artist's note: who the songs are about, in his own words. */}
          <div className='flex flex-col gap-3 px-3 py-4'>
            <div className='flex items-center gap-3'>
              <img
                src='assets/icon-192.png'
                alt=''
                className='size-14 shrink-0 rounded-md shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
              />
              <div className='min-w-0'>
                <div className='font-display text-[20px] leading-tight font-medium text-foreground'>
                  {ALBUM.handle}
                </div>
                <div className='mt-0.5 text-[12px] text-muted-foreground'>
                  Written and performed by Dustin · 2026
                </div>
              </div>
            </div>
            <p className='text-[13px] leading-relaxed text-foreground/80'>
              {ALBUM.about}
            </p>
            <p className='font-display text-[16px] leading-snug text-primary italic'>
              {ALBUM.legend}
            </p>
          </div>
          <MobileListRow
            icon={ExternalLink}
            label={`${ALBUM.handle} on Suno`}
            value='suno.com'
            onClick={() => window.open(ALBUM.sunoUrl, '_blank', 'noopener')}
          />
          <MobileListRow
            icon={BookOpen}
            label='The story so far'
            value='By date written'
            onClick={() =>
              void navigate({ to: '/', search: { sort: 'written' } })
            }
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
