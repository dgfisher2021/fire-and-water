import { useNavigate } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useMobileShellRoot } from '@dust-ui/blocks'
import { formatTime, MobileListGroup, SheetBottom } from '@dust-ui/ui'
import { styleSongs, type StyleName } from '@/data/creator-insights'
import { songsInStyle, styledSongCount } from '@/data/suno-style'
import { TRACKS } from '@/data/tracks'
import { TrackRow } from '@/components/track-row'
import { styleVar } from './style-var'

/**
 * This album's songs whose Suno style prompt names the style, beside Suno's
 * own count across every public song. A row opens Now Playing.
 */
export function StyleSongsSheet({
  style,
  onClose,
}: {
  style: StyleName
  onClose: () => void
}) {
  const root = useMobileShellRoot()
  const navigate = useNavigate()
  const ids = songsInStyle(style)
  const suno = styleSongs(style)
  const average = ids.length
    ? ids.reduce((s, id) => s + TRACKS[id].duration, 0) / ids.length
    : 0

  return (
    <SheetBottom
      title={
        <span className='flex items-center gap-2'>
          <span
            aria-hidden
            className='size-3 rounded-full'
            style={{ background: styleVar(style) }}
          />
          {style} on this album
        </span>
      }
      onClose={onClose}
      grabber
      scrim
      maxHeight='78%'
      container={root}
    >
      <div className='flex flex-col gap-3 pb-[calc(6px+env(safe-area-inset-bottom))]'>
        <p className='px-1 text-[13px] leading-snug text-muted-foreground'>
          {ids.length > 0 ? (
            <>
              <span className='font-semibold text-foreground'>
                {ids.length} of {styledSongCount()}
              </span>{' '}
              album songs name “{style.toLowerCase()}” in their Suno style
              prompt, averaging {formatTime(average)}.
            </>
          ) : (
            <>No album song names “{style.toLowerCase()}” in its Suno style.</>
          )}
          {suno !== undefined && (
            <> Suno counts {suno} across all public songs.</>
          )}
        </p>
        {ids.length > 0 && (
          // Rows in picker mode: the list row's own play button would nest
          // a button in the row.
          <MobileListGroup
            glass
            role='listbox'
            aria-label={`${style} songs on this album`}
          >
            {ids.map((id) => (
              <TrackRow
                key={id}
                id={id}
                trailing={
                  <ChevronRight
                    className='size-4 text-muted-foreground'
                    aria-hidden
                  />
                }
                onSelect={(track) =>
                  void navigate({ to: '/lyrics/$track', params: { track } })
                }
              />
            ))}
          </MobileListGroup>
        )}
      </div>
    </SheetBottom>
  )
}
