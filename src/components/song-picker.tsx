import { MobileListPicker } from '@dust-ui/ui'
import { TRACKS, TRACK_ORDER, type TrackId } from '@/data/tracks'
import { formatTime } from '@/lib/format'
import { useShellRoot } from '@/components/shell-context'

export type SongPickerProps = {
  title: string
  /** The song currently in that slot. */
  value: TrackId
  onSelect: (id: TrackId) => void
  onClose: () => void
}

// Every song as a picker item: cover, title, dedication and voice, length.
const ITEMS = TRACK_ORDER.map((id) => {
  const t = TRACKS[id]
  return {
    value: id,
    title: (
      <span className='font-display text-[17px] leading-tight text-foreground'>
        {t.title}
      </span>
    ),
    subtitle: `${t.dedication} · ${t.voice}`,
    leading: (
      <img
        src={t.art.thumb}
        alt=''
        className='size-11 shrink-0 rounded-[10px] object-cover shadow-[0_4px_14px_rgb(0_0_0/0.35)]'
      />
    ),
    trailing: formatTime(t.duration),
  }
})

/** A bottom sheet listing every song, pinned inside the shell root over the nav. */
export function SongPicker({
  title,
  value,
  onSelect,
  onClose,
}: SongPickerProps) {
  const root = useShellRoot()
  return (
    <MobileListPicker
      title={title}
      items={ITEMS}
      value={value}
      onSelect={onSelect}
      onClose={onClose}
      container={root}
      maxHeight='78%'
    />
  )
}
