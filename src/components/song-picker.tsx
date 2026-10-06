import { useState } from 'react'
import { MobileListGroup, MobileSearchBar, SheetBottom } from '@dust-ui/ui'
import { TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { filterTracks } from '@/lib/search'
import { useShellRoot } from '@/components/shell-context'
import { TrackRow } from '@/components/track-row'

export type SongPickerProps = {
  title: string
  /** The song currently in that slot. */
  value: TrackId
  onSelect: (id: TrackId) => void
  onClose: () => void
}

/**
 * A bottom sheet listing every song behind a search field, pinned inside
 * the shell root over the nav. Picking a song calls onSelect, then onClose.
 */
export function SongPicker({
  title,
  value,
  onSelect,
  onClose,
}: SongPickerProps) {
  const root = useShellRoot()
  const [query, setQuery] = useState('')
  const songs = filterTracks(TRACK_ORDER, (id) => TRACKS[id], query)
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
          footer={songs.length === 0 ? `No song matches “${query}”` : undefined}
        >
          {songs.map((id) => (
            <TrackRow
              key={id}
              id={id}
              selected={id === value}
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
