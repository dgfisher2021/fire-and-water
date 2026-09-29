import { createPortal } from 'react-dom'
import { MobileListGroup, SheetBottom } from '@dust-ui/ui'
import { TRACK_ORDER, type TrackId } from '@/data/tracks'
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
 * A bottom sheet listing every song. Like the action sheet it portals into
 * the shell root so it slides up over the nav, inside the frame.
 */
export function SongPicker({
  title,
  value,
  onSelect,
  onClose,
}: SongPickerProps) {
  const root = useShellRoot()
  if (!root) return null
  return createPortal(
    <SheetBottom
      title={title}
      onClose={onClose}
      grabber
      scrim
      maxHeight='78%'
      background='var(--popover)'
    >
      <div className='no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-[calc(24px+env(safe-area-inset-bottom))]'>
        <MobileListGroup>
          {TRACK_ORDER.map((id) => (
            <TrackRow
              key={id}
              id={id}
              selected={id === value}
              onSelect={(next) => {
                onSelect(next)
                onClose()
              }}
            />
          ))}
        </MobileListGroup>
      </div>
    </SheetBottom>,
    root
  )
}
