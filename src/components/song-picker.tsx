import { useState, type ReactNode } from 'react'
import { MobileListGroup, MobileSearchBar, SheetBottom } from '@dust-ui/ui'
import { TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { filterTracks } from '@/lib/search'
import { useShellRoot } from '@/components/shell-context'
import { TrackRow } from '@/components/track-row'

export type SongPickerProps = {
  title: string
  /** The songs on offer; the whole album by default. */
  songs?: readonly TrackId[]
  /** The song currently in the slot the picker fills, if any. */
  value?: TrackId
  /** Right-aligned detail per row; the song's length by default. */
  detail?: (id: TrackId) => ReactNode
  /** Glyph on each resting row's trailing edge; the play glyph by default. */
  trailing?: ReactNode
  onSelect: (id: TrackId) => void
  onClose: () => void
}

/**
 * A bottom sheet listing songs behind a search field, pinned inside the
 * shell root over the nav. Picking a song calls onSelect, then onClose.
 */
export function SongPicker({
  title,
  songs = TRACK_ORDER,
  value,
  detail,
  trailing,
  onSelect,
  onClose,
}: SongPickerProps) {
  const root = useShellRoot()
  const [query, setQuery] = useState('')
  const shown = filterTracks(songs, (id) => TRACKS[id], query)
  return (
    <SheetBottom
      title={title}
      onClose={onClose}
      grabber
      scrim
      maxHeight='78%'
      container={root}
    >
      <div
        data-slot='song-picker'
        className='flex flex-col gap-3 pb-[calc(6px+env(safe-area-inset-bottom))]'
      >
        <MobileSearchBar
          value={query}
          onChange={setQuery}
          placeholder='Search songs'
        />
        <MobileListGroup
          role='listbox'
          aria-label={title}
          footer={shown.length === 0 ? `No song matches “${query}”` : undefined}
        >
          {shown.map((id) => (
            <TrackRow
              key={id}
              id={id}
              selected={value !== undefined && id === value}
              value={detail?.(id)}
              trailing={trailing}
              onSelect={(picked) => {
                onSelect(picked)
                onClose()
              }}
            />
          ))}
        </MobileListGroup>
      </div>
    </SheetBottom>
  )
}
